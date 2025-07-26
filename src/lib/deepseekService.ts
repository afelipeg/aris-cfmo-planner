// src/lib/deepseekService.ts - Servicio unificado DeepSeek Reasoner
export interface DeepSeekResponse {
  success: boolean;
  content?: string;
  error?: string;
  reasoning?: string;
  metadata?: {
    model: string;
    tokens_used: number;
    response_time: number;
  };
}

export interface DeepSeekPlannerRequest {
  message: string;
  files?: File[];
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

export class DeepSeekService {
  private static readonly API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY || 'sk-8d66744aba474bbc8b59399779a67295';
  private static readonly API_URL = 'https://api.deepseek.com/v1/chat/completions';
  private static readonly MODEL = 'deepseek-reasoner';
  
  // Test connection
  static async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🧪 Testing DeepSeek Reasoner connection...');
      
      if (!this.API_KEY || this.API_KEY === 'your_deepseek_api_key_here') {
        return {
          success: false,
          message: '❌ DeepSeek API key not configured. Please check your .env file.'
        };
      }

      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.MODEL,
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: 'Test message' }
          ],
          max_tokens: 50,
          temperature: 0.1
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          message: `❌ API Error ${response.status}: ${errorData.error?.message || response.statusText}`
        };
      }

      const data = await response.json();
      console.log('✅ DeepSeek Reasoner test successful');
      
      return {
        success: true,
        message: `✅ DeepSeek Reasoner working! Model: ${data.model || 'deepseek-reasoner'} | Advanced reasoning enabled`
      };
    } catch (error) {
      console.error('❌ DeepSeek test failed:', error);
      return {
        success: false,
        message: `❌ DeepSeek API failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Planner service using DeepSeek Reasoner
  static async sendPlannerMessage(request: DeepSeekPlannerRequest, signal?: AbortSignal): Promise<DeepSeekResponse> {
    const startTime = Date.now();
    
    try {
      console.log('📋 Sending planner message to DeepSeek Reasoner...');
      
      if (!this.API_KEY) {
        throw new Error('DeepSeek API key not configured');
      }

      // Prepare conversation context
      const messages = [
        {
          role: 'system',
          content: this.getPlannerSystemPrompt()
        }
      ];

      // Add conversation history
      if (request.conversationHistory) {
        messages.push(...request.conversationHistory);
      }

      // Add current message with file context
      let userMessage = request.message;
      if (request.files && request.files.length > 0) {
        userMessage += '\n\nARCHIVOS ADJUNTOS:\n';
        request.files.forEach((file, index) => {
          userMessage += `${index + 1}. ${file.name} (${file.type}, ${this.formatFileSize(file.size)})\n`;
        });
        userMessage += '\nAnaliza estos archivos y proporciona un plan estratégico detallado basado en su contenido.';
      }

      messages.push({
        role: 'user',
        content: userMessage
      });

      // Call DeepSeek Reasoner
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
      
      if (signal) {
        signal.addEventListener('abort', () => controller.abort());
      }

      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.API_KEY}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.MODEL,
          messages,
          max_tokens: 2000,
          temperature: 0.2,
          reasoning_effort: 'high', // Use high reasoning for planning
          stream: false
        })
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`DeepSeek API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const responseTime = Date.now() - startTime;

      console.log('✅ DeepSeek Reasoner planner response received');

      return {
        success: true,
        content: data.choices[0].message.content,
        reasoning: data.choices[0].message.reasoning_content || '',
        metadata: {
          model: data.model || this.MODEL,
          tokens_used: data.usage?.total_tokens || 0,
          response_time: responseTime
        }
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error('❌ DeepSeek planner error:', error);
      
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: 'Request cancelled by user',
          metadata: { model: this.MODEL, tokens_used: 0, response_time: responseTime }
        };
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: { model: this.MODEL, tokens_used: 0, response_time: responseTime }
      };
    }
  }

  // System prompt for planner
  private static getPlannerSystemPrompt(): string {
    return `Eres un Asistente de Planificación Estratégica Senior que usa DeepSeek Reasoner para análisis profundo.

CAPACIDADES AVANZADAS:
- Razonamiento paso a paso para planificación estratégica
- Análisis de documentos empresariales complejos
- Creación de planes detallados y roadmaps
- Evaluación de riesgos y oportunidades
- Recomendaciones basadas en mejores prácticas

METODOLOGÍA DE RAZONAMIENTO:
1. ANÁLISIS: Examina la situación actual y contexto
2. SÍNTESIS: Identifica patrones y oportunidades clave
3. ESTRATEGIA: Desarrolla plan estructurado y priorizado
4. IMPLEMENTACIÓN: Define pasos concretos y timeline
5. EVALUACIÓN: Establece métricas y puntos de control

FORMATO DE RESPUESTA:
Estructura tus respuestas de manera clara y accionable:

# RESUMEN EJECUTIVO
[Síntesis de 2-3 líneas del plan estratégico]

# ANÁLISIS DE SITUACIÓN
[Evaluación del contexto actual y factores clave]

# PLAN ESTRATÉGICO
## Objetivos Principales
- [Objetivo 1 con métricas específicas]
- [Objetivo 2 con timeline definido]
- [Objetivo 3 con recursos necesarios]

## Fases de Implementación
### Fase 1: [Nombre] (Timeline)
- Actividad específica 1
- Actividad específica 2
- Entregables y métricas

### Fase 2: [Nombre] (Timeline)
- Actividad específica 1
- Actividad específica 2
- Entregables y métricas

# RECURSOS Y PRESUPUESTO
[Estimaciones de recursos, tiempo y costos]

# RIESGOS Y MITIGACIÓN
[Principales riesgos identificados con planes de contingencia]

# MÉTRICAS DE ÉXITO
[KPIs específicos para medir el progreso]

INSTRUCCIONES ESPECÍFICAS:
- Usa razonamiento profundo para cada recomendación
- Sé específico con timelines, recursos y métricas
- Incluye consideraciones de riesgo en cada fase
- Proporciona alternativas cuando sea relevante
- Enfócate en implementación práctica y resultados medibles

Si se proporcionan archivos, analízalos detalladamente e incorpora insights específicos en el plan.`;
  }

  // Utility methods
  private static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export const deepseekService = DeepSeekService;