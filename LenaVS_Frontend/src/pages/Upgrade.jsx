import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Loader2,
  QrCode,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './Upgrade.css';

const PAYMENT_OPTIONS = [
  {
    id: 'mercadopago-pix-boleto',
    provider: 'mercadopago',
    paymentMethod: 'pix_boleto',
    title: 'Pix / Boleto',
    icon: QrCode,
    details: ['Pagamento instantâneo', 'Liberação automática'],
    cta: 'Continuar com Pix ou Boleto',
  },
  {
    id: 'stripe-card',
    provider: 'stripe',
    paymentMethod: 'card',
    title: 'Cartão',
    icon: CreditCard,
    details: ['Pagamento no cartão', 'Liberação automática'],
    cta: 'Continuar com Cartão',
  },
];

const Upgrade = () => {
  const location = useLocation();
  const { hasUnlimitedAccess, unlimitedUntil, refreshCredits } = useAuth();
  const [loading, setLoading] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const canceled = searchParams.get('canceled') === '1';

  useEffect(() => {
    const loadStatus = async () => {
      try {
        setLoadingStatus(true);
        const response = await api.get('/payment/subscription');
        setSubscription(response.data || null);
        await refreshCredits?.();
      } catch (error) {
        console.error('Erro ao carregar status da assinatura:', error);
      } finally {
        setLoadingStatus(false);
      }
    };

    void loadStatus();
  }, [refreshCredits]);

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
      console.error('Erro ao iniciar checkout:', error);
      alert(error.response?.data?.error || error.message || 'Erro ao iniciar pagamento.');
    } finally {
      setLoading(null);
    }
  };

  const activeUntil = subscription?.unlimited_access_until || unlimitedUntil;
  const isUnlimitedActive = hasUnlimitedAccess || subscription?.unlimited;

  return (
    <div className="upgrade-container">
      <div className="upgrade-shell">
        <div className="upgrade-topbar">
          <Link to="/editor" className="upgrade-back-link">
            <ArrowLeft size={16} />
            Voltar ao editor
          </Link>
        </div>

        <section className="upgrade-hero">
          <div>
            <h1>Escolha a forma de pagamento</h1>
            <p>Acesso por 30 dias</p>
          </div>

          {isUnlimitedActive ? (
            <div className="upgrade-active-chip">
              <CheckCircle2 size={16} />
              {activeUntil
                ? `Ativo até ${new Date(activeUntil).toLocaleString('pt-BR')}`
                : 'Acesso ativo'}
            </div>
          ) : null}
        </section>

        {canceled ? (
          <div className="upgrade-alert upgrade-alert--warning">
            Pagamento cancelado. Você pode tentar novamente quando quiser.
          </div>
        ) : null}

        {!loadingStatus && isUnlimitedActive ? (
          <div className="upgrade-alert upgrade-alert--success">
            Seu acesso já está ativo. Enquanto ele estiver válido, as exportações não consomem créditos.
          </div>
        ) : null}

        <section className="upgrade-cards">
          {PAYMENT_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isBusy = loading === option.id;

            return (
              <article key={option.id} className="upgrade-card">
                <div className="upgrade-card__icon">
                  <Icon size={22} />
                </div>

                <div className="upgrade-card__content">
                  <h2>{option.title}</h2>

                  <ul>
                    {option.details.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  className="upgrade-card__button"
                  onClick={() => handleCheckout(option)}
                  disabled={Boolean(loading)}
                >
                  {isBusy ? (
                    <>
                      <Loader2 size={16} className="upgrade-spinner" />
                      Redirecionando...
                    </>
                  ) : option.cta}
                </button>
              </article>
            );
          })}
        </section>
      </div>
    </div>
  );
};

export default Upgrade;
