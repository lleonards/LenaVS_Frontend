import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  BookOpen,
  FolderOpen,
  HelpCircle,
  LifeBuoy,
  LogOut,
  ArrowUp,
  Gem,
  X,
  AlertTriangle,
} from 'lucide-react';
import './Header.css';
import { startUpgradeCheckout } from '../utils/checkout';

const GUIDE_PANELS = [
  {
    id: 'files',
    title: 'Painel Arquivos',
    image: '/guide/guia_1.png',
    bubbleClassName: 'guide-bubble--files',
    description:
      'Ponto de entrada do pipeline. Recebe os uploads obrigatórios, valida os tipos de mídia aceitos e dispara a criação dos blocos de letra a partir do arquivo enviado ou do texto colado.',
  },
  {
    id: 'editor',
    title: 'Painel Editor de Letras',
    image: '/guide/guia_2.png',
    bubbleClassName: 'guide-bubble--editor',
    description:
      'Camada de configuração por estrofe. Define texto, tempos de início e fim, tipografia, contorno, estilos e parâmetros de transição usados no preview e também na renderização final.',
  },
  {
    id: 'preview',
    title: 'Painel Preview',
    image: '/guide/guia_3.png',
    bubbleClassName: 'guide-bubble--preview',
    description:
      'Monitor técnico em canvas 16:9. Reproduz a estrofe ativa com o áudio selecionado e permite validar sincronismo, legibilidade, troca de trilha e comportamento visual antes da exportação.',
  },
  {
    id: 'export',
    title: 'Painel Exportar Vídeo',
    image: '/guide/guia_4.png',
    bubbleClassName: 'guide-bubble--export',
    description:
      'Fechamento do job de render. Consolida nome do projeto, resolução, formato de saída e trilha final; o comando de exportação serializa a configuração atual e inicia o processamento.',
  },
];

const SUPPORT_MAILTO = 'mailto:noreply@lenavs.com?subject=Suporte%20LenaVS';

const Header = ({ onOpenProjects = () => {} }) => {
  const { signOut, hasUnlimitedAccess, credits, creditsLabel } = useAuth();

  const [showHelpMenu, setShowHelpMenu] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [openingCheckout, setOpeningCheckout] = useState(false);
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

  const openGuide = () => {
    setShowHelpMenu(false);
    setShowGuideModal(true);
  };

  const handleUpgrade = async () => {
    if (openingCheckout) return;

    try {
      await startUpgradeCheckout({
        onStart: () => setOpeningCheckout(true),
        onFinish: () => setOpeningCheckout(false),
      });
    } catch {
      // Erro já tratado no helper.
    }
  };

  const handleLogout = async () => {
    await signOut();
    window.location.href = `${window.location.origin}${window.location.pathname}#/login`;
  };

  const showFreeLimitNotice = !hasUnlimitedAccess && Number(credits) <= 0;

  return (
    <>
      <header className="header">
        <div className="header-logo">
          <img src="/logo_oficial.png" alt="LenaVS Logo" className="logo-img" />
        </div>

        <div className="header-center-slot" aria-live="polite">
          {showFreeLimitNotice ? (
            <button type="button" className="header-free-limit-notice" onClick={() => void handleUpgrade()}>
              <AlertTriangle size={15} />
              <span>{openingCheckout ? 'Abrindo checkout...' : 'Limite gratuito atingido. Ative o LenaVS Unlimited'}</span>
            </button>
          ) : (
            <div className="header-helper-notice">
              <span>Não entendeu?</span>
              <button type="button" className="header-helper-link" onClick={openGuide}>
                Confira Ajuda → Guia
              </button>
              <span>ou entre em contato com o</span>
              <a className="header-helper-link" href={SUPPORT_MAILTO}>
                suporte
              </a>
              <span>.</span>
            </div>
          )}
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
              onClick={() => void handleUpgrade()}
              disabled={openingCheckout}
            >
              <div className="credits-section">
                <span className="credits-val">{creditsLabel}</span>
                <span className="credits-label">Créditos</span>
              </div>

              <div className="upgrade-label">
                <ArrowUp size={14} />
                {openingCheckout ? 'ABRINDO' : 'UPGRADE'}
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
                  onClick={openGuide}
                >
                  <BookOpen size={16} />
                  Guia visual
                </button>

                <a
                  className="header-dropdown__item"
                  href={SUPPORT_MAILTO}
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
                <h3>Guia visual do LenaVS</h3>
                <p>Resumo técnico dos quatro painéis principais da interface.</p>
              </div>

              <button type="button" className="guide-close-btn" onClick={() => setShowGuideModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="guide-modal__body guide-gallery">
              {GUIDE_PANELS.map((panel) => (
                <article key={panel.id} className="guide-card">
                  <div className="guide-card__media">
                    <img src={panel.image} alt={panel.title} className="guide-card__image" />
                    <div className={`guide-bubble ${panel.bubbleClassName}`}>
                      <span className="guide-bubble__label">{panel.title}</span>
                      <p>{panel.description}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default Header;
