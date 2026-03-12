import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, FolderOpen, LogOut, ArrowUp, Gem } from 'lucide-react';
import api from '../services/api';
import ProjectsModal from './ProjectsModal';
import './Header.css';

const Header = ({ onLoadProject }) => {
  const { signOut, plan, credits } = useAuth();
  const navigate = useNavigate();

  const [showHelp, setShowHelp]       = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [loadingUpgrade, setLoadingUpgrade] = useState(false);

  /* ── Upgrade / Checkout ── */
  const handleUpgrade = async () => {
    if (loadingUpgrade) return;
    setLoadingUpgrade(true);
    try {
      const currency = navigator.language?.startsWith('en') ? 'usd' : 'brl';
      const res = await api.post('/payment/create-session', { currency });
      if (res.data?.sessionUrl) {
        window.location.href = res.data.sessionUrl;
      } else {
        alert('Não foi possível iniciar o checkout. Tente novamente.');
      }
    } catch (error) {
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
    <>
      <header className="header">

        {/* LOGO */}
        <div className="header-logo">
          <img src="/logo_oficial.png" alt="LenaVS Logo" className="logo-img" />
        </div>

        <div className="header-nav">

          {/* PLANO */}
          {plan === 'pro' ? (
            <div className="pro-badge-v2">
              <Gem size={14} />
              <span className="pro-text">PRO</span>
              <span className="pro-status">Ilimitado</span>
            </div>
          ) : (
            <button
              type="button"
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
            type="button"
            className="header-btn"
            onClick={() => setShowHelp(!showHelp)}
          >
            <HelpCircle size={20} />
            Ajuda
          </button>

          {/* PROJETOS */}
          <button
            type="button"
            className="header-btn"
            onClick={() => setShowProjects(true)}
          >
            <FolderOpen size={20} />
            Projetos
          </button>

          {/* LOGOUT */}
          <button
            type="button"
            className="header-btn logout"
            onClick={handleLogout}
          >
            <LogOut size={20} />
          </button>

        </div>
      </header>

      {/* MODAL PROJETOS */}
      {showProjects && (
        <ProjectsModal
          onClose={() => setShowProjects(false)}
          onLoadProject={onLoadProject}
        />
      )}
    </>
  );
};

export default Header;
