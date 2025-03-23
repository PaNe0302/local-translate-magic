
import { TranslationHistoryItem } from '@/types/translation';

class TranslationHistoryService {
  private readonly MAX_HISTORY_ITEMS = 50;
  
  addToHistory(
    history: TranslationHistoryItem[], 
    originalText: string, 
    translatedText: string, 
    fromLang: string, 
    toLang: string
  ): TranslationHistoryItem[] {
    const historyItem: TranslationHistoryItem = {
      id: Date.now().toString(),
      originalText,
      translatedText,
      fromLang,
      toLang,
      timestamp: new Date(),
    };
    
    return [historyItem, ...history].slice(0, this.MAX_HISTORY_ITEMS);
  }
  
  removeHistoryItem(history: TranslationHistoryItem[], id: string): TranslationHistoryItem[] {
    return history.filter(item => item.id !== id);
  }
  
  clearHistory(): TranslationHistoryItem[] {
    return [];
  }
}

export const translationHistoryService = new TranslationHistoryService();
