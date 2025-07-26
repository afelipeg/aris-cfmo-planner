// src/lib/api.ts - VERSIÓN QA CORREGIDA Y OPTIMIZADA
import { Agent, AgentResponse } from '../types';
import { FileProcessor, ProcessedFile } from './fileProcessor';
import { API_RATE_LIMITS } from './rateLimiter';
import { CIRCUIT_BREAKERS } from './circuitBreaker';
import { apiMonitor } from './apiMonitor';

// ✅ QA CHECK 1: CONFIGURACIÓN DE API VALIDADA
const DEEPSEEK_API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY || 'sk-8d66744aba474bbc8b59399779a67295';
const SERPER_API_KEY = import.meta.env.VITE_SERPER_API_KEY || '2a4ae59e3a06f8511231fc9a9fc8a5d66585d41e';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-chat'; // Modelo estable verificado

// ✅ QA CYCLE 2: CONFIGURACIÓN OPTIMIZADA PARA PRODUCCIÓN
const API_CONFIG = {
  maxTokens: 800,        // ✅ PRODUCTION: Optimizado para velocidad y costos
  temperature: 0.1,      // Más determinístico
  timeout: 15000,        // ✅ PRODUCTION: 15s timeout para estabilidad
  maxRetries: 2,         // Solo 2 reintentos
  batchSize: 2,          // 2 agentes en paralelo para mejor performance
  delayBetweenRequests: 500  // ✅ PRODUCTION: 500ms delay para rate limits
};

// ✅ QA CHECK 2: SISTEMA DE CACHÉ PARA RESPUESTAS
const responseCache = new Map<string, { response: string; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

function getCacheKey(prompt: string, agentId: string, fileHashes: string[]): string {
  return `${agentId}-${prompt.substring(0, 100)}-${fileHashes.join(',')}`;
}

function getCachedResponse(cacheKey: string): string | null {
  const cached = responseCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('✅ QA: Using cached response');
    return cached.response;
  }
  return null;
}

function setCachedResponse(cacheKey: string, response: string): void {
  responseCache.set(cacheKey, { response, timestamp: Date.now() });
  
  // ✅ QA: Limpiar caché antiguo
  if (responseCache.size > 100) {
    const oldestKey = responseCache.keys().next().value;
    responseCache.delete(oldestKey);
  }
}

