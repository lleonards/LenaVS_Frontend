import axios from 'axios';
import { supabase } from './supabase';

/* =====================================================
   🌍 BASE URL
   Sempre adiciona /api automaticamente
===================================================== */

const BASE =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.MODE === 'production'
    ? 'https://lenavs-backend.onrender.com'
    : 'http://localhost:10000');

// 🔥 GARANTE que /api sempre esteja presente
const API_URL = `${BASE}/api`;

const api = axios.create({
  baseURL: API_URL,
  withCredentials: false,
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
