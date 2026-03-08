import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import setupLocator from '@locator/runtime';

if (import.meta.env.DEV) {
  setupLocator({
    targets: {
      antigravity: {
        url: 'antigravity://open?file=${projectPath}${filePath}&line=${line}&column=${column}',
        label: 'Antigravity',
      },
    },
    adapter: 'jsx',
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
