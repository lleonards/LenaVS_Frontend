import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [plan, setPlan] = useState('free');
  const [credits, setCredits] = useState(0);

  /* =====================================================
      🔄 BUSCAR STATUS DO USUÁRIO (PLANO E CRÉDITOS)
  ===================================================== */
  const fetchSubscription = async () => {
    try {
      const res = await api.get('/user/me');
      
      if (res.data) {
        setPlan(res.data.plan ?? 'free');
        setCredits(res.data.credits_remaining ?? 0);
        return true; // Sucesso na validação
      }
      return false;
    } catch (error) {
      console.error("Erro ao validar usuário no backend:", error);
      return false; // Usuário não existe ou token inválido
    }
  };

  /* =====================================================
      🚀 INICIALIZAÇÃO RESILIENTE
  ===================================================== */
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const currentSession = data?.session ?? null;

        if (!mounted) return;

        if (currentSession) {
          // Se existe sessão no navegador, validamos com o BACKEND
          const isValid = await fetchSubscription();
          
          if (isValid) {
            setSession(currentSession);
            setUser(currentSession.user);
          } else {
            // Se o usuário foi excluído do banco, limpamos a sessão local
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
          }
        }
      } catch (err) {
        console.error("Erro crítico na inicialização:", err);
      } finally {
        // O finally garante que o loading termine MESMO se der erro
        if (mounted) setLoading(false);
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (newSession) {
          setSession(newSession);
          setUser(newSession.user);
          await fetchSubscription();
        } else {
          setSession(null);
          setUser(null);
          setPlan('free');
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
    setPlan('free');
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
        fetchSubscription,
        signUp,
        signIn,
        signOut
      }}
    >
      {/* Só renderiza o app quando terminar de checar tudo */}
      {!loading && children}
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
