// supabase/functions/run_all_agents/index.ts
import { corsHeaders } from "../_shared/cors.ts";

// Tipos para TypeScript
interface Agent {
  id: string;
  name: string;
  displayName: string;
  description: string;
  color: string;
  icon: string;
}

interface AgentResponse {
  agent: Agent;
  content: string;
  status: 'pending' | 'complete' | 'error';
  created_at: string;
}

interface RequestBody {
  prompt: string;
  agents: Agent[];
  files?: any[];
}

// Configuración actualizada para DeepSeek Reasoner
const DEEPSEEK_MODEL = 'deepseek-reasoner'; // Modelo más actualizado
const DEEPSEEK_API_KEY = "sk-8d66744aba474bbc8b59399779a67295";

// Configuración optimizada
const CONFIG = {
  maxTokens: 800,
  temperature: 0.2,
  timeout: 15000,
  batchSize: 3, // Procesar 3 agentes en paralelo
  delayBetweenBatches: 200,
  maxRetries: 2
};

// Prompts optimizados para DeepSeek Reasoner
const AGENT_PROMPTS = {
  'strategic-planning': `You are a top-tier strategy consultant using DeepSeek's advanced reasoning capabilities. Think step-by-step and provide strategic insights.

CRITICAL: Use systematic reasoning to analyze documents thoroughly and provide strategic insights. Be direct and specific.

Structure your response:
1. Executive Summary (2-3 sentences)
2. Key Strategic Insights (3 bullet points max)
3. Priority Actions (3 recommendations max)

Use tables when presenting data comparisons:
| Metric | Current | Target | Impact |
|--------|---------|--------|--------|
| ROI    | 15%     | 25%    | +10%   |

Keep responses under 400 words. Focus on high-impact, actionable insights.
Do NOT use ### or ** formatting. Use plain text with bullet points and tables only.`,

  'zbg': `You are a Senior Zero-Based Growth consultant using advanced reasoning. Think systematically about financial impact and growth optimization.

CRITICAL: Use step-by-step reasoning to focus on financial impact and growth optimization. Be specific and actionable.

Structure your response:
1. Power Couples Analysis (top revenue drivers)
2. Growth Model Assessment (key metrics)
3. Investment Reallocation (specific recommendations)

Use tables for financial data:
| Initiative | Investment | ROI | Timeline |
|------------|------------|-----|----------|
| Digital    | $100K      | 25% | 6 months |

Keep responses under 400 words. Focus on ROI and measurable outcomes.
Do NOT use ### or ** formatting. Use plain text with bullet points and tables only.`,

  'crm': `You are a Senior CRM & Growth Loop Specialist using advanced reasoning. Think analytically about customer metrics and growth loops.

CRITICAL: Use analytical reasoning to focus on customer metrics and growth loops. Be specific and actionable.

Structure your response:
1. Customer Segmentation (RFM analysis)
2. Growth Loop Optimization (viral coefficient)
3. Automation Recommendations (specific actions)

Use tables for customer data:
| Segment | Size | LTV  | Retention | Action |
|---------|------|------|-----------|--------|
| VIP     | 20%  | $500 | 95%       | Retain |

Keep responses under 400 words. Focus on customer lifetime value and retention.
Do NOT use ### or ** formatting. Use plain text with bullet points and tables only.`,

  'research': `You are a Chief Insights Officer using advanced reasoning. Think systematically about data-driven insights and market intelligence.

CRITICAL: Use systematic reasoning to focus on data-driven insights and market intelligence. Be specific and actionable.

Structure your response:
1. Key Market Insights (3 points max)
2. Competitive Analysis (brief overview)
3. Strategic Recommendations (3 actions max)

Use tables for market data:
| Market | Size | Growth | Opportunity | Priority |
|--------|------|--------|-------------|----------|
| US     | $1B  | 15%    | High        | 1        |

Keep responses under 400 words. Focus on actionable market intelligence.
Do NOT use ### or ** formatting. Use plain text with bullet points and tables only.`,

  'brand-power': `You are a Senior Brand Equity Consultant using advanced reasoning. Think analytically about brand power and pricing optimization.

CRITICAL: Use analytical reasoning to focus on brand power and pricing optimization. Be specific and actionable.

Structure your response:
1. Brand Power Assessment (D×M×S analysis)
2. Price Premium Opportunities (specific recommendations)
3. Investment Priorities (3 actions max)

Use tables for brand metrics:
| Brand Metric | Score | Benchmark | Gap  | Action |
|--------------|-------|-----------|------|--------|
| Awareness    | 75%   | 85%       | -10% | Invest |

Keep responses under 400 words. Focus on brand equity and pricing power.
Do NOT use ### or ** formatting. Use plain text with bullet points and tables only.`
};

// Función para obtener el prompt del agente
function getAgentPrompt(agent: Agent): string {
  return AGENT_PROMPTS[agent.id as keyof typeof AGENT_PROMPTS] || 
         `You are ${agent.displayName}. ${agent.description}. 

Use DeepSeek's advanced reasoning to provide clear, actionable analysis in under 300 words. Think step-by-step and focus on specific recommendations and strategic guidance.
Use tables when presenting data. Do NOT use ### or ** formatting. Use plain text with bullet points and tables only.`;
}

