
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';

const TranslationHistory: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { translationHistory, removeHistoryItem, clearHistory } = useTranslation();

  if (translationHistory.length === 0) {
    return null;
  }

  return (
    <motion.div 
      className="glass-panel rounded-xl p-4 w-full max-w-md mt-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    >
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-medium">Translation History</h2>
        </div>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </div>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-2"
          >
            <div className="flex justify-end mb-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs text-muted-foreground flex items-center gap-1"
                onClick={(e) => {
                  e.stopPropagation();
                  clearHistory();
                }}
              >
                <Trash2 className="h-3 w-3" />
                Clear all
              </Button>
            </div>
            
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {translationHistory.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="glass-card rounded-lg p-3 text-sm"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(item.timestamp), 'MMM d, h:mm a')}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeHistoryItem(item.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="text-xs line-clamp-1 mb-1">{item.originalText}</div>
                    <div className="font-medium line-clamp-2">{item.translatedText}</div>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <span>{item.fromLang}</span>
                      <ChevronRight className="h-3 w-3" />
                      <span>{item.toLang}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Small ChevronRight component since we can't import it directly
const ChevronRight = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="m9 18 6-6-6-6"/>
  </svg>
);

export default TranslationHistory;
