
// Content Script Injector for LocalTranslate

/**
 * Injects the content script into a tab
 * @param {number} tabId - The ID of the tab to inject the script into
 * @returns {Promise<{success: boolean, error?: string}>} - Whether the injection was successful
 */
async function injectContentScript(tabId) {
  try {
    if (!tabId) {
      return { success: false, error: 'Invalid tab ID' };
    }
    
    // First check if we can access the tab
    try {
      const tab = await chrome.tabs.get(tabId);
      
      // Check if tab has a URL that we can inject into
      if (!tab.url) {
        return { success: false, error: 'Tab has no URL' };
      }
      
      // Check if the URL is restricted
      if (tab.url.startsWith('chrome://') || 
          tab.url.startsWith('edge://') || 
          tab.url.startsWith('brave://') ||
          tab.url.startsWith('about:') || 
          tab.url.startsWith('chrome-extension://') ||
          tab.url.startsWith('moz-extension://')) {
        return { 
          success: false, 
          error: `Cannot inject into restricted URL: ${tab.url}` 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: `Cannot access tab: ${error.message}` 
      };
    }
    
    // First try to ping the content script to see if it's already loaded
    try {
      const pingResponse = await sendPingToContentScript(tabId);
      console.log('Content script already loaded in tab:', tabId);
      return { success: true };
    } catch (pingError) {
      console.log('Content script not detected, will inject...', pingError);
      // Continue with injection since ping failed
    }
    
    // Execute content script injection
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
      });
      
      console.log('Content script injected into tab:', tabId);
      
      // Verify the content script is now loaded
      try {
        // Give the content script time to initialize
        await new Promise(resolve => setTimeout(resolve, 1000));
        await sendPingToContentScript(tabId);
        return { success: true };
      } catch (verifyError) {
        return { 
          success: false, 
          error: `Verification failed after injection: ${verifyError.message}` 
        };
      }
    } catch (injectionError) {
      return { 
        success: false, 
        error: `Injection failed: ${injectionError.message}` 
      };
    }
  } catch (error) {
    console.error('Error in injectContentScript:', error);
    return { 
      success: false, 
      error: `Unexpected error: ${error.message}` 
    };
  }
}

/**
 * Sends a ping to check if the content script is loaded
 * @param {number} tabId - The ID of the tab to check
 * @returns {Promise<any>} - The response from the content script
 */
function sendPingToContentScript(tabId) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Content script ping timed out'));
    }, 3000); // Increased timeout for reliability
    
    chrome.tabs.sendMessage(tabId, { action: 'ping' }, (response) => {
      clearTimeout(timeoutId);
      
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      
      if (!response) {
        reject(new Error('Empty response from content script'));
        return;
      }
      
      if (response.status === 'alive') {
        resolve(response);
      } else {
        reject(new Error('Content script not responding correctly'));
      }
    });
  });
}

export {
  injectContentScript
};
