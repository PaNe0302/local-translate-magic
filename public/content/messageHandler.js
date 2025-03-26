
// Message Handler for LocalTranslate

// Legacy functions kept for reference but reimplemented in content.js
function sendPingToExtension() {
  if (window.chrome && chrome.runtime && chrome.runtime.sendMessage) {
    chrome.runtime.sendMessage({ action: 'ping' }, function(response) {
      console.log('Ping response:', response);
    });
  } else {
    // For page context, use postMessage
    window.postMessage({
      type: 'FROM_PAGE_SCRIPT',
      message: { action: 'ping' }
    }, '*');
  }
}

function setupMessageListeners() {
  // Listen for messages from the content script
  window.addEventListener('message', function(event) {
    // Only accept messages from the same frame
    if (event.source !== window) return;
    
    // Check if this is our message
    if (event.data && event.data.type === 'FROM_CONTENT_SCRIPT') {
      console.log('Page script received message from content script:', event.data);
      
      // Process message here
      
      // Example response
      window.postMessage({
        type: 'FROM_PAGE_SCRIPT',
        message: { 
          action: 'responseFromPage',
          data: 'Message received by page script' 
        }
      }, '*');
    }
  });
  
  // Notify that the page script is ready
  window.postMessage({
    type: 'FROM_PAGE_SCRIPT',
    message: { action: 'pageScriptReady' }
  }, '*');
}

export {
  sendPingToExtension,
  setupMessageListeners
};
