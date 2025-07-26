// src/lib/rateLimiter.ts - Sistema de Rate Limiting y Queue
export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  queueSize: number;
  retryDelay: number;
}

export interface QueuedRequest {
  id: string;
  timestamp: number;
  priority: number;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  request: () => Promise<any>;
}

export class RateLimiter {
  private requests: number[] = [];
  private queue: QueuedRequest[] = [];
  private processing = false;
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
    this.startQueueProcessor();
  }

  // Verificar si podemos hacer una request
  canMakeRequest(): boolean {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.config.windowMs);
    return this.requests.length < this.config.maxRequests;
  }

  // Agregar request a la queue
  async enqueue<T>(request: () => Promise<T>, priority = 0): Promise<T> {
    return new Promise((resolve, reject) => {
      if (this.queue.length >= this.config.queueSize) {
        reject(new Error('Queue is full. Please try again later.'));
        return;
      }

      const queuedRequest: QueuedRequest = {
        id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        priority,
        resolve,
        reject,
        request
      };

      // Insertar por prioridad
      const insertIndex = this.queue.findIndex(item => item.priority < priority);
      if (insertIndex === -1) {
        this.queue.push(queuedRequest);
      } else {
        this.queue.splice(insertIndex, 0, queuedRequest);
      }

      console.log(`📋 Request queued: ${queuedRequest.id}, Queue size: ${this.queue.length}`);
    });
  }

  // Procesar queue
  private async startQueueProcessor() {
    setInterval(async () => {
      if (this.processing || this.queue.length === 0) return;

      if (this.canMakeRequest()) {
        this.processing = true;
        const queuedRequest = this.queue.shift();
        
        if (queuedRequest) {
          try {
            console.log(`⚡ Processing request: ${queuedRequest.id}`);
            this.requests.push(Date.now());
            
            const result = await queuedRequest.request();
            queuedRequest.resolve(result);
            
            console.log(`✅ Request completed: ${queuedRequest.id}`);
          } catch (error) {
            console.error(`❌ Request failed: ${queuedRequest.id}`, error);
            queuedRequest.reject(error);
          }
        }
        
        this.processing = false;
      }
    }, 100); // Check every 100ms
  }

  // Obtener estadísticas
  getStats() {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.config.windowMs);
    
    return {
      currentRequests: this.requests.length,
      maxRequests: this.config.maxRequests,
      queueSize: this.queue.length,
      maxQueueSize: this.config.queueSize,
      canMakeRequest: this.canMakeRequest()
    };
  }
}

// Configuraciones por API - Initialize lazily to avoid reference errors
let _API_RATE_LIMITS: any = null;

export const API_RATE_LIMITS = {
  get deepseek() {
    if (!_API_RATE_LIMITS) {
      _API_RATE_LIMITS = {
        deepseek: new RateLimiter({
          maxRequests: 50,
          windowMs: 60 * 1000,
          queueSize: 100,
          retryDelay: 1000
        }),
        serper: new RateLimiter({
          maxRequests: 10,
          windowMs: 60 * 1000,
          queueSize: 50,
          retryDelay: 2000
        })
      };
    }
    return _API_RATE_LIMITS.deepseek;
  },
  
  get serper() {
    if (!_API_RATE_LIMITS) {
      _API_RATE_LIMITS = {
        deepseek: new RateLimiter({
          maxRequests: 50,
          windowMs: 60 * 1000,
          queueSize: 100,
          retryDelay: 1000
        }),
        serper: new RateLimiter({
          maxRequests: 10,
          windowMs: 60 * 1000,
          queueSize: 50,
          retryDelay: 2000
        })
      };
    }
    return _API_RATE_LIMITS.serper;
  }
};