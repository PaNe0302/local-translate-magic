
import { translationApi } from './translationApi';
import { toast } from 'sonner';

class PageTranslationService {
  async translatePage(targetLanguage: string = 'vi'): Promise<boolean> {
    return new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.tabs) {
        toast.error('Extension API not available. This feature works only in the Chrome extension.');
        resolve(false);
        return;
      }
      
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        if (!tabs || !tabs[0] || !tabs[0].id) {
          toast.error('No active tab found');
          resolve(false);
          return;
        }
        
        try {
          const healthCheck = await translationApi.checkHealth();
          
          if (!healthCheck.connected) {
            toast.error(healthCheck.error || 'Cannot connect to LMStudio');
            resolve(false);
            return;
          }
          
          // First inject content script if not already injected
          try {
            await this.injectContentScriptIfNeeded(tabs[0].id);
          } catch (error) {
            console.error('Failed to inject content script:', error);
            toast.error('Cannot access page content. Please refresh and try again.');
            resolve(false);
            return;
          }
          
          // Get page content
          chrome.tabs.sendMessage(
            tabs[0].id,
            { action: 'getPageContent' },
            async (response) => {
              if (chrome.runtime.lastError) {
                console.error('Content script error:', chrome.runtime.lastError);
                toast.error('Could not connect to the page. Please refresh and try again.');
                resolve(false);
                return;
              }
              
              if (!response || !response.textNodes || response.textNodes.length === 0) {
                toast.error('No translatable content found on this page');
                resolve(false);
                return;
              }
              
              console.log('Found text nodes:', response.textNodes.length);
              toast.success(`Found ${response.textNodes.length} translatable elements`);
              
              try {
                let translatedCount = 0;
                // Process text nodes in smaller batches to avoid overwhelming the translation API
                const batchSize = 5;
                for (let i = 0; i < response.textNodes.length; i += batchSize) {
                  const batch = response.textNodes.slice(i, i + batchSize);
                  
                  // Process each text node in the batch
                  await Promise.all(batch.map(async (node: any) => {
                    // Skip very short text or already translated text
                    if (node.text.trim().length < 2 || node.isAlreadyTranslated) {
                      return;
                    }
                    
                    try {
                      toast.info(`Translating element ${i + batch.indexOf(node) + 1}/${response.textNodes.length}...`);
                      
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
                      
                      translatedCount++;
                    } catch (error) {
                      console.error(`Error translating node ${node.id}:`, error);
                    }
                  }));
                  
                  // Small pause between batches to not overload the API
                  await new Promise(r => setTimeout(r, 200));
                }
                
                if (translatedCount > 0) {
                  toast.success(`Translated ${translatedCount} elements successfully`);
                  resolve(true);
                } else {
                  toast.warning('No elements were translated');
                  resolve(false);
                }
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
  
  private async injectContentScriptIfNeeded(tabId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        chrome.tabs.sendMessage(tabId, { action: 'ping' }, (response) => {
          const lastError = chrome.runtime.lastError;
          
          if (lastError || !response) {
            console.log('Content script not detected, injecting now...');
            
            if (!chrome.scripting) {
              console.error('chrome.scripting API not available');
              reject(new Error('chrome.scripting API not available'));
              return;
            }
            
            chrome.scripting.executeScript(
              {
                target: { tabId },
                files: ['content.js']
              }
            ).then(() => {
              console.log('Content script injected successfully');
              // Give the content script a moment to initialize
              setTimeout(resolve, 300);
            }).catch((err) => {
              console.error('Script injection error:', err);
              reject(err);
            });
          } else {
            // Content script is already injected
            console.log('Content script already injected');
            resolve();
          }
        });
      } catch (error) {
        console.error('Error checking content script:', error);
        reject(error);
      }
    });
  }
}

export const pageTranslationService = new PageTranslationService();
