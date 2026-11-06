import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, LogIn, RotateCcw } from 'lucide-react';
import { hasSupabaseConfig, supabase } from '../services/supabase';
import {
  cleanAuthCallbackUrl,
  getAuthCallbackParams,
  hasSupabaseAuthCallback,
  isRecoveryCallback,
} from '../utils/authCallback';

// Tela intermediária de confirmação de acesso.
//
// É responsável por concluir de verdade a verificação feita quando a pessoa
// clica no link do e-mail do Supabase. O link pode chegar em três formatos:
//   1. #access_token=...&refresh_token=...  → supabase.auth.setSession()
//   2. ?code=...                            → supabase.auth.exchangeCodeForSession()
//   3. ?token_hash=...&type=signup          → supabase.auth.verifyOtp()
//
// Depois de estabelecer a sessão, o usuário é levado direto ao editor,
// sem precisar fazer login novamente. Se algo falhar ou demorar mais de
// 10 segundos, mostra uma mensagem amigável com opções de recuperação.

const CONFIRM_TIMEOUT_MS = 10000;
const PENDING_CALLBACK_KEY = 'lenavs-auth-callback';

// Recupera os parâmetros do link guardados pelo main.jsx (que os removeu
// da URL antes de o React montar, convertendo o link para #/auth/callback).
const readStoredCallbackParams = () => {
  try {
    const raw = window.sessionStorage.getItem(PENDING_CALLBACK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

const clearStoredCallbackParams = () => {
  try {
    window.sessionStorage.removeItem(PENDING_CALLBACK_KEY);
  } catch {
    // Storage pode estar bloqueado em modo privado.
  }
};

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

const getSessionSafely = async (deadline) => {
  const remaining = Math.max(1000, deadline - Date.now());
  const { data } = await withTimeout(
    supabase.auth.getSession(),
    remaining,
    { data: { session: null } },
    'Timeout ao verificar a sessão durante a confirmação do e-mail.'
  );
  return data?.session ?? null;
};

const AuthCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying | success | error
  const [errorHint, setErrorHint] = useState('');
  // Guarda os parâmetros do link antes de limpar a URL, para permitir
  // "Tentar novamente" em caso de falha temporária de conexão.
  const paramsRef = useRef(null);

  const runVerification = useCallback(async () => {
    setStatus('verifying');
    setErrorHint('');

    // Sem configuração do Supabase no frontend não há como confirmar nada.
    if (!hasSupabaseConfig) {
      console.error(
        'Confirmação de e-mail impossível: VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY não definidas no frontend.'
      );
      setErrorHint('Configuração de autenticação ausente nesta versão publicada do site.');
      setStatus('error');
      return;
    }

    if (!paramsRef.current) {
      paramsRef.current = getAuthCallbackParams();
      // Fallback: parâmetros normalizados pelo main.jsx no carregamento.
      if (!hasSupabaseAuthCallback()) {
        const stored = readStoredCallbackParams();
        if (stored) {
          paramsRef.current = stored;
        }
      }
    }
    const params = paramsRef.current || {};

    // Remove os tokens da barra de endereço o quanto antes (o link de
    // e-mail é de uso único: recarregar a página não deveria revalidá-lo).
    cleanAuthCallbackUrl();

    const deadline = Date.now() + CONFIRM_TIMEOUT_MS;
    const remaining = () => Math.max(1000, deadline - Date.now());

    try {
      // 0. A sessão já pode ter sido estabelecida (ex.: volta no botão
      //    "Tentar novamente" depois de uma falha de rede).
      let session = await getSessionSafely(deadline);

      // 1. Link no formato implícito: #access_token=...&refresh_token=...
      if (!session && params.accessToken && params.refreshToken) {
        const { data, error } = await withTimeout(
          supabase.auth.setSession({
            access_token: params.accessToken,
            refresh_token: params.refreshToken,
          }),
          remaining(),
          { data: { session: null }, error: new Error('timeout') },
          'Timeout ao restaurar a sessão recebida pelo link de confirmação.'
        );
        if (!error && data?.session) {
          session = data.session;
        } else if (error) {
          console.warn('Falha ao restaurar a sessão pelo link:', error.message);
        }
      }

      // 2. Link no formato PKCE: ?code=...
      if (!session && params.code) {
        const { data, error } = await withTimeout(
          supabase.auth.exchangeCodeForSession(params.code),
          remaining(),
          { data: { session: null }, error: new Error('timeout') },
          'Timeout ao trocar o código de confirmação.'
        );
        if (!error && data?.session) {
          session = data.session;
        } else if (error) {
          console.warn('Falha ao trocar o código de confirmação:', error.message);
          if (/expired|invalid/i.test(String(error.message || ''))) {
            setErrorHint('Este link de confirmação expirou ou já foi utilizado.');
          }
        }
      }

      // 3. Link no formato token hash: ?token_hash=...&type=signup
      if (!session && params.tokenHash) {
        const allowedTypes = [
          'signup',
          'invite',
          'recovery',
          'email_change',
          'email',
        ];
        const verificationType = allowedTypes.includes(
          String(params.type || '').toLowerCase()
        )
          ? params.type.toLowerCase()
          : 'signup';

        const { data, error } = await withTimeout(
          supabase.auth.verifyOtp({
            token_hash: params.tokenHash,
            type: verificationType,
          }),
          remaining(),
          { data: { session: null }, error: new Error('timeout') },
          'Timeout ao validar o link de confirmação.'
        );
        if (!error && data?.session) {
          session = data.session;
        } else if (error) {
          console.warn('Falha ao validar o link de confirmação:', error.message);
          if (/expired|invalid|used/i.test(String(error.message || ''))) {
            setErrorHint('Este link de confirmação expirou ou já foi utilizado.');
          }
        }
      }

      // 4. Última chance: a sessão pode ter sido persistida por algum dos
      //    passos acima mesmo sem retorno explícito.
      if (!session) {
        session = await getSessionSafely(deadline);
      }

      if (!session?.user) {
        if (!errorHint) {
          setErrorHint('Não foi possível validar o link de confirmação.');
        }
        setStatus('error');
        return;
      }

      // Sessão válida: o AuthContext assume a partir daqui (o listener de
      // onAuthStateChange recebe o evento SIGNED_IN e carrega o perfil).
      paramsRef.current = null;
      clearStoredCallbackParams();
      setStatus('success');

      const isRecovery = isRecoveryCallback(params.type);
      if (isRecovery) {
        navigate('/reset-password', { replace: true });
      } else {
        navigate('/editor', { replace: true });
      }
    } catch (error) {
      console.error('Erro inesperado ao confirmar o acesso:', error);
      setErrorHint('Ocorreu uma falha inesperada durante a verificação.');
      setStatus('error');
    }
  }, [navigate]);

  useEffect(() => {
    // Só entra em modo de confirmação quando a URL realmente traz parâmetros
    // de um link do Supabase (ou quando a rota /auth/callback foi aberta).
    if (!hasSupabaseAuthCallback()) {
      const hash = window.location.hash || '';
      if (!hash.includes('/auth/callback')) {
        // Abriu a rota sem parâmetros: segue o fluxo normal do app.
        navigate('/login', { replace: true });
        return;
      }
    }
    void runVerification();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRetry = () => {
    void runVerification();
  };

  const handleGoToLogin = () => {
    clearStaleState();
    navigate('/login', { replace: true });
  };

  const clearStaleState = () => {
    // Descarta os parâmetros guardados: a sessão, quando existe,
    // é gerenciada pelo AuthContext.
    paramsRef.current = null;
    clearStoredCallbackParams();
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at top, rgba(255,140,90,0.12), transparent 40%), #0a0a0a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: 'Montserrat, sans-serif',
        color: '#fff',
      }}
    >
      <div
        style={{
          width: 'min(520px, 100%)',
          background: '#141414',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 24,
          padding: '40px 32px',
          boxShadow: '0 30px 90px rgba(0,0,0,0.45)',
          textAlign: 'center',
        }}
        role="status"
        aria-live="polite"
      >
        <img
          src="/logo_oficial.png"
          alt="LenaVS"
          style={{
            width: '56px',
            height: '56px',
            objectFit: 'contain',
            marginBottom: '18px',
          }}
        />

        {status === 'error' ? (
          <>
            <span
              aria-hidden="true"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'rgba(255, 90, 90, 0.12)',
                color: '#ff8c8c',
                marginBottom: '16px',
              }}
            >
              <AlertCircle size={26} />
            </span>

            <h1
              style={{
                margin: '0 0 10px',
                fontSize: '20px',
                fontWeight: 700,
                letterSpacing: '0.02em',
              }}
            >
              Não conseguimos confirmar seu acesso.
            </h1>
            <p
              style={{
                margin: '0 auto 8px',
                maxWidth: '420px',
                color: 'rgba(255,255,255,0.72)',
                fontSize: '14px',
                lineHeight: 1.6,
              }}
            >
              Não foi possível concluir sua entrada automaticamente. Mas não se
              preocupe! Você pode tentar acessar sua conta normalmente.
            </p>
            {errorHint && (
              <p
                style={{
                  margin: '0 auto 20px',
                  maxWidth: '420px',
                  color: 'rgba(255,140,140,0.85)',
                  fontSize: '12.5px',
                  lineHeight: 1.5,
                }}
              >
                {errorHint}
              </p>
            )}

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px',
                justifyContent: 'center',
                marginTop: '18px',
              }}
            >
              <button
                type="button"
                onClick={handleRetry}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 22px',
                  borderRadius: 999,
                  border: '1px solid rgba(255,140,90,0.4)',
                  background: 'rgba(255,140,90,0.12)',
                  color: '#ffb08d',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                <RotateCcw size={16} />
                Tentar novamente
              </button>
              <button
                type="button"
                onClick={handleGoToLogin}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 22px',
                  borderRadius: 999,
                  border: '1px solid rgba(255,255,255,0.14)',
                  background: 'rgba(255,255,255,0.06)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                <LogIn size={16} />
                Ir para o login
              </button>
            </div>
          </>
        ) : (
          <>
            <div
              aria-hidden="true"
              style={{
                width: '42px',
                height: '42px',
                margin: '0 auto 18px',
                borderRadius: '999px',
                border: '3px solid rgba(255, 140, 90, 0.22)',
                borderTopColor: '#ff8c5a',
                animation: 'lenavs-callback-spin 0.9s linear infinite',
              }}
            />

            <h1
              style={{
                margin: '0 0 10px',
                fontSize: '20px',
                fontWeight: 700,
                letterSpacing: '0.02em',
              }}
            >
              {status === 'success'
                ? 'Tudo pronto!'
                : 'Confirmando seu acesso...'}
            </h1>
            <p
              style={{
                margin: '0 auto',
                maxWidth: '420px',
                color: 'rgba(255,255,255,0.72)',
                fontSize: '14px',
                lineHeight: 1.6,
              }}
            >
              {status === 'success'
                ? 'Seu e-mail foi confirmado. Estamos abrindo o editor para você.'
                : 'Estamos verificando seu e-mail e preparando tudo para você. Aguarde alguns instantes.'}
            </p>
          </>
        )}
      </div>

      <style>{`
        @keyframes lenavs-callback-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AuthCallback;
