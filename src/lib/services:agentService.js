// Busca esta función y actualízala
async function runAgent(agentId, userQuery) {
  // Obtiene el juguete correcto de Supabase
  const agent = await getAgentFromSupabase(agentId);
  
  // Prepara el juego
  const messages = [
    { role: "system", content: agent.system_prompt },
    { role: "user", content: userQuery }
  ];
  
  // Juega con DeepSeek
  const response = await deepseek.chat.completions.create({
    model: "deepseek-reasoner",
    messages: messages,
    response_format: { type: "json_object" }
  });
  
  return response;
}
