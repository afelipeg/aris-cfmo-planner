/*
  # Complete Database Schema Update

  1. New Tables
    - `users` - User profiles and metadata
    - `user_preferences` - User settings and preferences
    - `projects` - Project management (if needed)
    - Update existing tables for consistency

  2. Updated Tables
    - `chats` - Enhanced with better structure
    - `messages` - Improved with proper relationships
    - `planner_chats` - Consistent naming and structure
    - `planner_messages` - Enhanced functionality
    - `document_analyses` - Better organization

  3. Security
    - Enable RLS on all tables
    - Add comprehensive policies
    - Proper foreign key constraints

  4. Functions and Triggers
    - Updated timestamp functions
    - User profile creation triggers
*/

-- =====================================================
-- 1. CREATE UPDATED TIMESTAMP FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- =====================================================
-- 2. CREATE/UPDATE USERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policies for users table
DROP POLICY IF EXISTS "Allow authenticated users to read users" ON users;
DROP POLICY IF EXISTS "Allow authenticated users to insert own profile" ON users;
DROP POLICY IF EXISTS "Allow authenticated users to update own profile" ON users;
DROP POLICY IF EXISTS "Allow public read for debugging" ON users;

CREATE POLICY "Users can read all profiles"
  ON users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- =====================================================
-- 3. CREATE USER PREFERENCES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  language text DEFAULT 'en' CHECK (language IN ('en', 'es')),
  theme text DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  improve_model boolean DEFAULT true,
  notifications_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage own preferences"
  ON user_preferences FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Trigger
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. UPDATE CHATS TABLE
-- =====================================================
-- Add any missing columns and constraints
DO $$
BEGIN
  -- Add user_id foreign key constraint if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'chats_user_id_fkey' 
    AND table_name = 'chats'
  ) THEN
    ALTER TABLE chats 
    ADD CONSTRAINT chats_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure RLS is enabled
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

-- Update policies
DROP POLICY IF EXISTS "Users can create their own chats" ON chats;
DROP POLICY IF EXISTS "Users can view their own chats" ON chats;
DROP POLICY IF EXISTS "Users can update their own chats" ON chats;
DROP POLICY IF EXISTS "Users can delete their own chats" ON chats;

CREATE POLICY "Users can create their own chats"
  ON chats FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own chats"
  ON chats FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own chats"
  ON chats FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chats"
  ON chats FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON chats(updated_at DESC);

-- =====================================================
-- 5. UPDATE MESSAGES TABLE
-- =====================================================
-- Ensure foreign key exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'messages_chat_id_fkey' 
    AND table_name = 'messages'
  ) THEN
    ALTER TABLE messages 
    ADD CONSTRAINT messages_chat_id_fkey 
    FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure RLS is enabled
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Update policies
DROP POLICY IF EXISTS "Users can create messages in their chats" ON messages;
DROP POLICY IF EXISTS "Users can view messages from their chats" ON messages;
DROP POLICY IF EXISTS "Users can update messages in their chats" ON messages;
DROP POLICY IF EXISTS "Users can delete messages from their chats" ON messages;

CREATE POLICY "Users can create messages in their chats"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chats 
      WHERE chats.id = messages.chat_id 
      AND chats.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view messages from their chats"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chats 
      WHERE chats.id = messages.chat_id 
      AND chats.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update messages in their chats"
  ON messages FOR UPDATE
  TO authenticated
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

CREATE POLICY "Users can delete messages from their chats"
  ON messages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chats 
      WHERE chats.id = messages.chat_id 
      AND chats.user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- =====================================================
-- 6. UPDATE PLANNER_CHATS TABLE
-- =====================================================
-- Ensure foreign key exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'planner_chats_user_id_fkey' 
    AND table_name = 'planner_chats'
  ) THEN
    ALTER TABLE planner_chats 
    ADD CONSTRAINT planner_chats_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure RLS is enabled
ALTER TABLE planner_chats ENABLE ROW LEVEL SECURITY;

-- Update policies
DROP POLICY IF EXISTS "Users can create their own planner chats" ON planner_chats;
DROP POLICY IF EXISTS "Users can view their own planner chats" ON planner_chats;
DROP POLICY IF EXISTS "Users can update their own planner chats" ON planner_chats;
DROP POLICY IF EXISTS "Users can delete their own planner chats" ON planner_chats;

CREATE POLICY "Users can create their own planner chats"
  ON planner_chats FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own planner chats"
  ON planner_chats FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own planner chats"
  ON planner_chats FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own planner chats"
  ON planner_chats FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_planner_chats_updated_at ON planner_chats;
CREATE TRIGGER update_planner_chats_updated_at
  BEFORE UPDATE ON planner_chats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_planner_chats_user_id ON planner_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_planner_chats_updated_at ON planner_chats(updated_at DESC);

-- =====================================================
-- 7. UPDATE PLANNER_MESSAGES TABLE
-- =====================================================
-- Remove thread_id and run_id columns if they exist (OpenAI specific)
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

