import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

const CreditsBadge = () => {
  const { user } = useAuth(); // 👈 usar user direto
  const navigate = useNavigate();

  const [credits, setCredits] = useState(0);
  const [plan, setPlan] = useState('free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCredits = async () => {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('users')
        .select('credits, plan')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        setCredits(data.credits);
        setPlan(data.plan);
      }

      setLoading(false);
    };

    fetchCredits();
  }, [user]);

  if (loading) return null;

  const isPro = plan === 'pro';

  const handleClick = () => {
    if (!isPro) {
      navigate('/upgrade');
    }
  };

  return (
    <div
      onClick={handleClick}
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
        transition: '0.2s ease'
      }}
    >
      {isPro ? (
        <>⭐ Plano PRO</>
      ) : (
        <>
          🔥 {credits} créditos
          <span style={{ fontWeight: '700' }}> Upgrade</span>
        </>
      )}
    </div>
  );
};

export default CreditsBadge;
