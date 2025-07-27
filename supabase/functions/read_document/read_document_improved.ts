// supabase/functions/read_document/index.ts
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// Tipos para TypeScript
interface RequestBody {
  file_url?: string;
  file_data?: string; // Base64 encoded file
  file_name?: string;
  analysis_type?: 'summary' | 'detailed' | 'key_insights' | 'data_analysis';
  target_audience?: 'executive' | 'technical' | 'marketing' | 'financial';
}

interface DocumentAnalysis {
  file_info: {
    name: string;
    type: string;
    size_kb: number;
    pages?: number;
    sheets?: string[];
  };
  extracted_content: {
    raw_text: string;
    structured_data?: any;
    tables?: any[];
    images_count?: number;
  };
  analysis: {
    summary: string;
    key_insights: string[];
    recommendations: string[];
    data_points?: any[];
  };
  metadata: {
    processing_time_ms: number;
    extraction_method: string;
    confidence_score: number;
  };
}

// Conexión a Supabase
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  // Manejar CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // 1. Validar método HTTP
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método no permitido' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 2. Extraer y validar datos del request
    const body: RequestBody = await req.json();
    const { 
      file_url, 
      file_data, 
      file_name, 
      analysis_type = 'summary',
      target_audience = 'executive'
    } = body;

    if (!file_url && !file_data) {
      return new Response(
        JSON.stringify({ 
          error: 'Se requiere file_url o file_data' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 3. Obtener datos del archivo
    let fileBuffer: Uint8Array;
    let fileName: string;
    let fileType: string;

    if (file_data) {
      // Decodificar base64
      fileBuffer = new Uint8Array(
        atob(file_data).split('').map(char => char.charCodeAt(0))
      );
      fileName = file_name || 'document';
      fileType = detectFileType(fileName, fileBuffer);
    } else {
      // Descargar desde URL
      const response = await fetch(file_url!);
      if (!response.ok) {
        throw new Error(`Error descargando archivo: ${response.status}`);
      }
      fileBuffer = new Uint8Array(await response.arrayBuffer());
      fileName = extractFileNameFromUrl(file_url!) || 'document';
      fileType = detectFileType(fileName, fileBuffer);
    }

    // 4. Extraer contenido según el tipo de archivo
    const extractionResult = await extractContent(fileBuffer, fileType, fileName);

    // 5. Analizar contenido con IA
    const analysis = await analyzeContent(
      extractionResult.text,
      extractionResult.structured_data,
      analysis_type,
      target_audience,
      fileType
    );

    // 6. Preparar respuesta completa
    const result: DocumentAnalysis = {
      file_info: {
        name: fileName,
        type: fileType,
        size_kb: Math.round(fileBuffer.length / 1024),
        pages: extractionResult.pages,
        sheets: extractionResult.sheets
      },
      extracted_content: {
        raw_text: extractionResult.text,
        structured_data: extractionResult.structured_data,
        tables: extractionResult.tables,
        images_count: extractionResult.images_count
      },
      analysis: {
        summary: analysis.summary,
        key_insights: analysis.key_insights,
        recommendations: analysis.recommendations,
        data_points: analysis.data_points
      },
      metadata: {
        processing_time_ms: Date.now() - startTime,
        extraction_method: extractionResult.method,
        confidence_score: analysis.confidence_score
      }
    };

    // 7. Guardar en base de datos para historial
    await supabase.from('document_analyses').insert({
      file_name: fileName,
      file_type: fileType,
      analysis_type,
      target_audience,
      result: result,
      created_at: new Date().toISOString()
    }).catch(err => console.warn('Error guardando análisis:', err));

    // 8. Retornar resultado
    return new Response(
      JSON.stringify({
        success: true,
        data: result
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error en read_document:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Error procesando documento',
        details: error.message,
        processing_time_ms: Date.now() - startTime
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Función para detectar tipo de archivo
function detectFileType(fileName: string, buffer: Uint8Array): string {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  // Verificar por magic numbers si es posible
  const header = Array.from(buffer.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join('');
  
  if (header.startsWith('25504446')) return 'pdf'; // %PDF
  if (header.startsWith('504b0304')) return extension === 'xlsx' ? 'xlsx' : 'docx'; // ZIP-based
  if (header.startsWith('d0cf11e0')) return 'doc'; // MS Office legacy
  
  // Fallback a extensión
  switch (extension) {
    case 'pdf': return 'pdf';
    case 'docx': return 'docx';
    case 'doc': return 'doc';
    case 'xlsx': return 'xlsx';
    case 'xls': return 'xls';
    case 'csv': return 'csv';
    case 'txt': return 'txt';
    default: return 'unknown';
  }
}

// Función para extraer nombre de archivo de URL
function extractFileNameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    return pathname.split('/').pop() || 'document';
  } catch {
    return 'document';
  }
}

// Función principal de extracción de contenido
async function extractContent(buffer: Uint8Array, fileType: string, fileName: string) {
  const decoder = new TextDecoder('utf-8');
  
  try {
    switch (fileType) {
      case 'pdf':
        return await extractPDF(buffer);
      
      case 'docx':
        return await extractDocx(buffer);
      
      case 'doc':
        return await extractDoc(buffer);
      
      case 'xlsx':
        return await extractXlsx(buffer);
      
      case 'xls':
        return await extractXls(buffer);
      
      case 'csv':
        return await extractCSV(buffer);
      
      case 'txt':
        return {
          text: decoder.decode(buffer),
          method: 'text_decoder',
          pages: 1
        };
      
      default:
        // Intentar como texto plano
        const text = decoder.decode(buffer);
        return {
          text: text.length > 0 ? text : 'No se pudo extraer contenido del archivo',
          method: 'fallback_text',
          pages: 1
        };
    }
  } catch (error) {
    console.error(`Error extrayendo ${fileType}:`, error);
    return {
      text: `Error extrayendo contenido del archivo ${fileName}: ${error.message}`,
      method: 'error',
      pages: 0
    };
  }
}

// Extractor para PDF usando API externa
async function extractPDF(buffer: Uint8Array) {
  try {
    // Usar API de PDF.js o similar (implementación simplificada)
    const base64 = btoa(String.fromCharCode(...buffer));
    
    // Para entorno de producción, usar un servicio como:
    // - pdf-parse via API
    // - Adobe PDF Services API
    // - Google Document AI
    
    // Implementación simplificada para demo
    return {
      text: "Contenido extraído de PDF (implementar con PDF.js o servicio externo)",
      method: 'pdf_api',
      pages: 1,
      images_count: 0
    };
  } catch (error) {
    throw new Error(`Error procesando PDF: ${error.message}`);
  }
}

// Extractor para DOCX
async function extractDocx(buffer: Uint8Array) {
  try {
    // Usar librería como mammoth.js
    // Para simplicidad, usar un servicio externo o implementar parsing básico
    return {
      text: "Contenido extraído de DOCX (implementar con mammoth.js)",
      method: 'docx_parser',
      pages: 1
    };
  } catch (error) {
    throw new Error(`Error procesando DOCX: ${error.message}`);
  }
}

// Extractor para DOC legacy
async function extractDoc(buffer: Uint8Array) {
  try {
    return {
      text: "Contenido extraído de DOC (implementar con antiword o similar)",
      method: 'doc_parser',
      pages: 1
    };
  } catch (error) {
    throw new Error(`Error procesando DOC: ${error.message}`);
  }
}

// Extractor para XLSX
async function extractXlsx(buffer: Uint8Array) {
  try {
    // Implementación básica - en producción usar SheetJS
    const decoder = new TextDecoder('utf-8');
    
    // Para demo, retornar estructura básica
    return {
      text: "Datos extraídos de Excel",
      structured_data: {
        sheets: ["Hoja1"],
        data: [
          { "Columna1": "Valor1", "Columna2": "Valor2" }
        ]
      },
      tables: [
        {
          sheet: "Hoja1",
          rows: 1,
          columns: 2
        }
      ],
      method: 'xlsx_parser',
      sheets: ["Hoja1"]
    };
  } catch (error) {
    throw new Error(`Error procesando XLSX: ${error.message}`);
  }
}

// Extractor para XLS legacy
async function extractXls(buffer: Uint8Array) {
  try {
    return {
      text: "Datos extraídos de XLS legacy",
      structured_data: { sheets: ["Hoja1"] },
      method: 'xls_parser',
      sheets: ["Hoja1"]
    };
  } catch (error) {
    throw new Error(`Error procesando XLS: ${error.message}`);
  }
}

// Extractor para CSV
async function extractCSV(buffer: Uint8Array) {
  try {
    const decoder = new TextDecoder('utf-8');
    const text = decoder.decode(buffer);
    
    // Parsing básico de CSV
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0]?.split(',').map(h => h.trim()) || [];
    const rows = lines.slice(1).map(line => 
      line.split(',').map(cell => cell.trim())
    );
    
    // Crear objetos estructurados
    const data = rows.map(row => {
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });
    
    return {
      text: `CSV con ${rows.length} filas y ${headers.length} columnas: ${headers.join(', ')}`,
      structured_data: {
        headers,
        rows: data,
        summary: {
          total_rows: rows.length,
          total_columns: headers.length
        }
      },
      tables: [{
        name: "CSV Data",
        rows: rows.length,
        columns: headers.length,
        headers
      }],
      method: 'csv_parser'
    };
  } catch (error) {
    throw new Error(`Error procesando CSV: ${error.message}`);
  }
}

// Función para análisis con IA
async function analyzeContent(
  text: string, 
  structuredData: any, 
  analysisType: string,
  targetAudience: string,
  fileType: string
) {
  try {
    const deepseekApiKey = Deno.env.get("DEEPSEEK_API_KEY");
    if (!deepseekApiKey) {
      throw new Error("DEEPSEEK_API_KEY no configurada");
    }

    // Preparar prompt según el tipo de análisis y audiencia
    const systemPrompt = createAnalysisPrompt(analysisType, targetAudience, fileType);
    
    // Limitar texto para evitar exceder límites
    const limitedText = text.substring(0, 15000);
    
    const userContent = structuredData 
      ? `CONTENIDO DEL DOCUMENTO:\n${limitedText}\n\nDATOS ESTRUCTURADOS:\n${JSON.stringify(structuredData, null, 2)}`
      : `CONTENIDO DEL DOCUMENTO:\n${limitedText}`;

    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${deepseekApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-reasoner",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 3000
      })
    });

    if (!response.ok) {
      throw new Error(`Error de DeepSeek API: ${response.status}`);
    }

    const completion = await response.json();
    const analysisResult = JSON.parse(completion.choices[0].message.content);

    return {
      summary: analysisResult.summary || "Resumen no disponible",
      key_insights: analysisResult.key_insights || [],
      recommendations: analysisResult.recommendations || [],
      data_points: analysisResult.data_points || [],
      confidence_score: analysisResult.confidence_score || 0.8
    };

  } catch (error) {
    console.error('Error en análisis IA:', error);
    return {
      summary: `Error en análisis automático: ${error.message}`,
      key_insights: ["Error en procesamiento de IA"],
      recommendations: ["Revisar documento manualmente"],
      data_points: [],
      confidence_score: 0.1
    };
  }
}

// Función para crear prompts específicos
function createAnalysisPrompt(analysisType: string, targetAudience: string, fileType: string): string {
  const basePrompt = `Eres un analista senior especializado en ${fileType.toUpperCase()}. `;
  
  const audienceContext = {
    'executive': 'Tu audiencia son ejecutivos C-level. Enfócate en impacto al negocio, ROI y decisiones estratégicas.',
    'technical': 'Tu audiencia es técnica. Incluye detalles metodológicos, especificaciones y consideraciones de implementación.',
    'marketing': 'Tu audiencia es de marketing. Enfócate en insights de consumidor, oportunidades de campaña y posicionamiento.',
    'financial': 'Tu audiencia es financiera. Enfócate en métricas, proyecciones y impacto en P&L.'
  };

  const analysisContext = {
    'summary': 'Proporciona un resumen ejecutivo conciso.',
    'detailed': 'Realiza un análisis profundo y detallado.',
    'key_insights': 'Identifica los insights más importantes y accionables.',
    'data_analysis': 'Analiza los datos para identificar patrones, tendencias y anomalías.'
  };

  return `${basePrompt}${audienceContext[targetAudience]} ${analysisContext[analysisType]}

Responde SIEMPRE en formato JSON con esta estructura exacta:
{
  "summary": "string - resumen ejecutivo del documento",
  "key_insights": ["array de strings - máximo 5 insights clave"],
  "recommendations": ["array de strings - máximo 5 recomendaciones accionables"],
  "data_points": ["array - puntos de datos relevantes si aplica"],
  "confidence_score": number // 0.0 a 1.0 basado en calidad del contenido extraído
}`;
}
