
// Message Handler for LocalTranslate background script
import { ensureContentScript, getPageContent } from './contentInjectionHandler.js';

/**
 * Sets up message listeners for the background script
 */
export function setupMessageListeners() {
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
      
      try {
        // Ensure content script is injected
        await ensureContentScript(tabId);
        
        // Get page content
        try {
          const content = await getPageContent(tabId);
          sendResponse(content);
        } catch (contentError) {
          sendResponse({ 
            error: contentError.message,
            status: "error"
          });
        }
      } catch (injectionError) {
        sendResponse({ 
          error: injectionError.message,
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
