/*
  # Crear tabla de conversaciones para remember_chat - FIXED

  1. Nueva tabla
    - `conversations`
      - `id` (uuid, primary key)
      - `conversation_id` (text, para agrupar mensajes)
      - `content` (text, contenido del mensaje)
      - `role` (text, 'user' o 'assistant')
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `metadata` (jsonb, datos adicionales)

  2. Índices
    - Índice en conversation_id para consultas rápidas
    - Índice en created_at para ordenamiento
    - Índice compuesto para optimización

  3. Seguridad
    - RLS habilitado
    - Políticas para lectura y escritura (con DROP IF EXISTS)
    - Función de limpieza automática

  4. Triggers
    - Auto-actualización de updated_at
*/

-- 1. Crear tabla de conversaciones solo si no existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'conversations') THEN
    CREATE TABLE conversations (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      content TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      metadata JSONB DEFAULT '{}'::jsonb
    );
  END IF;
END $$;

-- 2. Crear índices solo si no existen
DO $$
BEGIN
  -- Índice en conversation_id
  IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_conversations_conversation_id') THEN
    CREATE INDEX idx_conversations_conversation_id ON conversations(conversation_id);
  END IF;

  -- Índice en created_at
  IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_conversations_created_at') THEN
    CREATE INDEX idx_conversations_created_at ON conversations(created_at DESC);
  END IF;

  -- Índice compuesto
  IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_conversations_conversation_id_created_at') THEN
    CREATE INDEX idx_conversations_conversation_id_created_at ON conversations(conversation_id, created_at DESC);
  END IF;

  -- Índice en role
  IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_conversations_role') THEN
    CREATE INDEX idx_conversations_role ON conversations(role);
  END IF;
END $$;

-- 3. Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. Crear trigger para updated_at (con DROP IF EXISTS)
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5. Habilitar Row Level Security (RLS)
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- 6. Políticas RLS para seguridad (con DROP IF EXISTS para evitar errores)
-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Anyone can read conversations" ON conversations;
DROP POLICY IF EXISTS "Anyone can insert conversations" ON conversations;
DROP POLICY IF EXISTS "Anyone can update conversations" ON conversations;
DROP POLICY IF EXISTS "Service role can delete conversations" ON conversations;

-- Crear políticas nuevas
CREATE POLICY "Anyone can read conversations" ON conversations
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert conversations" ON conversations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update conversations" ON conversations
  FOR UPDATE USING (true);

CREATE POLICY "Service role can delete conversations" ON conversations
  FOR DELETE USING (auth.role() = 'service_role');

-- 7. Función para limpiar conversaciones antiguas
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Función para obtener estadísticas de conversaciones
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Función para obtener historial de conversación con paginación
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Comentarios para documentación
COMMENT ON TABLE conversations IS 'Tabla para almacenar el historial de conversaciones de la aplicación Aris';
COMMENT ON COLUMN conversations.conversation_id IS 'ID único para agrupar mensajes de una misma conversación';
COMMENT ON COLUMN conversations.content IS 'Contenido del mensaje';
COMMENT ON COLUMN conversations.role IS 'Rol del emisor: user o assistant';
COMMENT ON COLUMN conversations.metadata IS 'Datos adicionales en formato JSON (user_id, source, etc.)';

-- 11. Verificación final
DO $$
DECLARE
  table_exists BOOLEAN;
  policy_count INTEGER;
BEGIN
  -- Verificar que la tabla existe
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'conversations'
  ) INTO table_exists;
  
  -- Contar políticas
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE tablename = 'conversations';
  
  -- Log de verificación
  RAISE NOTICE 'Tabla conversations existe: %', table_exists;
  RAISE NOTICE 'Políticas RLS creadas: %', policy_count;
  
  -- Verificar que todo está correcto
  IF NOT table_exists THEN
    RAISE EXCEPTION 'Error: La tabla conversations no se creó correctamente';
  END IF;
  
  IF policy_count < 4 THEN
    RAISE EXCEPTION 'Error: No se crearon todas las políticas RLS necesarias';
  END IF;
  
  RAISE NOTICE '✅ Migración completada exitosamente';
END $$;
