
import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Globe, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
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
  const [progressPercentage, setProgressPercentage] = useState(0);

  const handleMessage = useCallback((message) => {
    if (message.action === 'translationProgress') {
      const completed = message.completed;
      const total = message.total;
      
      setProgress({
        completed,
        total
      });
      
      // Calculate percentage for progress bar
      setProgressPercentage(total > 0 ? Math.floor((completed / total) * 100) : 0);
      
      if (completed % 10 === 0 || completed === total) {
        toast.info(`Tiến độ dịch: ${completed} / ${total} phần tử`);
      }
    } else if (message.action === 'translationComplete') {
      setProgress({ completed: 0, total: 0 });
      setProgressPercentage(0);
      if (message.failed > 0) {
        toast.warning(`Dịch hoàn tất với ${message.failed} lỗi`);
      } else {
        toast.success(`Dịch hoàn tất thành công`);
      }
    } else if (message.action === 'translationError') {
      setProgress({ completed: 0, total: 0 });
      setProgressPercentage(0);
      toast.error(`Lỗi dịch: ${message.error}`);
    } else if (message.action === 'translationCancelled') {
      setProgress({ completed: 0, total: 0 });
      setProgressPercentage(0);
      toast.info('Đã hủy dịch');
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
            <div className="space-y-4">
              {progress.total > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Tiến độ dịch:</span>
                    <span>{progress.completed} / {progress.total} ({progressPercentage}%)</span>
                  </div>
                  <Progress value={progressPercentage} className="h-2" />
                </div>
              )}
              <Button 
                className="w-full neo-button bg-red-500 hover:bg-red-600 flex items-center justify-center gap-2 py-6 text-base"
                onClick={handleCancelTranslation}
              >
                <X className="h-4 w-4" />
                <span>Hủy dịch</span>
              </Button>
            </div>
          ) : (
            <Button 
              className="w-full neo-button flex items-center justify-center gap-2 py-6 text-base"
              onClick={handleTranslatePage}
              disabled={!isConnected}
            >
              <span>Dịch trang hiện tại</span>
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
