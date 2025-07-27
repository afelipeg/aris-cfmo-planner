// src/types/planner.ts - Types for Planner functionality with DeepSeek

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
  attachments?: PlannerAttachment[];
  created_at: string;
}

export interface PlannerAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
}
