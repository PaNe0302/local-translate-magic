
/**
 * Service for extracting content from web pages
 */
import { toast } from 'sonner';
import { chromeApiService } from './chromeApiService';

export interface TextNode {
  id: string;
  text: string;
  isAlreadyTranslated?: boolean;
}

class PageContentService {
  /**
   * Gets all text content from the current page
   */
  public async getPageContent(): Promise<TextNode[]> {
    try {
      if (!chromeApiService.isAvailable()) {
        throw new Error('Chrome API not available');
      }
      
      // Get the active tab
      const tab = await chromeApiService.getActiveTab();
      
      // Ensure content script is injected
      await chromeApiService.ensureContentScript(tab.id as number);
      
      // Send message to the content script to get all text nodes
      const response = await chromeApiService.sendMessage<{ textNodes?: TextNode[] }>(
        tab.id as number,
        { action: 'getPageContent' }
      );
      
      return response.textNodes || [];
    } catch (error) {
      console.error('Error getting page content:', error);
      throw error;
    }
  }
  
  /**
   * Replaces a specific text node with translated text
   */
  public async replaceText(nodeId: string, translatedText: string): Promise<void> {
    try {
      if (!chromeApiService.isAvailable()) {
        throw new Error('Chrome API not available');
      }
      
      // Get the active tab
      const tab = await chromeApiService.getActiveTab();
      
      // Send message to the content script to replace text
      await chromeApiService.sendMessage(
        tab.id as number,
        { 
          action: 'replaceText',
          nodeId,
          translatedText
        }
      );
    } catch (error) {
      console.error(`Error replacing text for node ${nodeId}:`, error);
      throw error;
    }
  }
  
  /**
   * Restores the original text of the page
   */
  public async restoreOriginal(): Promise<void> {
    try {
      if (!chromeApiService.isAvailable()) {
        throw new Error('Chrome API not available');
      }
      
      // Get the active tab
      const tab = await chromeApiService.getActiveTab();
      
      // Send message to the content script to restore original text
      await chromeApiService.sendMessage(
        tab.id as number,
        { action: 'restoreOriginal' }
      );
      
      toast.success('Original text restored');
    } catch (error) {
      console.error('Error restoring original text:', error);
      toast.error('Failed to restore original text: ' + (error instanceof Error ? error.message : String(error)));
    }
  }
}

export const pageContentService = new PageContentService();
