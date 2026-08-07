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

const toFriendlyAuthError = (error, operation = 'login') => {
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();

  if (operation === 'login' && (
    code.includes('invalid_credentials')
    || message.includes('invalid login credentials')
    || message.includes('invalid credentials')
  )) {
    // Supabase intentionally uses the same response for an unknown email and
    // an incorrect password, so the UI must not claim which one was exposed.
    return new Error('E-mail não cadastrado ou senha incorreta. Confira os dados e tente novamente.');
  }

  if (message.includes('email not confirmed') || message.includes('email_not_confirmed')) {
    return new Error('Confirme seu e-mail antes de entrar. Verifique também a pasta de spam.');
  }

  if (operation === 'signup' && (
    code.includes('user_already_exists')
    || code.includes('email_exists')
    || code.includes('email_address_not_available')
    || message.includes('already registered')
    || message.includes('already been registered')
    || message.includes('already exists')
    || message.includes('email address is already')
    || message.includes('user with this email')
  )) {
    return new Error('Este e-mail já está cadastrado. Tente entrar ou use outro e-mail.');
  }

  if (message.includes('password should be at least')) {
    return new Error('A senha precisa ter pelo menos 6 caracteres.');
  }

  if (message.includes('invalid email')) {
    return new Error('Digite um e-mail válido.');
  }

  return new Error(
    operation === 'login'
      ? 'Não foi possível entrar agora. Confira seu e-mail e sua senha.'
      : 'Não foi possível criar sua conta agora. Tente novamente.'
  );
};

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState(0);
  const [plan, setPlan] = useState('free');
  const [subscriptionStatus, setSubscriptionStatus] = useState('inactive');
  const [unlimitedUntil, setUnlimitedUntil] = useState(null);
  // CORRIGIDO: data em que o Premium acaba quando há cancelamento agendado.
  // null enquanto a assinatura está ativa, encerrada ou nunca foi Pro.
  const [cancelScheduledAt, setCancelScheduledAt] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [userEmail, setUserEmail] = useState(null);

  const resetLocalUserState = () => {
    setCredits(0);
    setPlan('free');
    setSubscriptionStatus('inactive');
    setUnlimitedUntil(null);
    setCancelScheduledAt(null); // CORRIGIDO
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
    // CORRIGIDO: lê cancel_scheduled_at da resposta da API backend
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
          '⚠️ Timeout ao buscar dados do usuário no backend. Tentando fallback direto no Supabase.'
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
          .select('credits, plan, subscription_status, unlimited_access_until, subscription_cancel_at, display_name, avatar_url')
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

      // CORRIGIDO: fallback do Supabase não retorna cancel_scheduled_at;
      // deriva localmente pelo padrão: plan=pro + status=canceled + acesso ainda vigente.
      const isCancelScheduledLocally = (
        data?.plan === 'pro' &&
        data?.subscription_status === 'canceled' &&
        (data?.subscription_cancel_at || data?.unlimited_access_until) &&
        new Date(data.subscription_cancel_at || data.unlimited_access_until).getTime() > Date.now()
      );

      return applyUserSnapshot({
        ...data,
        cancel_scheduled_at: isCancelScheduledLocally
          ? (data.subscription_cancel_at || data.unlimited_access_until)
          : null,
      }, fallbackUser);
    } catch (err) {
      console.error('Erro inesperado fetchUserData:', err);
      resetLocalUserState();
      return null;
    }
  };

  const refreshCredits = async () => {
    const userId = session?.user?.id;
    if (!userId) return null;
    return fetchUserData(userId, session?.user ?? null);
  };

  const updateProfile = async ({ displayName: nextDisplayName, avatarFile = null, removeAvatar = false } = {}) => {
    const normalizedDisplayName = normalizeDisplayName(nextDisplayName);

    const formData = new FormData();
    formData.append('name', normalizedDisplayName);

    if (avatarFile) {
      formData.append('avatar', avatarFile);
    }

    if (removeAvatar) {
      formData.append('removeAvatar', 'true');
    }

    const { data } = await api.put('/user/profile', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    applyUserSnapshot(data, session?.user ?? null);
    return data;
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
          await fetchUserData(currentSession.user.id, currentSession.user);
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
        const fallbackProfile = deriveProfileFromSessionUser(newSession.user);
        setDisplayName(fallbackProfile.displayName || '');
        setAvatarUrl(fallbackProfile.avatarUrl || null);
        setUserEmail(fallbackProfile.email || null);
        void fetchUserData(newSession.user.id, newSession.user);
      } else {
        resetLocalUserState();
      }
    });

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && session?.user?.id) {
        void fetchUserData(session.user.id, session.user);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibility);
      listener?.subscription?.unsubscribe?.();
    };
  }, [session?.user?.id]);

  const signUp = async (email, password, name, countryCode = 'BR', acceptedLegal = false) => {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedName = String(name || '').trim();
    const normalizedCountryCode = String(countryCode || 'BR').trim().toUpperCase();
    const normalizedCountryGroup = normalizedCountryCode === 'BR' ? 'BR' : 'INTL';
    const preferredCurrency = normalizedCountryGroup === 'BR' ? 'BRL' : 'USD';
    const countryLabelMap = {
      BR: 'Brasil',
      US: 'Estados Unidos',
      CA: 'Canadá',
      AU: 'Austrália',
      NZ: 'Nova Zelândia',
      SG: 'Singapura',
      HK: 'Hong Kong',
      OTHER: 'Outros',
    };
    const selectedCountryLabel = countryLabelMap[normalizedCountryCode] || 'Outros';

    if (!acceptedLegal) {
      throw new Error('Você precisa aceitar os termos de uso e a política de privacidade para criar a conta.');
    }

    const acceptedAt = new Date().toISOString();

    try {
      const emailCheck = await api.post('/auth/check-email', {
        email: normalizedEmail,
      });

      if (emailCheck.data?.exists === true) {
        throw new Error('Este e-mail já está cadastrado. Tente entrar ou use outro e-mail.');
      }
    } catch (emailCheckError) {
      if (emailCheckError.message === 'Este e-mail já está cadastrado. Tente entrar ou use outro e-mail.') {
        throw emailCheckError;
      }

      // A API é apenas uma verificação auxiliar. Se estiver indisponível,
      // o Supabase continua sendo a fonte final da criação da conta.
      console.warn('Não foi possível verificar previamente o e-mail no backend:', emailCheckError?.message);
    }

    const { data: signUpData, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          name: normalizedName,
          full_name: normalizedName,
          display_name: normalizedName,
          country_group: normalizedCountryGroup,
          country: normalizedCountryCode,
          country_code: normalizedCountryCode,
          country_label: selectedCountryLabel,
          preferred_currency: preferredCurrency,
          accepted_legal_terms: true,
          legal_acceptance_at: acceptedAt,
          privacy_policy_version: '2026-06',
        },
      },
    });

    if (error) throw toFriendlyAuthError(error, 'signup');

    // Quando a proteção contra enumeração de e-mails está ativa, o Supabase
    // pode retornar sucesso para um e-mail existente, mas sem identities.
    // Transformamos esse retorno ambíguo no aviso solicitado pela interface.
    if (signUpData?.user && Array.isArray(signUpData.user.identities) && signUpData.user.identities.length === 0) {
      throw new Error('Este e-mail já está cadastrado. Tente entrar ou use outro e-mail.');
    }

    return { emailConfirmationRequired: true, message: 'Verifique seu e-mail para confirmar sua conta antes de fazer login.' };
  };

  const signIn = async (email, password) => {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      const errorCode = String(error?.code || '').toLowerCase();
      const errorMessage = String(error?.message || '').toLowerCase();
      const isInvalidCredentials = (
        errorCode.includes('invalid_credentials')
        || errorMessage.includes('invalid login credentials')
        || errorMessage.includes('invalid credentials')
      );

      if (isInvalidCredentials) {
        try {
          const emailCheck = await api.post('/auth/check-email', {
            email: normalizedEmail,
          });

          if (emailCheck.data?.exists === false) {
            throw new Error('E-mail não cadastrado. Confira o endereço ou crie uma conta.');
          }

          throw new Error('Senha incorreta. Confira sua senha e tente novamente.');
        } catch (checkError) {
          if (checkError.message === 'E-mail não cadastrado. Confira o endereço ou crie uma conta.'
            || checkError.message === 'Senha incorreta. Confira sua senha e tente novamente.') {
            throw checkError;
          }
        }
      }

      throw toFriendlyAuthError(error, 'login');
    }

    if (data?.session) {
      setSession(data.session);
      await fetchUserData(data.session.user.id, data.session.user);
    }

    return data?.session || null;
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
        cancelScheduledAt, // CORRIGIDO: exposto para Header.jsx exibir o banner
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
