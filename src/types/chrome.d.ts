
// Chrome extension API type declarations
declare namespace chrome {
  namespace runtime {
    function sendMessage(message: any): void;
    function sendMessage(message: any, callback: (response: any) => void): void;
    function sendMessage(extensionId: string, message: any, responseCallback: (response: any) => void): void;
    
    function onMessage: {
      addListener(callback: (message: any, sender: any, sendResponse: (response?: any) => void) => void): void;
      removeListener(callback: (message: any, sender: any, sendResponse: (response?: any) => void) => void): void;
    };
  }
  
  namespace storage {
    const local: {
      get(keys: string | string[] | object | null, callback: (items: { [key: string]: any }) => void): void;
      set(items: { [key: string]: any }, callback?: () => void): void;
      remove(keys: string | string[], callback?: () => void): void;
      clear(callback?: () => void): void;
    };
    
    const sync: {
      get(keys: string | string[] | object | null, callback: (items: { [key: string]: any }) => void): void;
      set(items: { [key: string]: any }, callback?: () => void): void;
      remove(keys: string | string[], callback?: () => void): void;
      clear(callback?: () => void): void;
    };
    
    function onChanged: {
      addListener(callback: (changes: { [key: string]: { oldValue: any; newValue: any } }, areaName: string) => void): void;
      removeListener(callback: (changes: { [key: string]: { oldValue: any; newValue: any } }, areaName: string) => void): void;
    };
  }
  
  namespace tabs {
    function query(queryInfo: { active: boolean; currentWindow: boolean }, callback: (tabs: any[]) => void): void;
    function sendMessage(tabId: number, message: any, callback?: (response: any) => void): void;
  }
}
