
// Default endpoints for the application
// These can be overridden by user settings in localStorage

export const ENDPOINTS = {
  LM_STUDIO: localStorage.getItem('lmStudioEndpoint') || 'http://100.108.173.6:1234',
};
