
// Context Menu Handler for LocalTranslate

/**
 * Sets up context menu items for the extension
 */
export function setupContextMenus() {
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

/**
 * Handle clicks on context menu items
 */
export function handleContextMenuClick(info, tab) {
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
