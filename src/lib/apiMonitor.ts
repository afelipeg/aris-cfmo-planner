// src/lib/apiMonitor.ts - API Health Monitoring
export interface APIHealth {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  lastCheck: number;
  errorRate: number;
  totalRequests: number;
  successfulRequests: number;
}

export class APIMonitor {
  private healthData: Map<string, APIHealth> = new Map();
  private monitoring = false;

  constructor() {
    this.initializeHealth();
    this.startMonitoring();
  }

  private initializeHealth() {
    const services = ['deepseek', 'serper'];
    services.forEach(service => {
      this.healthData.set(service, {
        service,
        status: 'healthy',
        responseTime: 0,
        lastCheck: 0,
        errorRate: 0,
        totalRequests: 0,
        successfulRequests: 0
      });
    });
  }

  // Registrar resultado de API call
  recordAPICall(service: string, success: boolean, responseTime: number) {
    const health = this.healthData.get(service);
    if (!health) return;

    health.totalRequests++;
    health.lastCheck = Date.now();
    health.responseTime = responseTime;

    if (success) {
      health.successfulRequests++;
    }

    // Calcular error rate (últimas 100 requests)
    health.errorRate = ((health.totalRequests - health.successfulRequests) / health.totalRequests) * 100;

    // Determinar status
    if (health.errorRate > 50) {
      health.status = 'down';
    } else if (health.errorRate > 20 || health.responseTime > 10000) {
      health.status = 'degraded';
    } else {
      health.status = 'healthy';
    }

    this.healthData.set(service, health);
    console.log(`📊 API Health [${service}]:`, {
      status: health.status,
      errorRate: health.errorRate.toFixed(1) + '%',
      responseTime: health.responseTime + 'ms'
    });
  }

  // Health check activo
  async performHealthCheck(service: string): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      let isHealthy = false;
      
      if (service === 'deepseek') {
        isHealthy = await this.checkDeepSeekHealth();
      } else if (service === 'serper') {
        isHealthy = await this.checkSerperHealth();
      }
      
      const responseTime = Date.now() - startTime;
      this.recordAPICall(service, isHealthy, responseTime);
      
      return isHealthy;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.recordAPICall(service, false, responseTime);
      return false;
    }
  }

  private async checkDeepSeekHealth(): Promise<boolean> {
    const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
    if (!apiKey) return false;

    try {
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: 'health check' }],
          max_tokens: 10
        })
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  private async checkSerperHealth(): Promise<boolean> {
    const apiKey = import.meta.env.VITE_SERPER_API_KEY;
    if (!apiKey) return false;

    try {
      const response = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: 'test',
          num: 1
        })
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  // Monitoreo continuo
  private startMonitoring() {
    if (this.monitoring) return;
    this.monitoring = true;

    // Health check cada 5 minutos
    setInterval(async () => {
      const services = ['deepseek', 'serper'];
      for (const service of services) {
        await this.performHealthCheck(service);
      }
    }, 5 * 60 * 1000);
  }

  // Obtener estado de salud
  getHealthStatus(): APIHealth[] {
    return Array.from(this.healthData.values());
  }

  // Verificar si un servicio está disponible
  isServiceAvailable(service: string): boolean {
    const health = this.healthData.get(service);
    return health ? health.status !== 'down' : false;
  }
}

// Initialize lazily to avoid reference errors
let _apiMonitor: APIMonitor | null = null;

export const apiMonitor = {
  recordAPICall(service: string, success: boolean, responseTime: number) {
    if (!_apiMonitor) {
      _apiMonitor = new APIMonitor();
    }
    return _apiMonitor.recordAPICall(service, success, responseTime);
  },
  
  async performHealthCheck(service: string) {
    if (!_apiMonitor) {
      _apiMonitor = new APIMonitor();
    }
    return _apiMonitor.performHealthCheck(service);
  },
  
  getHealthStatus() {
    if (!_apiMonitor) {
      _apiMonitor = new APIMonitor();
    }
    return _apiMonitor.getHealthStatus();
  },
  
  isServiceAvailable(service: string) {
    if (!_apiMonitor) {
      _apiMonitor = new APIMonitor();
    }
    return _apiMonitor.isServiceAvailable(service);
  }
};