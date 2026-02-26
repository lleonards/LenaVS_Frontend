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
      ABRIR CHECKOUT STRIPE COM MOEDA DINÂMICA
  ===================================================== */
  const handleUpgrade = async () => {
    if (loadingUpgrade) return; // previne múltiplos cliques
    setLoadingUpgrade(true);

    try {
      // Detecta moeda pelo navegador (simples, pode melhorar depois)
      const userLang = navigator.language || 'pt-BR';
      const currency = userLang.startsWith('en') ? 'USD' : 'BRL';

      const res = await api.post('/payment/create-session', { currency });

      if (res.data && res.data.sessionUrl) {
        window.location.href = res.data.sessionUrl;
      } else {
        alert('Não foi possível iniciar o checkout. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao iniciar checkout:', error);
      alert('Erro ao iniciar o checkout. Tente novamente.');
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
        {/* BOTÃO DE UPGRADE / PRO */}
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

        {/* BOTÕES DE NAVEGAÇÃO */}
        <button className="header-btn" onClick={() => setShowHelp(!showHelp)}>
          <HelpCircle size={20} />
          Ajuda
        </button>

        <button
          className="header-btn"
          onClick={() => setShowProjects(!showProjects)}
        >
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
