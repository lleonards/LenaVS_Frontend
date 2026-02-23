import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const [plan, setPlan] = useState(null);
  const [credits, setCredits] = useState(0);

  /* =====================================================
      💳 BUSCAR STATUS + CRÉDITOS
  ===================================================== */
  const fetchSubscription = async () => {
    try {
      const res = await api.get('/api/payment/subscription');
      setPlan(res.data?.subscription?.plan ?? null);
      setCredits(res.data?.subscription?.credits ?? 0);
    } catch (error) {
      console.error('Erro ao buscar assinatura (usuário pode ser novo):', error.message);
      // Se falhar, definimos valores padrão para não travar o App
      setPlan(null);
      setCredits(0);
    }
  };

  /* =====================================================
      🔄 CARREGAR SESSÃO INICIAL
  ===================================================== */
  useEffect(() => {
    const loadSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const currentSession = data?.session ?? null;

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession) {
          // Não usamos 'await' aqui para não travar o carregamento inicial do App
          fetchSubscription();
        }
      } catch (error) {
        console.error('Erro ao carregar sessão:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSession();

    // Listener de mudanças na autenticação
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('Evento Auth:', event);
      
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession) {
        // Se o usuário logou ou acabou de cadastrar
        await fetchSubscription();
      } else {
        setPlan(null);
        setCredits(0);
      }
      
      // 🔥 GARANTE QUE O LOADING PARE APÓS QUALQUER EVENTO (LOGIN/LOGOUT/CADASTRO)
      setLoading(false);
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  /* =====================================================
      🔐 AUTH FUNCTIONS
  ===================================================== */
  const signUp = async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { 
        data: { name },
        // Garante que o redirecionamento pós-cadastro funcione bem
        emailRedirectTo: window.location.origin 
      }
    });

    if (error) throw error;
    return data;
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    setLoading(true); // Opcional: mostra loading enquanto sai
    try {
      await supabase.auth.signOut();
      setPlan(null);
      setCredits(0);
      setUser(null);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    session,
    accessToken: session?.access_token ?? null,
    loading,
    isAuthenticated: !!session,
    plan,
    credits,
    refreshSubscription: fetchSubscription,
    signUp,
    signIn,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
