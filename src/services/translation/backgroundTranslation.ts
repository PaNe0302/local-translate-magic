
/**
 * Service for handling background translation processes
 */
import { toast } from 'sonner';
import { TextNode } from '../pageContentService';
import { pageContentService } from '../pageContentService';
import { chromeApiService } from '../chromeApiService';

/**
 * Starts a background translation process that continues even when popup is hidden
 */
export async function startBackgroundTranslation(targetLanguage: string): Promise<void> {
  try {
    // Get text nodes from the active tab
    const textNodes = await pageContentService.getPageContent();
    
    if (!textNodes || textNodes.length === 0) {
      toast.error('No translatable content found on this page');
      return;
    }
    
    // Filter out very short texts and already translated ones to save time
    const filteredNodes = textNodes.filter(node => 
      !node.isAlreadyTranslated && node.text.trim().length > 5
    );
    
    if (filteredNodes.length === 0) {
      toast.info('No new content to translate on this page');
      return;
    }
    
    // Send the translation request to the background script
    await chromeApiService.sendBackgroundMessage({
      action: 'startBackgroundTranslation',
      nodes: filteredNodes,
      targetLanguage: targetLanguage
    });
    
  } catch (error) {
    console.error('Error starting background translation:', error);
    throw error;
  }
}
