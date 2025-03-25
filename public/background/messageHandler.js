
// Message Handler for LocalTranslate background script

import { injectContentScript } from './contentScriptInjector.js';

/**
 * Sets up message listeners for the background script
 */
function setupMessageListeners() {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Background script received message:", request.action);
    
    // Handle ping from popup or content script
    if (request.action === "ping") {
      sendResponse({ status: "alive" });
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
 * @param {Object} request - The request message
 * @param {Function} sendResponse - Function to send response back to the sender
 */
async function handleTranslatePageRequest(request, sendResponse) {
  try {
    // Get the active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tabs && tabs[0] && tabs[0].id) {
      const tabId = tabs[0].id;
      
      // First ensure the content script is loaded
      const injected = await injectContentScript(tabId);
      
      // Give the content script a moment to initialize
      setTimeout(() => {
        chrome.tabs.sendMessage(tabId, { action: "getPageContent" }, response => {
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
    } else {
      sendResponse({ error: 'No active tab found' });
    }
  } catch (error) {
    console.error('Script injection error:', error);
    sendResponse({ 
      error: 'Failed to inject content script',
      details: error.message
    });
  }
}

/**
 * Handle translate selection request
 * @param {Object} request - The request message
 * @param {Function} sendResponse - Function to send response back to the sender
 */
function handleTranslateSelectionRequest(request, sendResponse) {
  // Just pass the selected text back to the popup for now
  sendResponse({ 
    text: request.text,
    status: "Selection received" 
  });
}

export {
  setupMessageListeners
};
