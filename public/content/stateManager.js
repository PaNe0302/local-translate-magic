// State Manager for LocalTranslate

// Keep track of original text nodes to restore later if needed
let originalNodes = new Map();
let translatedNodes = new Map();
let nodeCounter = 0;
let isTranslating = false;
let alreadyInjected = false;

// Reset state
function reset() {
  nodeCounter = 0;
  originalNodes.clear();
  translatedNodes.clear();
  isTranslating = false;
}

// Get/set state functions
function getNodeCounter() {
  return nodeCounter;
}

function incrementNodeCounter() {
  return nodeCounter++;
}

function setIsTranslating(value) {
  // If already translating and trying to set to true, return false
  if (isTranslating && value === true) {
    return false;
  }
  isTranslating = value;
  return true;
}

function getIsTranslating() {
  return isTranslating;
}

function setAlreadyInjected(value) {
  alreadyInjected = value;
}

function getAlreadyInjected() {
  return alreadyInjected;
}

export {
  originalNodes,
  translatedNodes,
  nodeCounter,
  getNodeCounter,
  incrementNodeCounter,
  setIsTranslating,
  getIsTranslating,
  setAlreadyInjected,
  getAlreadyInjected,
  reset
};
