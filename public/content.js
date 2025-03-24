
// Content script for LocalTranslate Chrome extension

// Keep track of original text nodes to restore later if needed
let originalNodes = new Map();
let translatedNodes = new Map();
let nodeCounter = 0;
let isTranslating = false;

// Helper function to get all text nodes in the document
function getTextNodes() {
  console.log("Getting text nodes from page...");
  // Reset counter when getting new nodes
  nodeCounter = 0;
  originalNodes.clear();
  
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
          node.textContent.trim() === ''
        ) {
          return NodeFilter.FILTER_REJECT;
        }
        
        // Skip very short text (likely not meaningful content)
        if (node.textContent.trim().length < 2) {
          return NodeFilter.FILTER_REJECT;
        }
        
        // Skip hidden elements
        const style = window.getComputedStyle(node.parentNode);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
          return NodeFilter.FILTER_REJECT;
        }
        
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  const textNodes = [];
  let node;
  
  try {
    while ((node = walker.nextNode())) {
      // Only include nodes with meaningful content
      if (node.textContent.trim().length > 0) {
        const nodeId = `ln-${nodeCounter++}`;
        
        // Store original node and text
        originalNodes.set(nodeId, {
          node,
          text: node.textContent
        });
        
        // Add to result
        textNodes.push({
          id: nodeId,
          text: node.textContent
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
    node.parentNode.classList.add('local-translate-highlight');
  }
}

// Remove highlight
function removeHighlight(node) {
  if (node && node.parentNode) {
    node.parentNode.classList.remove('local-translate-highlight');
  }
}

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
      } else {
        console.warn(`Node ${nodeId} not found for replacement`);
      }
    } catch (error) {
      console.error("Error replacing text:", error);
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

// Initialize the extension state on the page
console.log("LocalTranslate content script loaded");

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
