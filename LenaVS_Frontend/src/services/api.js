import axios from 'axios';
import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000';

const api = axios.create({
  baseURL: API_URL,
  // NÃO definir Content-Type aqui
});

// Adiciona token JWT em todas as requisições
api.interceptors.request.use(
  async (config) => {
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.access_token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${session.access_token}`,
      };
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de resposta
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await supabase.auth.signOut();
      // não força redirect aqui em uploads
    }
    return Promise.reject(error);
  }
);

export default api;
