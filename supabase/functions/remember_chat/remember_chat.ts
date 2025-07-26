// supabase/functions/remember_chat/index.ts
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// Tipos para TypeScript
interface RequestBody {
  conversation_id: string;
  message: string;
  role?: 'user' | 'assistant';
}

interface ConversationMessage {
  id: string;
  conversation_id: string;
  content: string;
  role: 'user' | 'assistant';
  created_at: string;
}

// Conexión a Supabase con service role para operaciones administrativas
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
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
    const { conversation_id, message, role = 'user' } = body;

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

    // 3. Guardar el nuevo mensaje
    const { data: newMessage, error: insertError } = await supabase
      .from("conversations")
      .insert({
        conversation_id,
        content: message.trim(),
        role,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error al insertar mensaje:', insertError);
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

    // 4. Obtener la historia completa de la conversación
    const { data: history, error: selectError } = await supabase
      .from("conversations")
      .select("id, content, role, created_at")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: true });

    if (selectError) {
      console.error('Error al obtener historial:', selectError);
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

    // 5. Limitar el historial si es muy largo (opcional)
    const maxMessages = 50; // Ajustar según necesidades
    const limitedHistory = history.slice(-maxMessages);

    // 6. Formatear respuesta
    const formattedHistory = limitedHistory.map(msg => ({
      id: msg.id,
      content: msg.content,
      role: msg.role,
      timestamp: msg.created_at
    }));

    // 7. Devolver la respuesta
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          new_message: {
            id: newMessage.id,
            content: newMessage.content,
            role: newMessage.role,
            timestamp: newMessage.created_at
          },
          conversation_history: formattedHistory,
          message_count: formattedHistory.length
        }
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error en remember_chat:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Error interno del servidor',
        details: error.message
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
  }
}