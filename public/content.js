
// Content script for LocalTranslate Chrome extension

// Keep track of original text nodes to restore later if needed
let originalNodes = new Map();
let translatedNodes = new Map();
let nodeCounter = 0;
let isTranslating = false;
let alreadyInjected = false;

// Function to safely inject styles and track injection status
function injectStyles() {
  if (alreadyInjected) return;
  
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
    console.log("LocalTranslate content script loaded and styles injected");
  } catch (error) {
    console.error("Failed to inject styles:", error);
  }
}

// Try to inject styles immediately
injectStyles();

// Helper function to get all text nodes in the document
function getTextNodes() {
  console.log("Getting text nodes from page...");
  // Reset counter when getting new nodes
  nodeCounter = 0;
  originalNodes.clear();
  
  try {
    // Ensure styles are injected before proceeding
    injectStyles();
    
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
    
    while ((node = walker.nextNode())) {
      // Only include nodes with meaningful content
      if (node.textContent.trim().length > 0) {
        const nodeId = `ln-${nodeCounter++}`;
        
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

// Execute ping on content script load
setTimeout(sendPingToExtension, 1000);

// Listen for messages from the popup or background script
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
      if (isTranslating) {
        sendResponse({ error: "Translation already in progress" });
        return true;
      }
      
      isTranslating = true;
      const textNodes = getTextNodes();
      
      if (textNodes.length === 0) {
        sendResponse({ error: "No translatable text found on this page" });
      } else {
        sendResponse({ textNodes });
      }
      
      isTranslating = false;
    } catch (error) {
      console.error("Error getting page content:", error);
      sendResponse({ error: error.message });
      isTranslating = false;
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

// Inform that content script is ready
console.log("LocalTranslate content script ready");
