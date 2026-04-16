import React, { useState } from 'react';
import { ArrowLeft, CreditCard, Loader2, QrCode } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import './Upgrade.css';

const PAYMENT_OPTIONS = [
  {
    id: 'mercadopago-pix',
    provider: 'mercadopago',
    paymentMethod: 'pix',
    title: 'Pix',
    icon: QrCode,
    bullets: ['Pagamento instantâneo', 'Liberação automática'],
    cta: 'Continuar com Pix',
  },
  {
    id: 'stripe-card',
    provider: 'stripe',
    paymentMethod: 'card',
    title: 'Cartão',
    icon: CreditCard,
    bullets: ['Pagamento no cartão', 'Liberação automática'],
    cta: 'Continuar com Cartão',
  },
];

const Upgrade = () => {
  const [loading, setLoading] = useState(null);

  const handleCheckout = async (option) => {
    try {
      setLoading(option.id);

      const payload = option.provider === 'mercadopago'
        ? { provider: 'mercadopago', currency: 'brl', paymentMethod: option.paymentMethod }
        : { provider: 'stripe', currency: 'brl' };

      const { data } = await api.post('/payment/create-session', payload);

      if (data?.sessionUrl) {
        window.location.href = data.sessionUrl;
        return;
      }

      alert('Não foi possível iniciar o pagamento agora.');
    } catch (error) {
      console.error('Erro ao iniciar pagamento:', error);
      alert(error.response?.data?.error || error.message || 'Erro ao iniciar pagamento.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="upgrade-container">
      <div className="upgrade-shell">
        <div className="upgrade-topbar">
          <Link to="/editor" className="upgrade-back-link">
            <ArrowLeft size={16} />
            Voltar ao editor
          </Link>
        </div>

        <div className="upgrade-header">
          <h1>Escolha a forma de pagamento</h1>
          <p>Acesso por 30 dias</p>
        </div>

        <div className="upgrade-grid">
          {PAYMENT_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isBusy = loading === option.id;

            return (
              <div key={option.id} className="upgrade-method-card">
                <div className="upgrade-method-card__icon">
                  <Icon size={26} />
                </div>

                <div className="upgrade-method-card__content">
                  <h2>{option.title}</h2>
                  <ul>
                    {option.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  className="upgrade-method-card__button"
                  onClick={() => handleCheckout(option)}
                  disabled={Boolean(loading)}
                >
                  {isBusy ? (
                    <>
                      <Loader2 size={16} className="upgrade-spinner" />
                      Abrindo...
                    </>
                  ) : option.cta}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Upgrade;
