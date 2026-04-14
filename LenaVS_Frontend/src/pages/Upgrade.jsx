import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Loader2,
  QrCode,
  Receipt,
  ShieldCheck,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './Upgrade.css';

const PAYMENT_OPTIONS = [
  {
    id: 'mercadopago-pix',
    provider: 'mercadopago',
    paymentMethod: 'pix',
    title: 'Pix',
    subtitle: 'Mercado Pago',
    icon: QrCode,
    description: 'Checkout dedicado ao Pix. Assim que o pagamento for aprovado, o webhook libera o plano unlimited por 30 dias.',
    badge: 'Instantâneo',
    cta: 'Pagar com Pix',
  },
  {
    id: 'mercadopago-boleto',
    provider: 'mercadopago',
    paymentMethod: 'boleto',
    title: 'Boleto',
    subtitle: 'Mercado Pago',
    icon: Receipt,
    description: 'Checkout focado em boleto bancário. A liberação do unlimited acontece quando o Mercado Pago confirmar o pagamento.',
    badge: 'Compensação bancária',
    cta: 'Gerar boleto',
  },
  {
    id: 'stripe-card',
    provider: 'stripe',
    paymentMethod: 'card',
    title: 'Cartão',
    subtitle: 'Stripe',
    icon: CreditCard,
    description: 'Assinatura mensal com confirmação imediata no checkout do cartão. O efeito final é o mesmo: acesso unlimited liberado.',
    badge: 'Assinatura mensal',
    cta: 'Assinar com cartão',
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

  return (
    <div className="upgrade-container">
      <div className="upgrade-shell">
        <div className="upgrade-topbar">
          <Link to="/editor" className="upgrade-back-link">
            <ArrowLeft size={16} />
            Voltar ao editor
          </Link>
        </div>

        <div className="upgrade-hero">
          <div>
            <span className="upgrade-eyebrow">Plano premium</span>
            <h1>Desbloqueie o <span>Unlimited</span> da LenaVS</h1>
            <p>
              Depois do pagamento confirmado, o usuário recebe acesso ilimitado por 30 dias,
              sem depender dos créditos que já possui.
            </p>
          </div>

          <div className="upgrade-summary-card">
            <div className="upgrade-summary-card__icon">
              <ShieldCheck size={22} />
            </div>
            <strong>Acesso liberado automaticamente</strong>
            <p>
              Pix, boleto e cartão levam ao mesmo resultado final: plano unlimited ativo.
            </p>
            {hasUnlimitedAccess || subscription?.unlimited ? (
              <div className="upgrade-active-chip">
                <CheckCircle2 size={16} />
                {activeUntil
                  ? `Ativo até ${new Date(activeUntil).toLocaleString('pt-BR')}`
                  : 'Unlimited ativo'}
              </div>
            ) : null}
          </div>
        </div>

        {canceled ? (
          <div className="upgrade-alert upgrade-alert--warning">
            O checkout {canceledProvider === 'mercadopago' ? 'do Mercado Pago' : 'do cartão'} foi cancelado antes da conclusão.
            Você pode tentar novamente quando quiser.
          </div>
        ) : null}

        {hasUnlimitedAccess || subscription?.unlimited ? (
          <div className="upgrade-alert upgrade-alert--success">
            Seu plano unlimited já está ativo. Você pode continuar usando a plataforma sem consumir créditos enquanto o acesso estiver válido.
          </div>
        ) : null}

        {!loadingStatus && !(hasUnlimitedAccess || subscription?.unlimited) ? (
          <div className="upgrade-alert upgrade-alert--info">
            Escolha entre Pix, boleto ou cartão. Para Pix e boleto, a confirmação final depende do webhook do Mercado Pago assim que o pagamento for aprovado.
          </div>
        ) : null}

        <div className="upgrade-grid">
          {PAYMENT_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isBusy = loading === option.id;

            return (
              <div key={option.id} className="upgrade-method-card">
                <div className="upgrade-method-card__header">
                  <div className="upgrade-method-card__icon">
                    <Icon size={24} />
                  </div>
                  <div>
                    <span className="upgrade-method-card__badge">{option.badge}</span>
                    <h2>{option.title}</h2>
                    <p>{option.subtitle}</p>
                  </div>
                </div>

                <div className="upgrade-method-card__body">
                  <p>{option.description}</p>
                  <ul>
                    <li>Acesso ilimitado por 30 dias</li>
                    <li>Confirmação de pagamento com retorno visual</li>
                    <li>Liberação automática do plano unlimited</li>
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
                      Redirecionando...
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
