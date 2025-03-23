
export interface TranslationHistoryItem {
  id: string;
  originalText: string;
  translatedText: string;
  fromLang: string;
  toLang: string;
  timestamp: Date;
}

export interface TranslateTextRequest {
  text: string;
  target_language: string;
}

export interface TranslateTextResponse {
  translatedText: string;
  detectedLanguage?: string;
}
