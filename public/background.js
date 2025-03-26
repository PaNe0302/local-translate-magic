
// Background script for LocalTranslate Chrome extension
import { setupContextMenus, handleContextMenuClick } from './background/contextMenuHandler.js';
import { setupMessageListeners } from './background/messageHandler.js';

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('LocalTranslate extension installed');
  
  // Setup context menus
  setupContextMenus();
});

// Set up message listeners
setupMessageListeners();

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(handleContextMenuClick);
