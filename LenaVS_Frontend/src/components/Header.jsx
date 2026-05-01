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

const GUIDE_INTRO = `A LenaVS é uma ferramenta para criar vídeos de karaokê de forma simples.
Você usa a música original para marcar o tempo de cada parte da letra e depois visualiza tudo com a versão instrumental.
As frases aparecem em blocos, onde você pode editar o estilo, posição e aparência de cada trecho.
Também é possível enviar sua própria música, letra ou fundo.
Quando tudo estiver pronto, você pode exportar o vídeo em diferentes formatos.
Seus projetos ficam salvos no histórico, e você pode escolher deixá-los públicos ou não.`;

const GUIDE_PANELS = [
  {
    id: 'files',
    step: 'Passo 1',
    title: 'Envie os arquivos principais',
    image: '/guide/guia_1.png',
    bubbleClassName: 'guide-bubble--files',
    shortDescription: 'Comece colocando a música, a letra e, se quiser, um fundo para o vídeo.',
    bubbleLabel: 'Área destacada',
    description:
      'Aqui você envia os arquivos do projeto. Quando a música e a letra entram, a LenaVS prepara os blocos para você começar a montar o karaokê.',
  },
  {
    id: 'editor',
    step: 'Passo 2',
    title: 'Ajuste cada bloco da letra',
    image: '/guide/guia_2.png',
    bubbleClassName: 'guide-bubble--editor',
    shortDescription: 'Edite o texto, o tempo e o visual de cada trecho com calma.',
    bubbleLabel: 'Área destacada',
    description:
      'Aqui você mexe em cada parte da letra. Dá para corrigir o texto, escolher quando ele aparece e mudar o estilo para deixar o vídeo do seu jeito.',
  },
  {
    id: 'preview',
    step: 'Passo 3',
    title: 'Confira o resultado antes de exportar',
    image: '/guide/guia_3.png',
    bubbleClassName: 'guide-bubble--preview',
    shortDescription: 'Veja como o karaokê está ficando antes de criar o vídeo final.',
    bubbleLabel: 'Área destacada',
    description:
      'Aqui você acompanha a prévia do vídeo. É o lugar para conferir se a letra está aparecendo no tempo certo e se o visual ficou como você queria.',
  },
  {
    id: 'export',
    step: 'Passo 4',
    title: 'Crie e baixe o vídeo final',
    image: '/guide/guia_4.png',
    bubbleClassName: 'guide-bubble--export',
    shortDescription: 'Escolha as opções finais e gere o arquivo para baixar.',
    bubbleLabel: 'Área destacada',
    description:
      'Aqui você define nome, resolução, formato e o áudio final do vídeo. Depois disso, é só exportar e baixar o resultado pronto.',
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
              <span>Confira</span>
              <button type="button" className="header-helper-link" onClick={openGuide}>
                Ajuda
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
                <p>Um passo a passo simples para entender a tela principal sem linguagem complicada.</p>
              </div>

              <button type="button" className="guide-close-btn" onClick={() => setShowGuideModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="guide-modal__body">
              <section className="guide-intro">
                <p>{GUIDE_INTRO}</p>
                <div className="guide-scroll-hint">Role para ver todos os passos</div>
              </section>

              <div className="guide-gallery">
                {GUIDE_PANELS.map((panel) => (
                  <article key={panel.id} className="guide-card">
                    <div className="guide-card__header">
                      <span className="guide-step-badge">{panel.step}</span>
                      <div>
                        <h4>{panel.title}</h4>
                        <p>{panel.shortDescription}</p>
                      </div>
                    </div>

                    <div className="guide-card__media">
                      <img src={panel.image} alt={panel.title} className="guide-card__image" />
                      <div className={`guide-bubble ${panel.bubbleClassName}`}>
                        <span className="guide-bubble__label">{panel.bubbleLabel}</span>
                        <p>{panel.description}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default Header;
