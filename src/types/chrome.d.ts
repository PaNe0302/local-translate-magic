
// Type definitions for Chrome extension API
// These types augment the existing Chrome API types

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
      callback: (tabs: any[]) => void
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

declare global {
  var chrome: Chrome;
}

export {};
