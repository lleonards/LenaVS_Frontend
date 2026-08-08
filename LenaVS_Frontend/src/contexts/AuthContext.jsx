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

const normalizeDisplayName = (value) =>
  String(value || '').trim().replace(/\s+/g, ' ');

const deriveProfileFromSessionUser = (sessionUser) => {
  const metadata = sessionUser?.user_metadata || {};

  const displayName =
    normalizeDisplayName(metadata.display_name) ||
    normalizeDisplayName(metadata.full_name) ||
    normalizeDisplayName(metadata.name) ||
    '';

  const avatarUrl =
    String(
      metadata.avatar_url ||
      metadata.picture ||
      metadata.photo_url ||
      ''
    ).trim() || null;

  return {
    displayName,
    avatarUrl,
    email: sessionUser?.email || null,
  };
};

/* =====================================================
   ERROS DE AUTENTICAÇÃO
===================================================== */

const AUTH_ERROR_RULES = [
  {
    test: (msg, code) =>
      /exceed_storage_size_quota|exceed storage size|storage quota/i.test(msg) ||
      /exceed_storage_size_quota/i.test(String(code || '')) ||
      /superase_limite_armazenamento|limite de armazenamento/i.test(msg),

    message: 'Erro no sistema. Tente novamente mais tarde.',
  },

  {
    test: (msg) =>
      /restricted due to|service is restricted/i.test(msg),

    message: 'Erro no sistema. Tente novamente mais tarde.',
  },

  {
    test: (msg) =>
      /billing|spend cap|plan upgrade|excedeu/i.test(msg),

    message: 'Erro no sistema. Tente novamente mais tarde.',
  },
];

/* =====================================================
   EXTRAI A MENSAGEM REAL DO ERRO
===================================================== */

const extractErrorMessage = (error) => {
  return String(
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.message ||
    ''
  ).trim();
};

/* =====================================================
   DETECTA E-MAIL JÁ CADASTRADO
===================================================== */

const isEmailAlreadyRegisteredError = (error) => {
  const code = String(
    error?.response?.data?.code ||
    error?.code ||
    ''
  ).toLowerCase();

  const message = extractErrorMessage(error).toLowerCase();

  return (
    code === 'email_already_registered' ||
    code === 'user_already_exists' ||
    code === 'email_exists' ||
    code === 'email_address_not_available' ||
    message.includes('já está cadastrado') ||
    message.includes('ja esta cadastrado') ||
    message.includes('already registered') ||
    message.includes('already been registered') ||
    message.includes('already exists') ||
    message.includes('email address is already') ||
    message.includes('user with this email') ||
    message.includes('email_exists')
  );
};

/* =====================================================
   TRANSFORMA ERROS EM MENSAGENS AMIGÁVEIS
===================================================== */