-- Ensure foreign key exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'planner_messages_chat_id_fkey' 
    AND table_name = 'planner_messages'
  ) THEN
    ALTER TABLE planner_messages 
    ADD CONSTRAINT planner_messages_chat_id_fkey 
    FOREIGN KEY (chat_id) REFERENCES planner_chats(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Ensure RLS is enabled
ALTER TABLE planner_messages ENABLE ROW LEVEL SECURITY;

-- Update policies
DROP POLICY IF EXISTS "Users can create messages in their planner chats" ON planner_messages;
DROP POLICY IF EXISTS "Users can view messages from their planner chats" ON planner_messages;
DROP POLICY IF EXISTS "Users can update messages in their planner chats" ON planner_messages;
DROP POLICY IF EXISTS "Users can delete messages from their planner chats" ON planner_messages;

CREATE POLICY "Users can create messages in their planner chats"
  ON planner_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM planner_chats 
      WHERE planner_chats.id = planner_messages.chat_id 
      AND planner_chats.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view messages from their planner chats"
  ON planner_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM planner_chats 
      WHERE planner_chats.id = planner_messages.chat_id 
      AND planner_chats.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update messages in their planner chats"
  ON planner_messages FOR UPDATE
  TO authenticated
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

CREATE POLICY "Users can delete messages from their planner chats"
  ON planner_messages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM planner_chats 
      WHERE planner_chats.id = planner_messages.chat_id 
      AND planner_chats.user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_planner_messages_chat_id ON planner_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_planner_messages_created_at ON planner_messages(created_at);

-- =====================================================
-- 8. REMOVE PLANNER_THREADS TABLE (OpenAI specific)
-- =====================================================
DROP TABLE IF EXISTS planner_threads CASCADE;

-- =====================================================
-- 9. UPDATE DOCUMENT_ANALYSES TABLE
-- =====================================================
-- Ensure proper structure and constraints
DO $$
BEGIN
  -- Add user_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'document_analyses' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE document_analyses ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Ensure RLS is enabled
ALTER TABLE document_analyses ENABLE ROW LEVEL SECURITY;

-- Update policies
DROP POLICY IF EXISTS "Users can insert their own analyses" ON document_analyses;
DROP POLICY IF EXISTS "Users can read their own analyses" ON document_analyses;

CREATE POLICY "Users can insert their own analyses"
  ON document_analyses FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can read their own analyses"
  ON document_analyses FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_document_analyses_user_id ON document_analyses(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_document_analyses_created_at ON document_analyses(created_at);
CREATE INDEX IF NOT EXISTS idx_document_analyses_file_type ON document_analyses(file_type);
CREATE INDEX IF NOT EXISTS idx_document_analyses_analysis_type ON document_analyses(analysis_type);

-- =====================================================
-- 10. UPDATE CONVERSATIONS TABLE
-- =====================================================
-- Add user_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conversations' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE conversations ADD COLUMN user_id text;
  END IF;
END $$;

-- Ensure RLS is enabled
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Update policies
DROP POLICY IF EXISTS "Anyone can insert conversations" ON conversations;
DROP POLICY IF EXISTS "Anyone can read conversations" ON conversations;
DROP POLICY IF EXISTS "Anyone can update conversations" ON conversations;
DROP POLICY IF EXISTS "Service role can delete conversations" ON conversations;

CREATE POLICY "Users can insert conversations"
  ON conversations FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users can read conversations"
  ON conversations FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can update conversations"
  ON conversations FOR UPDATE
  TO public
  USING (true);

CREATE POLICY "Service role can delete conversations"
  ON conversations FOR DELETE
  TO public
  USING (current_setting('role') = 'service_role');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_conversation_id_created_at ON conversations(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_role ON conversations(role);

-- =====================================================
-- 11. CREATE USER PROFILE TRIGGER
-- =====================================================
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, users.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
    updated_at = NOW();
  
  -- Create default preferences
  INSERT INTO user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic user profile creation
DROP TRIGGER IF EXISTS create_user_profile_trigger ON auth.users;
CREATE TRIGGER create_user_profile_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();

-- =====================================================
-- 12. CREATE UTILITY FUNCTIONS
-- =====================================================

-- Function to get user preferences
CREATE OR REPLACE FUNCTION get_user_preferences(user_uuid uuid)
RETURNS TABLE (
  language text,
  theme text,
  improve_model boolean,
  notifications_enabled boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.language,
    up.theme,
    up.improve_model,
    up.notifications_enabled
  FROM user_preferences up
  WHERE up.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user preferences
CREATE OR REPLACE FUNCTION update_user_preferences(
  user_uuid uuid,
  new_language text DEFAULT NULL,
  new_theme text DEFAULT NULL,
  new_improve_model boolean DEFAULT NULL,
  new_notifications_enabled boolean DEFAULT NULL
)
RETURNS boolean AS $$
BEGIN
  UPDATE user_preferences SET
    language = COALESCE(new_language, language),
    theme = COALESCE(new_theme, theme),
    improve_model = COALESCE(new_improve_model, improve_model),
    notifications_enabled = COALESCE(new_notifications_enabled, notifications_enabled),
    updated_at = NOW()
  WHERE user_id = user_uuid;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 13. CLEAN UP AND OPTIMIZE
-- =====================================================

-- Update all existing users to have profiles
INSERT INTO users (id, email, full_name, avatar_url)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name'),
  au.raw_user_meta_data->>'avatar_url'
FROM auth.users au
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = COALESCE(EXCLUDED.full_name, users.full_name),
  avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
  updated_at = NOW();

-- Create default preferences for existing users
INSERT INTO user_preferences (user_id)
SELECT u.id FROM users u
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- 14. FINAL VERIFICATION
-- =====================================================

-- Verify all tables have RLS enabled
DO $$
DECLARE
  table_name text;
BEGIN
  FOR table_name IN 
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN ('users', 'user_preferences', 'chats', 'messages', 'planner_chats', 'planner_messages', 'document_analyses', 'conversations')
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
  END LOOP;
END $$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================