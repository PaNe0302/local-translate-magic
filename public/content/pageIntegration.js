
// Integration with the page context
import { 
  getTextNodes, 
  highlightElement, 
  removeHighlight, 
  injectStyles 
} from './domUtils.js';

import { 
  originalNodes, 
  translatedNodes, 
  setIsTranslating,
  getIsTranslating,
  reset
} from './stateManager.js';

/**
 * Sets up communication with the page context
 */
export function setupPageCommunication() {
  // Listen for messages from page script
  window.addEventListener('message', function(event) {
    // Only accept messages from the same frame
    if (event.source !== window) return;
    
    // Check if it's from our page script
    if (event.data && event.data.type === 'FROM_PAGE_SCRIPT') {
      console.log('Content script received message from page:', event.data.message);
      handlePageMessage(event.data.message);
    }
  });
  
  console.log('Page communication channel set up');
}

/**
 * Handle messages from the page context
 */
function handlePageMessage(message) {
  if (!message || !message.action) return;
  
  switch (message.action) {
    case 'pageScriptReady':
      console.log('Page script is ready');
      break;
    
    case 'getPageContentResponse':
      console.log('Received page content response');
      break;
    
    case 'replaceTextResponse':
      console.log('Received replace text response');
      break;
    
    case 'restoreOriginalResponse':
      console.log('Received restore original response');
      break;
      
    default:
      console.log('Unknown page message action:', message.action);
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
