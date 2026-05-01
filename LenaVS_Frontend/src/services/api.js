import axios from 'axios';
import { supabase } from './supabase';
import { goToAppRoute } from '../utils/appPath';

const DEFAULT_PRODUCTION_API_URL = 'https://lenavs-backend-1-gv24.onrender.com';

let BASE =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.MODE === 'production'
    ? DEFAULT_PRODUCTION_API_URL
    : 'http://localhost:10000');

if (BASE.endsWith('/')) {
  BASE = BASE.slice(0, -1);
}

const API_URL = `${BASE}/api`;

const api = axios.create({
  baseURL: API_URL,
  withCredentials: false,
  timeout: 900000,
});

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

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const message = String(error.response?.data?.error || '').toLowerCase();

    const shouldForceLogout =
      status === 401 ||
      (status === 403 && (
        message.includes('sessão inválida') ||
        message.includes('sessao invalida') ||
        message.includes('token inválido') ||
        message.includes('token invalido') ||
        message.includes('expirada')
      ));

    if (shouldForceLogout) {
      console.warn('Sessão inválida ou expirada. Limpando sessão...');
      await supabase.auth.signOut();
      localStorage.clear();
      sessionStorage.clear();
      goToAppRoute('/login');
    }

    return Promise.reject(error);
  }
);

export default api;
