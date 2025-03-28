
/**
 * Handles the injection of content scripts into tabs and content retrieval
 * This file serves as a facade to maintain backward compatibility
 */

import { ensureContentScript } from './handlers/contentScriptInjectionHandler.js';
import { getPageContent } from './handlers/contentRetrievalHandler.js';

// Re-export the functions
export { ensureContentScript, getPageContent };
