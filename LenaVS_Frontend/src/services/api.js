import axios from 'axios';
import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: false, // importante para evitar conflitos CORS
});

/* =====================================================
   🔐 INTERCEPTOR DE REQUEST (JWT AUTOMÁTICO)
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
    if (error.response?.status === 401) {
      console.warn('Token inválido ou expirado. Fazendo logout...');
      await supabase.auth.signOut();
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default api;
