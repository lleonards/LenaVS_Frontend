// Utilitários compartilhados para o callback de autenticação do Supabase
// (link de confirmação de e-mail / recuperação de senha).
//
// O link enviado pelo Supabase chega em um destes formatos:
//   1. site.com/#access_token=...&refresh_token=...   (fluxo implícito)
//   2. site.com/?code=...                              (fluxo PKCE)
//   3. site.com/?token_hash=...&type=signup            (OTP por token hash)
//
// Como o app usa HashRouter, o fragmento do formato 1 não corresponde a
// nenhuma rota — por isso a rota /auth/callback (AuthCallback) passa a ser
// responsável exclusiva por ler esses parâmetros e concluir a verificação.

export const PENDING_RECOVERY_KEY = 'lenavs-password-recovery';

export const getAuthCallbackParams = () => {
  if (typeof window === 'undefined') {
    return {
      accessToken: null,
      refreshToken: null,
      code: null,
      tokenHash: null,
      type: null,
    };
  }

  const hash = window.location.hash.replace(/^#/, '');
  const hashParams = new URLSearchParams(hash);
  const searchParams = new URLSearchParams(
    window.location.search || ''
  );
  return {
    accessToken: hashParams.get('access_token'),
    refreshToken: hashParams.get('refresh_token'),
    code: searchParams.get('code'),
    tokenHash: searchParams.get('token_hash'),
    type: searchParams.get('type') || hashParams.get('type'),
  };
};

export const hasSupabaseAuthCallback = () => {
  const {
    accessToken,
    refreshToken,
    code,
    tokenHash,
  } = getAuthCallbackParams();
  return Boolean(
    (accessToken && refreshToken) ||
    code ||
    tokenHash
  );
};

export const isRecoveryCallback = (type) =>
  String(type || '').toLowerCase() === 'recovery';

// Remove os parâmetros do link da URL (sem recarregar a página), evitando
// que um F5 tente revalidar um link de uso único que já foi consumido.
export const cleanAuthCallbackUrl = (route = '/auth/callback') => {
  if (typeof window === 'undefined') {
    return;
  }
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = route;
  window.history.replaceState({}, '', url.toString());
};

export const readPendingRecoveryFlag = () => {
  try {
    return window.localStorage.getItem(PENDING_RECOVERY_KEY) === '1';
  } catch {
    return false;
  }
};

export const clearPendingRecoveryFlag = () => {
  try {
    window.localStorage.removeItem(PENDING_RECOVERY_KEY);
  } catch {
    // Storage pode estar bloqueado em modo privado.
  }
};