const toFriendlyAuthError = (error, operation = 'login') => {
  const code = String(error?.code || '').toLowerCase();
  const message = extractErrorMessage(error).toLowerCase();

  /* E-MAIL JÁ CADASTRADO — PRIMEIRO DE TUDO */
  if (operation === 'signup' && isEmailAlreadyRegisteredError(error)) {
    return new Error(
      'Este e-mail já está cadastrado. Tente entrar ou use outro e-mail.'
    );
  }

  for (const rule of AUTH_ERROR_RULES) {
    if (rule.test(message, code)) {
      return new Error(rule.message);
    }
  }

  if (
    operation === 'login' &&
    (
      code.includes('invalid_credentials') ||
      message.includes('invalid login credentials') ||
      message.includes('invalid credentials')
    )
  ) {
    return new Error(
      'E-mail não cadastrado ou senha incorreta. Confira os dados e tente novamente.'
    );
  }

  if (
    message.includes('email not confirmed') ||
    message.includes('email_not_confirmed')
  ) {
    return new Error(
      'Confirme seu e-mail antes de entrar. Verifique também a pasta de spam.'
    );
  }

  if (
    operation === 'signup' &&
    isEmailAlreadyRegisteredError(error)
  ) {
    return new Error(
      'Este e-mail já está cadastrado. Tente entrar ou use outro e-mail.'
    );
  }

  if (message.includes('password should be at least')) {
    return new Error(
      'A senha precisa ter pelo menos 6 caracteres.'
    );
  }

  if (message.includes('invalid email')) {
    return new Error(
      'Digite um e-mail válido.'
    );
  }

  return new Error(
    'Erro no sistema. Tente novamente mais tarde.'
  );
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
    const fallbackProfile =
      deriveProfileFromSessionUser(fallbackUser);

    setCredits(data?.credits ?? 0);
    setPlan(data?.plan ?? 'free');
    setSubscriptionStatus(
      data?.subscription_status ?? 'inactive'
    );

    setUnlimitedUntil(
      data?.unlimited_access_until ?? null
    );

    setCancelScheduledAt(
      data?.cancel_scheduled_at ?? null
    );

    setDisplayName(
      normalizeDisplayName(data?.display_name) ||
      fallbackProfile.displayName ||
      ''
    );

    setAvatarUrl(
      String(data?.avatar_url || '').trim() ||
      fallbackProfile.avatarUrl ||
      null
    );

    setUserEmail(
      data?.email ||
      fallbackProfile.email ||
      null
    );

    return data ?? null;
  };

  const fetchUserData = async (
    userId,
    fallbackUser = null
  ) => {
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
          return applyUserSnapshot(
            backendResponse.data,
            fallbackUser
          );
        }
      } catch (backendError) {
        console.warn(
          'Falha ao sincronizar usuário pelo backend, usando fallback Supabase:',
          backendError?.response?.data?.error ||
          backendError.message
        );
      }

      const { data, error } = await withTimeout(
        supabase
          .from('users')
          .select(
            'credits, plan, subscription_status, unlimited_access_until, subscription_cancel_at, display_name, avatar_url'
          )
          .eq('id', userId)
          .maybeSingle(),

        AUTH_BOOT_TIMEOUT_MS,

        {
          data: null,
          error: new Error(
            'Timeout ao buscar dados do usuário.'
          ),
        },

        '⚠️ Timeout ao buscar dados do usuário no Supabase. Seguindo com plano free.'
      );

      if (error) {
        console.warn(
          'Erro ao buscar dados do usuário:',
          error.message
        );

        resetLocalUserState();
        return null;
      }

      const isCancelScheduledLocally =
        data?.plan === 'pro' &&
        data?.subscription_status === 'canceled' &&
        (data?.subscription_cancel_at ||
          data?.unlimited_access_until) &&
        new Date(
          data.subscription_cancel_at ||
          data.unlimited_access_until
        ).getTime() > Date.now();

      return applyUserSnapshot(
        {
          ...data,
          cancel_scheduled_at:
            isCancelScheduledLocally
              ? (
                  data.subscription_cancel_at ||
                  data.unlimited_access_until
                )
              : null,
        },
        fallbackUser
      );
    } catch (err) {
      console.error(
        'Erro inesperado fetchUserData:',
        err
      );

      resetLocalUserState();
      return null;
    }
  };

  const refreshCredits = async () => {
    const userId = session?.user?.id;

    if (!userId) return null;

    return fetchUserData(
      userId,
      session?.user ?? null
    );
  };

  const updateProfile = async ({
    displayName: nextDisplayName,
    avatarFile = null,
    removeAvatar = false,
  } = {}) => {
    const normalizedDisplayName =
      normalizeDisplayName(nextDisplayName);

    const formData = new FormData();

    formData.append(
      'name',
      normalizedDisplayName
    );

    if (avatarFile) {
      formData.append(
        'avatar',
        avatarFile
      );
    }

    if (removeAvatar) {
      formData.append(
        'removeAvatar',
        'true'
      );
    }

    const { data } = await api.put(
      '/user/profile',
      formData,
      {
        headers: {
          'Content-Type':
            'multipart/form-data',
        },
      }
    );

    applyUserSnapshot(
      data,
      session?.user ?? null
    );

    return data;
  };

  /* =====================================================
     INICIALIZAÇÃO DA AUTENTICAÇÃO
  ===================================================== */

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

          {
            data: {
              session: null,
            },
            error: new Error(
              'Timeout ao recuperar a sessão.'
            ),
          },

          '⚠️ Timeout ao recuperar sessão do Supabase. Liberando a interface para evitar tela infinita de carregamento.'
        );

        if (error) {
          console.error(
            'Erro getSession:',
            error.message
          );
        }

        const currentSession =
          data?.session ?? null;

        if (!isMounted) return;

        setSession(currentSession);

        if (currentSession?.user) {
          await fetchUserData(
            currentSession.user.id,
            currentSession.user
          );
        } else {
          resetLocalUserState();
        }
      } catch (err) {
        console.error(
          'Erro inesperado initializeAuth:',
          err
        );

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

    const { data: listener } =
      supabase.auth.onAuthStateChange(
        (_event, newSession) => {
          if (!isMounted) return;

          setSession(
            newSession ?? null
          );

          if (newSession?.user) {
            const fallbackProfile =
              deriveProfileFromSessionUser(
                newSession.user
              );

            setDisplayName(
              fallbackProfile.displayName || ''
            );

            setAvatarUrl(
              fallbackProfile.avatarUrl || null
            );

            setUserEmail(
              fallbackProfile.email || null
            );

            void fetchUserData(
              newSession.user.id,
              newSession.user
            );
          } else {
            resetLocalUserState();
          }
        }
      );

    const handleVisibility = () => {
      if (
        document.visibilityState === 'visible' &&
        session?.user?.id
      ) {
        void fetchUserData(
          session.user.id,
          session.user
        );
      }
    };

    document.addEventListener(
      'visibilitychange',
      handleVisibility
    );

    return () => {
      isMounted = false;

      document.removeEventListener(
        'visibilitychange',
        handleVisibility
      );

      listener?.subscription
        ?.unsubscribe?.();
    };
  }, [session?.user?.id]);

  /* =====================================================
     CADASTRO
  ===================================================== */

  const signUp = async (
    email,
    password,
    name,
    countryCode = 'BR',
    acceptedLegal = false
  ) => {
    const normalizedEmail =
      String(email || '')
        .trim()
        .toLowerCase();

    const normalizedName =
      String(name || '').trim();

    const normalizedCountryCode =
      String(countryCode || 'BR')
        .trim()
        .toUpperCase();

    const normalizedCountryGroup =
      normalizedCountryCode === 'BR'
        ? 'BR'
        : 'INTL';

    const preferredCurrency =
      normalizedCountryGroup === 'BR'
        ? 'BRL'
        : 'USD';

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

    const selectedCountryLabel =
      countryLabelMap[
        normalizedCountryCode
      ] || 'Outros';

    if (!acceptedLegal) {
      throw new Error(
        'Você precisa aceitar os termos de uso e a política de privacidade para criar a conta.'
      );
    }

    const acceptedAt =
      new Date().toISOString();

    /* =================================================
       0. VERIFICA E-MAIL NO BACKEND
    ================================================= */

    try {
      const emailCheck =
        await api.post(
          '/auth/check-email',
          {
            email: normalizedEmail,
          }
        );

      if (
        emailCheck?.data?.exists === true
      ) {
        throw new Error(
          'Este e-mail já está cadastrado. Tente entrar ou use outro e-mail.'
        );
      }
    } catch (emailCheckError) {
      /*
       * IMPORTANTE:
       * Se o backend disser explicitamente que o
       * e-mail já existe, mostramos essa mensagem.
       */

      if (
        isEmailAlreadyRegisteredError(
          emailCheckError
        )
      ) {
        throw new Error(
          'Este e-mail já está cadastrado. Tente entrar ou use outro e-mail.'
        );
      }

      /*
       * O endpoint /check-email pode falhar por algum
       * motivo temporário. Nesse caso não bloqueamos
       * o cadastro e deixamos o Supabase fazer a
       * verificação definitiva.
       */

      console.warn(
        'Não foi possível verificar previamente o e-mail:',
        extractErrorMessage(
          emailCheckError
        ) || emailCheckError?.message
      );
    }

    /* =================================================
       1. CADASTRO NO SUPABASE
    ================================================= */

    try {
      const {
        data: signUpData,
        error,
      } = await supabase.auth.signUp({
        email: normalizedEmail,

        password,

        options: {
          data: {
            name: normalizedName,
            full_name: normalizedName,
            display_name: normalizedName,

            country_group:
              normalizedCountryGroup,

            country:
              normalizedCountryCode,

            country_code:
              normalizedCountryCode,

            country_label:
              selectedCountryLabel,

            preferred_currency:
              preferredCurrency,

            accepted_legal_terms:
              true,

            legal_acceptance_at:
              acceptedAt,

            privacy_policy_version:
              '2026-06',
          },

          emailRedirectTo: typeof window !== 'undefined'
  ? ${window.location.origin}/
  : undefined,
        },
      });

      if (error) {
        /*
         * Antes de transformar o erro em mensagem
         * genérica, verificamos se é e-mail existente.
         */
        if (
          isEmailAlreadyRegisteredError(
            error
          )
        ) {
          throw new Error(
            'Este e-mail já está cadastrado. Tente entrar ou use outro e-mail.'
          );
        }

        throw error;
      }

      /*
       * Proteção contra e-mail já existente.
       */
      if (
        signUpData?.user &&
        Array.isArray(
          signUpData.user.identities
        ) &&
        signUpData.user.identities.length === 0
      ) {
        throw new Error(
          'Este e-mail já está cadastrado. Tente entrar ou use outro e-mail.'
        );
      }

      /*
       * A confirmação de e-mail deve ser obrigatória.
       */
      if (signUpData?.session) {
        await supabase.auth.signOut();

        setSession(null);

        resetLocalUserState();
      }

      return {
        emailConfirmationRequired:
          true,

        message:
          'Cadastro realizado. Enviamos um link de confirmação para seu e-mail.',
      };
    } catch (supabaseError) {
      /*
       * PRIMEIRO:
       * Nunca transformar e-mail existente em
       * "Erro no sistema".
       */
      if (
        isEmailAlreadyRegisteredError(
          supabaseError
        ) ||
        /já está cadastrado/i.test(
          extractErrorMessage(
            supabaseError
          )
        )
      ) {
        throw new Error(
          'Este e-mail já está cadastrado. Tente entrar ou use outro e-mail.'
        );
      }

      const friendly =
        toFriendlyAuthError(
          supabaseError,
          'signup'
        );

      console.error(
        'Erro no cadastro pelo Supabase:',
        supabaseError
      );

      throw friendly;
    }
  };

  /* =====================================================
     LOGIN
  ===================================================== */

  const signIn = async (
    email,
    password
  ) => {
    const normalizedEmail =
      String(email || '')
        .trim()
        .toLowerCase();

    let data;

    try {
      const result =
        await supabase.auth.signInWithPassword(
          {
            email: normalizedEmail,
            password,
          }
        );

      if (result?.error) {
        throw result.error;
      }

      data = result?.data;
    } catch (primaryError) {
      const errorCode =
        String(
          primaryError?.code || ''
        ).toLowerCase();

      const errorMessage =
        String(
          primaryError?.message || ''
        ).toLowerCase();

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
          throw new Error(
            'E-mail não cadastrado. Confira o endereço ou crie uma conta.'
          );
        }

        throw new Error(
          'Senha incorreta. Confira sua senha e tente novamente.'
        );
      } catch (checkError) {
        if (
          checkError?.message &&
          /não cadastrado|senha incorreta/i.test(checkError.message)
        ) {
          throw checkError;
        }
      }
    }

    if (
      errorMessage.includes('email not confirmed')
      || errorCode.includes('email_not_confirmed')
    ) {
      throw new Error(
        'Confirme seu e-mail antes de entrar. Verifique também a pasta de spam.'
      );
    }

    throw toFriendlyAuthError(primaryError, 'login');
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
    console.warn(
      'Falha ao encerrar sessão Supabase:',
      err?.message
    );
  }

  setSession(null);
  resetLocalUserState();
};

