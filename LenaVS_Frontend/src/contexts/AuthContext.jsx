import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔥 NOVOS ESTADOS
  const [plan, setPlan] = useState(null);
  const [credits, setCredits] = useState(0);

  /* =====================================================
     🔄 CARREGAR SESSÃO INICIAL
  ===================================================== */

  useEffect(() => {
    const loadSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      setSession(session);
      setUser(session?.user ?? null);

      if (session) {
        await fetchSubscription();
      }

      setLoading(false);
    };

    loadSession();

    const { data: { subscription } } =
      supabase.auth.onAuthStateChange(async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session) {
          await fetchSubscription();
        } else {
          setPlan(null);
          setCredits(0);
        }

        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, []);

  /* =====================================================
     💳 BUSCAR STATUS + CRÉDITOS
  ===================================================== */

  const fetchSubscription = async () => {
    try {
      const res = await api.get('/payment/subscription');

      setPlan(res.data.subscription.plan);
      setCredits(res.data.subscription.credits ?? 0);

    } catch (error) {
      console.error('Erro ao buscar assinatura:', error);
    }
  };

  /* =====================================================
     🔐 AUTH FUNCTIONS
  ===================================================== */

  const signUp = async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }
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
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    setPlan(null);
    setCredits(0);
  };

  /* =====================================================
     📦 CONTEXT VALUE
  ===================================================== */

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
