import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App' // Removi o .jsx para evitar problemas de resolução de nomes em alguns builds
import './index.css'

// 🔎 LOG DE DIAGNÓSTICO: Se este log NÃO aparecer no console (F12), 
// o problema é o arquivo index.html que não está conseguindo carregar o main.jsx.
console.log('Main.jsx carregado com sucesso!');

// CORREÇÃO DA TELA BRANCA NA CONFIRMAÇÃO DE E-MAIL:
// O link do Supabase chega como "site.com/#access_token=..." (implícito) ou
// "site.com/?code=..." / "?token_hash=..." (PKCE / OTP). Como o app usa
// HashRouter, esses formatos não correspondem a NENHUMA rota — o usuário
// caía na tela branca antes de qualquer código rodar. Aqui, ANTES de o
// React montar, detectamos o link, guardamos os parâmetros e convertemos
// a URL para "#/auth/callback", a rota que conclui a verificação.
(function normalizeSupabaseAuthCallback() {
  try {
    const hash = window.location.hash || '';
    const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
    const searchParams = new URLSearchParams(window.location.search || '');

    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    const code = searchParams.get('code');
    const tokenHash = searchParams.get('token_hash');

    const isAuthLink = Boolean(
      (accessToken && refreshToken) || code || tokenHash
    );

    if (!isAuthLink) {
      return;
    }

    const payload = {
      accessToken,
      refreshToken,
      code,
      tokenHash,
      type: searchParams.get('type') || hashParams.get('type'),
    };

    window.sessionStorage.setItem(
      'lenavs-auth-callback',
      JSON.stringify(payload)
    );

    const url = new URL(window.location.href);
    url.search = '';
    url.hash = '/auth/callback';
    window.history.replaceState({}, '', url.toString());
  } catch (error) {
    console.warn('Não foi possível normalizar o link de confirmação:', error);
  }
})();

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('ERRO CRÍTICO: Elemento root não encontrado no index.html');
} else {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
