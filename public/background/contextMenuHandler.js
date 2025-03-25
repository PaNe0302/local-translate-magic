
// Context Menu Handler for LocalTranslate

/**
 * Sets up context menu items for the extension
 */
function setupContextMenus() {
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
}

/**
 * Handle clicks on context menu items
 */
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

export {
  setupContextMenus,
  handleContextMenuClick
};
