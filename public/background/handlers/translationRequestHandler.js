
// Handlers for translation requests in the background script
import { translationApi } from '../../../src/services/translationApi.js';
import { handleTranslationProgress } from './translationProgressHandler.js';

/**
 * Handle translate page request
 * @param {Object} request - The request message
 * @param {Function} sendResponse - Function to send response back to the sender
 */
export async function handleTranslatePageRequest(request, sendResponse) {
  try {
    // Get the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs || !tabs.length || !tabs[0] || !tabs[0].id) {
        sendResponse({ 
          error: 'No active tab found',
          status: "error"
        });
        return;
      }
      
      const tabId = tabs[0].id;
      
      try {
        // Import dynamically to avoid circular dependencies
        const { ensureContentScript, getPageContent } = await import('../contentInjectionHandler.js');
        
        // Ensure content script is injected
        await ensureContentScript(tabId);
        
        // Get page content
        try {
          const content = await getPageContent(tabId);
          sendResponse(content);
        } catch (contentError) {
          sendResponse({ 
            error: contentError.message,
            status: "error"
          });
        }
      } catch (injectionError) {
        sendResponse({ 
          error: injectionError.message,
          status: "error"
        });
      }
    });
  } catch (error) {
    console.error('Error handling translate page request:', error);
    sendResponse({ 
      error: 'Failed to process translate page request',
      details: error.message,
      status: "error"
    });
  }
}

/**
 * Handle translate selection request
 * @param {Object} request - The request message
 * @param {Function} sendResponse - Function to send response back to the sender
 */
export function handleTranslateSelectionRequest(request, sendResponse) {
  try {
    if (!request.text) {
      sendResponse({ 
        error: 'No text selected',
        status: "error" 
      });
      return;
    }
    
    // Just pass the selected text back to the popup for now
    sendResponse({ 
      text: request.text,
      status: "success" 
    });
  } catch (error) {
    console.error('Error handling translate selection request:', error);
    sendResponse({ 
      error: 'Failed to process translate selection request',
      details: error.message,
      status: "error"
    });
  }
}
