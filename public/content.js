// Content script for LocalTranslate Chrome extension

// Keep track of original text nodes to restore later if needed
let originalNodes = new Map();
let translatedNodes = new Map();
let nodeCounter = 0;

// Helper function to get all text nodes in the document
function getTextNodes() {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        // Skip script and style elements
        if (
          node.parentNode.tagName === 'SCRIPT' ||
          node.parentNode.tagName === 'STYLE' ||
          node.parentNode.tagName === 'NOSCRIPT' ||
          node.textContent.trim() === ''
        ) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  const textNodes = [];
  let node;
  while (node = walker.nextNode()) {
    // Only include nodes with meaningful content
    if (node.textContent.trim().length > 0) {
      const nodeId = `ln-${nodeCounter++}`;
      originalNodes.set(nodeId, {
        node,
        text: node.textContent
      });
      
      textNodes.push({
        id: nodeId,
        text: node.textContent
      });
    }
  }
  
  return textNodes;
}

// Listen for messages from the popup or background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Get all text content from the page
  if (request.action === "getPageContent") {
    try {
      const textNodes = getTextNodes();
      sendResponse({ textNodes });
    } catch (error) {
      console.error("Error getting page content:", error);
      sendResponse({ error: error.message });
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
});

// Initialize the extension state on the page
console.log("LocalTranslate content script loaded");

// Add a custom style for translated elements
const style = document.createElement('style');
style.textContent = `
  .local-translate-highlight {
    background-color: rgba(37, 99, 235, 0.1);
    transition: background-color 0.3s ease;
  }
`;
document.head.appendChild(style);
