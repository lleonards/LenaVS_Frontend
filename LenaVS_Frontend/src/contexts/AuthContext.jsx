import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { hasSupabaseConfig, supabase } from '../services/supabase';

const AuthContext = createContext(null);
const AUTH_BOOT_TIMEOUT_MS = 5000;

const withTimeout = async (promise, timeoutMs, fallbackValue, timeoutMessage) => {
  let timeoutId;

  const timeoutPromise = new Promise((resolve) => {
    timeoutId = setTimeout(() => {
      if (timeoutMessage) {
        console.warn(timeoutMessage);
      }
      resolve(fallbackValue);
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
};

const parseDateOrNull = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState(0);
  const [plan, setPlan] = useState('free');
  const [subscriptionStatus, setSubscriptionStatus] = useState('inactive');
  const [unlimitedUntil, setUnlimitedUntil] = useState(null);

  const resetLocalUserState = () => {
    setCredits(0);
    setPlan('free');
    setSubscriptionStatus('inactive');
    setUnlimitedUntil(null);
  };

  const fetchUserData = async (userId) => {
    try {
      if (!userId || !hasSupabaseConfig) {
        resetLocalUserState();
        return null;
      }

      const { data, error } = await withTimeout(
        supabase
          .from('users')
          .select('credits, plan, subscription_status, unlimited_access_until')
          .eq('id', userId)
          .maybeSingle(),
        AUTH_BOOT_TIMEOUT_MS,
        { data: null, error: new Error('Timeout ao buscar dados do usuário.') },
        '⚠️ Timeout ao buscar dados do usuário no Supabase. Seguindo com plano free.'
      );

      if (error) {
        console.warn('Erro ao buscar dados do usuário:', error.message);
        resetLocalUserState();
        return null;
      }

      setCredits(data?.credits ?? 0);
      setPlan(data?.plan ?? 'free');
      setSubscriptionStatus(data?.subscription_status ?? 'inactive');
      setUnlimitedUntil(data?.unlimited_access_until ?? null);
      return data;
    } catch (err) {
      console.error('Erro inesperado fetchUserData:', err);
      resetLocalUserState();
      return null;
    }
  };

  const refreshCredits = async () => {
    const userId = session?.user?.id;
    if (!userId) return null;
    return fetchUserData(userId);
  };

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        if (!hasSupabaseConfig) {
          if (isMounted) {
            setSession(null);
            resetLocalUserState();
          }
          return;
        }

        const { data, error } = await withTimeout(
          supabase.auth.getSession(),
          AUTH_BOOT_TIMEOUT_MS,
          { data: { session: null }, error: new Error('Timeout ao recuperar a sessão.') },
          '⚠️ Timeout ao recuperar sessão do Supabase. Liberando a interface para evitar tela infinita de carregamento.'
        );

        if (error) {
          console.error('Erro getSession:', error.message);
        }

        const currentSession = data?.session ?? null;

        if (!isMounted) return;

        setSession(currentSession);

        if (currentSession?.user) {
          await fetchUserData(currentSession.user.id);
        } else {
          resetLocalUserState();
        }
      } catch (err) {
        console.error('Erro inesperado initializeAuth:', err);
        if (isMounted) {
          setSession(null);
          resetLocalUserState();
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!isMounted) return;

      setSession(newSession ?? null);

      if (newSession?.user) {
        void fetchUserData(newSession.user.id);
      } else {
        resetLocalUserState();
      }
    });

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && session?.user?.id) {
        void fetchUserData(session.user.id);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibility);
      listener?.subscription?.unsubscribe?.();
    };
  }, [session?.user?.id]);

  const signUp = async (email, password, name, countryGroup = 'INTL') => {
    const normalizedName = String(name || '').trim();
    const normalizedCountryGroup = String(countryGroup || 'INTL').trim().toUpperCase() === 'BR' ? 'BR' : 'INTL';
    const preferredCurrency = normalizedCountryGroup === 'BR' ? 'BRL' : 'USD';

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: normalizedName,
          full_name: normalizedName,
          display_name: normalizedName,
          country_group: normalizedCountryGroup,
          country: normalizedCountryGroup,
          preferred_currency: preferredCurrency,
        },
      },
    });

    if (error) throw error;

    alert('Verifique seu e-mail para confirmar sua conta antes de fazer login.');
  };

  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    resetLocalUserState();
  };

  const hasUnlimitedAccess = useMemo(() => {
    const untilDate = parseDateOrNull(unlimitedUntil);
    if (untilDate) {
      return untilDate.getTime() > Date.now();
    }
    return plan === 'pro' && subscriptionStatus === 'active';
  }, [plan, subscriptionStatus, unlimitedUntil]);

  const creditsLabel = hasUnlimitedAccess ? 'unlimited' : Math.max(0, Number(credits) || 0);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        isAuthenticated: !!session,
        loading,
        credits,
        creditsLabel,
        plan,
        subscriptionStatus,
        unlimitedUntil,
        hasUnlimitedAccess,
        signUp,
        signIn,
        signOut,
        refreshCredits,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
