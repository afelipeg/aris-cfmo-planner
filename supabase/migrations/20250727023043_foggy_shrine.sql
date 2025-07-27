/*
  # Migración Completa del Esquema - Versión Corregida
  
  Esta migración actualiza el esquema completo manejando elementos existentes:
  
  1. Tablas Principales
     - users (perfiles de usuario)
     - user_preferences (configuraciones)
     - chats y messages (CFMO)
     - planner_chats y planner_messages (Planificador)
     - conversations (historial)
     - document_analyses (análisis de documentos)
  
  2. Seguridad
     - RLS habilitado en todas las tablas
     - Políticas de acceso actualizadas
     - Foreign keys y constraints
  
  3. Limpieza
     - Eliminar referencias OpenAI (threads)
     - Optimizar índices
*/

-- =====================================================
-- 1. FUNCIONES DE UTILIDAD (crear si no existen)
-- =====================================================

-- Función para actualizar updated_at (solo si no existe)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Función para crear perfil de usuario automáticamente
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, users.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. TABLA USERS (crear si no existe)
-- =====================================================

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Políticas para users (crear si no existen)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' AND policyname = 'Users can read own profile'
  ) THEN
    CREATE POLICY "Users can read own profile" ON users
      FOR SELECT TO authenticated
      USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile" ON users
      FOR UPDATE TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' AND policyname = 'Allow authenticated users to insert own profile'
  ) THEN
    CREATE POLICY "Allow authenticated users to insert own profile" ON users
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- Trigger para updated_at en users (crear si no existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_users_updated_at'
  ) THEN
    CREATE TRIGGER update_users_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Trigger para crear perfil automáticamente (crear si no existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'create_user_profile_trigger'
  ) THEN
    CREATE TRIGGER create_user_profile_trigger
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION create_user_profile();
  END IF;
END $$;

-- =====================================================
-- 3. TABLA USER_PREFERENCES (crear si no existe)
-- =====================================================

CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  language text DEFAULT 'en' CHECK (language IN ('en', 'es')),
  theme text DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  improve_model boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Habilitar RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Políticas para user_preferences
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_preferences' AND policyname = 'Users can manage own preferences'
  ) THEN
    CREATE POLICY "Users can manage own preferences" ON user_preferences
      FOR ALL TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Trigger para updated_at en user_preferences
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_user_preferences_updated_at'
  ) THEN
    CREATE TRIGGER update_user_preferences_updated_at
      BEFORE UPDATE ON user_preferences
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- =====================================================
-- 4. ACTUALIZAR TABLA CHATS (si existe)
-- =====================================================

-- Agregar columnas faltantes si no existen
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chats' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE chats ADD COLUMN user_id uuid REFERENCES users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chats' AND column_name = 'title'
  ) THEN
    ALTER TABLE chats ADD COLUMN title text DEFAULT 'New Chat';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chats' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE chats ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chats' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE chats ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Habilitar RLS si no está habilitado
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

-- Políticas para chats
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chats' AND policyname = 'Users can manage own chats'
  ) THEN
    CREATE POLICY "Users can manage own chats" ON chats
      FOR ALL TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Trigger para updated_at en chats
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_chats_updated_at'
  ) THEN
    CREATE TRIGGER update_chats_updated_at
      BEFORE UPDATE ON chats
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- =====================================================
-- 5. ACTUALIZAR TABLA MESSAGES (si existe)
-- =====================================================

-- Agregar columnas faltantes si no existen
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'chat_id'
  ) THEN
    ALTER TABLE messages ADD COLUMN chat_id uuid REFERENCES chats(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'content'
  ) THEN
    ALTER TABLE messages ADD COLUMN content text NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'role'
  ) THEN
    ALTER TABLE messages ADD COLUMN role text CHECK (role IN ('user', 'assistant'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'agent_responses'
  ) THEN
    ALTER TABLE messages ADD COLUMN agent_responses jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'attachments'
  ) THEN
    ALTER TABLE messages ADD COLUMN attachments jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE messages ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Habilitar RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Políticas para messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'messages' AND policyname = 'Users can manage messages in own chats'
  ) THEN
    CREATE POLICY "Users can manage messages in own chats" ON messages
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM chats 
          WHERE chats.id = messages.chat_id 
          AND chats.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM chats 
          WHERE chats.id = messages.chat_id 
          AND chats.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- =====================================================
-- 6. ACTUALIZAR TABLA PLANNER_CHATS (si existe)
-- =====================================================

-- Agregar columnas faltantes si no existen
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'planner_chats' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE planner_chats ADD COLUMN user_id uuid REFERENCES users(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'planner_chats' AND column_name = 'title'
  ) THEN
    ALTER TABLE planner_chats ADD COLUMN title text DEFAULT 'New Plan';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'planner_chats' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE planner_chats ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'planner_chats' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE planner_chats ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Habilitar RLS
ALTER TABLE planner_chats ENABLE ROW LEVEL SECURITY;

-- Políticas para planner_chats
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'planner_chats' AND policyname = 'Users can manage own planner chats'
  ) THEN
    CREATE POLICY "Users can manage own planner chats" ON planner_chats
      FOR ALL TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Trigger para updated_at en planner_chats
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_planner_chats_updated_at'
  ) THEN
    CREATE TRIGGER update_planner_chats_updated_at
      BEFORE UPDATE ON planner_chats
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- =====================================================
-- 7. ACTUALIZAR TABLA PLANNER_MESSAGES (si existe)
-- =====================================================

