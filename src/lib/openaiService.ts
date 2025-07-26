// src/lib/openaiService.ts - OpenAI Assistant API Service

import { supabase } from './supabase';
import { PlannerChat, PlannerMessage, PlannerThread, OpenAIRunStatus, OpenAIMessage } from '../types/planner';

// ✅ FIXED: Configuración corregida con valores reales
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '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';
const OPENAI_ORGANIZATION = import.meta.env.VITE_OPENAI_ORGANIZATION || 'org-HNTo7ChYl261Xu7iici4khKI';
const OPENAI_PROJECT = import.meta.env.VITE_OPENAI_PROJECT || 'proj_WtdVYvbK74UVDviFuJmFj7Hd';
const ASSISTANT_ID = import.meta.env.VITE_OPENAI_ASSISTANT_ID || 'asst_4W8wtluTZDA7SHW1tHMb27Rd';
const OPENAI_MODEL = import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o-mini';
const OPENAI_API_URL = import.meta.env.VITE_OPENAI_API_URL || 'https://api.openai.com/v1';

export class OpenAIService {
  private static validateConfig() {
    if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your_openai_api_key_here' || OPENAI_API_KEY === 'tu_api_key_real_de_openai') {
      throw new Error('OpenAI API key not configured');
    }
    
    if (!OPENAI_API_KEY.startsWith('sk-proj-') && !OPENAI_API_KEY.startsWith('sk-')) {
      throw new Error('Invalid OpenAI API key format. Must start with "sk-"');
    }
    
    if (!ASSISTANT_ID || ASSISTANT_ID === 'your_assistant_id_here' || ASSISTANT_ID === 'tu_assistant_id_real') {
      throw new Error('OpenAI Assistant ID not configured');
    }
    
    if (!ASSISTANT_ID.startsWith('asst_')) {
      throw new Error('Invalid OpenAI Assistant ID format. Must start with "asst_"');
    }
    
