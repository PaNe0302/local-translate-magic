
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/hooks/useTranslation';
import { toast } from 'sonner';
import { translationApi } from '@/services/translationApi';
import { ENDPOINTS } from '@/config/endpoints';

const TranslationSettings: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [endpoint, setEndpoint] = useState(ENDPOINTS.LM_STUDIO);
  const { isConnected, checkConnection } = useTranslation();
  
  // Load the saved endpoint from localStorage on component mount
  useEffect(() => {
    const savedEndpoint = localStorage.getItem('lmStudioEndpoint');
    if (savedEndpoint) {
      setEndpoint(savedEndpoint);
      // Also update the endpoint in the translation API service
      translationApi.setEndpoint(savedEndpoint);
    }
  }, []);
  
  const handleSaveEndpoint = () => {
    // Save to localStorage
    localStorage.setItem('lmStudioEndpoint', endpoint);
    
    // Update the endpoint in the translation API service
    translationApi.setEndpoint(endpoint);
    
    toast.success('Endpoint saved');
    
    // Check connection with the new endpoint
    checkConnection();
  };
  
  const handleTestConnection = async () => {
    // Set current endpoint for the test
    translationApi.setEndpoint(endpoint);
    
    const connected = await checkConnection();
    if (connected) {
      toast.success('Successfully connected to LMStudio');
    } else {
      toast.error('Failed to connect to LMStudio');
    }
  };

  return (
    <motion.div 
      className="glass-panel rounded-xl p-4 w-full max-w-md mt-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.3 }}
    >
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-medium">Settings</h2>
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
            className="mt-4 space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="endpoint">LMStudio Endpoint</Label>
              <div className="flex gap-2">
                <Input
                  id="endpoint"
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  placeholder="http://localhost:1234"
                  className="premium-text-input"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                The URL where your LMStudio instance is running
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="neo-button flex-1"
                onClick={handleSaveEndpoint}
              >
                Save
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="neo-button flex-1 flex items-center justify-center gap-1"
                onClick={handleTestConnection}
              >
                <RefreshCw className="h-3 w-3" />
                Test Connection
              </Button>
            </div>
            
            <div className="flex items-center space-x-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span>{isConnected ? 'Connected to LMStudio' : 'Not connected to LMStudio'}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default TranslationSettings;
