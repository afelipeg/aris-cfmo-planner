// supabase/functions/remember_chat/index.ts
import { corsHeaders } from "../_shared/cors.ts";

// Tipos para TypeScript
interface RequestBody {
  conversation_id: string;
  message: string;
  role?: 'user' | 'assistant';
  user_id?: string;
}

interface ConversationMessage {
  id: string;
  conversation_id: string;
  content: string;
  role: 'user' | 'assistant';
  created_at: string;
}

// Conexión a Supabase usando las credenciales proporcionadas
const supabaseUrl = "https://fxvvtozxqydgquwgbohx.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4dnZ0b3p4cXlkZ3F1d2dib2h4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0NjM0MDcsImV4cCI6MjA2NjAzOTQwN30.P553dZqXauPxMYwTLyKuPhYakDoTpKKI0UO4-s5muuU";

// Crear cliente de Supabase
const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
const supabase = createClient(supabaseUrl, supabaseAnonKey);

Deno.serve(async (req) => {
  // Manejar CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Validar método HTTP
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método no permitido' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 2. Validar y extraer datos del request
    const body: RequestBody = await req.json();
    const { conversation_id, message, role = 'user', user_id } = body;

    // Validar campos requeridos
    if (!conversation_id || !message) {
      return new Response(
        JSON.stringify({ 
          error: 'conversation_id y message son requeridos' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validar role
    if (role !== 'user' && role !== 'assistant') {
      return new Response(
        JSON.stringify({ 
          error: 'role debe ser "user" o "assistant"' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`💾 Guardando mensaje en conversación: ${conversation_id}`);
    console.log(`📝 Mensaje: ${message.substring(0, 100)}...`);
    console.log(`👤 Role: ${role}`);

    // 3. Guardar el nuevo mensaje
    const messageData = {
      conversation_id,
      content: message.trim(),
      role,
      created_at: new Date().toISOString(),
      metadata: {
        user_id: user_id || null,
        timestamp: Date.now(),
        source: 'aris_app'
      }
    };

    const { data: newMessage, error: insertError } = await supabase
      .from("conversations")
      .insert(messageData)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error al insertar mensaje:', insertError);
      return new Response(
        JSON.stringify({ 
          error: 'Error al guardar el mensaje',
          details: insertError.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`✅ Mensaje guardado con ID: ${newMessage.id}`);

    // 4. Obtener la historia completa de la conversación (últimos 50 mensajes)
    const { data: history, error: selectError } = await supabase
      .from("conversations")
      .select("id, content, role, created_at, metadata")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: true })
      .limit(50);

    if (selectError) {
      console.error('❌ Error al obtener historial:', selectError);
      return new Response(
        JSON.stringify({ 
          error: 'Error al obtener el historial',
          details: selectError.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 5. Formatear respuesta
    const formattedHistory = (history || []).map(msg => ({
      id: msg.id,
      content: msg.content,
      role: msg.role,
      timestamp: msg.created_at,
      metadata: msg.metadata || {}
    }));

    console.log(`📚 Historial obtenido: ${formattedHistory.length} mensajes`);

    // 6. Estadísticas de la conversación
    const userMessages = formattedHistory.filter(m => m.role === 'user').length;
    const assistantMessages = formattedHistory.filter(m => m.role === 'assistant').length;

    // 7. Devolver la respuesta
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          new_message: {
            id: newMessage.id,
            content: newMessage.content,
            role: newMessage.role,
            timestamp: newMessage.created_at,
            metadata: newMessage.metadata || {}
          },
          conversation_history: formattedHistory,
          stats: {
            total_messages: formattedHistory.length,
            user_messages: userMessages,
            assistant_messages: assistantMessages,
            conversation_id: conversation_id
          }
        },
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Error en remember_chat:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Función auxiliar para limpiar conversaciones antiguas (opcional)
export async function cleanOldConversations(daysOld: number = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  const { error } = await supabase
    .from("conversations")
    .delete()
    .lt("created_at", cutoffDate.toISOString());
  
  if (error) {
    console.error('Error limpiando conversaciones antiguas:', error);
  } else {
    console.log(`🧹 Conversaciones antiguas limpiadas (más de ${daysOld} días)`);
  }
}