// src/types/planner.ts - Types for Planner functionality

export interface PlannerChat {
  id: string;
  title: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface PlannerMessage {
  id: string;
  chat_id: string;
  content: string;
  role: 'user' | 'assistant';
  thread_id?: string;
  run_id?: string;
  attachments?: PlannerAttachment[];
  created_at: string;
}

export interface PlannerThread {
  id: string;
  chat_id: string;
  thread_id: string;
  assistant_id: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface PlannerAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  file_id?: string; // OpenAI file ID
}

export interface OpenAIRunStatus {
  id: string;
  status: 'queued' | 'in_progress' | 'requires_action' | 'cancelling' | 'cancelled' | 'failed' | 'completed' | 'expired';
  thread_id: string;
  assistant_id: string;
  created_at: number;
  completed_at?: number;
  failed_at?: number;
  last_error?: {
    code: string;
    message: string;
  };
}

export interface OpenAIMessage {
  id: string;
  object: string;
  created_at: number;
  thread_id: string;
  role: 'user' | 'assistant';
  content: Array<{
    type: 'text';
    text: {
      value: string;
      annotations: any[];
    };
  }>;
  file_ids: string[];
  assistant_id?: string;
  run_id?: string;
}