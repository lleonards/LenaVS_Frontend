import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY
  || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

const buildConfigError = () =>
  new Error(
    'Configurações do Supabase não encontradas. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (ou VITE_SUPABASE_PUBLISHABLE_KEY) antes de publicar o frontend.'
  );

const createMockSupabaseClient = () => {
  const fallbackSessionKey = 'lenavs-backend-session';
  let currentSession = null;
  const listeners = new Set();

  try {
    const storedSession = window.localStorage.getItem(fallbackSessionKey);
    currentSession = storedSession ? JSON.parse(storedSession) : null;
  } catch {
    currentSession = null;
  }

  const notify = (event, nextSession) => {
    currentSession = nextSession;
    try {
      if (nextSession) {
        window.localStorage.setItem(fallbackSessionKey, JSON.stringify(nextSession));
      } else {
        window.localStorage.removeItem(fallbackSessionKey);
      }
    } catch {
      // Alguns navegadores bloqueiam storage em modo privado.
    }
    listeners.forEach((callback) => {
      try {
        callback(event, nextSession);
      } catch (error) {
        console.warn('Falha ao notificar mudança de sessão:', error);
      }
    });
  };

  return {
    auth: {
      getSession: async () => ({ data: { session: currentSession }, error: buildConfigError() }),
      setSession: async (session) => {
        const nextSession = session?.access_token ? session : null;
        notify('SIGNED_IN', nextSession);
        return { data: { session: nextSession }, error: nextSession ? null : buildConfigError() };
      },
      onAuthStateChange: (callback) => {
        if (typeof callback === 'function') {
          listeners.add(callback);
          queueMicrotask(() => callback('INITIAL_SESSION', currentSession));
        }

        return {
          data: {
            subscription: {
              unsubscribe: () => listeners.delete(callback),
            },
          },
        };
      },
      signUp: async () => ({ data: null, error: buildConfigError() }),
      signInWithPassword: async () => ({ data: null, error: buildConfigError() }),
      signOut: async () => {
        notify('SIGNED_OUT', null);
        return { error: null };
      },
      exchangeCodeForSession: async () => ({ data: { session: null }, error: buildConfigError() }),
      verifyOtp: async () => ({ data: { session: null }, error: buildConfigError() }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: buildConfigError() }),
        }),
      }),
    }),
  };
};

let client;

if (!hasSupabaseConfig) {
  console.info(
    'ℹ️ Variáveis VITE do Supabase não encontradas. O app usará a autenticação do backend; recursos que dependem do cliente Supabase no navegador ficarão desativados.'
  );
  client = createMockSupabaseClient();
} else {
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
    client = createMockSupabaseClient();
  }
}

export const supabase = client;
