
/**
 * Processor for handling batch translation operations
 */
import { TextNode } from '../pageContentService';
import { translationApi } from '../translationApi';
import { pageContentService } from '../pageContentService';
import { chromeApiService } from '../chromeApiService';

/**
 * Process batch translation of text nodes with optimized concurrency
 * This method is called from the background script
 */
export async function processBatchTranslation(
  textNodes: TextNode[],
  targetLanguage: string,
  abortController: AbortController
): Promise<{completedCount: number, failedCount: number}> {
  // Increase batch size for better performance
  const batchSize = 10;
  // Optimize concurrency - don't process too many requests at once
  const concurrencyLimit = 3;
  let completedCount = 0;
  let failedCount = 0;
  
  // Group similar-length text nodes together for more efficient processing
  const groupedNodes = groupNodesByLength(textNodes);
  
  for (const group of groupedNodes) {
    // Check if operation was cancelled
    if (abortController?.signal.aborted) {
      throw new DOMException("Translation aborted", "AbortError");
    }
    
    // Process nodes in batches within each group
    for (let i = 0; i < group.length; i += batchSize) {
      const batch = group.slice(i, i + batchSize);
      
      // Process each batch with limited concurrency
      for (let j = 0; j < batch.length; j += concurrencyLimit) {
        const concurrentBatch = batch.slice(j, j + concurrencyLimit);
        
        const promises = concurrentBatch.map(async (node) => {
          try {
            // Check if operation was cancelled
            if (abortController?.signal.aborted) {
              throw new DOMException("Translation aborted", "AbortError");
            }
            
            const response = await translationApi.translateText({
              text: node.text,
              target_language: targetLanguage,
            });
            
            if (response.translatedText) {
              await pageContentService.replaceText(node.id, response.translatedText);
              completedCount++;
              
              // Update progress in a non-blocking way
              if (completedCount % 5 === 0 || completedCount === textNodes.length) {
                chromeApiService.sendBackgroundMessage({
                  action: 'translationProgress',
                  completed: completedCount,
                  total: textNodes.length
                }).catch(err => console.error('Failed to send progress update:', err));
              }
            } else {
              failedCount++;
            }
          } catch (error) {
            console.error(`Failed to translate node ${node.id}:`, error);
            failedCount++;
            // Don't rethrow to allow other translations to continue
          }
        });
        
        // Wait for concurrent batch to complete before starting next
        await Promise.all(promises);
      }
    }
  }
  
  return { completedCount, failedCount };
}

/**
 * Group nodes by text length for more efficient processing
 * This improves translation speed by processing similar-sized chunks together
 */
export function groupNodesByLength(nodes: TextNode[]): TextNode[][] {
  // Create 3 groups: short, medium, and long text
  const shortTexts: TextNode[] = [];
  const mediumTexts: TextNode[] = [];
  const longTexts: TextNode[] = [];
  
  nodes.forEach(node => {
    const length = node.text.length;
    if (length < 50) {
      shortTexts.push(node);
    } else if (length < 200) {
      mediumTexts.push(node);
    } else {
      longTexts.push(node);
    }
  });
  
  // Process short texts first, then medium, then long
  return [shortTexts, mediumTexts, longTexts].filter(group => group.length > 0);
}
