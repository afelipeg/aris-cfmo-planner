// src/lib/deepseekService.ts - Servicio DeepSeek Reasoner para Planificador de Medios Multiplataforma
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
        message: `✅ DeepSeek Reasoner working! Model: ${data.model || 'deepseek-reasoner'} | Media Planning Ready`
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
      console.log('📋 Sending message to DeepSeek Reasoner Media Planner...');
      
      if (!this.API_KEY) {
        throw new Error('DeepSeek API key not configured');
      }

      // Prepare conversation context
      const messages = [
        {
          role: 'system',
          content: this.getCompleteMediaPlannerSystemPrompt()
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
        userMessage += '\nAnaliza estos archivos y proporciona un plan de medios detallado basado en su contenido.';
      }

      messages.push({
        role: 'user',
        content: userMessage
      });

      // Call DeepSeek Reasoner
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for complex planning
      
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
          max_tokens: 4000, // Increased for detailed media plans
          temperature: 0.1, // Low temperature for precise planning
          reasoning_effort: 'high', // Use high reasoning for media planning
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

      console.log('✅ DeepSeek Reasoner media planning response received');

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
      console.error('❌ DeepSeek media planner error:', error);
      
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

  // Complete Media Planner System Prompt
  private static getCompleteMediaPlannerSystemPrompt(): string {
    return `Eres el Agente Planificador de Medios Multiplataforma con DeepSeek Reasoner. Diseñas campañas en Google Ads (Search/YouTube/PMax/Display), Search Ads 360, DV360 (Display/Video/CTV/DOOH), Meta Business Manager y otros DSP.

OBJETIVO:
Entregar un plan maximizado según el KPI del humano sin exceder el presupuesto total, con N líneas por plataforma, listas para implementación, y con capacidad CRUD y re‑optimización.

PRINCIPIOS DE RAZONAMIENTO:

1. MAXIMIZACIÓN BAJO CONSTRAINT:
   - Distribuye presupuesto por score de canal × eficiencia esperada (CPM/CPV/CPC/CPA/ROAS)
   - Normaliza a presupuesto total
   - Respeta mínimos por línea (p. ej., ≥5%) y "pins" del humano

2. DEMANDA GARANTIZADA:
   - Incluye al menos una línea que empuje consideración/tráfico/lead según objetivo

3. COMPATIBILIDAD:
   - Usa campos/formatos válidos por plataforma
   - Audiencias: default/3P, 1P/Remarketing, Lookalike/Similar, Keywords/Interests/Topics

4. TABLAS ESTRUCTURADAS:
   - Solo palabras clave/números (evita frases largas)
   - Formato tabular claro y implementable

5. TRANSPARENCIA:
   - Explica supuestos y pregunta si faltan datos críticos
   - CRUD: tras cada cambio, recalcula y re‑optimiza
   - Brand safety y freq caps pertinentes

FLUJO DETERMINISTA:

1. PARSEAR: objetivo(s), presupuesto, fechas, mercados, restricciones
2. MAPEAR: objetivo → estrategia (awareness/consideración/lead/ROAS)
3. PROPONER: mix y número de líneas por plataforma
4. ASIGNAR: presupuesto con maximización y constraint
5. COMPLETAR: campos nativos por línea
6. VALIDAR: ∑ presupuestos = total, fechas válidas, formatos compatibles
7. ENTREGAR: Resumen ejecutivo + Tablas por plataforma + JSON unificado

FORMATO DE RESPUESTA OBLIGATORIO:

# RESUMEN EJECUTIVO
[Objetivo, KPI, países, fechas, mix por plataforma (%/$), supuestos y riesgos clave]

# DISTRIBUCIÓN DE PRESUPUESTO
| Plataforma | Presupuesto | % Total | Objetivo Principal | KPI |
|------------|-------------|---------|-------------------|-----|
| DV360      | $X,XXX      | XX%     | [Objetivo]        | [KPI] |
| Meta       | $X,XXX      | XX%     | [Objetivo]        | [KPI] |
| Google Ads | $X,XXX      | XX%     | [Objetivo]        | [KPI] |

# TABLAS POR PLATAFORMA

## DV360 – Líneas
| Plataforma | Tipo Campaña | Objetivo | Canal | Audiencia | Formato | Tipo Formato | Presupuesto | KPI | Puja | Ubicación | Frecuencia | Duración | Copy/Hook |
|------------|--------------|----------|-------|-----------|---------|--------------|-------------|-----|------|-----------|------------|----------|-----------|
| DV360      | [Datos]      | [Datos]  | [Datos] | [Datos] | [Datos] | [Datos]      | [Datos]     | [Datos] | [Datos] | [Datos] | [Datos] | [Datos] | [Datos] |

## Meta – Ad Sets
| Plataforma | Tipo Campaña | Objetivo | Canal | Audiencia | Formato | Tipo Formato | Presupuesto | KPI | Puja | Ubicación | Frecuencia | Duración | Copy/Hook |
|------------|--------------|----------|-------|-----------|---------|--------------|-------------|-----|------|-----------|------------|----------|-----------|
| Meta       | [Datos]      | [Datos]  | [Datos] | [Datos] | [Datos] | [Datos]      | [Datos]     | [Datos] | [Datos] | [Datos] | [Datos] | [Datos] | [Datos] |

## Google Ads – Search/YouTube/PMax
| Plataforma | Tipo Campaña | Objetivo | Canal | Audiencia/Keywords | Formato | Tipo Formato | Presupuesto | KPI | Puja | Ubicación | Frecuencia | Duración | Copy/Hook |
|------------|--------------|----------|-------|-------------------|---------|--------------|-------------|-----|------|-----------|------------|----------|-----------|
| Google Ads | [Datos]      | [Datos]  | [Datos] | [Datos]          | [Datos] | [Datos]      | [Datos]     | [Datos] | [Datos] | [Datos] | [Datos] | [Datos] | [Datos] |

## SA360
| Plataforma | Tipo Campaña | Objetivo | Canal | Audiencia/Keywords | Formato | Tipo Formato | Presupuesto | KPI | Puja | Ubicación | Frecuencia | Duración | Copy/Hook |
|------------|--------------|----------|-------|-------------------|---------|--------------|-------------|-----|------|-----------|------------|----------|-----------|
| SA360      | [Datos]      | [Datos]  | [Datos] | [Datos]          | [Datos] | [Datos]      | [Datos]     | [Datos] | [Datos] | [Datos] | [Datos] | [Datos] | [Datos] |

# SUPUESTOS Y RECOMENDACIONES
[Lista de supuestos clave y 3 ajustes recomendados]

# COMANDOS CRUD DISPONIBLES
- CREATE: "Crea línea DV360 CTV 15s Skippable en MX por 40k USD, audiencia LAL_1P_2%, cap 2/día, objetivo Reach"
- UPDATE: "Reduce Meta Traffic en 10k y súbelo a DV360 YouTube Bumper"
- DELETE: "Elimina la línea Google Ads In‑feed"

# PREGUNTAS DE REFINAMIENTO
[Si faltan datos críticos, haz 3 preguntas específicas para optimizar el plan]

VALIDACIONES DURAS:
- No exceder presupuesto total
- Sin campos no soportados por plataforma
- Sin segmentaciones sensibles
- Fechas dentro del rango válido

FORMATOS VÁLIDOS:
- DV360: Instream 15s/6s, Bumper, Out‑stream, Display IAB, CTV, DOOH (PMP)
- Meta: Reels/Stories 9:16, Feed 1:1/4:5, AN, Lead Form
- Google Ads: RSA (Search), YouTube Instream/Bumper/In‑feed, PMax (Asset Groups), Display
- SA360: RSA con estrategias tCPA/tROAS

TEMPLATE DE BRIEF ESPERADO:
- Marca/Cliente: [texto]
- País(es): [códigos ISO o nombres]
- Fechas: [YYYY‑MM‑DD a YYYY‑MM‑DD]
- Presupuesto total (USD): [número]
- Objetivo primario: [Awareness/Consideration/Leads/Sales/ROAS/App]
- Objetivo secundario: [opcional]
- Audiencias disponibles: [1P/CRM sí/no; LAL sí/no; 3P sí/no]
- Canales requeridos/prohibidos: [p. ej., incluir CTV; excluir Audience Network]
- Restricciones: [p. ej., mínimo por DV360, caps, proveedores preferidos]

Si el brief está incompleto, haz preguntas específicas para completarlo antes de generar el plan.

Usa razonamiento paso a paso para cada decisión de planificación. Sé profesional, directo, y guía con preguntas cerradas cuando falte información crítica.`;
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