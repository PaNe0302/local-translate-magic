
// Content script for LocalTranslate Chrome extension
import { getTextNodes, highlightElement, removeHighlight, injectStyles } from './content/domUtils.js';
import { sendPingToExtension, setupMessageListeners } from './content/messageHandler.js';
import { 
  originalNodes, 
  translatedNodes, 
  nodeCounter, 
  setIsTranslating,
  getIsTranslating,
  reset
} from './content/stateManager.js';

// Try to inject styles immediately
(async function init() {
  try {
    await injectStyles();
    console.log("LocalTranslate styles injected successfully");
    
    // Execute ping after styles are injected
    setTimeout(sendPingToExtension, 1000);
    
    // Set up message listeners
    setupMessageListeners();
    
    console.log("LocalTranslate content script ready");
  } catch (error) {
    console.error("Error initializing content script:", error);
  }
})();
