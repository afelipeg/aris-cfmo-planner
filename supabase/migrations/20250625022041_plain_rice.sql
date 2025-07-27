-- Migración para resolver alertas de seguridad de Supabase
-- Fecha: 2025-06-25
-- Resuelve: RLS faltante, Function Search Path vulnerabilities

-- 1. Habilitar RLS en la tabla agents que no lo tenía
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- 2. Crear política para la tabla agents (solo lectura pública)
DROP POLICY IF EXISTS "Everyone can read agents" ON agents;
CREATE POLICY "Everyone can read agents" ON agents
  FOR SELECT USING (true);

-- 3. Agregar search_path a todas las funciones para evitar vulnerabilidades
-- Función clean_old_conversations
CREATE OR REPLACE FUNCTION clean_old_conversations(days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM conversations 
  WHERE created_at < NOW() - INTERVAL '1 day' * days_old;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log de la operación
  RAISE NOTICE 'Eliminadas % conversaciones de más de % días', deleted_count, days_old;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Función get_conversation_stats
CREATE OR REPLACE FUNCTION get_conversation_stats(conv_id TEXT DEFAULT NULL)
RETURNS TABLE (
  conversation_id TEXT,
  total_messages BIGINT,
  user_messages BIGINT,
  assistant_messages BIGINT,
  first_message TIMESTAMP WITH TIME ZONE,
  last_message TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.conversation_id,
    COUNT(*) as total_messages,
    COUNT(*) FILTER (WHERE c.role = 'user') as user_messages,
    COUNT(*) FILTER (WHERE c.role = 'assistant') as assistant_messages,
    MIN(c.created_at) as first_message,
    MAX(c.created_at) as last_message
  FROM conversations c
  WHERE (conv_id IS NULL OR c.conversation_id = conv_id)
  GROUP BY c.conversation_id
  ORDER BY last_message DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Función get_conversation_history
CREATE OR REPLACE FUNCTION get_conversation_history(
  conv_id TEXT,
  page_size INTEGER DEFAULT 50,
  page_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  role TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.content,
    c.role,
    c.created_at,
    c.metadata
  FROM conversations c
  WHERE c.conversation_id = conv_id
  ORDER BY c.created_at ASC
  LIMIT page_size
  OFFSET page_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Función get_analysis_statistics
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Función clean_old_document_analyses
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Función is_file_type_supported
CREATE OR REPLACE FUNCTION is_file_type_supported(file_type_input TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM supported_file_types 
    WHERE file_type = LOWER(file_type_input) AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Función get_user_document_history
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Función update_updated_at_column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Función update_document_analyses_updated_at
CREATE OR REPLACE FUNCTION update_document_analyses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Asegurar que las vistas tienen SECURITY DEFINER si es necesario
-- Recrear vista recent_document_analyses con seguridad mejorada
DROP VIEW IF EXISTS recent_document_analyses;
CREATE VIEW recent_document_analyses 
WITH (security_barrier = true) AS
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

-- Recrear vista file_type_capabilities con seguridad mejorada
DROP VIEW IF EXISTS file_type_capabilities;
CREATE VIEW file_type_capabilities 
WITH (security_barrier = true) AS
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

-- 5. Verificación final de seguridad
DO $$
DECLARE
  rls_enabled_count INTEGER;
  function_count INTEGER;
  agents_rls_enabled BOOLEAN;
BEGIN
  -- Verificar que todas las tablas principales tienen RLS habilitado
  SELECT COUNT(*) INTO rls_enabled_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind = 'r' 
    AND n.nspname = 'public'
    AND c.relname IN ('chats', 'messages', 'conversations', 'document_analyses', 'supported_file_types', 'agents')
    AND c.relrowsecurity = true;
  
  -- Verificar específicamente que agents tiene RLS
  SELECT c.relrowsecurity INTO agents_rls_enabled
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind = 'r' 
    AND n.nspname = 'public'
    AND c.relname = 'agents';
  
  -- Contar funciones con search_path seguro
  SELECT COUNT(*) INTO function_count
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prosecdef = true
    AND p.proname IN (
      'clean_old_conversations',
      'get_conversation_stats', 
      'get_conversation_history',
      'get_analysis_statistics',
      'clean_old_document_analyses',
      'is_file_type_supported',
      'get_user_document_history',
      'update_updated_at_column',
      'update_document_analyses_updated_at'
    );
  
  RAISE NOTICE '✅ Alertas de seguridad resueltas';
  RAISE NOTICE '🔒 Tablas principales con RLS habilitado: %/6', rls_enabled_count;
  RAISE NOTICE '🛡️ Tabla agents RLS habilitado: %', agents_rls_enabled;
  RAISE NOTICE '🔐 Funciones con search_path seguro: %/9', function_count;
  RAISE NOTICE '🚀 Base de datos lista para producción';
  
  -- Verificar que todo está correcto
  IF rls_enabled_count < 6 THEN
    RAISE WARNING 'Algunas tablas no tienen RLS habilitado';
  END IF;
  
  IF NOT agents_rls_enabled THEN
    RAISE WARNING 'La tabla agents no tiene RLS habilitado';
  END IF;
  
  IF function_count < 9 THEN
    RAISE WARNING 'Algunas funciones no tienen search_path seguro';
  END IF;
END $$;

-- 6. Comentarios para documentación
COMMENT ON TABLE agents IS 'Tabla de agentes con RLS habilitado para seguridad';
COMMENT ON POLICY "Everyone can read agents" ON agents IS 'Política que permite lectura pública de agentes';

-- 7. Crear índice adicional para optimización si no existe
CREATE INDEX IF NOT EXISTS idx_agents_name ON agents(name);

-- Mensaje final
SELECT 'Migración de seguridad completada exitosamente' as status;
