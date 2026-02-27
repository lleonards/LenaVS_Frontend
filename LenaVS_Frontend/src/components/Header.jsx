import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, FolderOpen, LogOut, ArrowUp, Gem } from 'lucide-react';
import api from '../services/api';
import './Header.css';

const Header = () => {
  const { signOut, plan, credits } = useAuth();
  const navigate = useNavigate();

  const [showHelp, setShowHelp] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [loadingUpgrade, setLoadingUpgrade] = useState(false);

  /* =====================================================
      ABRIR CHECKOUT STRIPE COM MOEDA PELO NAVEGADOR
  ===================================================== */
  const handleUpgrade = async () => {
    if (loadingUpgrade) return;
    setLoadingUpgrade(true);

    try {
      // Detecta idioma do navegador
      const userLang = navigator.language || 'pt-BR';

      // ⚠ IMPORTANTE: enviar minúsculo
      const currency = userLang.startsWith('en') ? 'usd' : 'brl';

      const res = await api.post('/payment/create-session', { currency });

      // ⚠ Alinhado com backend que retorna { url }
      if (res.data && res.data.url) {
        window.location.href = res.data.url;
      } else {
        alert('Não foi possível iniciar o checkout. Tente novamente.');
      }

    } catch (error) {
      console.error('Erro ao iniciar checkout:', error.response?.data || error.message);
      alert('Erro ao iniciar o checkout.');
    } finally {
      setLoadingUpgrade(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <header className="header">

      {/* LOGO */}
      <div className="header-logo">
        <img
          src="/logo_oficial.png"
          alt="LenaVS Logo"
          className="logo-img"
        />
      </div>

      <div className="header-nav">

        {/* BOTÃO PRO / UPGRADE */}
        {plan === 'pro' ? (
          <div className="pro-badge-v2">
            <Gem size={14} />
            <span className="pro-text">PRO</span>
            <span className="pro-status">Ilimitado</span>
          </div>
        ) : (
          <button
            className="upgrade-btn-lenavs"
            onClick={handleUpgrade}
            disabled={loadingUpgrade}
          >
            <div className="credits-section">
              <span className="credits-val">{credits ?? 0}</span>
              <span className="credits-label">Créditos</span>
            </div>

            <div className="upgrade-label">
              <ArrowUp size={14} />
              {loadingUpgrade ? 'Redirecionando...' : 'UPGRADE'}
            </div>
          </button>
        )}

        {/* AJUDA */}
        <button
          className="header-btn"
          onClick={() => setShowHelp(!showHelp)}
        >
          <HelpCircle size={20} />
          Ajuda
        </button>

        {/* PROJETOS */}
        <button
          className="header-btn"
          onClick={() => setShowProjects(!showProjects)}
        >
          <FolderOpen size={20} />
          Projetos
        </button>

        {/* LOGOUT */}
        <button
          className="header-btn logout"
          onClick={handleLogout}
        >
          <LogOut size={20} />
        </button>

      </div>
    </header>
  );
};

export default Header;
