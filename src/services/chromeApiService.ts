
/**
 * Service for interacting with the Chrome extension API
 */

// Import the Tab interface from our type definitions
import type { Tab } from '../types/chrome.d.ts';

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
  public async getActiveTab(): Promise<Tab> {
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
      // First try to ping the content script to see if it's already loaded
      await this.pingContentScript(tabId);
      console.log('Content script already loaded in tab:', tabId);
    } catch (error) {
      console.log('Content script not detected, injecting...');
      // If ping fails, inject the content script
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['content.js']
        });
        console.log('Content script injected successfully into tab:', tabId);
        
        // Give content script time to initialize and set up message listeners
        await new Promise(resolve => setTimeout(resolve, this.timeout));
      } catch (injectError) {
        console.error('Failed to inject content script:', injectError);
        throw new Error(`Failed to inject content script: ${injectError instanceof Error ? injectError.message : String(injectError)}`);
      }
    }
  }

  /**
   * Pings the content script to check if it's loaded
   */
  private async pingContentScript(tabId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Content script ping timed out'));
      }, this.timeout);

      chrome.tabs.sendMessage(
        tabId,
        { action: 'ping' },
        (response) => {
          clearTimeout(timeoutId);
          if (chrome.runtime?.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response && response.status === 'alive') {
            resolve();
          } else {
            reject(new Error('Content script not responding'));
          }
        }
      );
    });
  }

  /**
   * Sends a message to the content script in the specified tab
   */
  public async sendMessage<T>(tabId: number, message: any): Promise<T> {
    if (!this.isAvailable()) {
      throw new Error('Chrome API not available');
    }

    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Message sending timed out'));
      }, this.timeout * 2); // Double timeout for message operation

      chrome.tabs.sendMessage(
        tabId,
        message,
        (response) => {
          clearTimeout(timeoutId);
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

  /**
   * Sends a message to the background script
   */
  public async sendBackgroundMessage<T>(message: any): Promise<T> {
    if (!this.isAvailable()) {
      throw new Error('Chrome API not available');
    }

    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Background message sending timed out'));
      }, this.timeout * 2);

      chrome.runtime.sendMessage(
        message,
        (response) => {
          clearTimeout(timeoutId);
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

  /**
   * Updates the timeout value
   */
  public setTimeout(timeout: number): void {
    this.timeout = timeout;
  }

  /**
   * Gets the current timeout value
   */
  public getTimeout(): number {
    return this.timeout;
  }
}

export const chromeApiService = new ChromeApiService();
