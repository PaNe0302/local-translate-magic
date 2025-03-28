
// Message handling functionality for content script
import { 
  originalNodes, 
  translatedNodes, 
  setIsTranslating,
  getIsTranslating
} from './stateManager.js';

import { 
  getTextNodes,
  highlightElement,
  removeHighlight,
  injectStyles
} from './domUtils.js';

/**
 * Sets up the message bridge between content script and extension
 */
export function setupMessageBridge() {
  // Listen for messages from the extension background
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log("Content script received message from extension:", request);
    
    // Handle different actions
    if (request && request.action === 'ping') {
      sendResponse({ status: 'alive' });
      return true;
    } else if (request && request.action === 'getPageContent') {
      handleGetPageContent(sendResponse);
      return true;
    } else if (request && request.action === 'replaceText') {
      handleReplaceText(request, sendResponse);
      return true;
    } else if (request && request.action === 'restoreOriginal') {
      handleRestoreOriginal(sendResponse);
      return true;
    }
    
    // Default response
    sendResponse({ status: "unknown_action" });
    return true;
  });
}

/**
 * Handle get page content request
 */
export function handleGetPageContent(sendResponse) {
  try {
    if (setIsTranslating(true)) {
      injectStyles();
      
      const textNodes = getTextNodes();
      
      setIsTranslating(false);
      
      sendResponse({
        textNodes: textNodes.length > 0 ? textNodes : [],
        error: textNodes.length === 0 ? "No translatable text found on this page" : null,
        status: textNodes.length > 0 ? "success" : "error"
      });
    } else {
      sendResponse({
        error: "Translation already in progress",
        status: "error"
      });
    }
  } catch (error) {
    console.error("Error getting page content:", error);
    setIsTranslating(false);
    
    sendResponse({
      error: error.message || "Unknown error getting page content",
      status: "error"
    });
  }
}

/**
 * Handle replace text request
 */
export function handleReplaceText(request, sendResponse) {
  try {
    const { nodeId, translatedText } = request;
    const originalNode = originalNodes.get(nodeId);
    
    if (originalNode && originalNode.node) {
      originalNode.node.textContent = translatedText;
      translatedNodes.set(nodeId, translatedText);
      highlightElement(originalNode.node);
      
      sendResponse({
        status: "success"
      });
    } else {
      console.warn(`Node ${nodeId} not found for replacement`);
      sendResponse({
        error: `Node ${nodeId} not found`,
        status: "error"
      });
    }
  } catch (error) {
    console.error("Error replacing text:", error);
    sendResponse({
      error: error.message || "Unknown error replacing text",
      status: "error"
    });
  }
}

/**
 * Handle restore original request
 */
export function handleRestoreOriginal(sendResponse) {
  try {
    originalNodes.forEach((original, nodeId) => {
      if (original.node) {
        original.node.textContent = original.text;
        removeHighlight(original.node);
      }
    });
    translatedNodes.clear();
    
    sendResponse({
      status: "success",
      message: "Original text restored"
    });
  } catch (error) {
    console.error("Error restoring original text:", error);
    sendResponse({
      error: error.message || "Unknown error restoring original text",
      status: "error"
    });
  }
}

/**
 * Sends a message to the page context
 */
export function sendMessageToPage(message) {
  try {
    window.postMessage({
      type: 'FROM_CONTENT_SCRIPT',
      message: message
    }, '*');
    return true;
  } catch (error) {
    console.error("Error sending message to page:", error);
    return false;
  }
}
