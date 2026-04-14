import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Loader2,
  QrCode,
  ShieldCheck,
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
    subtitle: 'Checkout Mercado Pago',
    icon: QrCode,
    details: ['Mesmo checkout', 'Liberação automática', '30 dias de Unlimited'],
    cta: 'Continuar com Pix / Boleto',
  },
  {
    id: 'stripe-card',
    provider: 'stripe',
    paymentMethod: 'card',
    title: 'Cartão',
    subtitle: 'Checkout Stripe',
    icon: CreditCard,
    details: ['Pagamento por cartão', 'Liberação automática', '30 dias de Unlimited'],
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
  const canceledProvider = searchParams.get('provider');
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

      alert('Não foi possível iniciar o checkout agora.');
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

        <section className="upgrade-compact-hero">
          <div className="upgrade-compact-copy">
            <span className="upgrade-badge">LenaVS Unlimited</span>
            <h1>Escolha como pagar</h1>
            <p>Checkout simplificado, sem excesso de informação e com liberação automática após a confirmação.</p>
          </div>

          <div className="upgrade-status-card">
            <div className="upgrade-status-card__icon">
              <ShieldCheck size={20} />
            </div>
            <div>
              <strong>Acesso por 30 dias</strong>
              <p>Pix, boleto ou cartão ativam o mesmo plano Unlimited.</p>
            </div>
            {isUnlimitedActive ? (
              <div className="upgrade-active-chip">
                <CheckCircle2 size={16} />
                {activeUntil
                  ? `Ativo até ${new Date(activeUntil).toLocaleString('pt-BR')}`
                  : 'Unlimited ativo'}
              </div>
            ) : null}
          </div>
        </section>

        {canceled ? (
          <div className="upgrade-alert upgrade-alert--warning">
            Checkout {canceledProvider === 'mercadopago' ? 'do Mercado Pago' : 'do cartão'} cancelado. Você pode tentar novamente quando quiser.
          </div>
        ) : null}

        {isUnlimitedActive ? (
          <div className="upgrade-alert upgrade-alert--success">
            Seu plano Unlimited já está ativo. Enquanto ele estiver válido, as exportações não consomem créditos.
          </div>
        ) : null}

        {!loadingStatus && !isUnlimitedActive ? (
          <div className="upgrade-alert upgrade-alert--info">
            Pix e boleto usam o mesmo checkout do Mercado Pago. Cartão usa checkout separado.
          </div>
        ) : null}

        <section className="upgrade-compact-grid">
          {PAYMENT_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isBusy = loading === option.id;

            return (
              <article key={option.id} className="upgrade-compact-card">
                <div className="upgrade-compact-card__header">
                  <div className="upgrade-compact-card__icon">
                    <Icon size={22} />
                  </div>
                  <div>
                    <h2>{option.title}</h2>
                    <p>{option.subtitle}</p>
                  </div>
                </div>

                <ul className="upgrade-compact-card__list">
                  {option.details.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>

                <button
                  type="button"
                  className="upgrade-compact-card__button"
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
