/*
  # Update Database Schema - Consistent with Reference

  1. Update existing tables to match reference schema
  2. Add missing tables (users, projects, user_preferences, etc.)
  3. Maintain existing functionality while improving structure
  4. Add proper foreign keys and constraints
  5. Update Planner tables to be consistent
*/

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (matching reference schema)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY NOT NULL,
  email TEXT NOT NULL,
  anonymous BOOLEAN DEFAULT FALSE,
  daily_message_count INTEGER DEFAULT 0,
  daily_reset TIMESTAMPTZ DEFAULT NOW(),
  display_name TEXT,
  favorite_models TEXT[] DEFAULT '{}',
  message_count INTEGER DEFAULT 0,
  premium BOOLEAN DEFAULT FALSE,
  profile_image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  daily_pro_message_count INTEGER DEFAULT 0,
  daily_pro_reset TIMESTAMPTZ DEFAULT NOW(),
  system_prompt TEXT,
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Projects table (new, following reference)
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT projects_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Update existing chats table to match reference
ALTER TABLE chats DROP CONSTRAINT IF EXISTS chats_user_id_fkey;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS project_id UUID;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS system_prompt TEXT;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS public BOOLEAN DEFAULT FALSE;

-- Add proper foreign key constraints
ALTER TABLE chats ADD CONSTRAINT chats_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE chats ADD CONSTRAINT chats_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- Update existing messages table to match reference
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_chat_id_fkey;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_user_id_fkey;

-- Change messages id to SERIAL if it's not already
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'id' AND data_type = 'integer'
  ) THEN
    -- Create new table with SERIAL id and migrate data
    CREATE TABLE messages_new (
      id SERIAL PRIMARY KEY,
      chat_id UUID NOT NULL,
      user_id UUID,
      content TEXT,
      role TEXT NOT NULL CHECK (role IN ('system', 'user', 'assistant', 'data')),
      agent_responses JSONB DEFAULT '[]'::jsonb,
      attachments JSONB DEFAULT '[]'::jsonb,
      experimental_attachments JSONB,
      parts JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      message_group_id TEXT,
      model TEXT,
      CONSTRAINT messages_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
      CONSTRAINT messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    
    -- Migrate existing data
    INSERT INTO messages_new (chat_id, user_id, content, role, agent_responses, attachments, created_at)
    SELECT chat_id, user_id, content, role, agent_responses, attachments, created_at
    FROM messages;
    
    -- Drop old table and rename new one
    DROP TABLE messages;
    ALTER TABLE messages_new RENAME TO messages;
  END IF;
END $$;

-- Add missing columns to messages if they don't exist
ALTER TABLE messages ADD COLUMN IF NOT EXISTS experimental_attachments JSONB;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS parts JSONB;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_group_id TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS model TEXT;

-- Update role constraint to include 'data'
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_role_check;
ALTER TABLE messages ADD CONSTRAINT messages_role_check CHECK (role IN ('system', 'user', 'assistant', 'data'));

-- Chat attachments table (new, following reference)
CREATE TABLE IF NOT EXISTS chat_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL,
  user_id UUID NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_chat FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Feedback table (new, following reference)
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- User keys table for BYOK (new, following reference)
CREATE TABLE IF NOT EXISTS user_keys (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  encrypted_key TEXT NOT NULL,
  iv TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, provider)
);

-- User preferences table (new, following reference)
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  layout TEXT DEFAULT 'fullscreen',
  prompt_suggestions BOOLEAN DEFAULT true,
  show_tool_invocations BOOLEAN DEFAULT true,
  show_conversation_previews BOOLEAN DEFAULT true,
  multi_model_enabled BOOLEAN DEFAULT false,
  hidden_models TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Planner tables (updated to be consistent with reference schema)
