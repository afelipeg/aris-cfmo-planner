// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

// 1. Obtener variables de entorno
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 2. Función de validación robusta
const validateConfig = () => {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(`
      ❌ Missing Supabase configuration!
      Por favor verifica tu archivo .env y asegura que tienes:
      VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
      
      Pasos para solucionar:
      1. Ve a https://supabase.com/dashboard
      2. Selecciona tu proyecto
      3. Ve a Settings > API
      4. Copia la URL y la anon key
      5. Péguelas en tu archivo .env
    `);
  }

  try {
    new URL(supabaseUrl);
  } catch (error) {
    throw new Error(`
      ❌ URL de Supabase inválida: ${supabaseUrl}
      Formato requerido: https://[id-proyecto].supabase.co
    `);
  }

  if (!supabaseKey.startsWith('eyJ')) {
    throw new Error(`
      ❌ Key de Supabase inválida
      La key debe comenzar con 'eyJ...'
      Key actual: ${supabaseKey.slice(0, 10)}...
    `);
  }
};

// 3. Ejecutar validación
validateConfig();

// 4. Crear cliente
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// 5. Verificación en consola
console.log("[Supabase] Configuración exitosa!");
console.log("URL:", supabaseUrl);
console.log("Key:", supabaseKey.slice(0, 10) + "..." + supabaseKey.slice(-10));