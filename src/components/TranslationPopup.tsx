
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, X, Check, RefreshCw, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from '@/hooks/useTranslation';
import { ScrollArea } from '@/components/ui/scroll-area';

const languages = [
  { code: 'en', name: 'English' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'es', name: 'Spanish' },
  { code: 'it', name: 'Italian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ru', name: 'Russian' },
];

const TranslationPopup: React.FC = () => {
  const [text, setText] = useState('');
  const [showResult, setShowResult] = useState(false);
  const { 
    isTranslating, 
    translatedText, 
    translateText, 
    clearTranslation, 
    isConnected, 
    checkConnection,
    targetLanguage,
    setTargetLanguage
  } = useTranslation();

  useEffect(() => {
    checkConnection();
    
    // Check connection every 30 seconds
    const interval = setInterval(() => {
      checkConnection();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [checkConnection]);

  const handleTranslate = async () => {
    if (text.trim()) {
      await translateText(text, targetLanguage);
      setShowResult(true);
    }
  };

  const handleClear = () => {
    setText('');
    clearTranslation();
    setShowResult(false);
  };

  return (
    <motion.div 
      className="glass-panel rounded-xl p-4 w-full"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Select
            value={targetLanguage}
            onValueChange={setTargetLanguage}
          >
            <SelectTrigger className="w-[180px] neo-button">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="sm"
            className="neo-button"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text to translate..."
          className="premium-text-input min-h-[100px] max-h-[150px] resize-none subtle-scrollbar"
        />
        
        <Button
          className="w-full neo-button flex items-center justify-center gap-2"
          onClick={handleTranslate}
          disabled={!text.trim() || isTranslating || !isConnected}
        >
          {isTranslating ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Translating...</span>
            </>
          ) : (
            <>
              <span>Translate</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
        
        <AnimatePresence>
          {showResult && translatedText && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-4"
            >
              <div className="bg-accent/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-muted-foreground">Translation</div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setShowResult(false)}
                  >
                    {showResult ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
                <ScrollArea className="h-[120px]">
                  <p className="text-sm px-1">{translatedText}</p>
                </ScrollArea>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default TranslationPopup;
