/*
  # Create Planner Tables

  1. New Tables
    - `planner_chats`
      - `id` (uuid, primary key)
      - `title` (text)
      - `user_id` (uuid, foreign key)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    - `planner_messages`
      - `id` (uuid, primary key)
      - `chat_id` (uuid, foreign key)
      - `content` (text)
      - `role` (text)
      - `thread_id` (text) - OpenAI thread ID
      - `run_id` (text) - OpenAI run ID
      - `attachments` (jsonb)
      - `created_at` (timestamp)
    - `planner_threads`
      - `id` (uuid, primary key)
      - `chat_id` (uuid, foreign key)
      - `thread_id` (text) - OpenAI thread ID
      - `assistant_id` (text)
      - `metadata` (jsonb)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create planner_chats table
CREATE TABLE IF NOT EXISTS planner_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'New Plan',
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create planner_messages table
CREATE TABLE IF NOT EXISTS planner_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL,
  content text NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  thread_id text,
  run_id text,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create planner_threads table
CREATE TABLE IF NOT EXISTS planner_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL,
  thread_id text NOT NULL UNIQUE,
  assistant_id text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Add foreign key constraints
ALTER TABLE planner_chats 
ADD CONSTRAINT planner_chats_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE planner_messages 
ADD CONSTRAINT planner_messages_chat_id_fkey 
FOREIGN KEY (chat_id) REFERENCES planner_chats(id) ON DELETE CASCADE;

ALTER TABLE planner_threads 
ADD CONSTRAINT planner_threads_chat_id_fkey 
FOREIGN KEY (chat_id) REFERENCES planner_chats(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_planner_chats_user_id ON planner_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_planner_chats_updated_at ON planner_chats(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_planner_messages_chat_id ON planner_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_planner_messages_created_at ON planner_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_planner_threads_chat_id ON planner_threads(chat_id);
CREATE INDEX IF NOT EXISTS idx_planner_threads_thread_id ON planner_threads(thread_id);

-- Enable Row Level Security
ALTER TABLE planner_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE planner_threads ENABLE ROW LEVEL SECURITY;

-- Create policies for planner_chats
CREATE POLICY "Users can view their own planner chats"
  ON planner_chats
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own planner chats"
  ON planner_chats
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own planner chats"
  ON planner_chats
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own planner chats"
  ON planner_chats
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for planner_messages
CREATE POLICY "Users can view messages from their planner chats"
  ON planner_messages
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM planner_chats
    WHERE planner_chats.id = planner_messages.chat_id
    AND planner_chats.user_id = auth.uid()
  ));

CREATE POLICY "Users can create messages in their planner chats"
  ON planner_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM planner_chats
    WHERE planner_chats.id = planner_messages.chat_id
    AND planner_chats.user_id = auth.uid()
  ));

CREATE POLICY "Users can update messages in their planner chats"
  ON planner_messages
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM planner_chats
    WHERE planner_chats.id = planner_messages.chat_id
    AND planner_chats.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM planner_chats
    WHERE planner_chats.id = planner_messages.chat_id
    AND planner_chats.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete messages from their planner chats"
  ON planner_messages
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM planner_chats
    WHERE planner_chats.id = planner_messages.chat_id
    AND planner_chats.user_id = auth.uid()
  ));

-- Create policies for planner_threads
CREATE POLICY "Users can view threads from their planner chats"
  ON planner_threads
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM planner_chats
    WHERE planner_chats.id = planner_threads.chat_id
    AND planner_chats.user_id = auth.uid()
  ));

CREATE POLICY "Users can create threads in their planner chats"
  ON planner_threads
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM planner_chats
    WHERE planner_chats.id = planner_threads.chat_id
    AND planner_chats.user_id = auth.uid()
  ));

CREATE POLICY "Users can update threads in their planner chats"
  ON planner_threads
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM planner_chats
    WHERE planner_chats.id = planner_threads.chat_id
    AND planner_chats.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM planner_chats
    WHERE planner_chats.id = planner_threads.chat_id
    AND planner_chats.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete threads from their planner chats"
  ON planner_threads
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM planner_chats
    WHERE planner_chats.id = planner_threads.chat_id
    AND planner_chats.user_id = auth.uid()
  ));

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_planner_chats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_planner_chats_updated_at
  BEFORE UPDATE ON planner_chats
  FOR EACH ROW
  EXECUTE FUNCTION update_planner_chats_updated_at();
