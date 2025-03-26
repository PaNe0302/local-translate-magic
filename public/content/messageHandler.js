
// Message Handler for LocalTranslate

// Simple utility to safely post messages from the page context
function safePostMessage(message) {
  try {
    window.postMessage({
      type: 'FROM_PAGE_SCRIPT',
      message: message
    }, '*');
  } catch (error) {
    console.error('Error posting message:', error);
  }
}

// Function to send a ping to check if the extension is available
function sendPingToExtension() {
  if (window.chrome && chrome.runtime && chrome.runtime.sendMessage) {
    chrome.runtime.sendMessage({ action: 'ping' }, function(response) {
      console.log('Ping response:', response);
    });
  } else {
    // For page context, use postMessage
    safePostMessage({ action: 'ping' });
  }
}

// Set up listeners for messages from the content script
function setupMessageListeners() {
  // Listen for messages from the content script
  window.addEventListener('message', function(event) {
    // Only accept messages from the same frame
    if (event.source !== window) return;
    
    // Check if this is our message
    if (event.data && event.data.type === 'FROM_CONTENT_SCRIPT') {
      console.log('Page script received message from content script:', event.data);
      
      // Process the message based on its action
      const message = event.data.message;
      if (message && message.action) {
        // Handle different actions here
        // For now, just send a generic response
        safePostMessage({ 
          action: 'responseFromPage',
          data: 'Message received by page script: ' + message.action
        });
      }
    }
  });
  
  // Notify that the page script is ready
  safePostMessage({ action: 'pageScriptReady' });
}

// Export functions for use in other modules
// These can be used directly in the page context
// but we use module pattern for cleaner code organization
window.LocalTranslate = window.LocalTranslate || {};
window.LocalTranslate.messageHandler = {
  sendPingToExtension: sendPingToExtension,
  setupMessageListeners: setupMessageListeners
};

// Auto-init if running directly in a page
if (typeof document !== 'undefined') {
  console.log('LocalTranslate message handler loaded');
  setupMessageListeners();
}
