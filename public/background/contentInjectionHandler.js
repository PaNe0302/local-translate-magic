
/**
 * Handles the injection of content scripts into tabs
 */

/**
 * Injects the content script into a tab if not already present
 * @param {number} tabId - The ID of the tab to inject into
 * @returns {Promise<boolean>} - Whether the script was successfully injected or already present
 */
export async function ensureContentScript(tabId) {
  return new Promise((resolve, reject) => {
    if (!tabId) {
      reject(new Error('Invalid tab ID'));
      return;
    }
    
    // First try to ping the content script to see if it's already loaded
    chrome.tabs.sendMessage(tabId, { action: 'ping' }, (response) => {
      if (chrome.runtime.lastError) {
        console.log('Content script not detected, will inject...', chrome.runtime.lastError);
        
        // Check if we can inject into this tab
        chrome.tabs.get(tabId, (tab) => {
          if (chrome.runtime.lastError) {
            reject(new Error(`Cannot access tab: ${chrome.runtime.lastError.message}`));
            return;
          }
          
          if (!tab.url) {
            reject(new Error('Tab has no URL'));
            return;
          }
          
          // Check if the URL is restricted
          if (tab.url.startsWith('chrome://') || 
              tab.url.startsWith('edge://') || 
              tab.url.startsWith('brave://') ||
              tab.url.startsWith('about:') || 
              tab.url.startsWith('chrome-extension://') ||
              tab.url.startsWith('moz-extension://')) {
            reject(new Error(`Cannot inject into restricted URL: ${tab.url}`));
            return;
          }
          
          // Execute content script injection
          chrome.scripting.executeScript({
            target: { tabId },
            files: ['content.js']
          }, (injectionResults) => {
            if (chrome.runtime.lastError) {
              reject(new Error(`Injection failed: ${chrome.runtime.lastError.message}`));
            } else {
              console.log('Content script injected into tab:', tabId);
              // Give the content script time to initialize
              setTimeout(() => resolve(true), 500);
            }
          });
        });
      } else if (response && response.status === 'alive') {
        console.log('Content script already loaded in tab:', tabId);
        resolve(true);
      } else {
        reject(new Error('Content script not responding correctly'));
      }
    });
  });
}

/**
 * Gets page content from a tab
 * @param {number} tabId - The ID of the tab to get content from
 * @returns {Promise<any>} - The page content
 */
export async function getPageContent(tabId) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, { action: "getPageContent" }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else if (!response) {
        reject(new Error('No response received from content script'));
      } else {
        resolve(response);
      }
    });
  });
}
