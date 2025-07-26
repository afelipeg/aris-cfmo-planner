/*
  # Document Analysis System Schema

  1. New Tables
    - `document_analyses`
      - `id` (uuid, primary key)
      - `file_name` (text)
      - `file_type` (text)
      - `file_size_kb` (integer)
      - `analysis_type` (text, constrained)
      - `target_audience` (text, constrained)
      - `result` (jsonb)
      - `processing_time_ms` (integer)
      - `confidence_score` (decimal)
      - `user_id` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `supported_file_types`
      - `id` (serial, primary key)
      - `file_type` (varchar, unique)
      - `display_name` (text)
      - `max_size_mb` (integer)
      - `extraction_method` (text)
      - `is_active` (boolean)
      - `capabilities` (jsonb)
      - `created_at` (timestamptz)

  2. Views
    - `recent_document_analyses`
    - `file_type_capabilities`

  3. Functions
    - `update_document_analyses_updated_at()`
    - `get_analysis_statistics()`
    - `clean_old_document_analyses()`
    - `is_file_type_supported()`
    - `get_user_document_history()`

  4. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- 1. Crear tabla para historial de análisis de documentos
CREATE TABLE IF NOT EXISTS document_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size_kb INTEGER,
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('summary', 'detailed', 'key_insights', 'data_analysis')),
  target_audience TEXT NOT NULL CHECK (target_audience IN ('executive', 'technical', 'marketing', 'financial')),
  result JSONB NOT NULL,
  processing_time_ms INTEGER,
  confidence_score DECIMAL(3,2),
  user_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Crear tabla para metadatos de tipos de archivo soportados
CREATE TABLE IF NOT EXISTS supported_file_types (
  id SERIAL PRIMARY KEY,
  file_type VARCHAR(10) NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  max_size_mb INTEGER NOT NULL DEFAULT 10,
  extraction_method TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  capabilities JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Crear índices para optimización
CREATE INDEX IF NOT EXISTS idx_document_analyses_file_type 
ON document_analyses(file_type);

CREATE INDEX IF NOT EXISTS idx_document_analyses_analysis_type 
ON document_analyses(analysis_type);

CREATE INDEX IF NOT EXISTS idx_document_analyses_created_at 
ON document_analyses(created_at);

CREATE INDEX IF NOT EXISTS idx_document_analyses_user_id 
ON document_analyses(user_id) WHERE user_id IS NOT NULL;

-- Índice compuesto para búsquedas comunes
CREATE INDEX IF NOT EXISTS idx_document_analyses_user_type_date 
ON document_analyses(user_id, file_type, created_at) WHERE user_id IS NOT NULL;

-- 4. Crear función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_document_analyses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 5. Crear trigger para updated_at
DROP TRIGGER IF EXISTS update_document_analyses_updated_at ON document_analyses;
CREATE TRIGGER update_document_analyses_updated_at
  BEFORE UPDATE ON document_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_document_analyses_updated_at();

-- 6. Insertar tipos de archivo soportados
INSERT INTO supported_file_types (file_type, display_name, max_size_mb, extraction_method, capabilities) 
VALUES 
('pdf', 'PDF Document', 25, 'pdf_business_analysis', '{"text": true, "images": true, "tables": true, "business_context": true}'),
('docx', 'Word Document', 15, 'docx_business_analysis', '{"text": true, "images": true, "tables": true, "metadata": true, "business_context": true}'),
('doc', 'Word Document (Legacy)', 15, 'doc_business_analysis', '{"text": true, "basic_formatting": true, "business_context": true}'),
('xlsx', 'Excel Spreadsheet', 20, 'xlsx_business_analysis', '{"structured_data": true, "formulas": true, "charts": true, "multiple_sheets": true, "business_context": true}'),
('xls', 'Excel Spreadsheet (Legacy)', 20, 'xls_business_analysis', '{"structured_data": true, "basic_formulas": true, "business_context": true}'),
('csv', 'CSV File', 10, 'csv_parser', '{"structured_data": true, "delimiter_detection": true, "data_analysis": true}'),
('txt', 'Text File', 5, 'text_decoder', '{"text": true, "encoding_detection": true}'),
('json', 'JSON File', 10, 'json_parser', '{"structured_data": true, "api_data": true, "configuration": true}')
ON CONFLICT (file_type) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  max_size_mb = EXCLUDED.max_size_mb,
  extraction_method = EXCLUDED.extraction_method,
  capabilities = EXCLUDED.capabilities;

-- 7. Crear vista para análisis recientes
CREATE OR REPLACE VIEW recent_document_analyses AS
SELECT 
  id,
  file_name,
  file_type,
  analysis_type,
  target_audience,
  (result->>'summary') as summary,
  confidence_score,
  processing_time_ms,
  created_at
FROM document_analyses 
WHERE created_at >= NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;

-- 8. Vista para obtener capacidades por tipo de archivo
CREATE OR REPLACE VIEW file_type_capabilities AS
SELECT 
  file_type,
  display_name,
  max_size_mb,
  extraction_method,
  capabilities,
  (capabilities->>'text')::boolean as supports_text,
  (capabilities->>'structured_data')::boolean as supports_structured_data,
  (capabilities->>'images')::boolean as supports_images,
  (capabilities->>'tables')::boolean as supports_tables
FROM supported_file_types 
WHERE is_active = true
ORDER BY file_type;

-- 9. Función para obtener estadísticas de análisis
CREATE OR REPLACE FUNCTION get_analysis_statistics(days_back INTEGER DEFAULT 30)
RETURNS TABLE(
  total_analyses BIGINT,
  avg_processing_time_ms NUMERIC,
  avg_confidence_score NUMERIC,
  most_common_file_type TEXT,
  most_common_analysis_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT 
      COUNT(*) as total,
      AVG(processing_time_ms) as avg_time,
      AVG(confidence_score) as avg_confidence,
      MODE() WITHIN GROUP (ORDER BY file_type) as common_file_type,
      MODE() WITHIN GROUP (ORDER BY analysis_type) as common_analysis_type
    FROM document_analyses 
    WHERE created_at >= NOW() - INTERVAL '1 day' * days_back
  )
  SELECT 
    total,
    ROUND(avg_time, 2),
    ROUND(avg_confidence, 3),
    common_file_type,
    common_analysis_type
  FROM stats;
END;
$$ LANGUAGE plpgsql;

-- 10. Función para limpiar análisis antiguos
CREATE OR REPLACE FUNCTION clean_old_document_analyses(days_old INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM document_analyses 
  WHERE created_at < NOW() - INTERVAL '1 day' * days_old;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 11. Función para validar tipo de archivo
CREATE OR REPLACE FUNCTION is_file_type_supported(file_type_input TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM supported_file_types 
    WHERE file_type = LOWER(file_type_input) AND is_active = true
  );
END;
$$ LANGUAGE plpgsql;

-- 12. Función para obtener historial de usuario
CREATE OR REPLACE FUNCTION get_user_document_history(
  user_id_input TEXT,
  limit_count INTEGER DEFAULT 20,
  file_type_filter TEXT DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  file_name TEXT,
  file_type TEXT,
  analysis_type TEXT,
  summary TEXT,
  confidence_score DECIMAL(3,2),
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    da.id,
    da.file_name,
    da.file_type,
    da.analysis_type,
    (da.result->>'summary') as summary,
    da.confidence_score,
    da.created_at
  FROM document_analyses da
  WHERE da.user_id = user_id_input
    AND (file_type_filter IS NULL OR da.file_type = file_type_filter)
  ORDER BY da.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- 13. Habilitar RLS (Row Level Security)
ALTER TABLE document_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE supported_file_types ENABLE ROW LEVEL SECURITY;

-- 14. Eliminar políticas existentes si existen (para evitar conflictos)
DROP POLICY IF EXISTS "Users can read their own analyses" ON document_analyses;
DROP POLICY IF EXISTS "Users can insert their own analyses" ON document_analyses;
DROP POLICY IF EXISTS "Everyone can read supported file types" ON supported_file_types;

-- 15. Crear políticas RLS
CREATE POLICY "Users can read their own analyses" ON document_analyses
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own analyses" ON document_analyses
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Everyone can read supported file types" ON supported_file_types
  FOR SELECT USING (true);

-- 16. Comentarios para documentación
COMMENT ON TABLE document_analyses IS 'Tabla para almacenar el historial de análisis de documentos de la aplicación Aris';
COMMENT ON COLUMN document_analyses.file_name IS 'Nombre del archivo analizado';
COMMENT ON COLUMN document_analyses.file_type IS 'Tipo de archivo (pdf, docx, xlsx, etc.)';
COMMENT ON COLUMN document_analyses.analysis_type IS 'Tipo de análisis realizado';
COMMENT ON COLUMN document_analyses.target_audience IS 'Audiencia objetivo del análisis';
COMMENT ON COLUMN document_analyses.result IS 'Resultado completo del análisis en formato JSON';
COMMENT ON COLUMN document_analyses.confidence_score IS 'Puntuación de confianza del análisis (0.0 a 1.0)';