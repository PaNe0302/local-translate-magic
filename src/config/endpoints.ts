
// Default endpoints for the application
// These can be overridden by user settings in localStorage

let savedEndpoint: string | null = null;
try {
  savedEndpoint = localStorage.getItem('lmStudioEndpoint');
} catch (error) {
  console.error('Could not access localStorage:', error);
}

export const ENDPOINTS = {
  LM_STUDIO: savedEndpoint || 'http://localhost:1234', // Changed to localhost instead of IP
};