CREATE TABLE IF NOT EXISTS planner_chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  project_id UUID,
  title TEXT DEFAULT 'New Plan',
  model TEXT DEFAULT 'gpt-4',
  system_prompt TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  public BOOLEAN DEFAULT FALSE,
  CONSTRAINT planner_chats_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT planner_chats_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS planner_messages (
  id SERIAL PRIMARY KEY,
  chat_id UUID NOT NULL,
  user_id UUID,
  content TEXT,
  role TEXT NOT NULL CHECK (role IN ('system', 'user', 'assistant', 'data')),
  thread_id TEXT,
  run_id TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  experimental_attachments JSONB,
  parts JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  message_group_id TEXT,
  model TEXT DEFAULT 'gpt-4',
  CONSTRAINT planner_messages_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES planner_chats(id) ON DELETE CASCADE,
  CONSTRAINT planner_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS planner_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL,
  thread_id TEXT NOT NULL UNIQUE,
  assistant_id TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT planner_threads_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES planner_chats(id) ON DELETE CASCADE
);

-- Planner attachments table (consistent with chat_attachments)
CREATE TABLE IF NOT EXISTS planner_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL,
  user_id UUID NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_type TEXT,
  file_size INTEGER,
  openai_file_id TEXT, -- OpenAI specific file ID
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT planner_attachments_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES planner_chats(id) ON DELETE CASCADE,
  CONSTRAINT planner_attachments_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Update functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_planner_chats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_chats_updated_at ON chats;
CREATE TRIGGER update_chats_updated_at
  BEFORE UPDATE ON chats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_preferences_timestamp ON user_preferences;
CREATE TRIGGER update_user_preferences_timestamp
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_preferences_updated_at();

DROP TRIGGER IF EXISTS update_planner_chats_updated_at ON planner_chats;
CREATE TRIGGER update_planner_chats_updated_at
  BEFORE UPDATE ON planner_chats
  FOR EACH ROW
  EXECUTE FUNCTION update_planner_chats_updated_at();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON chats(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chats_project_id ON chats(project_id);

CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);

