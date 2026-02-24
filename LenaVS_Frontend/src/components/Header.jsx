import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, FolderOpen, LogOut, ArrowUp, Gem } from 'lucide-react';
import api from '../services/api';
import './Header.css';

const Header = () => {
  // Puxamos plan e credits diretamente do contexto global 
  const { signOut, plan, credits } = useAuth();
  const navigate = useNavigate();

  const [showHelp, setShowHelp] = useState(false);
  const [showProjects, setShowProjects] = useState(false);

  /* =====================================================
     💳 ABRIR CHECKOUT STRIPE
  ===================================================== */
  const handleUpgrade = async () => {
    try {
      const res = await api.post('/payment/create-session', {
        currency: 'BRL'
      });
      if (res.data?.sessionUrl) {
        window.location.href = res.data.sessionUrl; [cite: 5]
      }
    } catch (error) {
      console.error('Erro ao iniciar checkout:', error);
    }
  };

  const handleLogout = async () => {
    await signOut(); [cite: 33]
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
        {/* 🎁 BOTÃO UPGRADE + CRÉDITOS (TEMA LENAVS) */}
        {plan === 'pro' ? (
          <div className="pro-badge-v2">
            <Gem size={14} />
            <span className="pro-text">PRO</span>
            <span className="pro-status">Ilimitado</span>
          </div>
        ) : (
          <button className="upgrade-btn-lenavs" onClick={handleUpgrade}>
            <div className="credits-section">
              <span className="credits-val">{credits ?? 0}</span>
              <span className="credits-label">Créditos</span>
            </div>
            <div className="upgrade-label">
              <ArrowUp size={14} />
              UPGRADE
            </div>
          </button>
        )}

        {/* BOTÕES DE NAVEGAÇÃO */}
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
