import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔥 Busca dados do backend sem travar autenticação
  const fetchUserData = async (accessToken) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/user/me`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      if (!response.ok) throw new Error();

      const data = await response.json();
      setUser(data);

    } catch (error) {
      console.error('Erro ao buscar dados do usuário:', error);
      setUser(null);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      const { data } = await supabase.auth.getSession();

      if (!mounted) return;

      if (data.session) {
        setSession(data.session);

        // 🔥 NÃO espera terminar para liberar tela
        fetchUserData(data.session.access_token);
      }

      setLoading(false);
    };

    initialize();

    const { data: listener } =
      supabase.auth.onAuthStateChange((_event, newSession) => {
        if (!mounted) return;

        setSession(newSession);

        if (newSession) {
          fetchUserData(newSession.access_token);
        } else {
          setUser(null);
        }
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
    setUser(null);
  };

  // 🔥 Só bloqueia enquanto verifica sessão inicial
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
        user,
        session,
        isAuthenticated: !!session, // 🔥 autenticação depende só da sessão
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
