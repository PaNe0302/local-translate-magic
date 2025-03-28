
/**
 * Handles retrieval of content from tabs
 */

/**
 * Gets page content from a tab
 * @param {number} tabId - The ID of the tab to get content from
 * @returns {Promise<any>} - The page content
 */
export async function getPageContent(tabId) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, { action: "getPageContent" }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else if (!response) {
        reject(new Error('No response received from content script'));
      } else {
        resolve(response);
      }
    });
  });
}
