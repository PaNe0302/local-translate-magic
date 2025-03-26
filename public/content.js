// Content script for LocalTranslate Chrome extension
(function() {
  console.log("LocalTranslate content script starting");
  
  // Setup message bridge between content script and page
  function setupMessageBridge() {
    // Listen for messages from the page
    window.addEventListener('message', function(event) {
      // Only accept messages from the same frame
      if (event.source !== window) return;
      
      // Check if it's our message
      if (event.data && event.data.type === 'FROM_PAGE_SCRIPT') {
        console.log('Content script received message from page:', event.data);
        
        // Forward to the extension background
        chrome.runtime.sendMessage(event.data.message, function(response) {
          if (chrome.runtime.lastError) {
            console.error('Error sending message to background:', chrome.runtime.lastError);
            return;
          }
          
          // Send response back to the page script
          window.postMessage({
            type: 'FROM_CONTENT_SCRIPT',
            message: response || { error: 'No response from background' }
          }, '*');
        });
      }
    });
    
    // Listen for messages from the extension background
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
      console.log("Content script received message from extension:", request);
      
      // For ping requests, respond immediately
      if (request && request.action === 'ping') {
        sendResponse({ status: 'alive' });
        return true;
      }
      
      // Forward message to page
      window.postMessage({
        type: 'FROM_CONTENT_SCRIPT',
        message: request
      }, '*');
      
      // Keep the message channel open for async response
      return true;
    });
  }
  
  // Inject the page script by appending it to the DOM
  function injectPageScript() {
    try {
      // Create script elements for each dependency
      const scripts = [
        { src: 'content/domUtils.js', type: 'text/javascript' },
        { src: 'content/stateManager.js', type: 'text/javascript' },
        { src: 'content/pageScript.js', type: 'text/javascript' }
      ];
      
      // Add each script to the page
      scripts.forEach(scriptInfo => {
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL(scriptInfo.src);
        script.type = scriptInfo.type;
        script.onload = function() {
          console.log(`Script ${scriptInfo.src} loaded successfully`);
          this.remove(); // Remove the script element once loaded
        };
        script.onerror = function(error) {
          console.error(`Error loading script ${scriptInfo.src}:`, error);
        };
        (document.head || document.documentElement).appendChild(script);
      });
      
      console.log("Page scripts injected");
    } catch (error) {
      console.error("Error injecting page script:", error);
    }
  }
  
  // Initialize content script
  function init() {
    console.log("Setting up message bridge");
    setupMessageBridge();
    
    console.log("Injecting page scripts");
    injectPageScript();
    
    // Notify that content script is ready
    chrome.runtime.sendMessage({ action: "contentScriptReady" });
  }
  
  // Start initialization
  init();
})();
