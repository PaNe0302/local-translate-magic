
import { ENDPOINTS } from '@/config/endpoints';
import { TranslateTextRequest, TranslateTextResponse } from '@/types/translation';

class TranslationApiService {
  private endpoint: string;

  constructor(endpoint: string = ENDPOINTS.LM_STUDIO) {
    this.endpoint = endpoint;
  }

  async checkHealth(): Promise<{ connected: boolean; error?: string }> {
    try {
      // Instead of using /health, use the /v1/models endpoint which is available in LMStudio
      const response = await fetch(`${this.endpoint}/v1/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
        credentials: 'omit',
      });
      
      const data = await response.json();
      // If we get a successful response, we can consider the server connected
      return { connected: response.ok };
    } catch (error) {
      console.error('Connection error:', error);
      let errorMessage = 'Failed to connect';
      
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        errorMessage = 'Network error: LMStudio may not be running or CORS is blocked';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      return { connected: false, error: errorMessage };
    }
  }

  async translateText(request: TranslateTextRequest): Promise<TranslateTextResponse> {
    try {
      // For translation, we'll use the /v1/chat/completions endpoint which is standard in OpenAI-compatible APIs
      const response = await fetch(`${this.endpoint}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "gwen2.5-7b-instruct-1m", // Use the model name from your screenshot
          messages: [
            {
              role: "system",
              content: `You are a helpful translator. Translate the following text to ${request.target_language}.`
            },
            {
              role: "user",
              content: request.text
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        }),
        mode: 'cors',
        credentials: 'omit',
      });
      
      if (!response.ok) {
        throw new Error(`Translation failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Extract the translated text from the assistant's message
      const translatedText = data.choices && data.choices[0]?.message?.content;
      
      if (!translatedText) {
        throw new Error("No translation returned from LMStudio");
      }
      
      return {
        translatedText,
        detectedLanguage: "auto", // LMStudio doesn't provide language detection
      };
    } catch (error) {
      console.error('Translation error:', error);
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('Network error: LMStudio may not be running or CORS is blocked');
      }
      throw error;
    }
  }

  setEndpoint(newEndpoint: string): void {
    this.endpoint = newEndpoint;
  }

  getEndpoint(): string {
    return this.endpoint;
  }
}

export const translationApi = new TranslationApiService();
