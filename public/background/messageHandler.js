
// Message Handler for LocalTranslate background script
import { handlePingRequest, handleContentScriptReadyNotification } from './pingHandler.js';
import { 
  handleTranslatePageRequest, 
  handleTranslateSelectionRequest,
  handleStartBackgroundTranslation,
  handleCancelTranslation 
} from './translationHandler.js';

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
      handlePingRequest(sendResponse);
      return true;
    }
    
    // Handle content script ready notification
    if (request.action === "contentScriptReady") {
      handleContentScriptReadyNotification(sender, sendResponse);
      return true;
    }
    
    // Handle translate page request from popup
    if (request.action === "translatePage") {
      handleTranslatePageRequest(request, sendResponse);
      return true; // Keep the message channel open for the async response
    }
    
    // Handle start background translation request
    if (request.action === "startBackgroundTranslation") {
      handleStartBackgroundTranslation(request, sendResponse);
      return true;
    }
    
    // Handle cancel translation request
    if (request.action === "cancelTranslation") {
      handleCancelTranslation();
      sendResponse({ status: "cancelled" });
      return true;
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
