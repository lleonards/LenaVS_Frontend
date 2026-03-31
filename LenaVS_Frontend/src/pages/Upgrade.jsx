import React, { useState } from 'react';
import api from '../services/api';
import './Upgrade.css';

const Upgrade = () => {
  const [loading, setLoading] = useState(null);

  const handleSubscribe = async (currency) => {
    console.log('🔥 Botão clicado:', currency);

    try {
      setLoading(currency);

      const { data } = await api.post('/payment/create-session', {
        currency
      });

      console.log('✅ Resposta da API:', data);

      if (data?.sessionUrl) {
        window.location.href = data.sessionUrl;
      } else {
        alert('Erro: sessionUrl não retornada.');
      }

    } catch (error) {
      console.error('❌ Erro ao iniciar checkout:', error);

      alert(
        error.response?.data?.error ||
        error.message ||
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
            type="button"
            onClick={() => handleSubscribe('brl')}
            disabled={loading !== null}
          >
            {loading === 'brl'
              ? 'Redirecionando...'
              : 'Assinar por R$39,90/mês'}
          </button>

          <button
            type="button"
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