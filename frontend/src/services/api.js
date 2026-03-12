import axios from 'axios';
import { supabase } from './supabase';

let BASE = import.meta.env.VITE_API_URL || 'http://localhost:10000';

// remove barra final se existir
if (BASE.endsWith('/')) {
  BASE = BASE.slice(0, -1);
}

const api = axios.create({
  baseURL: `${BASE}/api`,
  timeout: 120000,
});

/* ── Interceptor: injeta token do Supabase em cada request ── */
api.interceptors.request.use(async (config) => {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (err) {
    console.warn('Erro ao obter token:', err);
  }

  return config;
});

export default api;
