import React, { useState } from 'react';
import { ArrowLeft, CreditCard, Loader2, QrCode } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import './Upgrade.css';

const PAYMENT_OPTIONS = [
  {
    id: 'pagarme-checkout',
    provider: 'pagarme',
    title: 'Pagar.me',
    badge: 'Recomendado para quem está no Brasil',
    icon: QrCode,
    bullets: [
      'Checkout hospedado com Pix, cartão e boleto',
      'Ativação automática do acesso após confirmação',
      'Ideal para clientes do Brasil',
    ],
    cta: 'Continuar com Pagar.me',
  },
  {
    id: 'stripe-card',
    provider: 'stripe',
    title: 'Stripe',
    badge: 'Recomendado para quem está fora do Brasil',
    icon: CreditCard,
    bullets: [
      'Checkout rápido no cartão',
      'Ativação automática do acesso',
      'Melhor opção para compras internacionais',
    ],
    cta: 'Continuar com Stripe',
  },
];

const Upgrade = () => {
  const [loading, setLoading] = useState(null);

  const handleCheckout = async (option) => {
    try {
      setLoading(option.id);

      const payload = option.provider === 'pagarme'
        ? { provider: 'pagarme', currency: 'brl' }
        : { provider: 'stripe', currency: 'usd' };

      const { data } = await api.post('/payment/create-session', payload);

      if (data?.sessionUrl) {
        if (data.provider === 'pagarme') {
          window.open(data.sessionUrl, '_blank', 'noopener,noreferrer');
          window.location.hash = data.statusUrl || '/payment/pending?provider=pagarme';
          return;
        }

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
          <span className="upgrade-header__eyebrow">LenaVS Upgrade</span>
          <h1>Mais liberdade para criar</h1>
          <p>
            Ative 30 dias de acesso sem limite de uso e continue criando sem depender dos 3 créditos gratuitos.
          </p>

          <div className="upgrade-summary">
            <div className="upgrade-summary__item">
              <strong>30 dias</strong>
              <span>Acesso liberado</span>
            </div>
            <div className="upgrade-summary__item">
              <strong>Automático</strong>
              <span>Liberação após confirmação</span>
            </div>
            <div className="upgrade-summary__item">
              <strong>Simples</strong>
              <span>Escolha a opção ideal para você</span>
            </div>
          </div>
        </div>

        <div className="upgrade-note">
          Se você está no Brasil, use o <strong>Pagar.me</strong>. Se está fora do Brasil, a opção mais indicada é o <strong>Stripe</strong>.
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
                  <span className="upgrade-method-card__badge">{option.badge}</span>
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
