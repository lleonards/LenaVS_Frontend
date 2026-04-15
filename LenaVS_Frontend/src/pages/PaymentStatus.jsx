import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Clock3, CreditCard, Loader2, QrCode, XCircle } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const STATUS_META = {
  success: {
    icon: CheckCircle2,
    title: 'Pagamento confirmado',
    description: 'Estamos validando o seu acesso ilimitado e sincronizando a conta.',
    color: '#4ade80',
  },
  pending: {
    icon: Clock3,
    title: 'Pagamento pendente',
    description: 'O pagamento ainda está aguardando confirmação. Isso é normal em Pix e boleto.',
    color: '#fbbf24',
  },
  failure: {
    icon: XCircle,
    title: 'Pagamento não concluído',
    description: 'Nenhuma cobrança foi confirmada. Você pode tentar novamente quando quiser.',
    color: '#f87171',
  },
};

const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

const PaymentStatus = () => {
  const { status = 'pending' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshCredits } = useAuth();
  const [syncing, setSyncing] = useState(status === 'success');
  const [details, setDetails] = useState(null);
  const [error, setError] = useState('');

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const provider = searchParams.get('provider') || 'stripe';
  const meta = STATUS_META[status] || STATUS_META.pending;
  const Icon = meta.icon;

  useEffect(() => {
    let cancelled = false;

    const syncAccess = async () => {
      if (status !== 'success') return;

      try {
        setSyncing(true);

        for (let attempt = 0; attempt < 8; attempt += 1) {
          const response = await api.get('/payment/subscription');
          const data = response.data || {};

          if (cancelled) return;

          setDetails(data);

          if (data.unlimited) {
            await refreshCredits?.();
            setSyncing(false);
            return;
          }

          await wait(1800);
        }

        setError('O pagamento foi retornado com sucesso, mas o webhook ainda não terminou de liberar o plano. Aguarde alguns segundos e tente atualizar.');
      } catch (err) {
        console.error('Erro ao sincronizar pagamento:', err);
        setError(err.response?.data?.error || err.message || 'Não foi possível confirmar o pagamento agora.');
      } finally {
        if (!cancelled) {
          setSyncing(false);
        }
      }
    };

    void syncAccess();

    return () => {
      cancelled = true;
    };
  }, [refreshCredits, status]);

  const providerLabel = provider === 'mercadopago' ? 'Mercado Pago (Pix/Boleto)' : 'Stripe (Cartão)';
  const providerIcon = provider === 'mercadopago' ? <QrCode size={16} /> : <CreditCard size={16} />;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0e0e0e, #050505)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        width: 'min(640px, 100%)',
        background: '#141414',
        border: `1px solid ${meta.color}33`,
        borderRadius: 24,
        boxShadow: '0 30px 90px rgba(0,0,0,0.45)',
        padding: '30px',
        color: '#fff',
      }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: 20,
          background: `${meta.color}22`,
          color: meta.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 18,
        }}>
          {syncing ? <Loader2 size={30} style={{ animation: 'spin 1s linear infinite' }} /> : <Icon size={30} />}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 10 }}>
          <h1 style={{ margin: 0, fontSize: '32px' }}>{meta.title}</h1>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 12px',
            borderRadius: 999,
            background: '#202020',
            color: '#d9d9d9',
            fontSize: '13px',
            fontWeight: 700,
          }}>
            {providerIcon}
            {providerLabel}
          </span>
        </div>

        <p style={{ margin: 0, color: '#cfcfcf', lineHeight: 1.7 }}>{meta.description}</p>

        {status === 'success' ? (
          <div style={{
            marginTop: 22,
            borderRadius: 16,
            background: '#1b1b1b',
            padding: '18px 18px 16px',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <strong style={{ display: 'block', marginBottom: 8, color: '#ffb08d' }}>Plano Unlimited</strong>
            <p style={{ margin: 0, color: '#d7d7d7', lineHeight: 1.6 }}>
              Quando o pagamento é aprovado, o LenaVS libera acesso ilimitado por 30 dias, independente dos créditos anteriores.
            </p>
            {details?.unlimited_access_until ? (
              <p style={{ margin: '10px 0 0', color: '#8fe6a6', fontWeight: 700 }}>
                Acesso ativo até: {new Date(details.unlimited_access_until).toLocaleString('pt-BR')}
              </p>
            ) : null}
            {syncing ? (
              <p style={{ margin: '10px 0 0', color: '#fbbf24' }}>Aguardando confirmação final do webhook...</p>
            ) : null}
          </div>
        ) : null}

        {status === 'pending' ? (
          <div style={{
            marginTop: 22,
            borderRadius: 16,
            background: 'rgba(245,158,11,0.1)',
            border: '1px solid rgba(245,158,11,0.2)',
            padding: '16px 18px',
            color: '#f4d17b',
            lineHeight: 1.7,
          }}>
            Em Pix e boleto, a liberação acontece assim que o webhook do Mercado Pago receber o status <strong>approved</strong>.
            Depois disso, sua conta passa automaticamente para o plano ilimitado.
          </div>
        ) : null}

        {error ? (
          <div style={{
            marginTop: 18,
            borderRadius: 16,
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.22)',
            padding: '14px 16px',
            color: '#ffb3b3',
            lineHeight: 1.6,
          }}>
            {error}
          </div>
        ) : null}

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 26 }}>
          <Link to="/editor" style={{
            background: '#ff8c5a',
            color: '#111',
            padding: '12px 18px',
            borderRadius: 12,
            fontWeight: 800,
          }}>
            Voltar para o editor
          </Link>
          <Link to="/upgrade" style={{
            background: '#242424',
            color: '#fff',
            padding: '12px 18px',
            borderRadius: 12,
            fontWeight: 700,
          }}>
            Ver opções de pagamento
          </Link>
          <button
            type="button"
            onClick={() => navigate(0)}
            style={{
              background: 'transparent',
              color: '#bcbcbc',
              padding: '12px 18px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.14)',
              fontWeight: 700,
            }}
          >
            Atualizar status
          </button>
        </div>

        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
};

export default PaymentStatus;
