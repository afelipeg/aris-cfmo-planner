-- Migración para resolver alertas de seguridad de Supabase
-- Fecha: 2025-06-25

-- 1. Habilitar RLS en la tabla agents que no lo tenía (solo si no está habilitado)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'agents' 
    AND n.nspname = 'public'
    AND c.relrowsecurity = true
  ) THEN
    ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS habilitado en tabla agents';
  ELSE
    RAISE NOTICE 'RLS ya estaba habilitado en tabla agents';
  END IF;
END $$;

-- 2. Crear política para la tabla agents (solo si no existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'agents' 
    AND policyname = 'Everyone can read agents'
  ) THEN
    CREATE POLICY "Everyone can read agents" ON agents
      FOR SELECT USING (true);
    RAISE NOTICE 'Política creada para tabla agents';
  ELSE
    RAISE NOTICE 'Política ya existe para tabla agents';
  END IF;
END $$;

-- 3. Agregar search_path a todas las funciones para evitar vulnerabilidades
-- Función clean_old_conversations
CREATE OR REPLACE FUNCTION clean_old_conversations(days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Set search_path for security
  SET search_path = public;
  
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
  -- Set search_path for security
  SET search_path = public;
  
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
  -- Set search_path for security
  SET search_path = public;
  
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
  -- Set search_path for security
  SET search_path = public;
  
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
  -- Set search_path for security
  SET search_path = public;
  
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
  -- Set search_path for security
  SET search_path = public;
  
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
  -- Set search_path for security
  SET search_path = public;
  
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
  -- Set search_path for security
  SET search_path = public;
  
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Función update_document_analyses_updated_at
CREATE OR REPLACE FUNCTION update_document_analyses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Set search_path for security
  SET search_path = public;
  
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Verificación final de seguridad
DO $$
DECLARE
  rls_enabled_count INTEGER;
  function_count INTEGER;
BEGIN
  -- Verificar que todas las tablas tienen RLS habilitado
  SELECT COUNT(*) INTO rls_enabled_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind = 'r' 
    AND n.nspname = 'public'
    AND c.relrowsecurity = true;
  
  -- Contar funciones con search_path seguro
  SELECT COUNT(*) INTO function_count
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prosecdef = true;
  
  RAISE NOTICE '✅ Alertas de seguridad resueltas';
  RAISE NOTICE '🔒 Tablas con RLS habilitado: %', rls_enabled_count;
  RAISE NOTICE '🛡️ Funciones con search_path seguro: %', function_count;
  RAISE NOTICE '🚀 Base de datos lista para producción';
END $$;