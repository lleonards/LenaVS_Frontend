import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Controla a tela de "Carregamento..."

  const [plan, setPlan] = useState('free');
  const [credits, setCredits] = useState(0);

  const fetchSubscription = async () => {
    try {
      const res = await api.get('/user/me'); 
      if (res.data) {
        setPlan(res.data.plan || 'free');
        setCredits(res.data.credits_remaining || 0);
      }
    } catch (error) {
      console.error("Erro ao buscar dados do usuário:", error);
      // Mesmo com erro, definimos valores padrão para não travar o app
      setPlan('free');
      setCredits(0);
    }
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const currentSession = data?.session ?? null;

        if (!mounted) return;

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession) {
          // Tenta buscar a assinatura, mas não deixa o app travar se falhar
          await fetchSubscription();
        }
      } catch (err) {
        console.error("Erro na inicialização:", err);
      } finally {
        // 🔥 O segredo está aqui: o finally garante que o loading pare
        // mesmo se der erro na rede ou na API.
        if (mounted) setLoading(false);
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession) {
          fetchSubscription();
        } else {
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

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setPlan('free');
    setCredits(0);
  };

  // Os outros métodos (signUp, signIn) continuam iguais...
  const signUp = async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({
      email, password, options: { data: { name }, emailRedirectTo: window.location.origin }
    });
    if (error) throw error;
    return data;
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
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
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return context;
};
