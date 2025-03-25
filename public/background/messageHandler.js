
// Message Handler for LocalTranslate background script

import { injectContentScript } from './contentScriptInjector.js';

/**
 * Sets up message listeners for the background script
 */
function setupMessageListeners() {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "translatePage") {
      handleTranslatePageRequest(sendResponse);
      return true; // Keep the message channel open for the async response
    }
    
    return true;
  });
  
  // Listen for connections from content scripts
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name === "content-script") {
      port.onMessage.addListener((message) => {
        console.log("Received message from content script:", message);
        // Process messages as needed
      });
    }
  });
}

/**
 * Handle translate page request
 * @param {Function} sendResponse - Function to send response back to the sender
 */
function handleTranslatePageRequest(sendResponse) {
  // Notify the active tab to start translation
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    if (tabs && tabs[0] && tabs[0].id) {
      try {
        // First ensure the content script is loaded
        const injected = await injectContentScript(tabs[0].id);
        
        // Give the content script a moment to initialize
        setTimeout(() => {
          chrome.tabs.sendMessage(tabs[0].id, { action: "getPageContent" }, response => {
            if (chrome.runtime.lastError) {
              console.error('Message sending error:', chrome.runtime.lastError);
              sendResponse({ 
                error: chrome.runtime.lastError.message,
                details: "Could not communicate with the page. This might be due to security restrictions."
              });
            } else {
              // Pass the response back to whoever requested the translation
              sendResponse(response);
            }
          });
        }, 500);
      } catch (error) {
        console.error('Script injection error:', error);
        sendResponse({ 
          error: 'Failed to inject content script',
          details: error.message
        });
      }
    } else {
      sendResponse({ error: 'No active tab found' });
    }
  });
}

export {
  setupMessageListeners
};
