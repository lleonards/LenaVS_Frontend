import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY
  || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

if (!hasSupabaseConfig) {
  // Sem as variáveis de ambiente, o cliente real não pode ser criado.
  // NÃO existe mais cliente "mock": um cliente incompleto fazia o app
  // chamar funções que não existem nele (ex.: "ge.auth.setSession is not
  // a function") e escondia o problema real de configuração do deploy.
  throw new Error(
    'Configurações do Supabase não encontradas. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (ou VITE_SUPABASE_PUBLISHABLE_KEY) no ambiente de build (Render) antes de publicar o frontend.'
  );
}

let client;

try {
  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // A confirmação do e-mail não deve fazer login automático.
      // Depois de clicar no link enviado pelo Supabase, a pessoa volta
      // para a tela de login e entra manualmente.
      detectSessionInUrl: false,
    },
  });
} catch (error) {
  console.error('❌ Falha ao inicializar o cliente Supabase:', error);
  throw error;
}

export const supabase = client;
