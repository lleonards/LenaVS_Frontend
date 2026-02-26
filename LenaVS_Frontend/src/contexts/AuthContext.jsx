import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const [credits, setCredits] = useState(0);
  const [plan, setPlan] = useState('free');

  // ===============================
  // Buscar dados do usuário no banco
  // ===============================
  const fetchUserData = async (userId) => {

    if (!userId) return;

    try {

      const { data, error } = await supabase
        .from('users')
        .select('credits, plan')
        .eq('id', userId)
        .single();

      if (!error && data) {
        setCredits(data.credits ?? 0);
        setPlan(data.plan ?? 'free');
      }

    } catch (err) {
      console.error(err);
    }
  };

  // ===============================
  // Inicialização auth
  // ===============================
  useEffect(() => {

    let mounted = true;

    const init = async () => {

      const { data } = await supabase.auth.getSession();

      if (!mounted) return;

      const currentSession = data.session ?? null;

      setSession(currentSession);

      if (currentSession?.user) {
        await fetchUserData(currentSession.user.id);
      }

      setLoading(false);
    };

    init();

    // Listener auth
    const { data: listener } =
      supabase.auth.onAuthStateChange(async (_event, newSession) => {

        if (!mounted) return;

        setSession(newSession ?? null);

        if (newSession?.user) {
          await fetchUserData(newSession.user.id);
        } else {
          setCredits(0);
          setPlan('free');
        }

      });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };

  }, []);

  // ===============================
  // Actions
  // ===============================

  const signUp = async (email, password, name) => {

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } }
    });

    if (error) throw error;

    await supabase.auth.signInWithPassword({
      email,
      password
    });
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
    setCredits(0);
    setPlan('free');
  };

  // ===============================
  // Loading Screen
  // ===============================
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
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      isAuthenticated: !!session,

      credits,
      plan,

      signUp,
      signIn,
      signOut,

      refreshCredits: () =>
        session?.user && fetchUserData(session.user.id)
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