// Función principal optimizada con procesamiento paralelo
async function processAgentsParallel(prompt: string, agents: Agent[], files?: any[]): Promise<AgentResponse[]> {
  console.log(`🚀 Starting parallel processing for ${agents.length} agents with DeepSeek Reasoner`);
  
  const results: AgentResponse[] = [];
  const batchSize = CONFIG.batchSize;
  
  // Procesar agentes en lotes paralelos
  for (let i = 0; i < agents.length; i += batchSize) {
    const batch = agents.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(agents.length / batchSize);
    
    console.log(`⏳ Processing batch ${batchNumber}/${totalBatches} (${batch.length} agents)`);
    
    // Crear promesas para procesamiento paralelo (simula asyncio.gather)
    const batchPromises = batch.map(async (agent) => {
      const startTime = Date.now();
      
      try {
        console.log(`🧠 Starting ${agent.displayName} with DeepSeek Reasoner...`);
        
        const content = await callDeepSeekReasoner(prompt, agent, files);
        const endTime = Date.now();
        
        console.log(`✅ ${agent.displayName} completed in ${endTime - startTime}ms`);
        
        return {
          agent,
          content,
          status: 'complete' as const,
          created_at: new Date().toISOString()
        };
      } catch (error) {
        const endTime = Date.now();
        console.error(`❌ ${agent.displayName} failed after ${endTime - startTime}ms:`, error);
        
        return {
          agent,
          content: getErrorMessage(error),
          status: 'error' as const,
          created_at: new Date().toISOString()
        };
      }
    });

    // Ejecutar lote en paralelo
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Delay entre lotes para evitar rate limiting
    if (i + batchSize < agents.length) {
      await delay(CONFIG.delayBetweenBatches);
    }
  }
  
  return results;
}

// Llamada optimizada a DeepSeek Reasoner
async function callDeepSeekReasoner(prompt: string, agent: Agent, processedFiles?: any[]): Promise<string> {
  if (!DEEPSEEK_API_KEY) {
    throw new Error('DeepSeek API key not configured');
  }

  try {
    // Preparar prompt optimizado
    let enhancedPrompt = prompt;
    
    if (processedFiles && processedFiles.length > 0) {
      enhancedPrompt += '\n\nATTACHED FILES:\n';
      
      processedFiles.forEach((file) => {
        enhancedPrompt += `\n${file.name} (${file.type}): ${file.summary}\n`;
        if (file.content) {
          enhancedPrompt += `Content: ${file.content.substring(0, 800)}${file.content.length > 800 ? '...' : ''}\n`;
        }
      });
      
      enhancedPrompt += '\nANALYSIS REQUIRED: Use advanced reasoning to analyze the files and provide specific insights for your expertise area.\n';
    }
    
    // Configuración optimizada para DeepSeek Reasoner
    const requestBody = {
      model: DEEPSEEK_MODEL,
      messages: [
        {
          role: 'system',
          content: getAgentPrompt(agent)
        },
        {
          role: 'user',
          content: enhancedPrompt.substring(0, 5000)
        }
      ],
      max_tokens: CONFIG.maxTokens,
      temperature: CONFIG.temperature,
      stream: false,
      // Configuraciones específicas para reasoner
      reasoning_effort: 'medium' // Balancear velocidad vs calidad
    };

    // Llamada con timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeout);

    try {
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ DeepSeek Reasoner API Error:', errorData);
        
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
        throw new Error('No response from DeepSeek Reasoner API');
      }

      // Limpiar respuesta
      let content = data.choices[0].message.content;
      
      // Limpiar formato pero preservar tablas
      content = content
        .replace(/###\s*/g, '') // Remover ###
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remover ** pero mantener texto
        .replace(/\*([^*\n|]+)\*/g, '$1') // Remover * simples pero preservar tablas
        .trim();

      return content;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  } catch (error) {
    console.error('❌ DeepSeek Reasoner API error:', error);
    throw error;
  }
}

// Función de delay
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Mensaje de error mejorado
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes('quota')) {
      return 'DeepSeek quota exceeded. Please check your billing.';
    } else if (error.message.includes('timeout') || error.name === 'AbortError') {
      return 'Request timeout. Please try again.';
    } else if (error.message.includes('rate limit')) {
      return 'Rate limit reached. Please wait a moment.';
    } else {
      return `Error: ${error.message}`;
    }
  }
  return 'Unknown error occurred. Please try again.';
}

// Función principal del Edge Function
Deno.serve(async (req) => {
  // Manejar CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Validar método HTTP
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método no permitido' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Recibir y validar datos
    const body: RequestBody = await req.json();
    const { prompt, agents, files } = body;

    if (!prompt || !agents || agents.length === 0) {
      return new Response(
        JSON.stringify({ error: 'prompt y agents son requeridos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🚀 Processing ${agents.length} agents with DeepSeek Reasoner`);

    // Procesar agentes en paralelo
    const results = await processAgentsParallel(prompt, agents, files);
    
    const successCount = results.filter(r => r.status === 'complete').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    const totalTime = Date.now() - startTime;
    
    console.log(`📊 Results: ${successCount} successful, ${errorCount} errors in ${totalTime}ms`);

    // Retornar resultados
    return new Response(
      JSON.stringify({
        success: true,
        data: results,
        timestamp: new Date().toISOString(),
        stats: {
          total: agents.length,
          successful: successCount,
          errors: errorCount,
          processing_time_ms: totalTime,
          model_used: DEEPSEEK_MODEL
        }
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error('Error en run_all_agents:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Unknown error',
        processing_time_ms: totalTime
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
