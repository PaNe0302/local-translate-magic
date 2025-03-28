
/**
 * Utility functions for the translation service
 */

/**
 * Gets the target language name from code
 */
export function getLanguageName(languageCode: string): string {
  const languageMap: Record<string, string> = {
    'en': 'English',
    'vi': 'Vietnamese',
    'fr': 'French',
    'de': 'German',
    'es': 'Spanish',
    'it': 'Italian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese',
    'ru': 'Russian'
  };
  
  return languageMap[languageCode] || languageCode;
}
