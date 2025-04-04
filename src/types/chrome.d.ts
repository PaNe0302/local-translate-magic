
// Type definitions for Chrome extension API

interface Chrome {
  runtime: {
    onInstalled: {
      addListener: (callback: () => void) => void;
    };
    onMessage: {
      addListener: (
        callback: (
          message: any,
          sender: any,
          sendResponse: (response?: any) => void
        ) => boolean | void
      ) => void;
      removeListener: (
        callback: (
          message: any,
          sender: any,
          sendResponse: (response?: any) => void
        ) => boolean | void
      ) => void;
    };
    sendMessage: (message: any, callback?: (response: any) => void) => void;
    lastError?: {
      message: string;
    };
    onConnect: {
      addListener: (port: any) => void;
    };
  };
  tabs: {
    query: (
      queryInfo: {
        active?: boolean;
        currentWindow?: boolean;
      },
      callback: (tabs: Tab[]) => void
    ) => void;
    sendMessage: (
      tabId: number,
      message: any,
      callback?: (response: any) => void
    ) => void;
    Tab: any; // Explicitly adding Tab interface reference
  };
  scripting: {
    executeScript: (params: {
      target: { tabId: number };
      files?: string[];
      func?: () => void;
      args?: any[];
    }) => Promise<any>;
  };
  contextMenus: {
    create: (
      createProperties: {
        id: string;
        title: string;
        contexts: string[];
      },
      callback?: () => void
    ) => void;
    onClicked: {
      addListener: (
        callback: (
          info: {
            menuItemId: string;
            selectionText?: string;
          },
          tab?: any
        ) => void
      ) => void;
    };
  };
  storage: {
    local: {
      get: (keys: string | string[] | null, callback: (items: { [key: string]: any }) => void) => void;
      set: (items: { [key: string]: any }, callback?: () => void) => void;
      remove: (keys: string | string[], callback?: () => void) => void;
    };
  };
}

// Define Tab interface explicitly and make it available globally
interface Tab {
  id?: number;
  url?: string;
  title?: string;
  active: boolean;
  index: number;
  windowId: number;
  highlighted: boolean;
  incognito: boolean;
  selected: boolean;
  pinned: boolean;
  audible?: boolean;
  discarded: boolean;
  autoDiscardable: boolean;
  mutedInfo?: {
    muted: boolean;
  };
  favIconUrl?: string;
  status?: string;
  width?: number;
  height?: number;
}

// Now correctly declare the chrome variable globally
declare global {
  interface Window {
    chrome: Chrome;
  }
  var chrome: Chrome;
}

export type { Tab }; // Export the Tab interface explicitly
