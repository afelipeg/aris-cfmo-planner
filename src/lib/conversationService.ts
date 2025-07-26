// src/lib/conversationService.ts
import { supabase } from './supabase';

export interface ConversationMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  metadata?: any;
}

export interface ConversationStats {
  total_messages: number;
  user_messages: number;
  assistant_messages: number;
  conversation_id: string;
}

export interface RememberChatResponse {
  success: boolean;
  data?: {
    new_message: ConversationMessage;
    conversation_history: ConversationMessage[];
    stats: ConversationStats;
  };
  error?: string;
  details?: string;
}

export class ConversationService {
  
  /**
   * Guarda un mensaje en la conversación usando la edge function remember_chat
   */
  static async saveMessage(
    conversationId: string,
    message: string,
    role: 'user' | 'assistant' = 'user',
    userId?: string
  ): Promise<RememberChatResponse> {
    try {
      console.log(`💾 Guardando mensaje en conversación: ${conversationId}`);
      
      const { data, error } = await supabase.functions.invoke('remember_chat', {
        body: {
          conversation_id: conversationId,
          message: message,
          role: role,
          user_id: userId
        }
      });

      if (error) {
        console.error('❌ Error en remember_chat function:', error);
        throw new Error(`Error saving message: ${error.message}`);
      }

      if (!data || !data.success) {
        console.error('❌ remember_chat function returned error:', data);
        throw new Error(data?.error || 'Unknown error from remember_chat function');
      }

      console.log('✅ Mensaje guardado exitosamente');
      console.log('📊 Stats:', data.data.stats);

      return data;
    } catch (error) {
      console.error('❌ Error saving message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined
      };
    }
  }

  /**
   * Obtiene el historial de una conversación directamente de la base de datos
   */
  static async getConversationHistory(
    conversationId: string,
    limit: number = 50
  ): Promise<ConversationMessage[]> {
    try {
      console.log(`📚 Obteniendo historial de conversación: ${conversationId}`);
      
      const { data, error } = await supabase
        .from('conversations')
        .select('id, content, role, created_at, metadata')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('❌ Error obteniendo historial:', error);
        throw error;
      }

      const messages: ConversationMessage[] = (data || []).map(msg => ({
        id: msg.id,
        content: msg.content,
        role: msg.role,
        timestamp: msg.created_at,
        metadata: msg.metadata || {}
      }));

      console.log(`✅ Historial obtenido: ${messages.length} mensajes`);
      return messages;
    } catch (error) {
      console.error('❌ Error getting conversation history:', error);
      return [];
    }
  }

  /**
   * Obtiene estadísticas de una conversación
   */
  static async getConversationStats(conversationId: string): Promise<ConversationStats | null> {
    try {
      console.log(`📊 Obteniendo estadísticas de conversación: ${conversationId}`);
      
      const { data, error } = await supabase
        .rpc('get_conversation_stats', { conv_id: conversationId });

      if (error) {
        console.error('❌ Error obteniendo estadísticas:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return null;
      }

      const stats = data[0];
      console.log('✅ Estadísticas obtenidas:', stats);
      
      return {
        conversation_id: stats.conversation_id,
        total_messages: parseInt(stats.total_messages),
        user_messages: parseInt(stats.user_messages),
        assistant_messages: parseInt(stats.assistant_messages)
      };
    } catch (error) {
      console.error('❌ Error getting conversation stats:', error);
      return null;
    }
  }

  /**
   * Limpia conversaciones antiguas
   */
  static async cleanOldConversations(daysOld: number = 30): Promise<number> {
    try {
      console.log(`🧹 Limpiando conversaciones de más de ${daysOld} días`);
      
      const { data, error } = await supabase
        .rpc('clean_old_conversations', { days_old: daysOld });

      if (error) {
        console.error('❌ Error limpiando conversaciones:', error);
        throw error;
      }

      const deletedCount = data || 0;
      console.log(`✅ Eliminadas ${deletedCount} conversaciones antiguas`);
      
      return deletedCount;
    } catch (error) {
      console.error('❌ Error cleaning old conversations:', error);
      return 0;
    }
  }

  /**
   * Genera un ID único para una nueva conversación
   */
  static generateConversationId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `conv_${timestamp}_${random}`;
  }

  /**
   * Valida si un ID de conversación es válido
   */
  static isValidConversationId(conversationId: string): boolean {
    return typeof conversationId === 'string' && 
           conversationId.length > 0 && 
           conversationId.length <= 255;
  }

  /**
   * Formatea un mensaje para mostrar en la UI
   */
  static formatMessageForDisplay(message: ConversationMessage): string {
    const timestamp = new Date(message.timestamp).toLocaleString();
    const roleIcon = message.role === 'user' ? '👤' : '🤖';
    return `${roleIcon} [${timestamp}] ${message.content}`;
  }
}

// Exportar tipos para uso en otros archivos
export type { ConversationMessage, ConversationStats, RememberChatResponse };