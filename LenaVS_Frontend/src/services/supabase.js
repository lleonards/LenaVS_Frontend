import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 🛡️ Mudamos de 'throw' para 'console.error'. 
// Isso evita que o App trave totalmente se as variáveis sumirem por um erro de build.
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '❌ ERRO CRÍTICO: Configurações do Supabase não encontradas.\n' +
    'Certifique-se de que VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY estão configuradas no painel do Render (Environment Variables).\n' +
    'Após configurar, é necessário fazer um "Clear Cache and Deploy".'
  );
}

// Passamos strings vazias como fallback para o createClient não quebrar a execução do JS
export const supabase = createClient(
  supabaseUrl || '', 
  supabaseAnonKey || '', 
  {
    auth: {
      persistSession: true,      // Mantém o usuário logado ao atualizar a página
      autoRefreshToken: true,    // Renova o token de acesso automaticamente
      detectSessionInUrl: true   // Importante para fluxos de recuperação de senha/e-mail
    }
  }
);
