
// Content script for LocalTranslate Chrome extension

// Import modules
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
injectStyles();

// Execute ping on content script load
setTimeout(sendPingToExtension, 1000);

// Set up message listeners
setupMessageListeners();

// Inform that content script is ready
console.log("LocalTranslate content script ready");
