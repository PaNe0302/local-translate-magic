
// DOM Utilities for LocalTranslate

import { originalNodes, translatedNodes, nodeCounter, setAlreadyInjected, getAlreadyInjected } from './stateManager.js';

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

// Function to safely inject styles and track injection status
async function injectStyles() {
  if (getAlreadyInjected()) return;
  
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
    
    setAlreadyInjected(true);
    console.log("LocalTranslate styles injected successfully");
    return true;
  } catch (error) {
    console.error("Failed to inject styles:", error);
    return false;
  }
}

export { 
  getTextNodes,
  highlightElement,
  removeHighlight,
  injectStyles
};
