
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
  clearTranslation: () => void;
  removeHistoryItem: (id: string) => void;
  clearHistory: () => void;
  isConnected: boolean;
  connectionError: string | null;
  checkConnection: () => Promise<boolean>;
}

export const useTranslation = (): TranslationHook => {
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [translationHistory, setTranslationHistory] = useState<TranslationHistoryItem[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

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
  }, [checkConnection]);

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
    clearTranslation,
    removeHistoryItem,
    clearHistory,
    isConnected,
    connectionError,
    checkConnection,
  };
};
