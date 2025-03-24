
import { translationApi } from './translationApi';
import { toast } from 'sonner';

class PageTranslationService {
  async translatePage(targetLanguage: string = 'en'): Promise<boolean> {
    return new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.tabs) {
        toast.error('Extension API not available. This feature works only in the Chrome extension.');
        resolve(false);
        return;
      }
      
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        try {
          const healthCheck = await translationApi.checkHealth();
          
          if (!healthCheck.connected) {
            toast.error(healthCheck.error || 'Cannot connect to LMStudio');
            resolve(false);
            return;
          }
          
          chrome.tabs.sendMessage(
            tabs[0].id!,
            { action: 'getPageContent' },
            async (response) => {
              if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError);
                toast.error('Could not connect to the page. Please refresh and try again.');
                resolve(false);
                return;
              }
              
              try {
                // Process each text node
                for (const node of response.textNodes) {
                  toast.info(`Translating segment ${node.id}...`);
                  
                  const data = await translationApi.translateText({
                    text: node.text,
                    target_language: targetLanguage,
                  });
                  
                  // Send translated text back to content script
                  chrome.tabs.sendMessage(tabs[0].id!, {
                    action: 'replaceText',
                    nodeId: node.id,
                    translatedText: data.translatedText,
                  });
                }
                
                toast.success('Page translated successfully');
                resolve(true);
              } catch (error) {
                console.error('Translation error:', error);
                toast.error(error instanceof Error ? error.message : 'Translation failed. Please try again.');
                resolve(false);
              }
            }
          );
        } catch (error) {
          console.error('Page translation error:', error);
          toast.error(error instanceof Error ? error.message : 'Page translation failed. Please try again.');
          resolve(false);
        }
      });
    });
  }
}

export const pageTranslationService = new PageTranslationService();