const getSafeAuthMessage = (error, operation = 'login') => {
  const message = String(
    error?.response?.data?.error
    || error?.message
    || ''
  );

  const knownMessages = [
    'Digite um e-mail válido.',
    'A senha precisa ter pelo menos 6 caracteres.',
    'Este e-mail já está cadastrado. Tente entrar ou use outro e-mail.',
    'Confirme seu e-mail antes de entrar. Verifique também a pasta de spam.',
    'E-mail não cadastrado. Confira o endereço ou crie uma conta.',
    'Senha incorreta. Confira sua senha e tente novamente.',
    'E-mail não cadastrado ou senha incorreta. Confira os dados e tente novamente.',
    'Você precisa aceitar os termos de uso e a política de privacidade para criar a conta.',
    'As senhas não coincidem',
    'Erro no sistema. Tente novamente mais tarde.',
  ];

  if (knownMessages.includes(message)) {
    return message;
  }

  return 'Erro no sistema. Tente novamente mais tarde.';
};

const hasUnlimitedAccess = useMemo(() => {
  const untilDate = parseDateOrNull(unlimitedUntil);

  if (untilDate) {
    return untilDate.getTime() > Date.now();
  }

  return plan === 'pro' && subscriptionStatus === 'active';
}, [plan, subscriptionStatus, unlimitedUntil]);

const creditsLabel = hasUnlimitedAccess
  ? 'unlimited'
  : Math.max(0, Number(credits) || 0);

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
      getSafeAuthMessage,
    }}
  >
    {children}
  </AuthContext.Provider>
);
};

export const useAuth = () => useContext(AuthContext);
