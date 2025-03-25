
/**
 * Service for translating web pages
 */
import { toast } from 'sonner';
import { translationApi } from './translationApi';
import { pageContentService, TextNode } from './pageContentService';

class PageTranslationService {
  private isTranslating: boolean = false;
  private targetLanguage: string = 'en';
  
  /**
   * Translates the current active web page
   */
  async translatePage(): Promise<void> {
    if (this.isTranslating) {
      toast.error('Translation already in progress');
      return;
    }
    
    this.isTranslating = true;
    
    try {
      // First, check connection to LMStudio
      const healthCheck = await translationApi.checkHealth();
      if (!healthCheck.connected) {
        toast.error(healthCheck.error || 'Cannot connect to LMStudio');
        this.isTranslating = false;
        return;
      }
      
      // Get text nodes from the active tab
      const textNodes = await pageContentService.getPageContent();
      
      if (!textNodes || textNodes.length === 0) {
        toast.error('No translatable content found on this page');
        this.isTranslating = false;
        return;
      }
      
      toast.info(`Translating ${textNodes.length} elements on the page...`);
      
      // Process nodes in batches to avoid overwhelming the API
      await this.processBatchTranslation(textNodes);
      
    } catch (error) {
      console.error('Page translation error:', error);
      toast.error('Failed to translate page: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      this.isTranslating = false;
    }
  }
  
  /**
   * Process batch translation of text nodes
   */
  private async processBatchTranslation(textNodes: TextNode[]): Promise<void> {
    const batchSize = 5;
    let completedCount = 0;
    let failedCount = 0;
    
    for (let i = 0; i < textNodes.length; i += batchSize) {
      const batch = textNodes.slice(i, i + batchSize);
      
      // Process each batch in parallel
      const promises = batch.map(async (node) => {
        try {
          // Skip already translated nodes
          if (node.isAlreadyTranslated) {
            completedCount++;
            return;
          }
          
          // Skip very short text (not worth translating)
          if (node.text.trim().length < 5) {
            completedCount++;
            return;
          }
          
          const response = await translationApi.translateText({
            text: node.text,
            target_language: this.targetLanguage,
          });
          
          if (response.translatedText) {
            await pageContentService.replaceText(node.id, response.translatedText);
            completedCount++;
          } else {
            failedCount++;
          }
        } catch (error) {
          console.error(`Failed to translate node ${node.id}:`, error);
          failedCount++;
        }
      });
      
      // Wait for the batch to complete
      await Promise.all(promises);
      
      // Update progress
      if ((i + batchSize) % 20 === 0 || i + batchSize >= textNodes.length) {
        toast.info(`Translation progress: ${completedCount} of ${textNodes.length} elements`);
      }
    }
    
    if (failedCount > 0) {
      toast.warning(`Translation completed with ${failedCount} errors`);
    } else {
      toast.success('Translation completed successfully');
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
}

export const pageTranslationService = new PageTranslationService();
