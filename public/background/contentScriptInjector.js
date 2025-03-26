
// Content Script Injector for LocalTranslate

/**
 * Injects the content script into a tab
 * @param {number} tabId - The ID of the tab to inject the script into
 * @returns {Promise<boolean>} - Whether the injection was successful
 */
async function injectContentScript(tabId) {
  try {
    // First check if we can access the tab
    const tab = await chrome.tabs.get(tabId);
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
      console.log('Cannot inject content script into this tab type:', tab.url);
      return false;
    }

    // First attempt to ping content script to see if it's already loaded
    try {
      const pingResponse = await sendPingToContentScript(tabId);
      console.log('Content script already loaded in tab:', tabId);
      return true;
    } catch (pingError) {
      console.log('Content script not detected, injecting...', pingError);
    }
    
    // If ping fails, inject the content script
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js'],
      world: 'MAIN' // This ensures the script runs in the main world context
    });
    
    console.log('Content script injected successfully into tab:', tabId);
    
    // Give the content script time to initialize
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verify the content script is now loaded
    try {
      await sendPingToContentScript(tabId);
      console.log('Content script verified as working in tab:', tabId);
      return true;
    } catch (verifyError) {
      console.error('Content script injection failed verification:', verifyError);
      return false;
    }
  } catch (error) {
    console.error('Failed to inject content script:', error);
    return false;
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
    }, 2000); // Increased timeout for reliability
    
    chrome.tabs.sendMessage(tabId, { action: 'ping' }, (response) => {
      clearTimeout(timeoutId);
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else if (response && response.status === 'alive') {
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