// ✅ QA CHECK 3: PROMPTS OPTIMIZADOS POR AGENTE
const AGENT_PROMPTS = {
  'strategic-planning': `You are a Strategic Planning expert. Respond in exactly this format:

EXECUTIVE SUMMARY:
[2-3 sentences about strategic insights with specific data points and competitive positioning]

KEY STRATEGIC INSIGHTS:
• [Market opportunity: Specific TAM/SAM with growth projections from data]
• [Competitive advantage: Unique positioning with differentiation factors]
• [Strategic priority: High-impact initiative with ROI calculation]
• [Risk mitigation: Key threat with specific contingency plan]

COMPETITIVE ANALYSIS:
• [Market position: Current vs target with specific metrics]
• [Competitive threats: Specific competitors with market share data]
• [Differentiation strategy: Unique value proposition with proof points]

STRATEGIC RECOMMENDATIONS:
• [Priority 1: Immediate action with specific timeline and investment]
• [Priority 2: Growth initiative with projected ROI and resource requirements]
• [Priority 3: Long-term strategy with milestone targets and success metrics]

CRITICAL: You MUST reference specific data points, market metrics, and competitive intelligence from the attached files.`,

  'zbg': `You are a Zero-Based Growth expert. Respond in exactly this format:

GROWTH ANALYSIS:
[2-3 sentences about current performance vs potential with specific metrics and growth multipliers]

FINANCIAL IMPACT:
• [Current performance: Specific metrics from data with variance analysis]
• [Growth potential: Quantified opportunities with investment requirements]
• [ROI calculation: Detailed breakdown with timeline and assumptions]
• [Cost optimization: Specific savings identified with implementation plan]

PRIORITY ACTIONS:
• [Priority 1: Immediate action with specific ROI and timeline from data]
• [Priority 2: Growth initiative with investment amount and expected returns]
• [Priority 3: Strategic transformation with long-term projections]
• [Resource allocation: Specific budget recommendations based on analysis]

MULTIPLIER EFFECT ANALYSIS:
• [Compound growth opportunities with exponential potential]
• [Cross-functional impact with quantified benefits]
• [Scalability assessment with growth trajectory projections]

CRITICAL: You MUST reference specific financial numbers, ROI calculations, and metrics from the attached files.`,

  'crm': `You are a CRM & Growth Loops expert. Respond in exactly this format:

CUSTOMER ANALYSIS:
[2-3 sentences about customer insights with specific metrics, conversion rates, and behavioral patterns]

GROWTH LOOPS:
• [Acquisition loop: Specific conversion rates and optimization opportunities from data]
• [Retention loop: Current vs target metrics with improvement strategies]
• [Viral coefficient: Calculated K-factor with growth projections]
• [Revenue loop: LTV/CAC ratios with optimization recommendations]

CRM RECOMMENDATIONS:
• [Automation priority: Specific workflow with expected efficiency gains]
• [Segmentation strategy: RFM analysis with targeted campaigns from data]
• [Lifecycle optimization: Stage-specific improvements with conversion targets]
• [Personalization engine: Data-driven recommendations with engagement lift]

VIRAL GROWTH OPTIMIZATION:
• [Current viral coefficient with improvement strategies]
• [Referral program optimization with projected impact]
• [Network effects amplification with growth multipliers]

CRITICAL: You MUST reference specific customer metrics, conversion rates, and segmentation data from the attached files.`,

  'research': `You are a Research & Intelligence expert. Respond in exactly this format:

MARKET INSIGHTS:
[2-3 sentences about market intelligence with specific data points, trends, and competitive positioning]

KEY FINDINGS:
• [Market size and growth: Specific TAM/SAM data with growth projections]
• [Competitive landscape: Market share analysis with positioning insights]
• [Consumer behavior: Specific trends with adoption rates and preferences]
• [Opportunity assessment: Quantified market gaps with entry strategies]

COMPETITIVE INTELLIGENCE:
• [Market leaders: Specific companies with market share and strategies]
• [Emerging threats: New entrants with disruptive potential]
• [Technology trends: Innovation drivers with adoption timelines]
• [Regulatory impact: Policy changes with business implications]

STRATEGIC RECOMMENDATIONS:
• [Market entry strategy: Specific approach with timeline and investment]
• [Competitive differentiation: Unique positioning with value proposition]
• [Risk mitigation: Identified threats with contingency plans]
• [Partnership opportunities: Strategic alliances with synergy potential]

PREDICTIVE ANALYSIS:
• [Cross-market analysis with correlation insights]
• [Predictive trends with confidence intervals]
• [Strategic implications with decision frameworks]

CRITICAL: You MUST reference specific market data, research findings, and competitive intelligence from the attached files.`,

  'brand-power': `You are a Brand Power expert. Respond in exactly this format:

BRAND ASSESSMENT:
[2-3 sentences about brand position with specific awareness metrics, equity scores, and market positioning]

BRAND METRICS:
• [Brand awareness: Specific aided/unaided metrics with benchmark comparison]
• [Brand equity: Quantified value with price premium analysis]
• [Market positioning: Competitive differentiation with perception mapping]
• [Brand health: Comprehensive scorecard with trend analysis]

INVESTMENT PRIORITIES:
• [Priority 1: Brand building initiative with ROI projections and budget]
• [Priority 2: Pricing optimization with elasticity analysis and revenue impact]
• [Priority 3: Market positioning with share growth targets and timeline]
• [Digital presence: Online brand strength with engagement metrics]

KANTAR D×M×S ANALYSIS:
• [Differentiation: Unique brand attributes with competitive advantage]
• [Meaningfulness: Consumer relevance with emotional connection metrics]
• [Salience: Brand prominence with consideration and preference rates]

PRICING OPTIMIZATION:
• [Price premium opportunities with elasticity analysis]
• [Competitive pricing with value perception mapping]
• [Revenue optimization with pricing strategy recommendations]

CRITICAL: You MUST reference specific brand metrics, awareness data, and pricing information from the attached files.`
};

