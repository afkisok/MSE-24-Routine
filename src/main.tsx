import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register PWA service worker for offline caching and updates
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.info('PWA update available; refreshing...');
  },
  onOfflineReady() {
    console.info('PWA offline ready');
  },
});

createRoot(document.getElementById('root')!).render(<App />);
