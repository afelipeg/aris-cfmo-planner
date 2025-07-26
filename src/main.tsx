import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// ✅ PRODUCTION: Initialize browser compatibility
async function initializeBrowserCompatibility() {
  try {
    const { browserCompatibility } = await import('./lib/browserCompatibility');
    console.log('🌐 Browser Compatibility Check:', browserCompatibility);
    
    // ✅ PRODUCTION: Mostrar warning si el browser no es completamente compatible
    if (!browserCompatibility.isFullySupported) {
      console.warn('⚠️ Browser may not be fully supported:', browserCompatibility.warnings);
      
      // Mostrar notificación al usuario si es necesario
      if (browserCompatibility.warnings.length > 0) {
        const notification = document.createElement('div');
        notification.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background: #fbbf24;
          color: #92400e;
          padding: 8px 16px;
          text-align: center;
          font-size: 14px;
          z-index: 9999;
        `;
        notification.textContent = `⚠️ Your browser may have limited compatibility. For best experience, use Chrome 90+ or Safari 14+`;
        document.body.appendChild(notification);
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 10000);
      }
    }
  } catch (error) {
    console.warn('⚠️ Could not load browser compatibility module:', error);
  }
}

// Initialize compatibility check
initializeBrowserCompatibility();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
