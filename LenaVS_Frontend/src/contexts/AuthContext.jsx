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
          try {
            await fetchSubscription();
          } catch (err) {
            console.error('Erro ao buscar assinatura:', err);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar sessão:', error);
      } finally {
        setLoading(false); // 🔥 SEMPRE FINALIZA
      }
    };

    loadSession();

    const { data: authListener } =
      supabase.auth.onAuthStateChange(async (_event, newSession) => {
        try {
          setSession(newSession);
          setUser(newSession?.user ?? null);

          if (newSession) {
            try {
              await fetchSubscription();
            } catch (err) {
              console.error('Erro ao buscar assinatura:', err);
            }
          } else {
            setPlan(null);
            setCredits(0);
          }
        } catch (err) {
          console.error('Erro no auth state change:', err);
        } finally {
          setLoading(false); // 🔥 GARANTE QUE NÃO TRAVE
        }
      });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  /* =====================================================
     💳 BUSCAR STATUS + CRÉDITOS
  ===================================================== */

  const fetchSubscription = async () => {
    try {
      const res = await api.get('/api/payment/subscription');

      setPlan(res.data?.subscription?.plan ?? null);
      setCredits(res.data?.subscription?.credits ?? 0);
    } catch (error) {
      console.error('Erro ao buscar assinatura:', error);
      setPlan(null);
      setCredits(0);
      throw error; // importante para o try/catch externo funcionar
    }
  };

  /* =====================================================
     🔐 AUTH FUNCTIONS
  ===================================================== */

  const signUp = async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } }
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
