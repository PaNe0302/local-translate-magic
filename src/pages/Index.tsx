import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Globe, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';
import Header from '@/components/Header';
import TranslationPopup from '@/components/TranslationPopup';
import TranslationHistory from '@/components/TranslationHistory';
import TranslationSettings from '@/components/TranslationSettings';
import { toast } from 'sonner';

const Index = () => {
  const { 
    translatePage, 
    cancelTranslation, 
    isTranslating, 
    isConnected, 
    checkConnection, 
    targetLanguage 
  } = useTranslation();
  const [progress, setProgress] = useState({ completed: 0, total: 0 });

  const handleMessage = useCallback((message) => {
    if (message.action === 'translationProgress') {
      setProgress({
        completed: message.completed,
        total: message.total
      });
      
      if (message.completed % 10 === 0 || message.completed === message.total) {
        toast.info(`Translation progress: ${message.completed} of ${message.total} elements`);
      }
    } else if (message.action === 'translationComplete') {
      setProgress({ completed: 0, total: 0 });
      if (message.failed > 0) {
        toast.warning(`Translation completed with ${message.failed} errors`);
      } else {
        toast.success(`Translation completed successfully`);
      }
    } else if (message.action === 'translationError') {
      setProgress({ completed: 0, total: 0 });
      toast.error(`Translation error: ${message.error}`);
    } else if (message.action === 'translationCancelled') {
      setProgress({ completed: 0, total: 0 });
      toast.info('Translation cancelled');
    }
  }, []);

  useEffect(() => {
    checkConnection();
    
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onMessage.addListener(handleMessage);
    }
    
    return () => {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.onMessage.removeListener(handleMessage);
      }
    };
  }, [checkConnection, handleMessage]);

  const handleTranslatePage = async () => {
    await translatePage();
  };

  const handleCancelTranslation = () => {
    cancelTranslation();
  };

  return (
    <div className="extension-wrapper bg-background">
      <div className="extension-content w-full max-w-md p-4 space-y-4">
        <Header isConnected={isConnected} />
        
        <motion.div
          className="flex flex-col items-center text-center mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <motion.div
            className="p-3 rounded-full bg-primary/10 mb-4"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ 
              type: "spring", 
              stiffness: 400, 
              damping: 17,
              delay: 0.2
            }}
          >
            <Globe className="w-6 h-6 text-primary" />
          </motion.div>
          <h1 className="text-2xl font-medium">Local Translation</h1>
          <p className="text-muted-foreground mt-1 max-w-sm">
            Translate web pages to {targetLanguage === 'vi' ? 'Vietnamese' : 
              targetLanguage === 'en' ? 'English' : 
              targetLanguage === 'fr' ? 'French' : 
              targetLanguage === 'de' ? 'German' : 
              targetLanguage === 'es' ? 'Spanish' : 
              targetLanguage === 'it' ? 'Italian' : 
              targetLanguage === 'ja' ? 'Japanese' : 
              targetLanguage === 'ko' ? 'Korean' : 
              targetLanguage === 'zh' ? 'Chinese' : 
              targetLanguage === 'ru' ? 'Russian' : 'your selected language'} using your local LMStudio instance
          </p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          {isTranslating || progress.total > 0 ? (
            <div className="space-y-2">
              {progress.total > 0 && (
                <div className="w-full bg-muted rounded-full h-2.5 mb-2">
                  <div 
                    className="bg-primary h-2.5 rounded-full" 
                    style={{ width: `${Math.floor((progress.completed / progress.total) * 100)}%` }}
                  ></div>
                </div>
              )}
              <Button 
                className="w-full neo-button bg-red-500 hover:bg-red-600 flex items-center justify-center gap-2 py-6 text-base"
                onClick={handleCancelTranslation}
              >
                <X className="h-4 w-4" />
                <span>Cancel Translation</span>
              </Button>
            </div>
          ) : (
            <Button 
              className="w-full neo-button flex items-center justify-center gap-2 py-6 text-base"
              onClick={handleTranslatePage}
              disabled={!isConnected}
            >
              <span>Translate Current Page</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </motion.div>
        
        <TranslationPopup />
        <TranslationHistory />
        <TranslationSettings />
      </div>
    </div>
  );
};

export default Index;
