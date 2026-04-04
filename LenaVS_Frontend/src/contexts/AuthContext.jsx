import React, { createContext, useContext, useEffect, useState } from 'react';
import { hasSupabaseConfig, supabase } from '../services/supabase';

const AuthContext = createContext(null);
const AUTH_BOOT_TIMEOUT_MS = 5000;

const withTimeout = async (promise, timeoutMs, fallbackValue, timeoutMessage) => {
  let timeoutId;

  const timeoutPromise = new Promise((resolve) => {
    timeoutId = setTimeout(() => {
      if (timeoutMessage) {
        console.warn(timeoutMessage);
      }
      resolve(fallbackValue);
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
};

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState(0);
  const [plan, setPlan] = useState('free');

  const resetLocalUserState = () => {
    setCredits(0);
    setPlan('free');
  };

  const fetchUserData = async (userId) => {
    try {
      if (!userId || !hasSupabaseConfig) {
        resetLocalUserState();
        return null;
      }

      const { data, error } = await withTimeout(
        supabase
          .from('users')
          .select('credits, plan')
          .eq('id', userId)
          .maybeSingle(),
        AUTH_BOOT_TIMEOUT_MS,
        { data: null, error: new Error('Timeout ao buscar dados do usuário.') },
        '⚠️ Timeout ao buscar dados do usuário no Supabase. Seguindo com plano free.'
      );

      if (error) {
        console.warn('Erro ao buscar dados do usuário:', error.message);
        resetLocalUserState();
        return null;
      }

      setCredits(data?.credits ?? 0);
      setPlan(data?.plan ?? 'free');
      return data;
    } catch (err) {
      console.error('Erro inesperado fetchUserData:', err);
      resetLocalUserState();
      return null;
    }
  };

  const refreshCredits = async () => {
    const userId = session?.user?.id;
    if (!userId) return null;
    return fetchUserData(userId);
  };

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        if (!hasSupabaseConfig) {
          if (isMounted) {
            setSession(null);
            resetLocalUserState();
          }
          return;
        }

        const { data, error } = await withTimeout(
          supabase.auth.getSession(),
          AUTH_BOOT_TIMEOUT_MS,
          { data: { session: null }, error: new Error('Timeout ao recuperar a sessão.') },
          '⚠️ Timeout ao recuperar sessão do Supabase. Liberando a interface para evitar tela infinita de carregamento.'
        );

        if (error) {
          console.error('Erro getSession:', error.message);
        }

        const currentSession = data?.session ?? null;

        if (!isMounted) return;

        setSession(currentSession);

        if (currentSession?.user) {
          await fetchUserData(currentSession.user.id);
        } else {
          resetLocalUserState();
        }
      } catch (err) {
        console.error('Erro inesperado initializeAuth:', err);
        if (isMounted) {
          setSession(null);
          resetLocalUserState();
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!isMounted) return;

      setSession(newSession ?? null);

      if (newSession?.user) {
        void fetchUserData(newSession.user.id);
      } else {
        resetLocalUserState();
      }
    });

    return () => {
      isMounted = false;
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  const signUp = async (email, password, name) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });

    if (error) throw error;

    alert('Verifique seu e-mail para confirmar sua conta antes de fazer login.');
  };

  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    resetLocalUserState();
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        isAuthenticated: !!session,
        loading,
        credits,
        plan,
        signUp,
        signIn,
        signOut,
        refreshCredits,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
