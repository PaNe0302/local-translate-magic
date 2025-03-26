
// This script runs in the page context
// It communicates with the content script via window.postMessage

import { getTextNodes, highlightElement, removeHighlight, injectStyles } from './domUtils.js';
import { 
  originalNodes, 
  translatedNodes, 
  nodeCounter, 
  setIsTranslating,
  getIsTranslating,
  reset
} from './stateManager.js';

// Setup communication with content script
function setupPageToContentCommunication() {
  // Listen for messages from content script
  window.addEventListener('message', function(event) {
    // Only accept messages from the same frame
    if (event.source !== window) return;
    
    // Check if it's from our content script
    if (event.data.type && event.data.type === 'FROM_CONTENT_SCRIPT') {
      const request = event.data.message;
      console.log('Page script received message:', request);
      
      // Handle different actions
      if (request.action === 'getPageContent') {
        handleGetPageContent();
      } else if (request.action === 'replaceText') {
        handleReplaceText(request);
      } else if (request.action === 'restoreOriginal') {
        handleRestoreOriginal();
      }
    }
  });
}

// Handle get page content request
function handleGetPageContent() {
  try {
    if (setIsTranslating(true)) {
      const textNodes = getTextNodes();
      
      // Send response back to content script
      window.postMessage({
        type: 'FROM_PAGE_SCRIPT',
        message: {
          action: 'getPageContentResponse',
          textNodes: textNodes.length > 0 ? textNodes : [],
          error: textNodes.length === 0 ? "No translatable text found on this page" : null
        }
      }, '*');
      
      setIsTranslating(false);
    } else {
      window.postMessage({
        type: 'FROM_PAGE_SCRIPT',
        message: {
          action: 'getPageContentResponse',
          error: "Translation already in progress"
        }
      }, '*');
    }
  } catch (error) {
    console.error("Error getting page content:", error);
    window.postMessage({
      type: 'FROM_PAGE_SCRIPT',
      message: {
        action: 'getPageContentResponse',
        error: error.message
      }
    }, '*');
    setIsTranslating(false);
  }
}

// Handle replace text request
function handleReplaceText(request) {
  try {
    const { nodeId, translatedText } = request;
    const originalNode = originalNodes.get(nodeId);
    
    if (originalNode && originalNode.node) {
      originalNode.node.textContent = translatedText;
      translatedNodes.set(nodeId, translatedText);
      highlightElement(originalNode.node);
      
      window.postMessage({
        type: 'FROM_PAGE_SCRIPT',
        message: {
          action: 'replaceTextResponse',
          success: true
        }
      }, '*');
    } else {
      console.warn(`Node ${nodeId} not found for replacement`);
      window.postMessage({
        type: 'FROM_PAGE_SCRIPT',
        message: {
          action: 'replaceTextResponse',
          error: `Node ${nodeId} not found`
        }
      }, '*');
    }
  } catch (error) {
    console.error("Error replacing text:", error);
    window.postMessage({
      type: 'FROM_PAGE_SCRIPT',
      message: {
        action: 'replaceTextResponse',
        error: error.message
      }
    }, '*');
  }
}

// Handle restore original request
function handleRestoreOriginal() {
  try {
    originalNodes.forEach((original, nodeId) => {
      if (original.node) {
        original.node.textContent = original.text;
        removeHighlight(original.node);
      }
    });
    translatedNodes.clear();
    
    window.postMessage({
      type: 'FROM_PAGE_SCRIPT',
      message: {
        action: 'restoreOriginalResponse',
        status: "Original text restored"
      }
    }, '*');
  } catch (error) {
    console.error("Error restoring original text:", error);
    window.postMessage({
      type: 'FROM_PAGE_SCRIPT',
      message: {
        action: 'restoreOriginalResponse',
        error: error.message
      }
    }, '*');
  }
}

// Initialize the page script
async function init() {
  try {
    console.log("Page script starting");
    
    // Inject styles
    await injectStyles();
    console.log("LocalTranslate styles injected successfully");
    
    // Setup communication
    setupPageToContentCommunication();
    
    // Send a ready message
    window.postMessage({
      type: 'FROM_PAGE_SCRIPT',
      message: {
        action: 'pageScriptReady'
      }
    }, '*');
    
    console.log("LocalTranslate page script ready");
  } catch (error) {
    console.error("Error initializing page script:", error);
  }
}

// Start initialization
init();
