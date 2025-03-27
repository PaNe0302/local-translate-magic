
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { TranslationHistoryItem } from '@/types/translation';
import { translationApi } from '@/services/translationApi';
import { translationHistoryService } from '@/services/translationHistoryService';
import { pageTranslationService } from '@/services/pageTranslationService';

interface TranslationHook {
  isTranslating: boolean;
  translatedText: string | null;
  translationHistory: TranslationHistoryItem[];
  translateText: (text: string, toLang: string) => Promise<void>;
  translatePage: () => Promise<void>;
  cancelTranslation: () => void;
  clearTranslation: () => void;
  removeHistoryItem: (id: string) => void;
  clearHistory: () => void;
  isConnected: boolean;
  connectionError: string | null;
  checkConnection: () => Promise<boolean>;
  targetLanguage: string;
  setTargetLanguage: (lang: string) => void;
}

export const useTranslation = (): TranslationHook => {
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [translationHistory, setTranslationHistory] = useState<TranslationHistoryItem[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [targetLanguage, setTargetLanguage] = useState<string>(() => {
    // Try to load from localStorage or default to Vietnamese
    const savedLang = localStorage.getItem('targetLanguage');
    return savedLang || 'vi';
  });

  // Debounced connection check to avoid too many requests
  const checkConnection = useCallback(async (): Promise<boolean> => {
    const result = await translationApi.checkHealth();
    setIsConnected(result.connected);
    setConnectionError(result.error || null);
    return result.connected;
  }, []);
  
  useEffect(() => {
    // Check for stored endpoint in localStorage and update if found
    const storedEndpoint = localStorage.getItem('lmStudioEndpoint');
    if (storedEndpoint) {
      translationApi.setEndpoint(storedEndpoint);
    }
    
    // Initial connection check
    checkConnection();

    // Set up periodic connection checks, but only when the app is active
    let checkInterval: number | null = null;
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Check connection when tab becomes visible
        checkConnection();
        // Start interval checks when visible
        if (checkInterval === null) {
          checkInterval = window.setInterval(checkConnection, 30000);
        }
      } else if (document.visibilityState === 'hidden') {
        // Clear interval when tab is hidden
        if (checkInterval !== null) {
          window.clearInterval(checkInterval);
          checkInterval = null;
        }
      }
    };
    
    // Set up visibility change listener
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Initialize interval if page is visible
    if (document.visibilityState === 'visible') {
      checkInterval = window.setInterval(checkConnection, 30000);
    }
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (checkInterval !== null) {
        window.clearInterval(checkInterval);
      }
    };
  }, [checkConnection]);

  // Save target language to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('targetLanguage', targetLanguage);
    // Update the target language in the page translation service
    pageTranslationService.setTargetLanguage(targetLanguage);
  }, [targetLanguage]);

  const translateText = useCallback(async (text: string, toLang: string): Promise<void> => {
    if (!text.trim()) return;
    
    setIsTranslating(true);
    
    try {
      const connected = await checkConnection();
      
      if (!connected) {
        toast.error(connectionError || 'Cannot connect to LMStudio');
        setIsTranslating(false);
        return;
      }
      
      const data = await translationApi.translateText({
        text,
        target_language: toLang,
      });
      
      setTranslatedText(data.translatedText);
      
      // Add to history
      setTranslationHistory(prev => 
        translationHistoryService.addToHistory(
          prev, 
          text, 
          data.translatedText, 
          data.detectedLanguage || 'auto', 
          toLang
        )
      );
      
    } catch (error) {
      console.error('Translation error:', error);
      toast.error(error instanceof Error ? error.message : 'Translation failed. Please try again.');
    } finally {
      setIsTranslating(false);
    }
  }, [checkConnection, connectionError]);

  const translatePage = useCallback(async (): Promise<void> => {
    setIsTranslating(true);
    await pageTranslationService.translatePage();
    setIsTranslating(false);
  }, []);

  const cancelTranslation = useCallback((): void => {
    pageTranslationService.cancelTranslation();
    setIsTranslating(false);
  }, []);

  const clearTranslation = useCallback((): void => {
    setTranslatedText(null);
  }, []);

  const removeHistoryItem = useCallback((id: string): void => {
    setTranslationHistory(prev => translationHistoryService.removeHistoryItem(prev, id));
  }, []);

  const clearHistory = useCallback((): void => {
    setTranslationHistory(translationHistoryService.clearHistory());
  }, []);

  return {
    isTranslating,
    translatedText,
    translationHistory,
    translateText,
    translatePage,
    cancelTranslation,
    clearTranslation,
    removeHistoryItem,
    clearHistory,
    isConnected,
    connectionError,
    checkConnection,
    targetLanguage,
    setTargetLanguage,
  };
};
