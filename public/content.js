
// Content script for LocalTranslate Chrome extension

// We need to use a different approach for content scripts
// This is a bootstrapper that will dynamically load our ES modules
(function() {
  console.log("LocalTranslate content script bootstrapper starting");
  
  // Helper function to dynamically load a script
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL(src);
      script.type = 'module';
      script.onload = () => {
        console.log(`Script ${src} loaded successfully`);
        resolve();
      };
      script.onerror = (error) => {
        console.error(`Error loading script ${src}:`, error);
        reject(error);
      };
      (document.head || document.documentElement).appendChild(script);
    });
  }
  
  // Create a custom event for communication between content script and page script
  function setupMessageBridge() {
    // Setup listener for messages from the page context
    window.addEventListener('message', function(event) {
      // Only accept messages from the same frame
      if (event.source !== window) return;
      
      // Check if this is our message
      if (event.data.type && event.data.type === 'FROM_PAGE_SCRIPT') {
        console.log('Content script received message from page script:', event.data);
        
        // Forward to background script
        chrome.runtime.sendMessage(event.data.message, function(response) {
          // Send response back to the page script
          window.postMessage({
            type: 'FROM_CONTENT_SCRIPT',
            message: response
          }, '*');
        });
      }
    });
    
    // Setup listener for messages from the extension
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
      console.log("Content script received message from extension:", request);
      
      // For simple ping, respond directly
      if (request.action === 'ping') {
        sendResponse({ status: 'alive' });
        return true;
      }
      
      // Forward message to page script
      window.postMessage({
        type: 'FROM_CONTENT_SCRIPT',
        message: request
      }, '*');
      
      // For other messages that need async response
      return true; // Keep the message channel open for async response
    });
  }
  
  // Initialize the content script
  async function init() {
    try {
      console.log("Setting up message bridge");
      setupMessageBridge();
      
      // Inject our main script into the page context
      console.log("Injecting main script");
      await loadScript('/content/pageScript.js');
      
      console.log("LocalTranslate content script initialized successfully");
    } catch (error) {
      console.error("Error initializing content script:", error);
    }
  }
  
  // Start initialization
  init();
})();
