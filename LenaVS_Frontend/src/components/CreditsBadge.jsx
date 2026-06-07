import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { startUpgradeCheckout } from '../utils/checkout';

const CreditsBadge = () => {
  const { creditsLabel, hasUnlimitedAccess } = useAuth();
  const [openingCheckout, setOpeningCheckout] = useState(false);

  const isPro = hasUnlimitedAccess;

  const handleClick = async () => {
    if (isPro || openingCheckout) return;

    try {
      await startUpgradeCheckout({
        onStart: () => setOpeningCheckout(true),
        onFinish: () => setOpeningCheckout(false),
      });
    } catch {
      // Erro já tratado no helper.
    }
  };

  return (
    <div
      onClick={() => {
        void handleClick();
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 14px',
        borderRadius: '20px',
        background: isPro
          ? 'linear-gradient(90deg, #ff7a00, #ff9900)'
          : 'rgba(255, 122, 0, 0.15)',
        border: '1px solid #ff7a00',
        color: isPro ? '#000' : '#ff7a00',
        fontWeight: '600',
        fontSize: '14px',
        cursor: isPro ? 'default' : 'pointer',
        transition: '0.2s ease',
        opacity: openingCheckout ? 0.75 : 1,
      }}
    >
      {isPro ? (
        <>⭐ Plano PRO</>
      ) : (
        <>
          🔥 {creditsLabel} créditos
          <span style={{ fontWeight: '700' }}>{openingCheckout ? ' Abrindo...' : ' Upgrade'}</span>
        </>
      )}
    </div>
  );
};

export default CreditsBadge;
