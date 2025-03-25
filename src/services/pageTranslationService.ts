
import { toast } from 'sonner';
import { translationApi } from './translationApi';

// This is necessary to ensure TypeScript recognizes the chrome namespace
/// <reference path="../types/chrome.d.ts" />

interface TextNode {
  id: string;
  text: string;
  isAlreadyTranslated?: boolean;
}

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
      const textNodes = await this.getPageContent();
      
      if (!textNodes || textNodes.length === 0) {
        toast.error('No translatable content found on this page');
        this.isTranslating = false;
        return;
      }
      
      toast.info(`Translating ${textNodes.length} elements on the page...`);
      
      // Process nodes in batches to avoid overwhelming the API
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
              await this.replaceText(node.id, response.translatedText);
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
      
    } catch (error) {
      console.error('Page translation error:', error);
      toast.error('Failed to translate page: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      this.isTranslating = false;
    }
  }
  
  /**
   * Restores the original text of the page
   */
  async restoreOriginal(): Promise<void> {
    try {
      // Get the active tab
      const tabs = await new Promise<chrome.runtime.MessageSender['tab'][]>((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.tabs) {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            resolve(tabs);
          });
        } else {
          resolve([]);
        }
      });
      
      if (!tabs || tabs.length === 0 || !tabs[0].id) {
        throw new Error('No active tab found');
      }
      
      // Send message to the content script to restore original text
      await new Promise<void>((resolve, reject) => {
        chrome.tabs.sendMessage(
          tabs[0].id as number,
          { action: 'restoreOriginal' },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else if (response.error) {
              reject(new Error(response.error));
            } else {
              resolve();
            }
          }
        );
      });
      
      toast.success('Original text restored');
    } catch (error) {
      console.error('Error restoring original text:', error);
      toast.error('Failed to restore original text: ' + (error instanceof Error ? error.message : String(error)));
    }
  }
  
  /**
   * Sets the target language for translation
   */
  setTargetLanguage(languageCode: string): void {
    this.targetLanguage = languageCode;
  }
  
  /**
   * Gets all text content from the current page
   */
  private async getPageContent(): Promise<TextNode[]> {
    try {
      // Get the active tab
      const tabs = await new Promise<any[]>((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.tabs) {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            resolve(tabs);
          });
        } else {
          resolve([]);
        }
      });
      
      if (!tabs || tabs.length === 0 || !tabs[0].id) {
        throw new Error('No active tab found');
      }
      
      // Ensure content script is injected
      try {
        if (chrome && chrome.scripting) {
          await chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            files: ['content.js']
          });
        }
      } catch (error) {
        console.warn('Content script may already be loaded:', error);
      }
      
      // Send message to the content script to get all text nodes
      const response = await new Promise<any>((resolve, reject) => {
        setTimeout(() => {
          if (chrome && chrome.tabs) {
            chrome.tabs.sendMessage(
              tabs[0].id as number,
              { action: 'getPageContent' },
              (response) => {
                if (chrome.runtime && chrome.runtime.lastError) {
                  reject(new Error(chrome.runtime.lastError.message));
                } else {
                  resolve(response);
                }
              }
            );
          } else {
            reject(new Error('Chrome API not available'));
          }
        }, 500); // Give content script some time to initialize
      });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      return response.textNodes || [];
    } catch (error) {
      console.error('Error getting page content:', error);
      throw error;
    }
  }
  
  /**
   * Replaces a specific text node with translated text
   */
  private async replaceText(nodeId: string, translatedText: string): Promise<void> {
    try {
      // Get the active tab
      const tabs = await new Promise<any[]>((resolve) => {
        if (typeof chrome !== 'undefined' && chrome.tabs) {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            resolve(tabs);
          });
        } else {
          resolve([]);
        }
      });
      
      if (!tabs || tabs.length === 0 || !tabs[0].id) {
        throw new Error('No active tab found');
      }
      
      // Send message to the content script to replace text
      await new Promise<void>((resolve, reject) => {
        if (chrome && chrome.tabs) {
          chrome.tabs.sendMessage(
            tabs[0].id as number,
            { 
              action: 'replaceText',
              nodeId,
              translatedText
            },
            (response) => {
              if (chrome.runtime && chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
              } else if (response.error) {
                reject(new Error(response.error));
              } else {
                resolve();
              }
            }
          );
        } else {
          reject(new Error('Chrome API not available'));
        }
      });
    } catch (error) {
      console.error(`Error replacing text for node ${nodeId}:`, error);
      throw error;
    }
  }
}

export const pageTranslationService = new PageTranslationService();
