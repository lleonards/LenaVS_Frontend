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

  // ======================================
  // Backend validation
  // ======================================
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

  // ======================================
  // Init Auth State
  // ======================================
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const {
          data: { session }
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (session) {
          const isValid = await fetchSubscription();

          if (isValid) {
            setSession(session);
            setUser(session.user);
          } else {
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
          }
        }
      } catch (err) {
        console.error("Erro crítico na inicialização auth:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    // ======================================
    // Auth State Listener
    // ======================================
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (_, newSession) => {
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

      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // ======================================
  // Auth Actions
  // ======================================
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
    setPlan('free');
    setCredits(0);
  };

  // ======================================
  // Loading safety render
  // ======================================
  if (loading) {
    return (
      <div
        style={{
          background: '#000',
          height: '100vh',
          width: '100vw'
        }}
      />
    );
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

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }

  return context;
};
