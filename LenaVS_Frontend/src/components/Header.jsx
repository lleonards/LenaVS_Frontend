import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  BookOpen,
  FolderOpen,
  HelpCircle,
  LifeBuoy,
  LogOut,
  ArrowUp,
  Gem,
  X,
} from 'lucide-react';
import './Header.css';

const GUIDE_STEPS = [
  'Faça upload dos arquivos: música original, música instrumental, fundo em imagem/vídeo (opcional) e a letra da música (arquivo ou texto colado).',
  'No painel Editor de Letras, configure cada estrofe: defina o tempo inicial e final, ajuste o tamanho, fonte, cor, contorno e estilos, além da transição e duração.',
  'Todas as alterações feitas no Editor de Letras são refletidas automaticamente no preview.',
  'No preview, utilize o player para sincronizar as estrofes com a música. É possível alternar entre o áudio original e o instrumental.',
  'Ainda no preview, você pode ajustar o fundo do vídeo, incluindo a escolha de cor quando não houver imagem ou vídeo.',
  'No painel Exportar Vídeo, defina o nome do projeto, a resolução, o formato do vídeo e escolha qual áudio será utilizado no resultado final.',
  'Clique em exportar para gerar o vídeo. O sistema irá processar todas as configurações e iniciar o download automaticamente.',
  'Cada exportação consome 1 crédito apenas no plano free. No plano unlimited, o uso fica liberado enquanto o acesso estiver ativo.',
];

const Header = ({ onOpenProjects = () => {}, showCreditsLimitMessage = false }) => {
  const { signOut, hasUnlimitedAccess, creditsLabel } = useAuth();
  const navigate = useNavigate();

  const [showHelpMenu, setShowHelpMenu] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const helpMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (helpMenuRef.current && !helpMenuRef.current.contains(event.target)) {
        setShowHelpMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUpgrade = () => {
    navigate('/upgrade');
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <>
      <header className="header">
        <div className="header-logo">
          <img src="/logo_oficial.png" alt="LenaVS Logo" className="logo-img" />
        </div>

        <div className="header-center-slot">
          {showCreditsLimitMessage ? (
            <button
              type="button"
              className="header-limit-banner"
              onClick={handleUpgrade}
              title="Limite gratuito atingido. Ative o LenaVS Unlimited."
            >
              <AlertTriangle size={16} />
              <span>Limite gratuito atingido. Ative o LenaVS Unlimited.</span>
            </button>
          ) : null}
        </div>

        <div className="header-nav">
          {hasUnlimitedAccess ? (
            <div className="pro-badge-v2">
              <Gem size={14} />
              <span className="pro-text">UNLIMITED</span>
              <span className="pro-status">Acesso ativo</span>
            </div>
          ) : (
            <button
              type="button"
              className="upgrade-btn-lenavs"
              onClick={handleUpgrade}
            >
              <div className="credits-section">
                <span className="credits-val">{creditsLabel}</span>
                <span className="credits-label">Créditos</span>
              </div>

              <div className="upgrade-label">
                <ArrowUp size={14} />
                UNLIMITED
              </div>
            </button>
          )}

          <div className="header-help-wrap" ref={helpMenuRef}>
            <button
              type="button"
              className="header-btn"
              onClick={() => setShowHelpMenu((prev) => !prev)}
            >
              <HelpCircle size={20} />
              Ajuda
            </button>

            {showHelpMenu ? (
              <div className="header-dropdown">
                <button
                  type="button"
                  className="header-dropdown__item"
                  onClick={() => {
                    setShowGuideModal(true);
                    setShowHelpMenu(false);
                  }}
                >
                  <BookOpen size={16} />
                  Guia completo
                </button>

                <a
                  className="header-dropdown__item"
                  href="mailto:noreply@lenavs.com?subject=Suporte%20LenaVS"
                  onClick={() => setShowHelpMenu(false)}
                >
                  <LifeBuoy size={16} />
                  Suporte
                </a>
              </div>
            ) : null}
          </div>

          <button type="button" className="header-btn" onClick={onOpenProjects}>
            <FolderOpen size={20} />
            Projetos
          </button>

          <button type="button" className="header-btn logout" onClick={handleLogout}>
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {showGuideModal ? (
        <div className="guide-overlay" onClick={() => setShowGuideModal(false)}>
          <div className="guide-modal" onClick={(event) => event.stopPropagation()}>
            <div className="guide-modal__header">
              <div>
                <h3>Guia completo do LenaVS</h3>
                <p>Fluxo recomendado para criar, salvar, publicar e reaproveitar projetos.</p>
              </div>

              <button type="button" className="guide-close-btn" onClick={() => setShowGuideModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="guide-modal__body">
              {GUIDE_STEPS.map((step, index) => (
                <div key={step} className="guide-step">
                  <span className="guide-step__number">{index + 1}</span>
                  <p>{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default Header;
