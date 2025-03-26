
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Globe, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';
import Header from '@/components/Header';
import TranslationPopup from '@/components/TranslationPopup';
import TranslationHistory from '@/components/TranslationHistory';
import TranslationSettings from '@/components/TranslationSettings';

const Index = () => {
  const { translatePage, isTranslating, isConnected, checkConnection } = useTranslation();

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  const handleTranslatePage = async () => {
    await translatePage();
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
            Translate web pages using your local LMStudio instance
          </p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Button 
            className="w-full neo-button flex items-center justify-center gap-2 py-6 text-base"
            onClick={handleTranslatePage}
            disabled={isTranslating || !isConnected}
          >
            {isTranslating ? (
              <span>Translating Page...</span>
            ) : (
              <>
                <span>Translate Current Page</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </motion.div>
        
        <TranslationPopup />
        <TranslationHistory />
        <TranslationSettings />
      </div>
    </div>
  );
};

export default Index;
