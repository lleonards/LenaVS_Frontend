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

/**
 * Tenta abrir uma sessão no Supabase após o backend criar a conta.
 * O backend NÃO devolve JWT (gera via admin), então o frontend precisa
 * chamar signInWithPassword após o "ensure-account"/"signup-direct".
 */
const signInAfterBackendSignup = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: String(email).trim().toLowerCase(),
    password,
  });
  if (error) throw error;
  return data;
};

const tryBackendEnsureAccount = async ({ email, password, name, countryGroup }) => {
  try {
    const response = await api.post('/auth/ensure-account', {
      email,
      password,
      name,
      countryCode: countryGroup,
      acceptedLegal: true,
    });
    return response?.data || null;
  } catch (err) {
    const message = err?.response?.data?.error || err?.message;
    const code = err?.response?.data?.code;
    const error = new Error(message || 'Não foi possível preparar sua conta agora.');
    error.code = code || err?.code;
    error.original = err;
    throw error;
  }
};

const tryBackendSignupDirect = async ({ email, password, name, countryGroup }) => {
  try {
    const response = await api.post('/auth/signup-direct', {
      email,
      password,
      name,
      countryCode: countryGroup,
      acceptedLegal: true,
    });
    return response?.data || null;
  } catch (err) {
    const message = err?.response?.data?.error || err?.message;
    const code = err?.response?.data?.code;
    const error = new Error(message || 'Não foi possível criar sua conta agora.');
    error.code = code || err?.code;
    error.original = err;
    throw error;
  }
};

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState(0);
  const [plan, setPlan] = useState('free');
  const [subscriptionStatus, setSubscriptionStatus] = useState('inactive');
  const [unlimitedUntil, setUnlimitedUntil] = useState(null);
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
    setCancelScheduledAt(data?.cancel_scheduled_at ?? null);
    setDisplayName(normalizeDisplayName(data?.display_name) || fallbackProfile.displayName || '');
    setAvatarUrl(String(data?.avatar_url || '').trim() || fallbackProfile.avatarUrl || null);
    setUserEmail(data?.email || fallbackProfile.email || null);

    return data ?? null;
  };

  const fetchUserData = async (userId, fallbackUser = null) => {
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

  /**
   * signUp agora usa estratégia em camadas para resolver "não consigo cadastrar":
   *
   *   1) Tenta Supabase.auth.signUp (caminho padrão).
   *      - Se devolve SESSÃO: faz setSession e segue fluxo normal.
   *      - Se devolve usuário mas SEM sessão (e-mail precisa confirmar):
   *        → chama /api/auth/ensure-account que cria/garante via service_role
   *          já auto-confirmado, e em seguida faz signInWithPassword.
   *   2) Se Supabase.auth.signUp falhar (rede, 5xx, CORS), cai direto
   *      para /api/auth/ensure-account.
   */
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

    // 0. Verifica e-mail previamente (best-effort)
    try {
      const emailCheck = await api.post('/auth/check-email', { email: normalizedEmail });
      if (emailCheck.data?.exists === true) {
        throw new Error('Este e-mail já está cadastrado. Tente entrar ou use outro e-mail.');
      }
    } catch (emailCheckError) {
      if (emailCheckError.message && emailCheckError.message.includes('já está cadastrado')) {
        throw emailCheckError;
      }
      console.warn('Não foi possível verificar previamente o e-mail:', emailCheckError?.message);
    }

    // 1. Tenta Supabase direto
    let supabaseSignupSucceededWithoutSession = false;
    try {
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

      if (error) throw error;

      // Proteção contra enumeração: sinaliza que o usuário já existe sem identities.
      if (signUpData?.user && Array.isArray(signUpData.user.identities) && signUpData.user.identities.length === 0) {
        throw new Error('Este e-mail já está cadastrado. Tente entrar ou use outro e-mail.');
      }

      // ✅ Caso BOM: Supabase devolveu SESSÃO imediatamente
      if (signUpData?.session) {
        setSession(signUpData.session);
        await fetchUserData(signUpData.session.user.id, signUpData.session.user);
        return { sessionEstablished: true, message: 'Conta criada e login efetuado com sucesso.' };
      }

      // ⚠️ Caso comum: Supabase criou o usuário mas devolveu SESSÃO VAZIA
      //    (porque confirmação de e-mail está ON no painel Supabase).
      supabaseSignupSucceededWithoutSession = true;
    } catch (supabaseError) {
      // Se for erro de "email já cadastrado" do próprio Supabase, propaga
      const friendly = toFriendlyAuthError(supabaseError, 'signup');
      if (supabaseError?.code?.includes('user_already_exists')
          || supabaseError?.code?.includes('email_exists')
          || /já está cadastrado/.test(friendly.message)) {
        throw friendly;
      }
      // Para qualquer outro erro de rede/Supabase, usamos o backend como fallback
      supabaseSignupSucceededWithoutSession = false;
      console.warn('Supabase signUp falhou, tentando backend ensure-account:', supabaseError?.message);
    }

    // 2. Fallback robusto via backend (service_role auto-confirma)
    try {
      await tryBackendEnsureAccount({
        email: normalizedEmail,
        password,
        name: normalizedName,
        countryGroup: normalizedCountryCode,
      });

      // 3. Agora loga via Supabase (já auto-confirmado pelo backend)
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (signInError) throw signInError;
      if (data?.session) {
        setSession(data.session);
        await fetchUserData(data.session.user.id, data.session.user);
      }
      return {
        sessionEstablished: true,
        message: 'Conta criada e login efetuado com sucesso.',
      };
    } catch (backendError) {
      // Se o backend disse "já existe" — é mensagem amigável
      if (backendError?.message && /já está cadastrado/i.test(backendError.message)) {
        throw new Error(backendError.message);
      }
      throw new Error(backendError?.message || 'Não foi possível criar sua conta agora. Tente novamente.');
    }
  };

  const signIn = async (email, password) => {
    const normalizedEmail = String(email || '').trim().toLowerCase();

    // 1. Tenta via Supabase diretamente
    let data;
    try {
      const result = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (result?.error) throw result.error;
      data = result?.data;
    } catch (primaryError) {
      const errorCode = String(primaryError?.code || '').toLowerCase();
      const errorMessage = String(primaryError?.message || '').toLowerCase();
      const isInvalidCredentials = (
        errorCode.includes('invalid_credentials')
        || errorMessage.includes('invalid login credentials')
        || errorMessage.includes('invalid credentials')
      );

      if (isInvalidCredentials) {
        // Tenta refinar a mensagem (e-mail existe? senha errada? etc.)
        try {
          const emailCheck = await api.post('/auth/check-email', { email: normalizedEmail });
          if (emailCheck.data?.exists === false) {
            throw new Error('E-mail não cadastrado. Confira o endereço ou crie uma conta.');
          }
          throw new Error('Senha incorreta. Confira sua senha e tente novamente.');
        } catch (checkError) {
          if (checkError?.message && /não cadastrado|senha incorreta/i.test(checkError.message)) {
            throw checkError;
          }
        }
      }

      if (errorMessage.includes('email not confirmed') || errorCode.includes('email_not_confirmed')) {
        // WORKAROUND: o usuário existe no Auth mas o e-mail não foi confirmado
        // (SMTP do Supabase pode estar desativado no tier gratuito).
        // Usamos o backend para AUTO-CONFIRMAR e logo em seguida logamos.
        try {
          await tryBackendEnsureAccount({
            email: normalizedEmail,
            password,
            name: '',
            countryGroup: 'BR',
          });
          const retry = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          });
          if (retry?.error) throw retry.error;
          data = retry?.data;
        } catch (ensureError) {
          throw new Error(
            'Sua conta existe, mas precisamos confirmar seu e-mail antes do primeiro login. '
            + 'Aguarde alguns segundos e tente entrar novamente. '
            + 'Se o problema persistir, reinicie o cadastro com o mesmo e-mail e senha.'
          );
        }
      } else {
        throw toFriendlyAuthError(primaryError, 'login');
      }
    }

    if (data?.session) {
      setSession(data.session);
      await fetchUserData(data.session.user.id, data.session.user);
    }

    return data?.session || null;
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Falha ao encerrar sessão Supabase:', err?.message);
    }
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