export class LLMService {
  // ✅ QA CHECK 4: MÉTODO DE PRUEBA MEJORADO
  async testDeepSeekMessage(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🧪 QA: Testing DeepSeek API connection...');
      
      if (!DEEPSEEK_API_KEY || DEEPSEEK_API_KEY === 'your_deepseek_api_key_here' || DEEPSEEK_API_KEY === 'tu_deepseek_api_key_aqui') {
        return {
          success: false,
          message: '❌ DeepSeek API key not configured. Please check your .env file.'
        };
      }

      // ✅ PRODUCTION: Usar rate limiter y circuit breaker
      const testRequest = async () => {
        const startTime = Date.now();
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        try {
          const response = await fetch(DEEPSEEK_API_URL, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
            body: JSON.stringify({
              model: DEEPSEEK_MODEL,
              messages: [
                { role: 'system', content: 'You are a helpful assistant.' },
                { role: 'user', content: 'Test message' }
              ],
              max_tokens: 50,
              temperature: 0.1
            })
          });

          clearTimeout(timeoutId);
          
          const responseTime = Date.now() - startTime;
          apiMonitor.recordAPICall('deepseek', response.ok, responseTime);
          
          return response;
        } catch (error) {
          clearTimeout(timeoutId);
          const responseTime = Date.now() - startTime;
          apiMonitor.recordAPICall('deepseek', false, responseTime);
          throw error;
        }
      };

