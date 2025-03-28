
/**
 * Service for translating web pages
 */
import { toast } from 'sonner';
import { translationApi } from './translationApi';
import { startBackgroundTranslation } from './translation/backgroundTranslation';
import { getLanguageName } from './translation/translationUtils';
import { pageContentService } from './pageContentService';
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
      await startBackgroundTranslation(this.targetLanguage);
      
      toast.info(`Translation started in background to ${getLanguageName(this.targetLanguage)}...`);
      
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
}

export const pageTranslationService = new PageTranslationService();
