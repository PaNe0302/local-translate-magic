
// Message Handler for LocalTranslate

import { getTextNodes, highlightElement, removeHighlight } from './domUtils.js';
import { originalNodes, translatedNodes, setIsTranslating, reset } from './stateManager.js';

// Send a ping to check if extension is connected
function sendPingToExtension() {
  try {
    chrome.runtime.sendMessage({ action: "ping" }, (response) => {
      if (chrome.runtime.lastError) {
        console.log("Cannot reach extension background script:", chrome.runtime.lastError);
      } else {
        console.log("Extension background script connected");
      }
    });
  } catch (error) {
    console.error("Error sending ping to extension:", error);
  }
}

// Handle messages from the extension
function setupMessageListeners() {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Content script received message:", request.action);
    
    // Ping to check if content script is running
    if (request.action === "ping") {
      sendResponse({ status: "alive" });
      return true;
    }
    
    // Get all text content from the page
    if (request.action === "getPageContent") {
      try {
        if (setIsTranslating(true)) {
          const textNodes = getTextNodes();
          
          if (textNodes.length === 0) {
            sendResponse({ error: "No translatable text found on this page" });
          } else {
            sendResponse({ textNodes });
          }
          
          setIsTranslating(false);
        } else {
          sendResponse({ error: "Translation already in progress" });
        }
      } catch (error) {
        console.error("Error getting page content:", error);
        sendResponse({ error: error.message });
        setIsTranslating(false);
      }
      return true;
    }
    
    // Replace a specific text node with translated text
    if (request.action === "replaceText") {
      try {
        const { nodeId, translatedText } = request;
        const originalNode = originalNodes.get(nodeId);
        
        if (originalNode && originalNode.node) {
          originalNode.node.textContent = translatedText;
          translatedNodes.set(nodeId, translatedText);
          highlightElement(originalNode.node);
          sendResponse({ success: true });
        } else {
          console.warn(`Node ${nodeId} not found for replacement`);
          sendResponse({ error: `Node ${nodeId} not found` });
        }
      } catch (error) {
        console.error("Error replacing text:", error);
        sendResponse({ error: error.message });
      }
      return true;
    }
    
    // Restore original text
    if (request.action === "restoreOriginal") {
      try {
        originalNodes.forEach((original, nodeId) => {
          if (original.node) {
            original.node.textContent = original.text;
            removeHighlight(original.node);
          }
        });
        translatedNodes.clear();
        sendResponse({ status: "Original text restored" });
      } catch (error) {
        console.error("Error restoring original text:", error);
        sendResponse({ error: error.message });
      }
      return true;
    }
    
    return true;
  });
}

export {
  sendPingToExtension,
  setupMessageListeners
};
