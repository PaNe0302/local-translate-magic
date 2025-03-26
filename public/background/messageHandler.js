
// Message Handler for LocalTranslate background script

/**
 * Sets up message listeners for the background script
 */
function setupMessageListeners() {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Background script received message:", request ? request.action : "undefined message");
    
    if (!request) {
      console.error("Received empty message");
      sendResponse({ error: "Empty message received" });
      return true;
    }
    
    // Handle ping from popup or content script
    if (request.action === "ping") {
      sendResponse({ status: "alive" });
      return true;
    }
    
    // Handle content script ready notification
    if (request.action === "contentScriptReady") {
      console.log("Content script is ready in tab:", sender.tab ? sender.tab.id : "unknown tab");
      sendResponse({ status: "acknowledged" });
      return true;
    }
    
    // Handle translate page request from popup
    if (request.action === "translatePage") {
      handleTranslatePageRequest(request, sendResponse);
      return true; // Keep the message channel open for the async response
    }
    
    // Handle translate selection request from context menu
    if (request.action === "translateSelection") {
      handleTranslateSelectionRequest(request, sendResponse);
      return true;
    }
    
    // Default response for unhandled actions
    console.warn("Unhandled message action:", request.action);
    sendResponse({ 
      error: `Unhandled message action: ${request.action}`,
      status: "error" 
    });
    
    return true;
  });
}

/**
 * Handle translate page request
 * @param {Object} request - The request message
 * @param {Function} sendResponse - Function to send response back to the sender
 */
async function handleTranslatePageRequest(request, sendResponse) {
  try {
    // Get the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs || !tabs.length || !tabs[0] || !tabs[0].id) {
        sendResponse({ 
          error: 'No active tab found',
          status: "error"
        });
        return;
      }
      
      const tabId = tabs[0].id;
      
      // First ensure the content script is loaded
      try {
        await ensureContentScript(tabId);
        
        // Send the getPageContent message to the tab
        chrome.tabs.sendMessage(tabId, { action: "getPageContent" }, response => {
          if (chrome.runtime.lastError) {
            console.error('Message sending error:', chrome.runtime.lastError);
            sendResponse({ 
              error: chrome.runtime.lastError.message,
              details: "Could not communicate with the page. This might be due to security restrictions.",
              status: "error"
            });
          } else {
            // Pass the response back to whoever requested the translation
            sendResponse(response || { 
              error: 'No response received from content script',
              status: "error"
            });
          }
        });
      } catch (error) {
        console.error('Error injecting or communicating with content script:', error);
        sendResponse({
          error: error.message || 'Failed to inject content script',
          status: "error"
        });
      }
    });
  } catch (error) {
    console.error('Error handling translate page request:', error);
    sendResponse({ 
      error: 'Failed to process translate page request',
      details: error.message,
      status: "error"
    });
  }
}

/**
 * Handle translate selection request
 * @param {Object} request - The request message
 * @param {Function} sendResponse - Function to send response back to the sender
 */
function handleTranslateSelectionRequest(request, sendResponse) {
  try {
    if (!request.text) {
      sendResponse({ 
        error: 'No text selected',
        status: "error" 
      });
      return;
    }
    
    // Just pass the selected text back to the popup for now
    sendResponse({ 
      text: request.text,
      status: "success" 
    });
  } catch (error) {
    console.error('Error handling translate selection request:', error);
    sendResponse({ 
      error: 'Failed to process translate selection request',
      details: error.message,
      status: "error"
    });
  }
}

/**
 * Injects the content script into a tab
 * @param {number} tabId - The ID of the tab to inject the script into
 * @returns {Promise<boolean>} - Whether the injection was successful
 */
async function ensureContentScript(tabId) {
  return new Promise((resolve, reject) => {
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
              resolve(true);
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

export {
  setupMessageListeners,
  handleTranslatePageRequest,
  handleTranslateSelectionRequest,
  ensureContentScript
};
