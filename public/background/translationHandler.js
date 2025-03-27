
// Translation Handler for LocalTranslate background script
import { translationApi } from '../../src/services/translationApi.js';

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
    
    // Process in batches to avoid memory issues
    const batchSize = 10;
    const concurrencyLimit = 3;
    let completedCount = 0;
    let failedCount = 0;
    
    // Group by length for more efficient processing
    const groupedNodes = groupNodesByLength(validNodes);
    
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
    
    // Process each group
    for (const group of groupedNodes) {
      if (abortController.signal.aborted) {
        break;
      }
      
      for (let i = 0; i < group.length; i += batchSize) {
        if (abortController.signal.aborted) {
          break;
        }
        
        const batch = group.slice(i, i + batchSize);
        
        // Process each batch with limited concurrency
        for (let j = 0; j < batch.length; j += concurrencyLimit) {
          if (abortController.signal.aborted) {
            break;
          }
          
          const concurrentBatch = batch.slice(j, j + concurrencyLimit);
          
          const promises = concurrentBatch.map(async (node) => {
            try {
              if (abortController.signal.aborted) {
                throw new DOMException("Translation aborted", "AbortError");
              }
              
              const response = await translationApi.translateText({
                text: node.text,
                target_language: targetLanguage,
              });
              
              if (response.translatedText) {
                await replaceText(activeTabId, node.id, response.translatedText);
                completedCount++;
                
                // Update progress
                if (completedCount % 5 === 0 || completedCount === validNodes.length) {
                  updateProgress(completedCount, validNodes.length);
                }
              } else {
                failedCount++;
              }
            } catch (error) {
              console.error(`Failed to translate node ${node.id}:`, error);
              failedCount++;
            }
          });
          
          // Wait for concurrent batch to complete before starting next
          await Promise.all(promises);
        }
      }
    }
    
    // Send completion notification
    chrome.runtime.sendMessage({
      action: "translationComplete",
      completed: completedCount,
      total: validNodes.length,
      failed: failedCount,
      tabId: activeTabId
    }).catch(err => console.error('Failed to send completion notification:', err));
    
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
 * Group nodes by text length
 */
function groupNodesByLength(nodes) {
  // Create 3 groups: short, medium, and long text
  const shortTexts = [];
  const mediumTexts = [];
  const longTexts = [];
  
  nodes.forEach(node => {
    const length = node.text.length;
    if (length < 50) {
      shortTexts.push(node);
    } else if (length < 200) {
      mediumTexts.push(node);
    } else {
      longTexts.push(node);
    }
  });
  
  // Process short texts first, then medium, then long
  return [shortTexts, mediumTexts, longTexts].filter(group => group.length > 0);
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
