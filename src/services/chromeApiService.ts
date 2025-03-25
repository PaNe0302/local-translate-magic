
/**
 * Service for interacting with the Chrome extension API
 */
// This is necessary to ensure TypeScript recognizes the chrome namespace
/// <reference path="../types/chrome.d.ts" />

interface ChromeApiOptions {
  timeout?: number;
}

class ChromeApiService {
  private timeout: number;

  constructor(options: ChromeApiOptions = {}) {
    this.timeout = options.timeout || 500;
  }

  /**
   * Checks if Chrome API is available
   */
  public isAvailable(): boolean {
    return typeof chrome !== 'undefined';
  }

  /**
   * Gets the active tab
   */
  public async getActiveTab(): Promise<chrome.tabs.Tab> {
    if (!this.isAvailable()) {
      throw new Error('Chrome API not available');
    }

    return new Promise((resolve, reject) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime?.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (!tabs || tabs.length === 0 || !tabs[0].id) {
          reject(new Error('No active tab found'));
        } else {
          resolve(tabs[0]);
        }
      });
    });
  }

  /**
   * Ensures the content script is injected into the active tab
   */
  public async ensureContentScript(tabId: number): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Chrome API not available');
    }

    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
      });
    } catch (error) {
      console.warn('Content script may already be loaded:', error);
    }

    // Give content script some time to initialize
    await new Promise(resolve => setTimeout(resolve, this.timeout));
  }

  /**
   * Sends a message to the content script in the specified tab
   */
  public async sendMessage<T>(tabId: number, message: any): Promise<T> {
    if (!this.isAvailable()) {
      throw new Error('Chrome API not available');
    }

    return new Promise<T>((resolve, reject) => {
      chrome.tabs.sendMessage(
        tabId,
        message,
        (response) => {
          if (chrome.runtime?.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response && response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response);
          }
        }
      );
    });
  }
}

export const chromeApiService = new ChromeApiService();
