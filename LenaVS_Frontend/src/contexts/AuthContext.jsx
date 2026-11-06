import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { hasSupabaseConfig, supabase } from '../services/supabase';
import api from '../services/api';
import { isUserFacingMessage } from '../utils/errorMessages';
const AuthContext = createContext(null);
const AUTH_BOOT_TIMEOUT_MS = 5000;

// CORRIGADO (tela branca na confirmação de e-mail):
// Antes o próprio AuthContext tentava restaurar a sessão a partir dos
// parâmetros do link do Supabase durante o boot e recarregava a página com
// window.location.replace — em qualquer falha silenciosa (timeout, token
// expirado, code PKCE sem verifier) o usuário ficava sem sessão e sem tela.
// Agora a rota dedicada /auth/callback (pages/AuthCallback.jsx) é a única
// responsável por concluir a verificação, com tela de carregamento, timeout
// de 10s e mensagem de erro amigável. O AuthContext apenas reage ao evento
// SIGNED_IN disparado por supabase.auth.setSession/exchangeCodeForSession/
// verifyOtp, como em um login normal.
const getEmailRedirectUrl = () => {
  if (typeof window === 'undefined') {
    return undefined;
  }
  // O Supabase precisa de uma URL que esteja na lista "Redirect URLs" do
  // painel. Enviamos apenas a origem (sem path/search/hash) e o backend
  // valida contra FRONTEND_URL antes de repassar ao Supabase.
  return `${window.location.origin}/`;
};
const withTimeout = async (
  promise,
  timeoutMs,
  fallbackValue,
  timeoutMessage
) => {
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
    return await Promise.race([
      promise,
      timeoutPromise,
    ]);
  } finally {
    clearTimeout(timeoutId);
  }
};
const parseDateOrNull = (value) => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? null
    : parsed;
};
const normalizeDisplayName = (value) => {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ');
};
const getSafeAuthMessage = (error, context = 'login') => {
  const payload = error?.response?.data || {};
  const code = String(
    payload.code ||
    error?.code ||
    ''
  ).toLowerCase();
  const rawMessage = String(
    payload.error ||
    payload.message ||
    error?.message ||
    ''
  );

  if (
    context === 'login' &&
    (
      code === 'invalid_login_credentials' ||
      /invalid login credentials|invalid credentials|invalid password|password is incorrect/i.test(rawMessage)
    )
  ) {
    return 'Senha incorreta. Tente novamente.';
  }

  if (code === 'email_not_confirmed' || /email not confirmed/i.test(rawMessage)) {
    return 'Confirme seu e-mail antes de entrar.';
  }

  if (code === 'invalid_email') {
    return 'Digite um e-mail válido.';
  }

  if (code === 'password_required') {
    return 'Digite sua senha.';
  }

  // Só repassa a mensagem do servidor quando ela é de produto (curta e sem
  // termos técnicos). Caso contrário, usa o fallback da ação.
  if (isUserFacingMessage(rawMessage)) {
    return rawMessage;
  }

  return context === 'login'
    ? 'Não foi possível fazer login. Tente novamente.'
    : 'Não foi possível concluir a autenticação. Tente novamente.';
};
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
const EmailConfirmationNotice = ({
  email,
  onClose,
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        width: 'min(360px, calc(100vw - 40px))',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '16px',
        border: '1px solid #e9e3f5',
        borderRadius: '12px',
        backgroundColor: '#ffffff',
        boxShadow: '0 8px 28px rgba(30, 20, 55, 0.12)',
        color: '#2d2640',
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          flexShrink: 0,
          width: '30px',
          height: '30px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          backgroundColor: '#f3edff',
          color: '#7651c9',
          fontSize: '16px',
          lineHeight: 1,
        }}
      >
        ✓
      </div>
      <div
        style={{
          flex: 1,
          minWidth: 0,
        }}
      >
        <strong
          style={{
            display: 'block',
            marginBottom: '4px',
            fontSize: '14px',
            fontWeight: 700,
            lineHeight: 1.35,
          }}
        >
          Confirme seu e-mail
        </strong>
        <span
          style={{
            display: 'block',
            color: '#6f687e',
            fontSize: '13px',
            lineHeight: 1.5,
            overflowWrap: 'anywhere',
          }}
        >
          Enviamos um link para{' '}
          <strong
            style={{
              color: '#4f4563',
              fontWeight: 600,
            }}
          >
            {email || 'seu e-mail'}
          </strong>
          . Verifique sua caixa de entrada.
        </span>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar aviso"
        style={{
          flexShrink: 0,
          width: '24px',
          height: '24px',
          margin: '-2px -4px 0 0',
          padding: 0,
          border: 0,
          background: 'transparent',
          color: '#9a93a8',
          cursor: 'pointer',
          fontSize: '20px',
          fontWeight: 400,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
};
export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState(0);
  const [plan, setPlan] = useState('free');
  const [subscriptionStatus, setSubscriptionStatus] =
    useState('inactive');
  const [unlimitedUntil, setUnlimitedUntil] =
    useState(null);
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [emailConfirmationNotice, setEmailConfirmationNotice] =
    useState(null);
  const sessionRef = useRef(null);
  const resetLocalUserState = () => {
    setCredits(0);
    setPlan('free');
    setSubscriptionStatus('inactive');
    setUnlimitedUntil(null);
    setDisplayName('');
    setAvatarUrl(null);
    setUserEmail(null);
  };
  const applyUserSnapshot = (
    data,
    fallbackUser = null
  ) => {
    const fallbackProfile =
      deriveProfileFromSessionUser(fallbackUser);
    // CORRIGIDO: uma leitura sem dados (rede caiu / Storage instável) zerava
    // créditos e derrubava o plano para "free", e o app passava a dizer que o
    // usuário estava sem créditos. Agora só sobrescreve o que veio de fato.
    if (data && data.credits !== undefined && data.credits !== null) {
      setCredits(Number(data.credits) || 0);
    }
    if (data && data.plan) {
      setPlan(data.plan);
    }
    if (data && data.subscription_status) {
      setSubscriptionStatus(data.subscription_status);
    }
    if (data && data.unlimited_access_until !== undefined) {
      setUnlimitedUntil(data.unlimited_access_until ?? null);
    }
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
    fallbackUser = session?.user ?? null
  ) => {
    try {
      if (!userId) {
        resetLocalUserState();
        return null;
      }
      try {
        let backendResponse = null;
        let backendError = null;

        // CORRIGIDO: até 2 tentativas. Um ERR_CONNECTION_RESET pontual (o que
        // aparecia no console) não deve mais virar "usuário sem créditos".
        for (let attempt = 1; attempt <= 2; attempt += 1) {
          try {
            backendResponse = await withTimeout(
              api.get('/user/me'),
              AUTH_BOOT_TIMEOUT_MS,
              null,
              'Timeout ao buscar dados do usuário no backend. Tentando fallback direto no Supabase.'
            );
            backendError = null;
            break;
          } catch (requestError) {
            backendError = requestError;

            if (requestError?.response?.status || attempt === 2) {
              break;
            }

            await new Promise((resolve) => setTimeout(resolve, 700 * attempt));
          }
        }

        if (backendResponse?.data) {
          return applyUserSnapshot(
            backendResponse.data,
            fallbackUser
          );
        }

        if (backendError) {
          console.warn(
            'Falha ao sincronizar usuário pelo backend. Usando fallback do Supabase:',
            backendError?.response?.data?.error ||
            backendError?.message
          );
        }
      } catch (backendError) {
        console.warn(
          'Falha ao sincronizar usuário pelo backend. Usando fallback do Supabase:',
          backendError?.response?.data?.error ||
          backendError?.message
        );
      }
      if (hasSupabaseConfig) {
        const { data, error } = await withTimeout(
          supabase
            .from('users')
            .select(
              'credits, plan, subscription_status, unlimited_access_until'
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
          'Timeout ao buscar dados do usuário no Supabase. Seguindo com plano free.'
        );
        if (!error) {
          return applyUserSnapshot(
            data,
            fallbackUser
          );
        }
        console.warn(
          'Erro ao buscar dados do usuário:',
          error.message
        );
      }

      // O backend já devolveu uma sessão válida. Quando o frontend está
      // hospedado sem as variáveis VITE do Supabase, mantém o perfil mínimo
      // local em vez de invalidar o login.
      return applyUserSnapshot(null, fallbackUser);
    } catch (error) {
      console.error(
        'Erro inesperado ao buscar dados do usuário:',
        error
      );
      // CORRIGIDO: não zera mais créditos/plano quando a falha é de rede.
      // O usuário continua com o último estado conhecido até a próxima leitura.
      return null;
    }
  };
  const refreshCredits = async () => {
    const userId = session?.user?.id;
    if (!userId) {
      return null;
    }
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
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    applyUserSnapshot(
      data,
      session?.user ?? null
    );
    return data;
  };
  useEffect(() => {
    let isMounted = true;
    const getCurrentSession = async () => {
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
        'Timeout ao recuperar sessão do Supabase. Liberando a interface para evitar tela infinita de carregamento.'
      );
      if (error) {
        console.error(
          'Erro ao recuperar sessão:',
          error.message
        );
      }
      return data?.session ?? null;
    };
    const initializeAuth = async () => {
      try {
        // CORRIGIDO: antes, sem as variáveis VITE do Supabase, a sessão
        // devolvida pelo backend era descartada no boot e o usuário caía
        // de volta no login a cada recarregamento da página.
        // Agora a sessão é sempre restaurada (Supabase ou fallback do
        // backend via storage local).
        const currentSession = await getCurrentSession();
        if (!isMounted) {
          return;
        }
        sessionRef.current = currentSession;
        setSession(currentSession);
        if (currentSession?.user) {
          await fetchUserData(
            currentSession.user.id,
            currentSession.user
          );
        } else {
          resetLocalUserState();
        }
      } catch (error) {
        console.error(
          'Erro inesperado ao inicializar autenticação:',
          error
        );
        if (isMounted) {
          sessionRef.current = null;
          setSession(null);
          resetLocalUserState();
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    const {
      data: listener,
    } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!isMounted) {
          return;
        }
        const nextSession = newSession ?? null;
        sessionRef.current = nextSession;
        setSession(nextSession);
        if (nextSession?.user) {
          const fallbackProfile =
            deriveProfileFromSessionUser(
              nextSession.user
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
            nextSession.user.id,
            nextSession.user
          );
        } else {
          resetLocalUserState();
        }
      }
    );
    void initializeAuth();
    const handleVisibility = () => {
      const currentSession =
        sessionRef.current;
      if (
        document.visibilityState === 'visible' &&
        currentSession?.user?.id
      ) {
        void fetchUserData(
          currentSession.user.id,
          currentSession.user
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
  }, []);
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
    if (!acceptedLegal) {
      throw new Error(
        'Você precisa aceitar os termos de uso e a política de privacidade para criar a conta.'
      );
    }
    const { data } = await api.post('/auth/signup-direct', {
      email: normalizedEmail,
      password,
      name: normalizedName,
      countryCode: normalizedCountryCode,
      acceptedLegal: true,
      emailRedirectTo: getEmailRedirectUrl(),
    });

    const needsEmailConfirmation = data?.email_confirmation_required !== false;

    if (needsEmailConfirmation) {
      setEmailConfirmationNotice({
        email: normalizedEmail,
      });
    }

    return {
      emailConfirmationRequired: needsEmailConfirmation,
      email: normalizedEmail,
      message:
        data?.message
        || 'Cadastro realizado. Verifique seu e-mail para confirmar a conta antes de entrar.',
    };
  };

  // Reenvia o e-mail de confirmação de cadastro.
  const resendConfirmation = async (email) => {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const { data } = await api.post('/auth/resend-confirmation', {
      email: normalizedEmail,
      emailRedirectTo: getEmailRedirectUrl(),
    });
    return data;
  };

  // Envia o link de redefinição de senha.
  const requestPasswordReset = async (email) => {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const { data } = await api.post('/auth/forgot-password', {
      email: normalizedEmail,
      emailRedirectTo: getEmailRedirectUrl(),
    });
    return data;
  };

  // Salva a nova senha (usado na tela de redefinição).
  const updatePassword = async (password) => {
    const { data } = await api.post('/auth/update-password', { password });
    return data;
  };
  const signIn = async (
    email,
    password
  ) => {
    const normalizedEmail =
      String(email || '')
        .trim()
        .toLowerCase();
    const { data } = await api.post('/auth/login', {
      email: normalizedEmail,
      password,
    });
    const returnedSession = data?.session || null;

    if (!returnedSession) {
      throw new Error(
        'Não foi possível iniciar sua sessão. Tente novamente em instantes.'
      );
    }

    if (returnedSession) {
      const { error: sessionError } =
        await supabase.auth.setSession(returnedSession);
      if (sessionError) {
        throw sessionError;
      }
    }

    setEmailConfirmationNotice(null);
    if (returnedSession) {
      sessionRef.current =
        returnedSession;
      setSession(
        returnedSession
      );
      await fetchUserData(
        returnedSession.user.id,
        returnedSession.user
      );
    }
    return returnedSession;
  };
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn(
        'Falha ao encerrar sessão do Supabase:',
        error?.message
      );
    }
    sessionRef.current = null;
    setSession(null);
    resetLocalUserState();
  };
  // CORRIGIDO: quando unlimited_access_until existe mas está vencido e a
  // assinatura segue ativa (plan='pro' + status 'active'), o acesso Pro
  // prevalece — antes o usuário com assinatura paga perdia o acesso Pro
  // no frontend mesmo com a liberação confirmada no backend.
  const hasUnlimitedAccess = useMemo(() => {
    const untilDate =
      parseDateOrNull(unlimitedUntil);
    if (untilDate && untilDate.getTime() > Date.now()) {
      return true;
    }
    const normalizedStatus = String(
      subscriptionStatus || ''
    )
      .trim()
      .toLowerCase();
    return (
      plan === 'pro' &&
      (normalizedStatus === 'active' ||
        normalizedStatus === 'trialing')
    );
  }, [
    plan,
    subscriptionStatus,
    unlimitedUntil,
  ]);
  const creditsLabel =
    hasUnlimitedAccess
      ? 'unlimited'
      : Math.max(
          0,
          Number(credits) || 0
        );
  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        isAuthenticated: Boolean(session),
        loading,
        credits,
        creditsLabel,
        plan,
        subscriptionStatus,
        unlimitedUntil,
        hasUnlimitedAccess,
        displayName,
        avatarUrl,
        userEmail,
        signUp,
        signIn,
        signOut,
        refreshCredits,
        updateProfile,
        resendConfirmation,
        requestPasswordReset,
        updatePassword,
        getSafeAuthMessage,
      }}
    >
      {children}
      {emailConfirmationNotice && (
        <EmailConfirmationNotice
          email={emailConfirmationNotice.email}
          onClose={() => {
            setEmailConfirmationNotice(null);
          }}
        />
      )}
    </AuthContext.Provider>
  );
};
export const useAuth = () => {
  return useContext(AuthContext);
};
