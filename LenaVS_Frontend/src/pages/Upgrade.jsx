import React, { useState } from 'react';
import api from '../services/api';
import './Upgrade.css';

const Upgrade = () => {
  const [loading, setLoading] = useState(null);

  const handleSubscribe = async (currency) => {
    try {
      setLoading(currency);

      const response = await api.post('/api/payment/create-session', {
        currency
      });

      const { sessionUrl } = response.data;

      if (sessionUrl) {
        window.location.href = sessionUrl;
      } else {
        alert('Erro ao gerar link de pagamento.');
      }

    } catch (error) {
      console.error(
        'Erro ao iniciar checkout:',
        error.response?.data || error.message
      );

      alert(
        error.response?.data?.error ||
        'Erro ao iniciar pagamento.'
      );
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="upgrade-container">
      <h1>Atualize para o Plano PRO</h1>

      <div className="plan-card">
        <h2>Plano PRO</h2>
        <p>✔ Downloads ilimitados</p>
        <p>✔ Sem limite de créditos</p>
        <p>✔ Prioridade de processamento</p>

        <div className="price-options">
          <button
            onClick={() => handleSubscribe('brl')}
            disabled={loading !== null}
          >
            {loading === 'brl'
              ? 'Redirecionando...'
              : 'Assinar por R$39,90/mês'}
          </button>

          <button
            onClick={() => handleSubscribe('usd')}
            disabled={loading !== null}
          >
            {loading === 'usd'
              ? 'Redirecting...'
              : 'Subscribe for $9.90/month'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Upgrade;
