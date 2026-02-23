import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, FolderOpen, LogOut, ArrowUp } from 'lucide-react';
import api from '../services/api';
import './Header.css';

const Header = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const [showHelp, setShowHelp] = useState(false);
  const [showProjects, setShowProjects] = useState(false);

  const [plan, setPlan] = useState(null);
  const [credits, setCredits] = useState(null);

  /* =====================================================
     🔄 BUSCAR STATUS DA ASSINATURA
  ===================================================== */

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const res = await api.get('/payment/subscription');
      setPlan(res.data.subscription.plan);
      setCredits(res.data.subscription.credits);
    } catch (error) {
      console.error('Erro ao buscar assinatura:', error);
    }
  };

  /* =====================================================
     💳 ABRIR CHECKOUT STRIPE
  ===================================================== */

  const handleUpgrade = async () => {
    try {
      const res = await api.post('/payment/create-session', {
        currency: 'BRL'
      });

      window.location.href = res.data.sessionUrl;
    } catch (error) {
      console.error('Erro ao iniciar checkout:', error);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="header">

      {/* 🔥 LOGO */}
      <div className="header-logo">
        <img
          src="/logo_oficial.png"
          alt="LenaVS Logo"
          className="logo-img"
        />
      </div>

      <div className="header-nav">

        {/* 🎁 BOTÃO UPGRADE + CRÉDITOS */}
        {plan === 'free' && (
          <button className="upgrade-btn" onClick={handleUpgrade}>
            <ArrowUp size={18} />
            <span>Upgrade</span>
            <span className="credits-badge">
              ✨ {credits ?? 0}
            </span>
          </button>
        )}

        {plan === 'pro' && (
          <div className="pro-badge">
            💎 PRO
          </div>
        )}

        <button className="header-btn" onClick={() => setShowHelp(!showHelp)}>
          <HelpCircle size={20} />
          Ajuda
        </button>

        <button className="header-btn" onClick={() => setShowProjects(!showProjects)}>
          <FolderOpen size={20} />
          Projetos
        </button>

        <button className="header-btn logout" onClick={handleLogout}>
          <LogOut size={20} />
        </button>

      </div>
    </header>
  );
};

export default Header;
