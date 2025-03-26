
// Background script for LocalTranslate Chrome extension

// Context menu setup
function setupContextMenus() {
  try {
    // Create context menu item for selected text
    chrome.contextMenus.create({
      id: "translate-selection",
      title: "Translate selection with LocalTranslate",
      contexts: ["selection"]
    });
    
    // Create context menu item for translating the page
    chrome.contextMenus.create({
      id: "translate-page",
      title: "Translate this page with LocalTranslate",
      contexts: ["page"]
    });
  } catch (error) {
    console.error("Error setting up context menus:", error);
  }
}

// Handle clicks on context menu items
function handleContextMenuClick(info, tab) {
  if (info.menuItemId === "translate-selection" && info.selectionText) {
    // Send the selected text to the popup for translation
    chrome.runtime.sendMessage({
      action: "translateSelection",
      text: info.selectionText
    });
  } else if (info.menuItemId === "translate-page" && tab && tab.id) {
    // Tell the popup to translate the current page
    chrome.runtime.sendMessage({
      action: "translatePage"
    });
  }
}

// Set up message listeners
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Background script received message:", request ? request.action : "undefined message");
  
  if (!request) {
    console.error("Received empty message");
    sendResponse({ error: "Empty message received" });
    return true;
  }
  
  // Handle ping from popup or content script
  if (request.action === "ping") {
    sendResponse({ status: "alive" });
    return true;
  }
  
  // Handle content script ready notification
  if (request.action === "contentScriptReady") {
    console.log("Content script is ready in tab:", sender.tab ? sender.tab.id : "unknown tab");
    sendResponse({ status: "acknowledged" });
    return true;
  }
  
  // Handle translate page request from popup
  if (request.action === "translatePage") {
    handleTranslatePage(request, sendResponse);
    return true; // Keep the message channel open for the async response
  }
  
  // Handle translate selection request from context menu
  if (request.action === "translateSelection") {
    handleTranslateSelection(request, sendResponse);
    return true;
  }
  
  // Default response for unhandled actions
  console.warn("Unhandled message action:", request.action);
  sendResponse({ 
    error: `Unhandled message action: ${request.action}`,
    status: "error" 
  });
  
  return true;
});

// Handle translate page request
function handleTranslatePage(request, sendResponse) {
  try {
    // Get the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs.length || !tabs[0] || !tabs[0].id) {
        sendResponse({ 
          error: 'No active tab found',
          status: "error"
        });
        return;
      }
      
      const tabId = tabs[0].id;
      
      // Try pinging the content script first
      chrome.tabs.sendMessage(tabId, { action: 'ping' }, (pingResponse) => {
        if (chrome.runtime.lastError) {
          console.log('Content script not detected, will inject...');
          
          // Check if tab is injectable
          chrome.tabs.get(tabId, (tab) => {
            if (chrome.runtime.lastError || !tab.url) {
              sendResponse({ 
                error: 'Cannot access tab or URL',
                status: "error"
              });
              return;
            }
            
            // Check if URL is restricted
            if (tab.url.startsWith('chrome://') || 
                tab.url.startsWith('edge://') || 
                tab.url.startsWith('brave://') ||
                tab.url.startsWith('about:') || 
                tab.url.startsWith('chrome-extension://') ||
                tab.url.startsWith('moz-extension://')) {
              sendResponse({ 
                error: 'Cannot inject into restricted URL',
                status: "error"
              });
              return;
            }
            
            // Inject content script
            chrome.scripting.executeScript({
              target: { tabId },
              files: ['content.js']
            }, (injectionResults) => {
              if (chrome.runtime.lastError) {
                sendResponse({ 
                  error: `Injection failed: ${chrome.runtime.lastError.message}`,
                  status: "error"
                });
                return;
              }
              
              // Wait for content script to initialize
              setTimeout(() => {
                // Now that script is injected, get page content
                chrome.tabs.sendMessage(tabId, { action: "getPageContent" }, (response) => {
                  if (chrome.runtime.lastError) {
                    sendResponse({ 
                      error: chrome.runtime.lastError.message,
                      status: "error"
                    });
                  } else {
                    sendResponse(response || { 
                      error: 'No response received from content script',
                      status: "error"
                    });
                  }
                });
              }, 500); // Give content script time to initialize
            });
          });
        } else if (pingResponse && pingResponse.status === 'alive') {
          // Content script is already loaded, proceed with getPageContent request
          chrome.tabs.sendMessage(tabId, { action: "getPageContent" }, (response) => {
            if (chrome.runtime.lastError) {
              sendResponse({ 
                error: chrome.runtime.lastError.message,
                status: "error"
              });
            } else {
              sendResponse(response || { 
                error: 'No response received from content script',
                status: "error"
              });
            }
          });
        } else {
          sendResponse({ 
            error: 'Content script not responding correctly',
            status: "error"
          });
        }
      });
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

// Handle translate selection request
function handleTranslateSelection(request, sendResponse) {
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

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('LocalTranslate extension installed');
  
  // Setup context menus
  setupContextMenus();
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(handleContextMenuClick);
