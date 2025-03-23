
import { ENDPOINTS } from '@/config/endpoints';
import { TranslateTextRequest, TranslateTextResponse } from '@/types/translation';

class TranslationApiService {
  private endpoint: string;

  constructor(endpoint: string = ENDPOINTS.LM_STUDIO) {
    this.endpoint = endpoint;
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.endpoint}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      return response.ok;
    } catch (error) {
      console.error('Connection error:', error);
      return false;
    }
  }

  async translateText(request: TranslateTextRequest): Promise<TranslateTextResponse> {
    const response = await fetch(`${this.endpoint}/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      throw new Error(`Translation failed: ${response.statusText}`);
    }
    
    return await response.json();
  }

  setEndpoint(newEndpoint: string): void {
    this.endpoint = newEndpoint;
  }

  getEndpoint(): string {
    return this.endpoint;
  }
}

export const translationApi = new TranslationApiService();
