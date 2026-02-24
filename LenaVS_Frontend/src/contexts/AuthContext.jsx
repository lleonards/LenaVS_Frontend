import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [plan, setPlan] = useState(null);
  const [credits, setCredits] = useState(0);

  /* =====================================================
     🔄 BUSCAR STATUS DO USUÁRIO (PLANO E CRÉDITOS)
  ===================================================== */
  const fetchSubscription = async () => {
    try {
      // Chamada para a rota que você tem no backend que retorna plano e créditos
      const res = await api.get('/user/me'); 
      
      // O backend retorna: { plan: 'free', credits_remaining: 3, ... }
      setPlan(res.data?.plan ?? 'free');
      setCredits(res.data?.credits_remaining ?? 0);
    } catch (error) {
      console.error("Erro ao buscar dados do usuário:", error);
      setPlan('free');
      setCredits(0);
    }
  };

  /* =====================================================
     🚀 INICIALIZAÇÃO E MONITORAMENTO DE SESSÃO
  ===================================================== */
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const currentSession = data?.session ?? null;

      if (!mounted) return;

      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession) {
        // Busca os créditos e plano assim que logar
        await fetchSubscription(); 
      }
      
      setLoading(false);
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession) {
          await fetchSubscription();
        } else {
          setPlan(null);
          setCredits(0);
        }
      }
    );

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  /* =====================================================
     🔐 MÉTODOS DE AUTENTICAÇÃO
  ===================================================== */
  const signUp = async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
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
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setPlan(null);
    setCredits(0);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isAuthenticated: !!session,
        plan,
        credits,
        fetchSubscription, // Exportado para atualizar os créditos via ExportPanel
        signUp,
        signIn,
        signOut
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
};
