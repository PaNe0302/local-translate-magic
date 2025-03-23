
import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface TranslationHistoryItem {
  id: string;
  originalText: string;
  translatedText: string;
  fromLang: string;
  toLang: string;
  timestamp: Date;
}

interface TranslationHook {
  isTranslating: boolean;
  translatedText: string | null;
  translationHistory: TranslationHistoryItem[];
  translateText: (text: string, toLang: string) => Promise<void>;
  translatePage: () => Promise<void>;
  clearTranslation: () => void;
  removeHistoryItem: (id: string) => void;
  clearHistory: () => void;
  isConnected: boolean;
  checkConnection: () => Promise<boolean>;
}

export const useTranslation = (): TranslationHook => {
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [translationHistory, setTranslationHistory] = useState<TranslationHistoryItem[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  
  const LM_STUDIO_ENDPOINT = 'http://100.108.173.6:1234';

  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(`${LM_STUDIO_ENDPOINT}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const connected = response.ok;
      setIsConnected(connected);
      return connected;
    } catch (error) {
      console.error('Connection error:', error);
      setIsConnected(false);
      return false;
    }
  }, []);

  const translateText = useCallback(async (text: string, toLang: string): Promise<void> => {
    if (!text.trim()) return;
    
    setIsTranslating(true);
    
    try {
      const connected = await checkConnection();
      
      if (!connected) {
        toast.error('Cannot connect to LMStudio. Please check if the application is running.');
        setIsTranslating(false);
        return;
      }
      
      const response = await fetch(`${LM_STUDIO_ENDPOINT}/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          target_language: toLang,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Translation failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      setTranslatedText(data.translatedText);
      
      // Add to history
      const historyItem: TranslationHistoryItem = {
        id: Date.now().toString(),
        originalText: text,
        translatedText: data.translatedText,
        fromLang: data.detectedLanguage || 'auto',
        toLang,
        timestamp: new Date(),
      };
      
      setTranslationHistory(prev => [historyItem, ...prev].slice(0, 50)); // Keep max 50 items
      
    } catch (error) {
      console.error('Translation error:', error);
      toast.error('Translation failed. Please try again.');
    } finally {
      setIsTranslating(false);
    }
  }, [checkConnection]);

  const translatePage = useCallback(async (): Promise<void> => {
    try {
      setIsTranslating(true);
      
      // Communicate with content script to get page content
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
          const connected = await checkConnection();
      
          if (!connected) {
            toast.error('Cannot connect to LMStudio. Please check if the application is running.');
            setIsTranslating(false);
            return;
          }
          
          chrome.tabs.sendMessage(
            tabs[0].id!,
            { action: 'getPageContent' },
            async (response) => {
              if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError);
                toast.error('Could not connect to the page. Please refresh and try again.');
                setIsTranslating(false);
                return;
              }
              
              try {
                // Process each text node
                for (const node of response.textNodes) {
                  const translationResponse = await fetch(`${LM_STUDIO_ENDPOINT}/translate`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      text: node.text,
                      target_language: 'en', // Default to English
                    }),
                  });
                  
                  if (!translationResponse.ok) {
                    throw new Error(`Translation failed: ${translationResponse.statusText}`);
                  }
                  
                  const data = await translationResponse.json();
                  
                  // Send translated text back to content script
                  chrome.tabs.sendMessage(tabs[0].id!, {
                    action: 'replaceText',
                    nodeId: node.id,
                    translatedText: data.translatedText,
                  });
                }
                
                toast.success('Page translated successfully');
              } catch (error) {
                console.error('Translation error:', error);
                toast.error('Translation failed. Please try again.');
              } finally {
                setIsTranslating(false);
              }
            }
          );
        });
      } else {
        // For non-extension environments (development)
        toast.error('Extension API not available. This feature works only in the Chrome extension.');
        setIsTranslating(false);
      }
    } catch (error) {
      console.error('Page translation error:', error);
      toast.error('Page translation failed. Please try again.');
      setIsTranslating(false);
    }
  }, [checkConnection]);

  const clearTranslation = useCallback((): void => {
    setTranslatedText(null);
  }, []);

  const removeHistoryItem = useCallback((id: string): void => {
    setTranslationHistory(prev => prev.filter(item => item.id !== id));
  }, []);

  const clearHistory = useCallback((): void => {
    setTranslationHistory([]);
  }, []);

  return {
    isTranslating,
    translatedText,
    translationHistory,
    translateText,
    translatePage,
    clearTranslation,
    removeHistoryItem,
    clearHistory,
    isConnected,
    checkConnection,
  };
};