    console.log('✅ OpenAI Configuration validated:', {
      hasApiKey: !!OPENAI_API_KEY,
      hasAssistantId: !!ASSISTANT_ID,
      hasOrganization: !!OPENAI_ORGANIZATION,
      hasProject: !!OPENAI_PROJECT,
      model: OPENAI_MODEL,
      apiKeyPrefix: OPENAI_API_KEY ? OPENAI_API_KEY.substring(0, 20) + '...' : 'Not set',
      assistantIdPrefix: ASSISTANT_ID ? ASSISTANT_ID.substring(0, 15) + '...' : 'Not set',
      organization: OPENAI_ORGANIZATION || 'Not set',
      project: OPENAI_PROJECT || 'Not set'
    });
  }
  
  // Get standard headers for OpenAI API
  private static getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2'
    };
    
    // Add organization header (required for your setup)
    if (OPENAI_ORGANIZATION) {
      headers['OpenAI-Organization'] = OPENAI_ORGANIZATION;
      console.log('🏢 Using OpenAI Organization:', OPENAI_ORGANIZATION);
    }
    
    // Add project header (required for your setup)
    if (OPENAI_PROJECT) {
      headers['OpenAI-Project'] = OPENAI_PROJECT;
      console.log('📋 Using OpenAI Project:', OPENAI_PROJECT);
    }
    
    return headers;
  }

  // Test OpenAI connection
  static async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      this.validateConfig();

      console.log('🔍 Testing OpenAI connection with Assistant ID:', ASSISTANT_ID);
      console.log('🏢 Using Organization:', OPENAI_ORGANIZATION);
      console.log('📋 Using Project:', OPENAI_PROJECT);

      const response = await fetch(`${OPENAI_API_URL}/assistants/${ASSISTANT_ID}`, {
        headers: this.getHeaders()
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.error('❌ OpenAI API Error:', response.status, error);
        
        if (response.status === 401) {
          return {
            success: false,
            message: `❌ OpenAI API Key inválida. Status: ${response.status}. Verifica configuración.`
          };
        }
        
        if (response.status === 404) {
          return {
            success: false,
            message: `❌ Assistant no encontrado. Verifica tu VITE_OPENAI_ASSISTANT_ID: ${ASSISTANT_ID}`
          };
        }
        
        return {
          success: false,
          message: `OpenAI API Error ${response.status}: ${error.error?.message || response.statusText}`
        };
      }

      const assistant = await response.json();
      console.log('✅ OpenAI Assistant found:', assistant.name);
      return {
        success: true,
        message: `✅ OpenAI gpt-4o-mini connected: ${assistant.name || 'Planner Assistant'} | Org: ${OPENAI_ORGANIZATION?.substring(0, 15)}... | Project: ${OPENAI_PROJECT?.substring(0, 15)}...`
      };
    } catch (error) {
      console.error('❌ OpenAI connection test failed:', error);
      return {
        success: false,
        message: `OpenAI connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Create a new thread
  static async createThread(): Promise<string> {
    this.validateConfig();

    const response = await fetch(`${OPENAI_API_URL}/threads`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({})
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Failed to create thread: ${error.error?.message || response.statusText}`);
    }

    const thread = await response.json();
    return thread.id;
  }

  // Upload file to OpenAI
  static async uploadFile(file: File): Promise<string> {
    this.validateConfig();

    const formData = new FormData();
    formData.append('file', file);
    formData.append('purpose', 'assistants');

    const uploadHeaders: Record<string, string> = {
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    };
    
    // Add organization header if provided (no Content-Type for FormData)
    if (OPENAI_ORGANIZATION) {
      uploadHeaders['OpenAI-Organization'] = OPENAI_ORGANIZATION;
    }
    
    if (OPENAI_PROJECT) {
      uploadHeaders['OpenAI-Project'] = OPENAI_PROJECT;
    }

    const response = await fetch(`${OPENAI_API_URL}/files`, {
      method: 'POST',
      headers: uploadHeaders,
      body: formData
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Failed to upload file: ${error.error?.message || response.statusText}`);
    }

    const fileData = await response.json();
    return fileData.id;
  }

  // Add message to thread
  static async addMessageToThread(threadId: string, content: string, fileIds: string[] = []): Promise<string> {
    this.validateConfig();

    const messageData: any = {
      role: 'user',
      content
    };

    if (fileIds.length > 0) {
      messageData.attachments = fileIds.map(fileId => ({
        file_id: fileId,
        tools: [{ type: 'file_search' }]
      }));
    }

    const response = await fetch(`${OPENAI_API_URL}/threads/${threadId}/messages`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(messageData)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Failed to add message: ${error.error?.message || response.statusText}`);
    }

    const message = await response.json();
    return message.id;
  }

  // Run assistant
  static async runAssistant(threadId: string, signal?: AbortSignal): Promise<string> {
    this.validateConfig();

    const response = await fetch(`${OPENAI_API_URL}/threads/${threadId}/runs`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        assistant_id: ASSISTANT_ID,
        model: OPENAI_MODEL
      }),
      signal
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Failed to run assistant: ${error.error?.message || response.statusText}`);
    }

    const run = await response.json();
    return run.id;
  }

  // Check run status
  static async checkRunStatus(threadId: string, runId: string): Promise<OpenAIRunStatus> {
    this.validateConfig();

    const response = await fetch(`${OPENAI_API_URL}/threads/${threadId}/runs/${runId}`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Failed to check run status: ${error.error?.message || response.statusText}`);
    }

    return await response.json();
  }

  // Get thread messages
  static async getThreadMessages(threadId: string): Promise<OpenAIMessage[]> {
    this.validateConfig();

    const response = await fetch(`${OPENAI_API_URL}/threads/${threadId}/messages?order=asc`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Failed to get messages: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  }

  // Cancel run
  static async cancelRun(threadId: string, runId: string): Promise<void> {
    this.validateConfig();

    const response = await fetch(`${OPENAI_API_URL}/threads/${threadId}/runs/${runId}/cancel`, {
      method: 'POST',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Failed to cancel run: ${error.error?.message || response.statusText}`);
    }
  }

  // Wait for run completion with polling
  static async waitForRunCompletion(
    threadId: string, 
    runId: string, 
    onStatusUpdate?: (status: string) => void,
    signal?: AbortSignal
  ): Promise<OpenAIRunStatus> {
    const maxAttempts = 60; // 5 minutes max
    let attempts = 0;

    while (attempts < maxAttempts) {
      if (signal?.aborted) {
        await this.cancelRun(threadId, runId);
        throw new Error('Run cancelled by user');
      }

      const status = await this.checkRunStatus(threadId, runId);
      onStatusUpdate?.(status.status);

      if (status.status === 'completed') {
        return status;
      }

      if (status.status === 'failed' || status.status === 'cancelled' || status.status === 'expired') {
        throw new Error(`Run ${status.status}: ${status.last_error?.message || 'Unknown error'}`);
      }

      // Wait 5 seconds before next check
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;
    }

    throw new Error('Run timeout after 5 minutes');
  }

  // Complete workflow: send message and get response
  static async sendMessageAndGetResponse(
    threadId: string,
    content: string,
    files: File[] = [],
    onStatusUpdate?: (status: string) => void,
    signal?: AbortSignal
  ): Promise<string> {
    try {
      // Upload files if any
      const fileIds: string[] = [];
      for (const file of files) {
        if (signal?.aborted) throw new Error('Upload cancelled');
        const fileId = await this.uploadFile(file);
        fileIds.push(fileId);
      }

      // Add message to thread
      await this.addMessageToThread(threadId, content, fileIds);

      // Run assistant
      const runId = await this.runAssistant(threadId, signal);

      // Wait for completion
      await this.waitForRunCompletion(threadId, runId, onStatusUpdate, signal);

      // Get latest messages
      const messages = await this.getThreadMessages(threadId);
      
      // Find the latest assistant message
      const assistantMessages = messages.filter(msg => msg.role === 'assistant');
      const latestMessage = assistantMessages[assistantMessages.length - 1];

      if (!latestMessage) {
        throw new Error('No response from assistant');
      }

      // Extract text content
      const textContent = latestMessage.content
        .filter(content => content.type === 'text')
        .map(content => content.text.value)
        .join('\n');

      return textContent || 'No response content';

    } catch (error) {
      console.error('Error in sendMessageAndGetResponse:', error);
      throw error;
    }
  }
}

export const openaiService = OpenAIService;