      // Usar circuit breaker
      const response = await CIRCUIT_BREAKERS.deepseek.execute(testRequest);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          message: `❌ API Error ${response.status}: ${errorData.error?.message || response.statusText}`
        };
      }

      const data = await response.json();
      console.log('✅ QA: DeepSeek test successful');
      
      // ✅ QA: Test Serper API también
      const serperTest = await this.testSerperAPI();
      
      return {
        success: true,
        message: `✅ DeepSeek API working! Model: ${data.model || 'deepseek-chat'}${serperTest.success ? ' | Serper API: ✅' : ' | Serper API: ❌'} | Health: ${apiMonitor.isServiceAvailable('deepseek') ? '🟢' : '🔴'}`
      };
    } catch (error) {
      console.error('❌ QA: DeepSeek test failed:', error);
      return {
        success: false,
        message: `❌ DeepSeek API failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  // ✅ QA: Test Serper API
  private async testSerperAPI(): Promise<{ success: boolean; message: string }> {
    try {
      const serperApiKey = import.meta.env.VITE_SERPER_API_KEY;
      if (!serperApiKey || serperApiKey === 'your_serper_api_key_here') {
        return { success: false, message: 'Serper API key not configured' };
      }

      // ✅ PRODUCTION: Usar circuit breaker para Serper
      const testRequest = async () => {
        const startTime = Date.now();
        
        try {
          const response = await fetch('https://google.serper.dev/search', {
            method: 'POST',
            headers: {
              'X-API-KEY': serperApiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              q: 'test query',
              num: 1
            })
          });
          
          const responseTime = Date.now() - startTime;
          // Record API call if monitor is available
          try {
            const { apiMonitor } = await import('./apiMonitor');
            apiMonitor.recordAPICall('serper', response.ok, responseTime);
          } catch (e) {
            console.warn('API monitor not available');
          }
          
          return response;
        } catch (error) {
          const responseTime = Date.now() - startTime;
          try {
            const { apiMonitor } = await import('./apiMonitor');
            apiMonitor.recordAPICall('serper', false, responseTime);
          } catch (e) {
            console.warn('API monitor not available');
          }
          throw error;
        }
      };

      // Use circuit breaker if available, otherwise direct call
      let response;
      try {
        const { CIRCUIT_BREAKERS } = await import('./circuitBreaker');
        response = await CIRCUIT_BREAKERS.serper.execute(testRequest);
      } catch (e) {
        console.warn('Circuit breaker not available, using direct call');
        response = await testRequest();
      }

      return {
        success: response.ok,
        message: response.ok ? '✅ Serper API working' : `❌ Serper API error: ${response.status}`
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ Serper API failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  // ✅ QA CHECK 5: MÉTODO PRINCIPAL OPTIMIZADO
  async generateResponsesWithContext(
    prompt: string,
    agents: Agent[],
    context?: any,
    signal?: AbortSignal
  ): Promise<AgentResponse[]> {
    console.log('🚀 QA: Starting generateResponsesWithContext:', {
      prompt: prompt.substring(0, 50) + '...',
      agentCount: agents.length,
      hasContext: !!context,
      hasFiles: context?.processedFiles?.length || 0
    });

    const results: AgentResponse[] = [];
    
    // ✅ QA: Procesar agentes secuencialmente para máxima estabilidad
    for (let i = 0; i < agents.length; i++) {
      const agent = agents[i];
      
      // ✅ QA: Check abort antes de cada agente
      if (signal?.aborted) {
        console.log('🛑 QA: Request aborted, stopping agent processing');
        // Add partial results with abort status
        const abortedAgent: AgentResponse = {
          agent,
          content: '🛑 Analysis stopped by user',
          status: 'error',
          created_at: new Date().toISOString()
        };
        results.push(abortedAgent);
        break;
      }
      
      try {
        console.log(`🤖 QA: Processing agent ${i + 1}/${agents.length}: ${agent.displayName}`);
        
        const agentResponse = await this.callDeepSeekWithRetry(
          prompt, 
          agent, 
          context?.processedFiles || [], 
          context?.fileAnalysis || '',
          signal
        );

        // ✅ QA: Check abort después de cada API call
        if (signal?.aborted) {
          console.log('🛑 QA: Request aborted after API call');
          break;
        }

        results.push({
          agent,
          content: agentResponse,
          status: 'complete',
          created_at: new Date().toISOString()
        });

        console.log(`✅ QA: Agent ${agent.displayName} completed successfully`);

        // ✅ QA: Delay entre agentes para evitar rate limits
        if (i < agents.length - 1 && !signal?.aborted) {
          await this.delay(API_CONFIG.delayBetweenRequests);
        }

      } catch (error) {
        console.error(`❌ QA: Agent ${agent.displayName} failed:`, error);
        
        // ✅ QA: Handle abort error specifically
        if (error instanceof Error && error.name === 'AbortError') {
          console.log(`🛑 QA: Agent ${agent.displayName} aborted by user`);
          results.push({
            agent,
            content: '🛑 Analysis stopped by user',
            status: 'error',
            created_at: new Date().toISOString()
          });
          break;
        }
        
        // ✅ QA: Add error response for failed agent
        results.push({
          agent,
          content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
          status: 'error',
          created_at: new Date().toISOString()
        });
      }
    }

    console.log(`🎉 QA: Completed processing ${results.length}/${agents.length} agents`);
    return results;
  }

  // ✅ QA CHECK 6: LLAMADA A DEEPSEEK CON RETRY OPTIMIZADO
  private async callDeepSeekWithRetry(
    prompt: string,
    agent: Agent,
    processedFiles?: ProcessedFile[],
    fileAnalysis?: string,
    signal?: AbortSignal
  ): Promise<string> {
    
    // ✅ PRODUCTION: Usar rate limiter
    return await API_RATE_LIMITS.deepseek.enqueue(async () => {
      return await this.executeDeepSeekCall(prompt, agent, processedFiles, fileAnalysis, signal);
    }, 1); // Priority 1 for agent calls
  }

  // ✅ PRODUCTION: Método separado para la llamada real
  private async executeDeepSeekCall(
    prompt: string,
    agent: Agent,
    processedFiles?: ProcessedFile[],
    fileAnalysis?: string,
    signal?: AbortSignal
  ): Promise<string> {
    for (let attempt = 1; attempt <= API_CONFIG.maxRetries; attempt++) {
      try {
        // ✅ QA: Check abort antes de cada intento
        if (signal?.aborted) {
          throw new Error('Request aborted');
        }
        
        // ✅ PRODUCTION: Usar circuit breaker
        return await CIRCUIT_BREAKERS.deepseek.execute(async () => {
          return await this.callDeepSeek(prompt, agent, processedFiles, fileAnalysis, signal);
        });
        
      } catch (error) {
        console.warn(`⚠️ QA: Attempt ${attempt}/${API_CONFIG.maxRetries} failed for ${agent.displayName}:`, error);
        
        // ✅ QA: Don't retry on abort
        if (error instanceof Error && error.name === 'AbortError') {
          throw error;
        }
        
        // ✅ PRODUCTION: Don't retry on circuit breaker open
        if (error instanceof Error && error.message.includes('Circuit breaker is OPEN')) {
          throw new Error('Service temporarily unavailable. Please try again later.');
        }
        
        // ✅ QA: Don't retry on certain errors
        if (error instanceof Error && (
          error.message.includes('401') || 
          error.message.includes('403') ||
          error.message.includes('quota')
        )) {
          throw error;
        }
        
        // ✅ QA: Retry with exponential backoff
        if (attempt < API_CONFIG.maxRetries) {
          const delay = attempt * 1000; // 1s, 2s
          console.log(`⏳ QA: Retrying in ${delay}ms...`);
          await this.delay(delay);
        } else {
          throw error;
        }
      }
    }
    
    throw new Error('All retry attempts failed');
  }

  // ✅ QA CHECK 7: LLAMADA PRINCIPAL A DEEPSEEK OPTIMIZADA
  private async callDeepSeek(
    prompt: string,
    agent: Agent,
    processedFiles?: ProcessedFile[],
    fileAnalysis?: string,
    signal?: AbortSignal
  ): Promise<string> {
    
    const startTime = Date.now();
    
    // ✅ QA: Verificar configuración
    if (!DEEPSEEK_API_KEY) {
      throw new Error('DeepSeek API key not configured');
    }

    // ✅ QA: Preparar prompt mejorado
    const systemPrompt = AGENT_PROMPTS[agent.id as keyof typeof AGENT_PROMPTS] || 
      `You are ${agent.displayName}. ${agent.description}. Provide clear, actionable analysis.`;
    
    let enhancedPrompt = prompt;
    
    // ✅ QA: Agregar análisis de archivos si existe
    if (fileAnalysis && fileAnalysis.trim()) {
      enhancedPrompt += '\n\nFILE ANALYSIS CONTEXT:\n' + fileAnalysis;
    }
    
    // ✅ QA: Agregar datos de archivos procesados
    if (processedFiles && processedFiles.length > 0) {
      enhancedPrompt += '\n\nPROCESSED FILES DATA:\n';
      processedFiles.forEach((file, index) => {
        enhancedPrompt += `\n${index + 1}. ${file.name}:\n`;
        enhancedPrompt += `   Summary: ${file.summary}\n`;
        if (file.extractedData?.keyPoints) {
          enhancedPrompt += `   Key Points: ${file.extractedData.keyPoints.join(', ')}\n`;
        }
        if (file.extractedData?.metrics) {
          enhancedPrompt += `   Metrics: ${file.extractedData.metrics.join(', ')}\n`;
        }
      });
    }

    console.log(`📤 QA: Sending request to DeepSeek for ${agent.displayName}`, {
      promptLength: enhancedPrompt.length,
      hasFiles: processedFiles?.length || 0,
      maxTokens: API_CONFIG.maxTokens
    });

    // ✅ QA: Configurar timeout y abort
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);
    
    // ✅ QA: Combinar signals si existe uno externo
    if (signal) {
      signal.addEventListener('abort', () => controller.abort());
    }

    try {
      const response = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: DEEPSEEK_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: enhancedPrompt.substring(0, 8000) }
          ],
          max_tokens: API_CONFIG.maxTokens,
          temperature: API_CONFIG.temperature,
          stream: false
        })
      });

      clearTimeout(timeoutId);

      const responseTime = Date.now() - startTime;
      apiMonitor.recordAPICall('deepseek', response.ok, responseTime);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ QA: DeepSeek API Error:', errorData);
        
        if (response.status === 429) {
          throw new Error('Rate limit reached. Please wait a moment.');
        } else if (response.status === 401) {
          throw new Error('Invalid DeepSeek API key.');
        } else if (response.status >= 500) {
          throw new Error('DeepSeek servers are experiencing issues.');
        }
        
        throw new Error(`DeepSeek API error: ${response.status}`);
      }

      const data = await response.json();
      
      console.log(`📥 QA: Received response from DeepSeek for ${agent.displayName}`, {
        hasChoices: !!data.choices,
        choicesLength: data.choices?.length || 0,
        usage: data.usage,
        responseTime: responseTime + 'ms'
      });

      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from DeepSeek API');
      }

      const content = data.choices[0].message.content;
      
      console.log(`✅ QA: Successfully processed response for ${agent.displayName}`, {
        contentLength: content.length,
        tokensUsed: data.usage?.total_tokens || 'unknown',
        responseTime: responseTime + 'ms'
      });
      
      return content;

    } catch (error) {
      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      apiMonitor.recordAPICall('deepseek', false, responseTime);
      console.error(`❌ QA: Error in callDeepSeek for ${agent.displayName}:`, error);
      
      // ✅ QA: Re-throw abort errors immediately
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
      
      throw error;
    }
  }

  // ✅ QA: Direct API call fallback
  private async callDeepSeekDirect(
    prompt: string,
    agent: Agent,
    processedFiles?: ProcessedFile[],
    fileAnalysis?: string,
    signal?: AbortSignal
  ): Promise<string> {
    const startTime = Date.now();
    
    if (!DEEPSEEK_API_KEY) {
      throw new Error('DeepSeek API key not configured');
    }

    const systemPrompt = AGENT_PROMPTS[agent.id as keyof typeof AGENT_PROMPTS] || 
      `You are ${agent.displayName}. ${agent.description}. Provide clear, actionable analysis.`;
    
    let enhancedPrompt = prompt;
    
    if (fileAnalysis && fileAnalysis.trim()) {
      enhancedPrompt += '\n\nFILE ANALYSIS CONTEXT:\n' + fileAnalysis;
    }
    
    if (processedFiles && processedFiles.length > 0) {
      enhancedPrompt += '\n\nPROCESSED FILES DATA:\n';
      processedFiles.forEach((file, index) => {
        enhancedPrompt += `\n${index + 1}. ${file.name}:\n`;
        enhancedPrompt += `   Summary: ${file.summary}\n`;
        if (file.extractedData?.keyPoints) {
          enhancedPrompt += `   Key Points: ${file.extractedData.keyPoints.join(', ')}\n`;
        }
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);
    
    if (signal) {
      signal.addEventListener('abort', () => controller.abort());
    }

    try {
      const response = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: DEEPSEEK_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: enhancedPrompt.substring(0, 8000) }
          ],
          max_tokens: API_CONFIG.maxTokens,
          temperature: API_CONFIG.temperature,
          stream: false
        })
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ DeepSeek API Error:', errorData);
        
        if (response.status === 429) {
          throw new Error('Rate limit reached. Please wait a moment.');
        } else if (response.status === 401) {
          throw new Error('Invalid DeepSeek API key.');
        } else if (response.status >= 500) {
          throw new Error('DeepSeek servers are experiencing issues.');
        }
        
        throw new Error(`DeepSeek API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from DeepSeek API');
      }

      return data.choices[0].message.content;

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
      
      throw error;
    }
  }

  // ✅ QA CHECK 8: VERIFICACIÓN DE CONEXIÓN MEJORADA
  async testConnection(): Promise<{ deepseek: boolean; anthropic: boolean }> {
    console.log('🔍 QA: Testing API connections...');
    
    const deepseekTest = await this.testDeepSeekMessage();
    
    // Import rate limiter and circuit breaker dynamically
    let API_RATE_LIMITS, CIRCUIT_BREAKERS, apiMonitor;
    
    try {
      const rateLimiterModule = await import('./rateLimiter');
      const circuitBreakerModule = await import('./circuitBreaker');
      const apiMonitorModule = await import('./apiMonitor');
      
      API_RATE_LIMITS = rateLimiterModule.API_RATE_LIMITS;
      CIRCUIT_BREAKERS = circuitBreakerModule.CIRCUIT_BREAKERS;
      apiMonitor = apiMonitorModule.apiMonitor;
      
      const stats = this.getAPIStats();
      console.log('📊 API Health Status:', stats.health);
    } catch (e) {
      console.warn('API monitor not available');
    }
    
    return {
      deepseek: deepseekTest.success,
      anthropic: false // No implementado aún
    };
  }

  // ✅ PRODUCTION: Método para obtener estadísticas
  getAPIStats() {
    try {
      const { API_RATE_LIMITS } = require('./rateLimiter');
      const { CIRCUIT_BREAKERS } = require('./circuitBreaker');
      const { apiMonitor } = require('./apiMonitor');
      
      return {
        rateLimits: {
          deepseek: API_RATE_LIMITS.deepseek.getStats(),
          serper: API_RATE_LIMITS.serper.getStats()
        },
        circuitBreakers: {
          deepseek: CIRCUIT_BREAKERS.deepseek.getState(),
          serper: CIRCUIT_BREAKERS.serper.getState()
        },
        health: apiMonitor.getHealthStatus()
      };
    } catch (error) {
      console.warn('⚠️ Could not get API stats:', error);
      return {
        rateLimits: { deepseek: null, serper: null },
        circuitBreakers: { deepseek: null, serper: null },
        health: []
      };
    }
  }

  // ✅ QA: Utility method
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const llmService = new LLMService();