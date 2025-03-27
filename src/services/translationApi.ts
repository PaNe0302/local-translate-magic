
import { ENDPOINTS } from '@/config/endpoints';
import { TranslateTextRequest, TranslateTextResponse } from '@/types/translation';

class TranslationApiService {
  private endpoint: string;
  private abortControllers: Map<string, AbortController> = new Map();

  constructor(endpoint: string = ENDPOINTS.LM_STUDIO) {
    this.endpoint = endpoint;
  }

  async checkHealth(): Promise<{ connected: boolean; error?: string }> {
    try {
      // Cancel any previous health check requests
      this.cancelRequest('health');
      const controller = new AbortController();
      this.abortControllers.set('health', controller);

      // Use timeout to avoid hanging requests
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      // Instead of using /health, use the /v1/models endpoint which is available in LMStudio
      const response = await fetch(`${this.endpoint}/v1/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-cache',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      this.abortControllers.delete('health');
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        return { 
          connected: false, 
          error: `Server returned ${response.status}: ${errorText}`
        };
      }
      
      await response.json(); // We don't need the data, just confirming it's valid JSON
      return { connected: true };
    } catch (error) {
      this.abortControllers.delete('health');
      console.error('Connection error:', error);
      let errorMessage = 'Failed to connect';
      
      if (error instanceof DOMException && error.name === 'AbortError') {
        errorMessage = 'Connection timed out';
      } else if (error instanceof TypeError && error.message === 'Failed to fetch') {
        errorMessage = 'Network error: LMStudio may not be running or CORS is blocked';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      return { connected: false, error: errorMessage };
    }
  }

  async translateText(request: TranslateTextRequest): Promise<TranslateTextResponse> {
    try {
      // Generate a unique ID for this translation request
      const requestId = `translate-${Date.now()}`;
      
      // Cancel any previous translation request with the same text
      this.cancelRequest(requestId);
      const controller = new AbortController();
      this.abortControllers.set(requestId, controller);
      
      // Use timeout to avoid hanging requests
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      // For translation, we'll use the /v1/chat/completions endpoint which is standard in OpenAI-compatible APIs
      const response = await fetch(`${this.endpoint}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "application/json", // LMStudio often ignores this field
          messages: [
            {
              role: "system",
              content: `You are a helpful translator. Translate the following text to ${request.target_language} accurately and efficiently. Only return the translated text, nothing else.`
            },
            {
              role: "user",
              content: request.text
            }
          ],
          temperature: 0.3, // Lower temperature for more deterministic outputs
          max_tokens: 2000, // Increased max tokens
          top_p: 0.95, // More focused sampling
          presence_penalty: 0.0,
          frequency_penalty: 0.0,
        }),
        mode: 'cors',
        credentials: 'omit',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      this.abortControllers.delete(requestId);
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Translation failed: ${response.status} - ${errorText}`);
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
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('Translation request timed out');
      } else if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('Network error: LMStudio may not be running or CORS is blocked');
      }
      throw error;
    }
  }

  // Cancel ongoing requests
  private cancelRequest(id: string): void {
    if (this.abortControllers.has(id)) {
      const controller = this.abortControllers.get(id);
      controller?.abort();
      this.abortControllers.delete(id);
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
