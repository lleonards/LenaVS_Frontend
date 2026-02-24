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

  /* ================================
     BUSCAR ASSINATURA
  ================================= */
  const fetchSubscription = async () => {
    try {
      const res = await api.get('/api/payment/subscription');
      setPlan(res.data?.subscription?.plan ?? null);
    } catch (error) {
      setPlan(null);
      setCredits(0);
    }
  };

  /* ================================
     INICIALIZAÇÃO
  ================================= */
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const currentSession = data?.session ?? null;

      if (!mounted) return;

      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false); // 🔥 loading termina aqui SEM depender da API

      if (currentSession) {
        fetchSubscription(); // roda depois
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession) {
          fetchSubscription();
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

  /* ================================
     AUTH
  ================================= */
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
