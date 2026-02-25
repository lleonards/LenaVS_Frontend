import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null); 
  const [loading, setLoading] = useState(true);

  // 🔥 Busca dados reais do backend (/user/me)
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

      if (!response.ok) {
        throw new Error('Erro ao buscar usuário');
      }

      const data = await response.json();

      setUser(data);

    } catch (error) {
      console.error('Erro ao buscar dados do usuário:', error);
      setUser(null);
    }
  };

  // 🔎 Inicializa sessão ao abrir o site
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (data?.session) {
          setSession(data.session);
          await fetchUserData(data.session.access_token);
        } else {
          setSession(null);
          setUser(null);
        }

      } catch (error) {
        console.error('Erro ao inicializar auth:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!isMounted) return;

        if (newSession) {
          setSession(newSession);
          await fetchUserData(newSession.access_token);
        } else {
          setSession(null);
          setUser(null);
        }
      }
    );

    return () => {
      isMounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  // ================================
  // 🔥 AÇÕES
  // ================================

  // ✅ Cadastro + Login automático
  const signUp = async (email, password, name) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }
      }
    });

    if (error) throw error;

    // 🔥 Login automático após cadastro
    const { data, error: loginError } =
      await supabase.auth.signInWithPassword({
        email,
        password
      });

    if (loginError) throw loginError;

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
  };

  // ================================
  // Loading Screen
  // ================================

  if (loading) {
    return (
      <div
        style={{
          background: '#000',
          height: '100vh',
          width: '100vw',
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
        loading,
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
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
};