CREATE INDEX IF NOT EXISTS idx_planner_chats_user_id ON planner_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_planner_chats_updated_at ON planner_chats(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_planner_chats_project_id ON planner_chats(project_id);

CREATE INDEX IF NOT EXISTS idx_planner_messages_chat_id ON planner_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_planner_messages_created_at ON planner_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_planner_messages_user_id ON planner_messages(user_id);

CREATE INDEX IF NOT EXISTS idx_planner_threads_chat_id ON planner_threads(chat_id);
CREATE INDEX IF NOT EXISTS idx_planner_threads_thread_id ON planner_threads(thread_id);

CREATE INDEX IF NOT EXISTS idx_chat_attachments_chat_id ON chat_attachments(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_attachments_user_id ON chat_attachments(user_id);

CREATE INDEX IF NOT EXISTS idx_planner_attachments_chat_id ON planner_attachments(chat_id);
CREATE INDEX IF NOT EXISTS idx_planner_attachments_user_id ON planner_attachments(user_id);

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
DROP POLICY IF EXISTS "Users can view their own data" ON users;
CREATE POLICY "Users can view their own data" ON users FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own data" ON users;
CREATE POLICY "Users can update their own data" ON users FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own data" ON users;
CREATE POLICY "Users can insert their own data" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for projects
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
CREATE POLICY "Users can view their own projects" ON projects FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own projects" ON projects;
CREATE POLICY "Users can create their own projects" ON projects FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
CREATE POLICY "Users can update their own projects" ON projects FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;
CREATE POLICY "Users can delete their own projects" ON projects FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for chats (updated)
DROP POLICY IF EXISTS "Users can create their own chats" ON chats;
CREATE POLICY "Users can create their own chats" ON chats FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own chats" ON chats;
CREATE POLICY "Users can view their own chats" ON chats FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own chats" ON chats;
CREATE POLICY "Users can update their own chats" ON chats FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own chats" ON chats;
CREATE POLICY "Users can delete their own chats" ON chats FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for messages (updated)
DROP POLICY IF EXISTS "Users can create messages in their chats" ON messages;
CREATE POLICY "Users can create messages in their chats" ON messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM chats WHERE chats.id = messages.chat_id AND chats.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can view messages from their chats" ON messages;
CREATE POLICY "Users can view messages from their chats" ON messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM chats WHERE chats.id = messages.chat_id AND chats.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can update messages in their chats" ON messages;
CREATE POLICY "Users can update messages in their chats" ON messages FOR UPDATE USING (
  EXISTS (SELECT 1 FROM chats WHERE chats.id = messages.chat_id AND chats.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can delete messages from their chats" ON messages;
CREATE POLICY "Users can delete messages from their chats" ON messages FOR DELETE USING (
  EXISTS (SELECT 1 FROM chats WHERE chats.id = messages.chat_id AND chats.user_id = auth.uid())
);

-- RLS Policies for planner_chats
DROP POLICY IF EXISTS "Users can create their own planner chats" ON planner_chats;
CREATE POLICY "Users can create their own planner chats" ON planner_chats FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own planner chats" ON planner_chats;
CREATE POLICY "Users can view their own planner chats" ON planner_chats FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own planner chats" ON planner_chats;
CREATE POLICY "Users can update their own planner chats" ON planner_chats FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own planner chats" ON planner_chats;
CREATE POLICY "Users can delete their own planner chats" ON planner_chats FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for planner_messages
DROP POLICY IF EXISTS "Users can create messages in their planner chats" ON planner_messages;
CREATE POLICY "Users can create messages in their planner chats" ON planner_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM planner_chats WHERE planner_chats.id = planner_messages.chat_id AND planner_chats.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can view messages from their planner chats" ON planner_messages;
CREATE POLICY "Users can view messages from their planner chats" ON planner_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM planner_chats WHERE planner_chats.id = planner_messages.chat_id AND planner_chats.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can update messages in their planner chats" ON planner_messages;
CREATE POLICY "Users can update messages in their planner chats" ON planner_messages FOR UPDATE USING (
  EXISTS (SELECT 1 FROM planner_chats WHERE planner_chats.id = planner_messages.chat_id AND planner_chats.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can delete messages from their planner chats" ON planner_messages;
CREATE POLICY "Users can delete messages from their planner chats" ON planner_messages FOR DELETE USING (
  EXISTS (SELECT 1 FROM planner_chats WHERE planner_chats.id = planner_messages.chat_id AND planner_chats.user_id = auth.uid())
);

-- RLS Policies for planner_threads
DROP POLICY IF EXISTS "Users can create threads in their planner chats" ON planner_threads;
CREATE POLICY "Users can create threads in their planner chats" ON planner_threads FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM planner_chats WHERE planner_chats.id = planner_threads.chat_id AND planner_chats.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can view threads from their planner chats" ON planner_threads;
CREATE POLICY "Users can view threads from their planner chats" ON planner_threads FOR SELECT USING (
  EXISTS (SELECT 1 FROM planner_chats WHERE planner_chats.id = planner_threads.chat_id AND planner_chats.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can update threads in their planner chats" ON planner_threads;
CREATE POLICY "Users can update threads in their planner chats" ON planner_threads FOR UPDATE USING (
  EXISTS (SELECT 1 FROM planner_chats WHERE planner_chats.id = planner_threads.chat_id AND planner_chats.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can delete threads from their planner chats" ON planner_threads;
CREATE POLICY "Users can delete threads from their planner chats" ON planner_threads FOR DELETE USING (
  EXISTS (SELECT 1 FROM planner_chats WHERE planner_chats.id = planner_threads.chat_id AND planner_chats.user_id = auth.uid())
);

-- RLS Policies for attachments tables
DROP POLICY IF EXISTS "Users can manage their chat attachments" ON chat_attachments;
CREATE POLICY "Users can manage their chat attachments" ON chat_attachments FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their planner attachments" ON planner_attachments;
CREATE POLICY "Users can manage their planner attachments" ON planner_attachments FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for other tables
DROP POLICY IF EXISTS "Users can manage their feedback" ON feedback;
CREATE POLICY "Users can manage their feedback" ON feedback FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their keys" ON user_keys;
CREATE POLICY "Users can manage their keys" ON user_keys FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their preferences" ON user_preferences;
CREATE POLICY "Users can manage their preferences" ON user_preferences FOR ALL USING (auth.uid() = user_id);