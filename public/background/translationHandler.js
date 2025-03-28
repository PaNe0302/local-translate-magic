
// Translation Handler for LocalTranslate background script
import { translationApi } from '../../src/services/translationApi.js';
import { processBatchTranslation, groupNodesByLength } from '../../src/services/translation/translationProcessor.js';

let isTranslating = false;
let abortController = null;
let activeTabId = null;

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
        const { ensureContentScript, getPageContent } = await import('./contentInjectionHandler.js');
        
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
 * Handle start background translation request
 * @param {Object} request - The request message
 * @param {Function} sendResponse - Function to send response back to the sender
 */
export async function handleStartBackgroundTranslation(request, sendResponse) {
  if (isTranslating) {
    sendResponse({ 
      error: 'Translation already in progress',
      status: "error"
    });
    return;
  }
  
  try {
    isTranslating = true;
    abortController = new AbortController();
    
    // Get active tab ID
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || !tabs.length || !tabs[0] || !tabs[0].id) {
      throw new Error('No active tab found');
    }
    
    activeTabId = tabs[0].id;
    
    // Acknowledge the request
    sendResponse({ 
      status: "started",
      message: "Background translation started"
    });
    
    // Process the nodes
    const { nodes, targetLanguage } = request;
    
    if (!nodes || nodes.length === 0) {
      isTranslating = false;
      abortController = null;
      return;
    }
    
    // Filter out any problematic nodes
    const validNodes = nodes.filter(node => node && node.id && node.text);
    
    // Create a tab-specific handler for updating progress
    const updateProgress = (completed, total) => {
      chrome.runtime.sendMessage({
        action: "translationProgress",
        completed,
        total,
        tabId: activeTabId
      }).catch(err => console.error('Failed to send progress update:', err));
    };
    
    // Notify that we're starting
    updateProgress(0, validNodes.length);
    
    // Process the translation - using our refactored processor
    try {
      const { completedCount, failedCount } = await processBatchTranslation(
        validNodes, 
        targetLanguage, 
        abortController
      );
      
      // Send completion notification
      chrome.runtime.sendMessage({
        action: "translationComplete",
        completed: completedCount,
        total: validNodes.length,
        failed: failedCount,
        tabId: activeTabId
      }).catch(err => console.error('Failed to send completion notification:', err));
      
    } catch (error) {
      // Handle translation errors
      if (error instanceof DOMException && error.name === 'AbortError') {
        // This is a cancellation, handled separately
      } else {
        // Notify of error
        chrome.runtime.sendMessage({
          action: "translationError",
          error: error.message,
          tabId: activeTabId
        }).catch(err => console.error('Failed to send error notification:', err));
      }
    }
    
  } catch (error) {
    console.error('Error in background translation:', error);
    // Notify of error
    chrome.runtime.sendMessage({
      action: "translationError",
      error: error.message,
      tabId: activeTabId
    }).catch(err => console.error('Failed to send error notification:', err));
  } finally {
    isTranslating = false;
    abortController = null;
    activeTabId = null;
  }
}

/**
 * Replace text in the content script
 */
async function replaceText(tabId, nodeId, translatedText) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(
      tabId,
      { 
        action: 'replaceText',
        nodeId,
        translatedText
      },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response && response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      }
    );
  });
}

/**
 * Handle cancel translation request
 */
export function handleCancelTranslation() {
  if (isTranslating && abortController) {
    abortController.abort();
    isTranslating = false;
    
    // Notify that translation was cancelled
    chrome.runtime.sendMessage({
      action: "translationCancelled",
      tabId: activeTabId
    }).catch(err => console.error('Failed to send cancellation notification:', err));
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
