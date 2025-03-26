
// Content script for LocalTranslate Chrome extension
(function() {
  console.log("LocalTranslate content script starting");
  
  // Global state variables
  let originalNodes = new Map();
  let translatedNodes = new Map();
  let nodeCounter = 0;
  let isTranslating = false;
  let alreadyInjected = false;
  
  // Setup message bridge between content script and extension
  function setupMessageBridge() {
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
  
  // Helper function to get all text nodes in the document
  function getTextNodes() {
    console.log("Getting text nodes from page...");
    
    try {
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: function(node) {
            // Skip script, style, noscript elements and empty text
            if (
              !node.parentNode ||
              node.parentNode.tagName === 'SCRIPT' ||
              node.parentNode.tagName === 'STYLE' ||
              node.parentNode.tagName === 'NOSCRIPT' ||
              node.parentNode.tagName === 'META' ||
              node.parentNode.tagName === 'LINK' ||
              node.parentNode.tagName === 'TITLE' ||
              node.textContent.trim() === ''
            ) {
              return NodeFilter.FILTER_REJECT;
            }
            
            // Skip very short text (likely not meaningful content)
            if (node.textContent.trim().length < 2) {
              return NodeFilter.FILTER_REJECT;
            }
            
            // Skip hidden elements
            try {
              const style = window.getComputedStyle(node.parentNode);
              if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
                return NodeFilter.FILTER_REJECT;
              }
            } catch (e) {
              // Skip nodes with styling issues
              return NodeFilter.FILTER_REJECT;
            }
            
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );

      const textNodes = [];
      let node;
      let localNodeCounter = nodeCounter;
      
      while ((node = walker.nextNode())) {
        // Only include nodes with meaningful content
        if (node.textContent.trim().length > 0) {
          const nodeId = `ln-${localNodeCounter++}`;
          
          // Check if content is already likely to be translated
          const isAlreadyTranslated = translatedNodes.has(nodeId);
          
          // Store original node and text
          originalNodes.set(nodeId, {
            node,
            text: node.textContent
          });
          
          // Add to result
          textNodes.push({
            id: nodeId,
            text: node.textContent,
            isAlreadyTranslated
          });
        }
      }
      
      console.log(`Found ${textNodes.length} text nodes`);
      return textNodes;
    } catch (error) {
      console.error("Error walking DOM:", error);
      return [];
    }
  }
  
  // Injects styles for highlighting translated elements
  function injectStyles() {
    if (alreadyInjected) return true;
    
    try {
      // Add a custom style for translated elements
      const style = document.createElement('style');
      style.textContent = `
        .local-translate-highlight {
          background-color: rgba(255, 255, 0, 0.15);
          border-radius: 2px;
          transition: background-color 0.3s ease;
        }
        
        .local-translate-highlight:hover {
          background-color: rgba(255, 255, 0, 0.3);
        }
      `;
      document.head.appendChild(style);
      
      alreadyInjected = true;
      console.log("LocalTranslate styles injected successfully");
      return true;
    } catch (error) {
      console.error("Failed to inject styles:", error);
      return false;
    }
  }
  
  // Highlight translated elements for better visibility
  function highlightElement(node) {
    if (node && node.parentNode) {
      try {
        node.parentNode.classList.add('local-translate-highlight');
      } catch (e) {
        console.warn("Could not highlight node:", e);
      }
    }
  }
  
  // Remove highlight
  function removeHighlight(node) {
    if (node && node.parentNode) {
      try {
        node.parentNode.classList.remove('local-translate-highlight');
      } catch (e) {
        console.warn("Could not remove highlight from node:", e);
      }
    }
  }
  
  // Handle get page content request
  function handleGetPageContent(sendResponse) {
    try {
      if (isTranslating) {
        sendResponse({
          error: "Translation already in progress",
          status: "error"
        });
        return;
      }
      
      isTranslating = true;
      injectStyles();
      
      const textNodes = getTextNodes();
      
      isTranslating = false;
      
      sendResponse({
        textNodes: textNodes.length > 0 ? textNodes : [],
        error: textNodes.length === 0 ? "No translatable text found on this page" : null,
        status: textNodes.length > 0 ? "success" : "error"
      });
    } catch (error) {
      console.error("Error getting page content:", error);
      isTranslating = false;
      
      sendResponse({
        error: error.message || "Unknown error getting page content",
        status: "error"
      });
    }
  }
  
  // Handle replace text request
  function handleReplaceText(request, sendResponse) {
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
  
  // Handle restore original request
  function handleRestoreOriginal(sendResponse) {
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
  
  // Initialize content script
  function init() {
    console.log("Setting up message bridge");
    setupMessageBridge();
    
    // Notify that content script is ready
    chrome.runtime.sendMessage({ action: "contentScriptReady" }, function(response) {
      console.log("Background notified of content script ready:", response);
    });
  }
  
  // Start initialization
  init();
})();
