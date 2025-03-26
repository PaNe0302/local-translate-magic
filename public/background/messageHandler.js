
// Message Handler for LocalTranslate background script

import { injectContentScript } from './contentScriptInjector.js';

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
    
    // Handle page script ready notification
    if (request.action === "pageScriptReady") {
      console.log("Page script is ready in tab:", sender.tab ? sender.tab.id : "unknown tab");
      sendResponse({ status: "acknowledged" });
      return true;
    }
    
    // Handle responses from the page script
    if (request.action === "getPageContentResponse" || 
        request.action === "replaceTextResponse" || 
        request.action === "restoreOriginalResponse") {
      // Just pass these back to whoever requested them
      sendResponse(request);
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
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tabs || !tabs.length || !tabs[0] || !tabs[0].id) {
      sendResponse({ 
        error: 'No active tab found',
        status: "error"
      });
      return;
    }
    
    const tabId = tabs[0].id;
    
    // First ensure the content script is loaded
    const injectionResult = await injectContentScript(tabId);
    
    if (!injectionResult.success) {
      sendResponse({ 
        error: 'Failed to inject content script into the page',
        details: injectionResult.error || "The page may be protected or use a restricted URL scheme.",
        status: "error"
      });
      return;
    }
    
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

export {
  setupMessageListeners
};
