import api from '../services/api';
import { getApiErrorMessage } from './errorMessages';

const getBrowserContext = () => {
  if (typeof window === 'undefined') {
    return {
      browserLanguage: '',
      browserLanguages: [],
      browserTimezone: '',
    };
  }

  return {
    browserLanguage: window.navigator?.language || '',
    browserLanguages: Array.isArray(window.navigator?.languages) ? window.navigator.languages : [],
    browserTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
  };
};

export const startUpgradeCheckout = async ({ onStart, onFinish, onError } = {}) => {
  try {
    onStart?.();

    const { data } = await api.post('/payment/create-session', {
      ...getBrowserContext(),
    });

    if (!data?.sessionUrl) {
      throw new Error('Não foi possível abrir o checkout agora.');
    }

    window.location.href = data.sessionUrl;
    return data;
  } catch (error) {
    const message = getApiErrorMessage(error, 'Não foi possível abrir o checkout. Tente novamente.');

    if (onError) {
      onError(message, error);
    }

    throw error;
  } finally {
    onFinish?.();
  }
};

export default startUpgradeCheckout;
