
import { ENDPOINTS } from '@/config/endpoints';
import { TranslateTextRequest, TranslateTextResponse } from '@/types/translation';

class TranslationApiService {
  private endpoint: string;

  constructor(endpoint: string = ENDPOINTS.LM_STUDIO) {
    this.endpoint = endpoint;
  }

  async checkHealth(): Promise<{ connected: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.endpoint}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Adding these options to help with CORS issues
        mode: 'cors',
        credentials: 'omit',
      });
      
      return { connected: response.ok };
    } catch (error) {
      console.error('Connection error:', error);
      let errorMessage = 'Failed to connect';
      
      // More specific error messages based on error type
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
      const response = await fetch(`${this.endpoint}/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        // Adding these options to help with CORS issues
        mode: 'cors',
        credentials: 'omit',
      });
      
      if (!response.ok) {
        throw new Error(`Translation failed: ${response.statusText}`);
      }
      
      return await response.json();
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
