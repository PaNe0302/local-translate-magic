
import React from 'react';
import { motion } from 'framer-motion';
import { Globe } from 'lucide-react';

interface HeaderProps {
  isConnected: boolean;
}

const Header: React.FC<HeaderProps> = ({ isConnected }) => {
  return (
    <motion.header 
      className="py-4 flex items-center justify-between"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-2">
        <motion.div
          className="p-1.5 rounded-full bg-primary/10"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Globe className="w-5 h-5 text-primary" />
        </motion.div>
        <div>
          <h1 className="text-lg font-medium leading-none">LocalTranslate</h1>
          <p className="text-xs text-muted-foreground">No cloud. Just your LLM.</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <span className="text-xs text-muted-foreground">
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
    </motion.header>
  );
};

export default Header;
