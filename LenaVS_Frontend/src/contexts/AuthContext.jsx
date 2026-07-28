import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { hasSupabaseConfig, supabase } from '../services/supabase';
import api from '../services/api';

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

const normalizeDisplayName = (value) => String(value || '').trim().replace(/\s+/g, ' ');

const deriveProfileFromSessionUser = (sessionUser) => {
  const metadata = sessionUser?.user_metadata || {};
  const displayName =
    normalizeDisplayName(metadata.display_name)
    || normalizeDisplayName(metadata.full_name)
    || normalizeDisplayName(metadata.name)
    || '';

  const avatarUrl = String(metadata.avatar_url || metadata.picture || metadata.photo_url || '').trim() || null;

  return {
    displayName,
    avatarUrl,
    email: sessionUser?.email || null,
  };
};

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState(0);
  const [plan, setPlan] = useState('free');
  const [subscriptionStatus, setSubscriptionStatus] = useState('inactive');
  const [unlimitedUntil, setUnlimitedUntil] = useState(null);
  // Data em que o acesso Premium encerrará quando há cancelamento agendado.
  // null quando a assinatura está ativa, encerrada ou nunca foi Pro.
  const [cancelScheduledAt, setCancelScheduledAt] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [userEmail, setUserEmail] = useState(null);

  const resetLocalUserState = () => {
    setCredits(0);
    setPlan('free');
    setSubscriptionStatus('inactive');
    setUnlimitedUntil(null);
    setCancelScheduledAt(null);
    setDisplayName('');
    setAvatarUrl(null);
    setUserEmail(null);
  };

  const applyUserSnapshot = (data, fallbackUser = null) => {
    const fallbackProfile = deriveProfileFromSessionUser(fallbackUser);

    setCredits(data?.credits ?? 0);
    setPlan(data?.plan ?? 'free');
    setSubscriptionStatus(data?.subscription_status ?? 'inactive');
    setUnlimitedUntil(data?.unlimited_access_until ?? null);
    // cancel_scheduled_at vem da API quando há cancelamento agendado (mas período ainda pago)
    setCancelScheduledAt(data?.cancel_scheduled_at ?? null);
    setDisplayName(normalizeDisplayName(data?.display_name) || fallbackProfile.displayName || '');
    setAvatarUrl(String(data?.avatar_url || '').trim() || fallbackProfile.avatarUrl || null);
    setUserEmail(data?.email || fallbackProfile.email || null);

    return data ?? null;
  };

  const fetchUserData = async (userId, fallbackUser = session?.user ?? null) => {
    try {
      if (!userId || !hasSupabaseConfig) {
        resetLocalUserState();
        return null;
      }

      try {
        const backendResponse = await withTimeout(
          api.get('/user/me'),
          AUTH_BOOT_TIMEOUT_MS,
          null,
          '⚠️ Timeout ao buscar dados do usuário no backend. Tentando fallback direto no Supabase.',
        );

        if (backendResponse?.data) {
          return applyUserSnapshot(backendResponse.data, fallbackUser);
        }
      } catch (backendError) {
        console.warn('Falha ao sincronizar usuário pelo backend, usando fallback Supabase:', backendError?.response?.data?.error || backendError.message);
      }

      const { data, error } = await withTimeout(
        supabase
          .from('users')
          .select('credits, plan, subscription_status, unlimited_access_until, display_name, avatar_url, email')
          .eq('id', userId)
          .maybeSingle(),
        AUTH_BOOT_TIMEOUT_MS,
        null,
        '⚠️ Timeout no fallback Supabase ao buscar dados do usuário.',
      );

      if (error || !data) {
        const derived = deriveProfileFromSessionUser(fallbackUser);
        setDisplayName(derived.displayName);
        setAvatarUrl(derived.avatarUrl);
        setUserEmail(derived.email);
        return null;
      }

      // Fallback do Supabase não retorna cancel_scheduled_at, derivar localmente
      const isCancelScheduledLocally = (
        data?.plan === 'pro' &&
        data?.subscription_status === 'canceled' &&
        data?.unlimited_access_until &&
        new Date(data.unlimited_access_until).getTime() > Date.now()
      );

      return applyUserSnapshot({
        ...data,
        cancel_scheduled_at: isCancelScheduledLocally ? data.unlimited_access_until : null,
      }, fallbackUser);
    } catch (err) {
      console.error('Erro ao buscar dados do usuário:', err);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();

        if (!mounted) return;

        setSession(initialSession);

        if (initialSession?.user) {
          await fetchUserData(initialSession.user.id, initialSession.user);
        }
      } catch (err) {
        console.error('Erro na inicialização do auth:', err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;

      setSession(newSession);

      if (newSession?.user) {
        await fetchUserData(newSession.user.id, newSession.user);
      } else {
        resetLocalUserState();
      }

      if (mounted) {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshCredits = async () => {
    if (!session?.user?.id) return;

    try {
      const response = await api.get('/payment/subscription');
      if (response?.data) {
        applyUserSnapshot(response.data, session.user);
      }
    } catch (err) {
      console.warn('Não foi possível atualizar créditos:', err.message);
    }
  };

  const signUp = async ({ email, password, metadata = {} }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });

    if (error) throw error;
    return data;
  };

  const signIn = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) throw error;
    return data;
  };

  const updateProfile = async ({ displayName: newDisplayName, avatarFile, removeAvatar }) => {
    const formData = new FormData();

    if (newDisplayName !== undefined) {
      formData.append('display_name', String(newDisplayName || '').trim());
    }

    if (removeAvatar) {
      formData.append('remove_avatar', 'true');
    } else if (avatarFile) {
      formData.append('avatar', avatarFile);
    }

    const { data, error } = await api.patch('/user/profile', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    if (error) throw error;

    if (data) {
      setDisplayName(normalizeDisplayName(data.display_name) || displayName);
      setAvatarUrl(String(data.avatar_url || '').trim() || null);
    }
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
        // Data limite do Premium quando há cancelamento agendado.
        // Ex: "Plano cancelado. Premium ativo até 15/08/2025."
        cancelScheduledAt,
        displayName,
        avatarUrl,
        userEmail,
        signUp,
        signIn,
        signOut,
        refreshCredits,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
