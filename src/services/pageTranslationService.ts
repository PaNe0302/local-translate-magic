
/**
 * Service for translating web pages
 */
import { toast } from 'sonner';
import { translationApi } from './translationApi';
import { pageContentService, TextNode } from './pageContentService';
import { chromeApiService } from './chromeApiService';

class PageTranslationService {
  private isTranslating: boolean = false;
  private targetLanguage: string = 'vi'; // Default to Vietnamese
  private abortController: AbortController | null = null;
  
  /**
   * Translates the current active web page
   */
  async translatePage(): Promise<void> {
    if (this.isTranslating) {
      toast.error('Translation already in progress');
      return;
    }
    
    this.isTranslating = true;
    
    // Create abort controller for cancellation
    this.abortController = new AbortController();
    
    try {
      // First, check connection to LMStudio
      const healthCheck = await translationApi.checkHealth();
      if (!healthCheck.connected) {
        toast.error(healthCheck.error || 'Cannot connect to LMStudio');
        this.isTranslating = false;
        return;
      }
      
      // Start the background translation process
      await this.startBackgroundTranslation();
      
      toast.info(`Translation started in background to ${this.getLanguageName(this.targetLanguage)}...`);
      
    } catch (error) {
      console.error('Page translation error:', error);
      if (error instanceof DOMException && error.name === 'AbortError') {
        toast.error('Translation was cancelled');
      } else {
        toast.error('Failed to translate page: ' + (error instanceof Error ? error.message : String(error)));
      }
    } finally {
      this.isTranslating = false;
      this.abortController = null;
    }
  }

  /**
   * Starts a background translation process that continues even when popup is hidden
   */
  private async startBackgroundTranslation(): Promise<void> {
    try {
      // Get text nodes from the active tab
      const textNodes = await pageContentService.getPageContent();
      
      if (!textNodes || textNodes.length === 0) {
        toast.error('No translatable content found on this page');
        this.isTranslating = false;
        return;
      }
      
      // Filter out very short texts and already translated ones to save time
      const filteredNodes = textNodes.filter(node => 
        !node.isAlreadyTranslated && node.text.trim().length > 5
      );
      
      if (filteredNodes.length === 0) {
        toast.info('No new content to translate on this page');
        this.isTranslating = false;
        return;
      }
      
      // Send the translation request to the background script
      await chromeApiService.sendBackgroundMessage({
        action: 'startBackgroundTranslation',
        nodes: filteredNodes,
        targetLanguage: this.targetLanguage
      });
      
    } catch (error) {
      console.error('Error starting background translation:', error);
      throw error;
    }
  }
  
  /**
   * Process batch translation of text nodes with optimized concurrency
   * This method is called from the background script
   */
  async processBatchTranslation(textNodes: TextNode[]): Promise<void> {
    // Increase batch size for better performance
    const batchSize = 10;
    // Optimize concurrency - don't process too many requests at once
    const concurrencyLimit = 3;
    let completedCount = 0;
    let failedCount = 0;
    
    // Group similar-length text nodes together for more efficient processing
    const groupedNodes = this.groupNodesByLength(textNodes);
    
    for (const group of groupedNodes) {
      // Check if operation was cancelled
      if (this.abortController?.signal.aborted) {
        throw new DOMException("Translation aborted", "AbortError");
      }
      
      // Process nodes in batches within each group
      for (let i = 0; i < group.length; i += batchSize) {
        const batch = group.slice(i, i + batchSize);
        const batchPromises = [];
        
        // Process each batch with limited concurrency
        for (let j = 0; j < batch.length; j += concurrencyLimit) {
          const concurrentBatch = batch.slice(j, j + concurrencyLimit);
          
          const promises = concurrentBatch.map(async (node) => {
            try {
              // Check if operation was cancelled
              if (this.abortController?.signal.aborted) {
                throw new DOMException("Translation aborted", "AbortError");
              }
              
              const response = await translationApi.translateText({
                text: node.text,
                target_language: this.targetLanguage,
              });
              
              if (response.translatedText) {
                await pageContentService.replaceText(node.id, response.translatedText);
                completedCount++;
                
                // Update progress in a non-blocking way
                if (completedCount % 5 === 0 || completedCount === textNodes.length) {
                  chromeApiService.sendBackgroundMessage({
                    action: 'translationProgress',
                    completed: completedCount,
                    total: textNodes.length
                  }).catch(err => console.error('Failed to send progress update:', err));
                }
              } else {
                failedCount++;
              }
            } catch (error) {
              console.error(`Failed to translate node ${node.id}:`, error);
              failedCount++;
              // Don't rethrow to allow other translations to continue
            }
          });
          
          // Wait for concurrent batch to complete before starting next
          await Promise.all(promises);
        }
      }
    }
    
    // Send final status to update the UI
    chromeApiService.sendBackgroundMessage({
      action: 'translationComplete',
      failedCount,
      targetLanguage: this.targetLanguage
    }).catch(err => console.error('Failed to send completion status:', err));
  }
  
  /**
   * Group nodes by text length for more efficient processing
   * This improves translation speed by processing similar-sized chunks together
   */
  private groupNodesByLength(nodes: TextNode[]): TextNode[][] {
    // Create 3 groups: short, medium, and long text
    const shortTexts: TextNode[] = [];
    const mediumTexts: TextNode[] = [];
    const longTexts: TextNode[] = [];
    
    nodes.forEach(node => {
      const length = node.text.length;
      if (length < 50) {
        shortTexts.push(node);
      } else if (length < 200) {
        mediumTexts.push(node);
      } else {
        longTexts.push(node);
      }
    });
    
    // Process short texts first, then medium, then long
    return [shortTexts, mediumTexts, longTexts].filter(group => group.length > 0);
  }
  
  /**
   * Cancels an ongoing translation
   */
  cancelTranslation(): void {
    if (this.isTranslating && this.abortController) {
      this.abortController.abort();
      this.isTranslating = false;
      
      // Notify background script to cancel translation
      chromeApiService.sendBackgroundMessage({
        action: 'cancelTranslation'
      }).catch(err => console.error('Failed to send cancellation message:', err));
      
      toast.info('Translation cancelled');
    }
  }
  
  /**
   * Restores the original text of the page
   */
  async restoreOriginal(): Promise<void> {
    await pageContentService.restoreOriginal();
  }
  
  /**
   * Sets the target language for translation
   */
  setTargetLanguage(languageCode: string): void {
    this.targetLanguage = languageCode;
  }

  /**
   * Gets the target language code
   */
  getTargetLanguage(): string {
    return this.targetLanguage;
  }

  /**
   * Gets the target language name from code
   */
  private getLanguageName(languageCode: string): string {
    const languageMap: Record<string, string> = {
      'en': 'English',
      'vi': 'Vietnamese',
      'fr': 'French',
      'de': 'German',
      'es': 'Spanish',
      'it': 'Italian',
      'ja': 'Japanese',
      'ko': 'Korean',
      'zh': 'Chinese',
      'ru': 'Russian'
    };
    
    return languageMap[languageCode] || languageCode;
  }
}

export const pageTranslationService = new PageTranslationService();
