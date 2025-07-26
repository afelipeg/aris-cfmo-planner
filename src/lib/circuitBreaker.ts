// src/lib/circuitBreaker.ts - Circuit Breaker Pattern
export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private successCount: number = 0;
  private config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime > this.config.recoveryTimeout) {
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
        console.log('🔄 Circuit breaker: OPEN → HALF_OPEN');
      } else {
        throw new Error('Circuit breaker is OPEN. Service temporarily unavailable.');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= 3) { // 3 successful calls to close
        this.state = CircuitState.CLOSED;
        console.log('✅ Circuit breaker: HALF_OPEN → CLOSED');
      }
    }
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      console.log('🚨 Circuit breaker: CLOSED → OPEN');
    }
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
      isAvailable: this.state !== CircuitState.OPEN || 
                   (Date.now() - this.lastFailureTime > this.config.recoveryTimeout)
    };
  }
}

// Circuit breakers por servicio - Initialize lazily
let _CIRCUIT_BREAKERS: any = null;

export const CIRCUIT_BREAKERS = {
  get deepseek() {
    if (!_CIRCUIT_BREAKERS) {
      _CIRCUIT_BREAKERS = {
        deepseek: new CircuitBreaker({
          failureThreshold: 5,
          recoveryTimeout: 30000,
          monitoringPeriod: 60000
        }),
        serper: new CircuitBreaker({
          failureThreshold: 3,
          recoveryTimeout: 60000,
          monitoringPeriod: 300000
        })
      };
    }
    return _CIRCUIT_BREAKERS.deepseek;
  },
  
  get serper() {
    if (!_CIRCUIT_BREAKERS) {
      _CIRCUIT_BREAKERS = {
        deepseek: new CircuitBreaker({
          failureThreshold: 5,
          recoveryTimeout: 30000,
          monitoringPeriod: 60000
        }),
        serper: new CircuitBreaker({
          failureThreshold: 3,
          recoveryTimeout: 60000,
          monitoringPeriod: 300000
        })
      };
    }
    return _CIRCUIT_BREAKERS.serper;
  }
};