-- Esquema para la tabla de conversaciones
-- Ejecutar en el SQL Editor de Supabase

-- 1. Crear tabla de conversaciones
CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  content TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 2. Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_conversations_conversation_id 
ON conversations(conversation_id);

CREATE INDEX IF NOT EXISTS idx_conversations_created_at 
ON conversations(created_at);

CREATE INDEX IF NOT EXISTS idx_conversations_conversation_id_created_at 
ON conversations(conversation_id, created_at);

-- 3. Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. Crear trigger para updated_at
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5. Políticas RLS (Row Level Security) - Opcional
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Política para permitir que los usuarios lean sus propias conversaciones
CREATE POLICY "Users can read their own conversations" ON conversations
  FOR SELECT USING (true); -- Ajustar según tu lógica de autenticación

-- Política para permitir insertar nuevas conversaciones
CREATE POLICY "Users can insert conversations" ON conversations
  FOR INSERT WITH CHECK (true); -- Ajustar según tu lógica de autenticación

-- 6. Función para limpiar conversaciones antiguas (opcional)
CREATE OR REPLACE FUNCTION clean_old_conversations(days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM conversations 
  WHERE created_at < NOW() - INTERVAL '1 day' * days_old;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 7. Ejemplo de cómo usar la función de limpieza
-- SELECT clean_old_conversations(30); -- Eliminar conversaciones de más de 30 días
