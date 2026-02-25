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

  // Função para buscar dados e validar o utilizador
  const fetchSubscription = async () => {
    try {
      const res = await api.get('/user/me');
      if (res.data) {
        setPlan(res.data.plan ?? 'free');
        setCredits(res.data.credits_remaining ?? 0);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Erro ao validar no backend:", error);
      return false;
    }
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        // 1. Pega a sessão do Supabase
        const { data } = await supabase.auth.getSession();
        const currentSession = data?.session ?? null;

        if (!mounted) return;

        if (currentSession) {
          // 2. Se existe sessão, tenta validar com o teu backend
          const isValid = await fetchSubscription();
          
          if (isValid) {
            setSession(currentSession);
            setUser(currentSession.user);
          } else {
            // Se o utilizador não existe no banco, força logout
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
          }
        }
      } catch (err) {
        console.error("Erro crítico na inicialização:", err);
      } finally {
        // 3. OBRIGATÓRIO: Liberta a tela independentemente do resultado
        if (mounted) setLoading(false);
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (newSession) {
          setSession(newSession);
          setUser(newSession.user);
          fetchSubscription();
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

  const signUp = async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name }, emailRedirectTo: window.location.origin }
    });
    if (error) throw error;
    return data;
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
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

  // Renderização de segurança: se estiver a carregar, mostra uma div preta ou vazia
  // mas garante que após o loading o children apareça.
  if (loading) {
    return <div style={{ background: '#1e1e1e', height: '100vh', width: '100vw' }} />;
  }

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
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return context;
};
