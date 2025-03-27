
// Ping Handler for LocalTranslate background script

/**
 * Handle ping requests from popup or content script
 * @param {Object} request - The request message
 * @param {Function} sendResponse - Function to send response back to the sender
 */
export function handlePingRequest(sendResponse) {
  sendResponse({ status: "alive" });
}

/**
 * Handle content script ready notification
 * @param {Object} sender - The sender of the message
 * @param {Function} sendResponse - Function to send response back to the sender
 */
export function handleContentScriptReadyNotification(sender, sendResponse) {
  console.log("Content script is ready in tab:", sender.tab ? sender.tab.id : "unknown tab");
  sendResponse({ status: "acknowledged" });
}
