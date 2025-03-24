
// Background script for LocalTranslate Chrome extension

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
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0] && tabs[0].id) {
        // Ensure the content script is loaded
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          files: ['content.js']
        }, () => {
          if (chrome.runtime.lastError) {
            console.error('Script injection error:', chrome.runtime.lastError);
          } else {
            // Give the content script a moment to initialize
            setTimeout(() => {
              chrome.tabs.sendMessage(tabs[0].id, { action: "getPageContent" });
            }, 300);
          }
        });
      }
    });
    sendResponse({ status: "Translation initiated" });
  }
  return true;
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "translate-selection") {
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
