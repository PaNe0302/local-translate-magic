// State Manager for LocalTranslate

// Keep track of original text nodes to restore later if needed
export let originalNodes = new Map();
export let translatedNodes = new Map();
export let nodeCounter = 0;
let isTranslating = false;
let alreadyInjected = false;

/**
 * Resets the translation state
 */
export function reset() {
  nodeCounter = 0;
  originalNodes.clear();
  translatedNodes.clear();
  isTranslating = false;
}

/**
 * Gets the current node counter
 */
export function getNodeCounter() {
  return nodeCounter;
}

/**
 * Increments and returns the node counter
 */
export function incrementNodeCounter() {
  return nodeCounter++;
}

/**
 * Sets the translation state
 * @param {boolean} value - Whether translation is in progress
 * @returns {boolean} - Whether the state was successfully set
 */
export function setIsTranslating(value) {
  // If already translating and trying to set to true, return false
  if (isTranslating && value === true) {
    return false;
  }
  isTranslating = value;
  return true;
}

/**
 * Gets the current translation state
 */
export function getIsTranslating() {
  return isTranslating;
}

/**
 * Sets whether styles have been injected
 */
export function setAlreadyInjected(value) {
  alreadyInjected = value;
}

/**
 * Gets whether styles have been injected
 */
export function getAlreadyInjected() {
  return alreadyInjected;
}
