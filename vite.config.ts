
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import fs from "fs";

// Custom plugin to copy extension files to the dist root
const extensionFilesPlugin = () => {
  return {
    name: 'extension-files',
    closeBundle: async () => {
      // Copy manifest.json
      if (fs.existsSync('public/manifest.json')) {
        fs.copyFileSync('public/manifest.json', 'dist/manifest.json');
        console.log('✓ Copied manifest.json to dist root');
      }

      // Copy background.js
      if (fs.existsSync('public/background.js')) {
        fs.copyFileSync('public/background.js', 'dist/background.js');
        console.log('✓ Copied background.js to dist root');
      }

      // Copy content.js
      if (fs.existsSync('public/content.js')) {
        fs.copyFileSync('public/content.js', 'dist/content.js');
        console.log('✓ Copied content.js to dist root');
      }

      // Copy icon files
      const iconFiles = ['icon16.png', 'icon48.png', 'icon128.png'];
      iconFiles.forEach(iconFile => {
        if (fs.existsSync(`public/${iconFile}`)) {
          fs.copyFileSync(`public/${iconFile}`, `dist/${iconFile}`);
          console.log(`✓ Copied ${iconFile} to dist root`);
        } else {
          console.warn(`⚠ Warning: ${iconFile} not found in public folder`);
        }
      });
    }
  };
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
    extensionFilesPlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
    },
  }
}));
