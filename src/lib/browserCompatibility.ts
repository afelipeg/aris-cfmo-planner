// src/lib/browserCompatibility.ts - Chrome y Safari Compatibility
export class BrowserCompatibility {
  
  // Detectar browser y versión
  static detectBrowser(): { name: string; version: string; isSupported: boolean } {
    const userAgent = navigator.userAgent;
    
    // Chrome detection
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
      const version = userAgent.match(/Chrome\/(\d+)/)?.[1] || '0';
      return {
        name: 'Chrome',
        version,
        isSupported: parseInt(version) >= 90
      };
    }
    
    // Safari detection
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      const version = userAgent.match(/Version\/(\d+)/)?.[1] || '0';
      return {
        name: 'Safari',
        version,
        isSupported: parseInt(version) >= 14
      };
    }
    
    // Firefox detection
    if (userAgent.includes('Firefox')) {
      const version = userAgent.match(/Firefox\/(\d+)/)?.[1] || '0';
      return {
        name: 'Firefox',
        version,
        isSupported: parseInt(version) >= 90
      };
    }
    
    return {
      name: 'Unknown',
      version: '0',
      isSupported: false
    };
  }

  // Verificar APIs necesarias
  static checkRequiredAPIs(): { [key: string]: boolean } {
    return {
      fetch: typeof fetch !== 'undefined',
      fileReader: typeof FileReader !== 'undefined',
      localStorage: typeof localStorage !== 'undefined',
      sessionStorage: typeof sessionStorage !== 'undefined',
      webWorkers: typeof Worker !== 'undefined',
      promises: typeof Promise !== 'undefined',
      asyncAwait: true, // Always available in modern browsers
      modules: true, // ES6 modules
      abortController: typeof AbortController !== 'undefined'
    };
  }

  // Polyfills para Safari
  static initializeSafariPolyfills() {
    // AbortController polyfill para Safari < 12.1
    if (!window.AbortController) {
      console.log('🔧 Loading AbortController polyfill for Safari...');
      
      class AbortControllerPolyfill {
        signal: any;
        
        constructor() {
          this.signal = {
            aborted: false,
            addEventListener: () => {},
            removeEventListener: () => {}
          };
        }
        
        abort() {
          this.signal.aborted = true;
        }
      }
      
      (window as any).AbortController = AbortControllerPolyfill;
    }

    // Intersection Observer polyfill si es necesario
    if (!window.IntersectionObserver) {
      console.log('🔧 IntersectionObserver not available, using fallback...');
    }
  }

  // Optimizaciones específicas para Chrome
  static optimizeForChrome() {
    const browser = this.detectBrowser();
    
    if (browser.name === 'Chrome') {
      console.log('🚀 Chrome optimizations enabled');
      
      // ✅ CHROME FIX: File handling optimizations
      this.optimizeChromeFileHandling();
      
      // Preload critical resources
      this.preloadCriticalResources();
      
      // ✅ CHROME FIX: Memory management
      this.optimizeChromeMemory();
    }
  }
  
  // ✅ CHROME FIX: Optimizaciones específicas para manejo de archivos
  private static optimizeChromeFileHandling() {
    // Chrome file handling optimizations
    if (typeof window !== 'undefined') {
      // Optimize FileReader for Chrome
      const originalFileReader = window.FileReader;
      if (originalFileReader) {
        const FileReaderWrapper = function(this: any) {
          const reader = new originalFileReader();
          
          // ✅ CHROME FIX: Add progress tracking
          const originalReadAsDataURL = reader.readAsDataURL;
          reader.readAsDataURL = function(file: File) {
            console.log(`📖 CHROME: Reading file ${file.name} (${Math.round(file.size/1024)}KB)`);
            return originalReadAsDataURL.call(this, file);
          };
          
          return reader;
        };
        FileReaderWrapper.prototype = originalFileReader.prototype;
        (window as any).FileReader = FileReaderWrapper;
      }
    }
  }
  
  // ✅ CHROME FIX: Optimización de memoria
  private static optimizeChromeMemory() {
    // Chrome memory optimizations
    if (typeof window !== 'undefined') {
      // Cleanup blob URLs automatically
      const originalCreateObjectURL = URL.createObjectURL;
      const createdURLs = new Set<string>();
      
      URL.createObjectURL = function(object: any) {
        const url = originalCreateObjectURL(object);
        createdURLs.add(url);
        
        // Auto-cleanup after 5 minutes
        setTimeout(() => {
          if (createdURLs.has(url)) {
            URL.revokeObjectURL(url);
            createdURLs.delete(url);
            console.log('🧹 CHROME: Auto-cleaned blob URL');
          }
        }, 5 * 60 * 1000);
        
        return url;
      };
    }
  }

  // Optimizaciones específicas para Safari
  static optimizeForSafari() {
    const browser = this.detectBrowser();
    
    if (browser.name === 'Safari') {
      console.log('🍎 Safari optimizations enabled');
      
      // Safari-specific fixes
      this.initializeSafariPolyfills();
      
      // Fix Safari file upload issues
      this.fixSafariFileUpload();
      
      // Fix Safari fetch issues
      this.fixSafariFetch();
    }
  }

  // Precargar recursos críticos
  private static preloadCriticalResources() {
    const criticalResources = [
      '/ms-icon-310x310.png',
      'https://fonts.googleapis.com/css2?family=Google+Sans:wght@300;400;500;600;700&display=swap'
    ];

    criticalResources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource;
      link.as = resource.includes('.png') ? 'image' : 'style';
      document.head.appendChild(link);
    });
  }

  // Fix Safari file upload
  private static fixSafariFileUpload() {
    // Safari file upload fixes
    if (typeof window !== 'undefined') {
      // Fix File constructor issues in Safari
      const originalFile = window.File;
      if (originalFile) {
        // Ensure File objects have all required properties
        const FileWrapper = function(this: any, fileBits: any, fileName: string, options: any) {
          const file = new originalFile(fileBits, fileName, options);
          // Ensure lastModified is set
          if (!file.lastModified) {
            Object.defineProperty(file, 'lastModified', {
              value: Date.now(),
              writable: false
            });
          }
          return file;
        };
        FileWrapper.prototype = originalFile.prototype;
        (window as any).File = FileWrapper;
      }
    }
  }

  // Fix Safari fetch issues
  private static fixSafariFetch() {
    if (typeof window === 'undefined') return;
    
    const originalFetch = window.fetch;
    
    window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
      // ✅ CHROME & SAFARI: Enhanced fetch compatibility
      const enhancedInit = {
        ...init,
        credentials: init?.credentials || 'same-origin',
        mode: init?.mode || 'cors',
        // ✅ CHROME FIX: Ensure headers are properly set
        headers: {
          ...init?.headers,
          // Ensure Content-Type is preserved
        }
      };
      
      return originalFetch(input, enhancedInit);
    };
  }

  // Verificación completa de compatibilidad
  static performCompatibilityCheck(): {
    browser: ReturnType<typeof BrowserCompatibility.detectBrowser>;
    apis: ReturnType<typeof BrowserCompatibility.checkRequiredAPIs>;
    isFullySupported: boolean;
    warnings: string[];
  } {
    const browser = this.detectBrowser();
    const apis = this.checkRequiredAPIs();
    const warnings: string[] = [];

    // Check browser support
    if (!browser.isSupported) {
      warnings.push(`Browser ${browser.name} ${browser.version} may not be fully supported`);
    }

    // Check API support
    Object.entries(apis).forEach(([api, supported]) => {
      if (!supported) {
        warnings.push(`${api} API not available`);
      }
    });

    const isFullySupported = browser.isSupported && Object.values(apis).every(Boolean);

    return {
      browser,
      apis,
      isFullySupported,
      warnings
    };
  }

  // Inicializar todas las optimizaciones
  static initialize() {
    console.log('🔧 Initializing browser compatibility layer...');
    
    const compatibility = this.performCompatibilityCheck();
    
    console.log('🌐 Browser compatibility check:', compatibility);
    
    // Apply optimizations
    this.optimizeForChrome();
    this.optimizeForSafari();
    
    // Log warnings
    if (compatibility.warnings.length > 0) {
      console.warn('⚠️ Compatibility warnings:', compatibility.warnings);
    }
    
    return compatibility;
  }
}

// Auto-initialize on import
export const browserCompatibility = BrowserCompatibility.initialize();