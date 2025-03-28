
// Main content script implementation
import { 
  setupMessageBridge, 
  handleGetPageContent,
  handleReplaceText,
  handleRestoreOriginal
} from './messageHandlers.js';

import { injectStyles } from './domUtils.js';
import { setAlreadyInjected } from './stateManager.js';

/**
 * Initializes the content script
 */
export function setupContentScript() {
  console.log("LocalTranslate content script starting");
  
  try {
    // Inject styles immediately
    injectStyles();
    
    // Set up message bridge with the extension
    setupMessageBridge();
    
    // Notify that content script is ready
    chrome.runtime.sendMessage({ action: "contentScriptReady" }, function(response) {
      console.log("Background notified of content script ready:", response);
    });
    
    console.log("LocalTranslate content script initialized successfully");
  } catch (error) {
    console.error("Error initializing content script:", error);
  }
}
