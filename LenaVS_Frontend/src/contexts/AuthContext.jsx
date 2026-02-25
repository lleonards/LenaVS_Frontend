import React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Novo estado para armazenar os dados da tabela public.users
  const [userData, setUserData] = useState({ credits: 0, plan: 'free' });

  // Função para buscar créditos e plano diretamente da tabela do Supabase
  const fetchUserData = async (userId) => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('credits, plan')
        .eq('id', userId)
        .single();

      if (!error && data) {
        setUserData({ 
          credits: data.credits, 
          plan: data.plan 
        });
      }
    } catch (err) {
      console.error('Erro ao carregar dados do usuário:', err);
    }
  };

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      const currentSession = data.session ?? null;
      setSession(currentSession);
      
      // Se houver usuário, busca os créditos dele
      if (currentSession?.user) {
        await fetchUserData(currentSession.user.id);
      }
      setLoading(false);
    };

    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession ?? null);
        
        if (newSession?.user) {
          // Busca créditos sempre que o estado de login mudar
          await fetchUserData(newSession.user.id);
        } else {
          // Limpa os dados se o usuário deslogar
          setUserData({ credits: 0, plan: 'free' });
        }
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const signUp = async (email, password, name) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } }
    });

    if (error) throw error;

    await supabase.auth.signInWithPassword({ email, password });
  };

  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUserData({ credits: 0, plan: 'free' });
  };

  if (loading) {
    return (
      <div style={{
        background: '#000',
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        color: '#fff'
      }}>
        Carregando...
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        isAuthenticated: !!session,
        credits: userData.credits, // Exposto para o Header.jsx
        plan: userData.plan,       // Exposto para o Header.jsx
        signUp,
        signIn,
        signOut,
        refreshCredits: () => fetchUserData(session?.user?.id) // Função para atualizar manual
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
