import React from 'react';
import api from '../services/api';
import './Upgrade.css';

const Upgrade = () => {

  const handleSubscribe = async (currency) => {
    try {
      const response = await api.post('/api/stripe/create-checkout-session', {
        currency
      });

      const { url } = response.data;

      window.location.href = url;

    } catch (error) {
      console.error('Erro ao iniciar pagamento:', error);
      alert('Erro ao iniciar pagamento.');
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
          <button onClick={() => handleSubscribe('brl')}>
            Assinar por R$29/mês
          </button>

          <button onClick={() => handleSubscribe('usd')}>
            Subscribe for $9/month
          </button>
        </div>
      </div>
    </div>
  );
};

export default Upgrade;