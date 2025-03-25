
// Content Script Injector for LocalTranslate

/**
 * Injects the content script into a tab
 * @param {number} tabId - The ID of the tab to inject the script into
 * @returns {Promise<boolean>} - Whether the injection was successful
 */
async function injectContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    });
    console.log('Content script injected successfully into tab:', tabId);
    return true;
  } catch (error) {
    console.error('Failed to inject content script:', error);
    return false;
  }
}

export {
  injectContentScript
};