-- Eliminar columnas OpenAI si existen
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'planner_messages' AND column_name = 'thread_id'
  ) THEN
    ALTER TABLE planner_messages DROP COLUMN thread_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'planner_messages' AND column_name = 'run_id'
  ) THEN
    ALTER TABLE planner_messages DROP COLUMN run_id;
  END IF;
END $$;

-- Agregar columnas faltantes si no existen
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'planner_messages' AND column_name = 'chat_id'
  ) THEN
    ALTER TABLE planner_messages ADD COLUMN chat_id uuid REFERENCES planner_chats(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'planner_messages' AND column_name = 'content'
  ) THEN
    ALTER TABLE planner_messages ADD COLUMN content text NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'planner_messages' AND column_name = 'role'
  ) THEN
    ALTER TABLE planner_messages ADD COLUMN role text CHECK (role IN ('user', 'assistant'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'planner_messages' AND column_name = 'attachments'
  ) THEN
    ALTER TABLE planner_messages ADD COLUMN attachments jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'planner_messages' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE planner_messages ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Habilitar RLS
ALTER TABLE planner_messages ENABLE ROW LEVEL SECURITY;

-- Políticas para planner_messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'planner_messages' AND policyname = 'Users can manage messages in own planner chats'
  ) THEN
    CREATE POLICY "Users can manage messages in own planner chats" ON planner_messages
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM planner_chats 
          WHERE planner_chats.id = planner_messages.chat_id 
          AND planner_chats.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM planner_chats 
          WHERE planner_chats.id = planner_messages.chat_id 
          AND planner_chats.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- =====================================================
-- 8. ELIMINAR TABLA PLANNER_THREADS (OpenAI)
-- =====================================================

DROP TABLE IF EXISTS planner_threads CASCADE;

-- =====================================================
-- 9. VERIFICAR TABLA CONVERSATIONS (mantener existente)
-- =====================================================

-- Solo verificar que existe, no modificar
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'conversations'
  ) THEN
    RAISE NOTICE 'Tabla conversations no existe, pero se mantendrá el esquema actual';
  END IF;
END $$;

-- =====================================================
-- 10. VERIFICAR TABLA DOCUMENT_ANALYSES (mantener existente)
-- =====================================================

-- Solo verificar que existe, no modificar
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'document_analyses'
  ) THEN
    RAISE NOTICE 'Tabla document_analyses no existe, pero se mantendrá el esquema actual';
  END IF;
END $$;

-- =====================================================
-- 11. CREAR ÍNDICES OPTIMIZADOS
-- =====================================================

-- Índices para chats
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON chats(updated_at DESC);

-- Índices para messages
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Índices para planner_chats
CREATE INDEX IF NOT EXISTS idx_planner_chats_user_id ON planner_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_planner_chats_updated_at ON planner_chats(updated_at DESC);

-- Índices para planner_messages
CREATE INDEX IF NOT EXISTS idx_planner_messages_chat_id ON planner_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_planner_messages_created_at ON planner_messages(created_at);

-- =====================================================
-- 12. FUNCIONES DE UTILIDAD PARA LA APLICACIÓN
-- =====================================================

-- Función para obtener preferencias de usuario
CREATE OR REPLACE FUNCTION get_user_preferences(user_uuid uuid)
RETURNS TABLE (
  language text,
  theme text,
  improve_model boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(up.language, 'en'::text) as language,
    COALESCE(up.theme, 'system'::text) as theme,
    COALESCE(up.improve_model, true) as improve_model
  FROM user_preferences up
  WHERE up.user_id = user_uuid
  UNION ALL
  SELECT 'en'::text, 'system'::text, true
  WHERE NOT EXISTS (
    SELECT 1 FROM user_preferences WHERE user_id = user_uuid
  )
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para actualizar preferencias de usuario
CREATE OR REPLACE FUNCTION update_user_preferences(
  user_uuid uuid,
  new_language text DEFAULT NULL,
  new_theme text DEFAULT NULL,
  new_improve_model boolean DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO user_preferences (user_id, language, theme, improve_model)
  VALUES (
    user_uuid,
    COALESCE(new_language, 'en'),
    COALESCE(new_theme, 'system'),
    COALESCE(new_improve_model, true)
  )
  ON CONFLICT (user_id) DO UPDATE SET
    language = COALESCE(new_language, user_preferences.language),
    theme = COALESCE(new_theme, user_preferences.theme),
    improve_model = COALESCE(new_improve_model, user_preferences.improve_model),
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- MIGRACIÓN COMPLETADA
-- =====================================================

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE '✅ Migración completada exitosamente';
  RAISE NOTICE '📋 Tablas actualizadas: users, chats, messages, planner_chats, planner_messages';
  RAISE NOTICE '🔒 RLS habilitado en todas las tablas';
  RAISE NOTICE '❌ Eliminadas referencias OpenAI (threads)';
  RAISE NOTICE '🧠 Sistema preparado para DeepSeek únicamente';
END $$;
