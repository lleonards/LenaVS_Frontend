import axios from 'axios';
import { supabase } from './supabase';

/* =====================================================
   🌍 BASE URL
   Garante que nunca duplique barras
===================================================== */

let BASE =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.MODE === 'production'
    ? 'https://lenavs-backend.onrender.com'
    : 'http://localhost:10000');

// 🔥 Remove barra final se existir
if (BASE.endsWith('/')) {
  BASE = BASE.slice(0, -1);
}

// 🔥 Adiciona /api corretamente
const API_URL = `${BASE}/api`;

const api = axios.create({
  baseURL: API_URL,
  withCredentials: false,
  // Timeout padrão de 3 minutos para suportar análise de áudio com IA
  timeout: 180000,
});

/* =====================================================
   🔐 INTERCEPTOR DE REQUEST (ENVIA TOKEN SUPABASE)
===================================================== */

api.interceptors.request.use(
  async (config) => {
    try {
      const { data } = await supabase.auth.getSession();
      const session = data?.session;

      if (session?.access_token) {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${session.access_token}`,
        };
      }

      return config;
    } catch (error) {
      console.error('Erro ao obter sessão:', error);
      return config;
    }
  },
  (error) => Promise.reject(error)
);

/* =====================================================
   🔁 INTERCEPTOR DE RESPONSE
===================================================== */

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;

    if (status === 401 || status === 403) {
      console.warn('Sessão inválida ou expirada. Limpando sessão...');

      await supabase.auth.signOut();
      localStorage.clear();
      sessionStorage.clear();

      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default api;
