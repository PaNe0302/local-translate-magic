
// Background script for LocalTranslate Chrome extension

// Function to inject content script more reliably
async function injectContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    });
    console.log('Content script injected successfully into tab:', tabId);
    return true;
  } catch (error) {
    console.error('Failed to inject content script:', error);
    return false;
  }
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('LocalTranslate extension installed');
  
  // Create context menu item
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
});

// Listen for messages from the content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "translatePage") {
    // Notify the active tab to start translation
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs && tabs[0] && tabs[0].id) {
        try {
          // First ensure the content script is loaded
          const injected = await injectContentScript(tabs[0].id);
          
          // Give the content script a moment to initialize
          setTimeout(() => {
            chrome.tabs.sendMessage(tabs[0].id, { action: "getPageContent" }, response => {
              if (chrome.runtime.lastError) {
                console.error('Message sending error:', chrome.runtime.lastError);
                sendResponse({ 
                  error: chrome.runtime.lastError.message,
                  details: "Could not communicate with the page. This might be due to security restrictions."
                });
              } else {
                // Pass the response back to whoever requested the translation
                sendResponse(response);
              }
            });
          }, 500);
        } catch (error) {
          console.error('Script injection error:', error);
          sendResponse({ 
            error: 'Failed to inject content script',
            details: error.message
          });
        }
      } else {
        sendResponse({ error: 'No active tab found' });
      }
    });
    return true; // Keep the message channel open for the async response
  }
  
  return true;
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
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
});

// Listen for connections from content scripts
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "content-script") {
    port.onMessage.addListener((message) => {
      console.log("Received message from content script:", message);
      // Process messages as needed
    });
  }
});
