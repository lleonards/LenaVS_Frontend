import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      const { data } = await supabase.auth.getSession();

      if (!mounted) return;

      setSession(data.session ?? null);
      setLoading(false);
    };

    initialize();

    const { data: listener } =
      supabase.auth.onAuthStateChange((_event, newSession) => {
        if (!mounted) return;
        setSession(newSession ?? null);
      });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  // ======================
  // AÇÕES
  // ======================

  const signUp = async (email, password, name) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }
      }
    });

    if (error) throw error;

    // Login automático
    const { error: loginError } =
      await supabase.auth.signInWithPassword({
        email,
        password
      });

    if (loginError) throw loginError;
  };

  const signIn = async (email, password) => {
    const { error } =
      await supabase.auth.signInWithPassword({
        email,
        password
      });

    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  if (loading) {
    return (
      <div
        style={{
          background: '#000',
          height: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          color: '#fff'
        }}
      >
        Carregando...
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null, // 🔥 agora user vem direto do Supabase
        isAuthenticated: !!session,
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
  return useContext(AuthContext);
};
