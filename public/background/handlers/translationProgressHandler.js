
// Handler for translation progress updates
/**
 * Handles translation progress updates and notifications
 * @param {number} tabId - The tab ID where translation is happening
 * @param {number} completed - Number of completed translations
 * @param {number} total - Total number of translations
 */
export function handleTranslationProgress(tabId, completed, total) {
  chrome.runtime.sendMessage({
    action: "translationProgress",
    completed,
    total,
    tabId: tabId
  }).catch(err => console.error('Failed to send progress update:', err));
}

/**
 * Handles translation completion notification
 * @param {number} tabId - The tab ID where translation completed
 * @param {number} completed - Number of completed translations
 * @param {number} total - Total number of translations
 * @param {number} failed - Number of failed translations
 */
export function handleTranslationComplete(tabId, completed, total, failed) {
  chrome.runtime.sendMessage({
    action: "translationComplete",
    completed,
    total,
    failed,
    tabId: tabId
  }).catch(err => console.error('Failed to send completion notification:', err));
}

/**
 * Handles translation error notification
 * @param {number} tabId - The tab ID where translation failed
 * @param {string} error - Error message
 */
export function handleTranslationError(tabId, error) {
  chrome.runtime.sendMessage({
    action: "translationError",
    error,
    tabId: tabId
  }).catch(err => console.error('Failed to send error notification:', err));
}
