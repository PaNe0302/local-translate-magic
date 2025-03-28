
// Translation Handler for LocalTranslate background script
import { 
  handleTranslatePageRequest, 
  handleTranslateSelectionRequest 
} from './handlers/translationRequestHandler.js';
import { 
  handleStartBackgroundTranslation,
  handleCancelTranslation 
} from './handlers/backgroundTranslationHandler.js';

// Export the handlers for use in messageHandler.js
export {
  handleTranslatePageRequest,
  handleTranslateSelectionRequest,
  handleStartBackgroundTranslation,
  handleCancelTranslation
};
