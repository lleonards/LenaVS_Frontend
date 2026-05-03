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
  Upload,
  FileText,
  Monitor,
  Download,
} from 'lucide-react';
import './Header.css';
import { startUpgradeCheckout } from '../utils/checkout';

const GUIDE_INTRO_PARAGRAPHS = [
  'A LenaVS é uma ferramenta para criar vídeos de karaokê de forma simples.',
  'Você usa a música original para marcar o tempo de cada parte da letra e depois visualiza tudo com a versão instrumental.',
  'As frases aparecem em blocos, onde você pode editar o estilo, posição e aparência de cada trecho.',
  'Também é possível enviar sua própria música, letra ou fundo.',
  'Quando tudo estiver pronto, você pode exportar o vídeo em diferentes formatos.',
  'Seus projetos ficam salvos no histórico, e você pode escolher deixá-los públicos ou não.',
];

const SUPPORT_HREF = 'mailto:noreply@lenavs.com?subject=Suporte%20LenaVS';

const GUIDE_PANELS = [
  {
    id: 'arquivos',
    label: 'Painel Arquivos',
    icon: Upload,
    imageSrc: '/guide/guide_01.png',
    imageAlt: 'Captura do LenaVS com destaque no painel Arquivos.',
    highlightStyle: {
      left: '1.2%',
      top: '12.1%',
      width: '30.8%',
      height: '73.2%',
    },
    bubbleStyle: {
      right: '2.4%',
      top: '16%',
      width: '28%',
    },
    bubbleTone: 'peach',
    bubbleText:
      'Painel Arquivos\nEnvie a música original, a versão instrumental e a letra. Se quiser, também pode adicionar uma imagem ou vídeo como fundo.\nDepois que a letra é enviada, a LenaVS organiza automaticamente o conteúdo em blocos (estrofes), que serão usados na edição.',
  },
  {
    id: 'editor',
    label: 'Editor de Letras',
    icon: FileText,
    imageSrc: '/guide/guide_02.png',
    imageAlt: 'Captura do LenaVS com destaque no Editor de Letras.',
    highlightStyle: {
      left: '71.1%',
      top: '12.1%',
      width: '27.7%',
      height: '75.6%',
    },
    bubbleStyle: {
      left: '2.2%',
      bottom: '6.5%',
      width: '33.5%',
    },
    bubbleTone: 'blue',
    bubbleText:
      'Aqui você ajusta cada parte da letra.\nCada bloco pode ser editado, reorganizado ou duplicado.\nVocê define o tempo de início e fim de cada estrofe e também pode ajustar o visual: fonte, cor, tamanho, alinhamento e efeitos.\nAo clicar em um bloco com tempo definido, o preview vai direto para o início dele.\nEsse é o painel principal para deixar o karaokê sincronizado e com boa aparência.',
  },
  {
    id: 'preview',
    label: 'Preview',
    icon: Monitor,
    imageSrc: '/guide/guide_03.png',
    imageAlt: 'Captura do LenaVS com destaque na área de Preview.',
    highlightStyle: {
      left: '32.9%',
      top: '11.9%',
      width: '39.1%',
      height: '56.4%',
    },
    bubbleStyle: {
      right: '1.8%',
      top: '15.5%',
      width: '24.5%',
    },
    bubbleTone: 'green',
    bubbleText:
      'Aqui você vê como o vídeo está ficando.\nUse os controles para reproduzir a música e conferir se a letra está aparecendo no tempo certo.\nO preview mostra o resultado com estilo, transições e sincronização, antes da exportação.\nTambém é possível mudar cor de fundo, e alternar entre ouvir a música original ou o playback.',
  },
  {
    id: 'exportar',
    label: 'Exportar Vídeo',
    icon: Download,
    imageSrc: '/guide/guide_04.png',
    imageAlt: 'Captura do LenaVS com destaque no painel Exportar Vídeo.',
    highlightStyle: {
      left: '32.9%',
      top: '69%',
      width: '39%',
      height: '23.2%',
    },
    bubbleStyle: {
      right: '2.2%',
      top: '16.5%',
      width: '24%',
    },
    bubbleTone: 'gold',
    bubbleText:
      'Painel Exportar Vídeo\nAqui você gera o vídeo final.\nEscolha o nome do projeto, a resolução, o formato e qual áudio será usado.',
  },
];

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

  const openGuideModal = () => {
    setShowGuideModal(true);
    setShowHelpMenu(false);
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
            <div className="header-inline-help-notice">
              <span>Não entendeu? Confira </span>
              <button
                type="button"
                className="header-inline-help-link"
                onClick={openGuideModal}
              >
                Ajuda → guia
              </button>
              <span> ou entre em contato com o </span>
              <a className="header-inline-help-link" href={SUPPORT_HREF}>
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
                  onClick={openGuideModal}
                >
                  <BookOpen size={16} />
                  Guia completo
                </button>

                <a
                  className="header-dropdown__item"
                  href={SUPPORT_HREF}
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
              <section className="guide-intro-card">
                {GUIDE_INTRO_PARAGRAPHS.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </section>

              <div className="guide-gallery">
                {GUIDE_PANELS.map((panel) => {
                  const Icon = panel.icon;

                  return (
                    <section key={panel.id} className="guide-card">
                      <div className="guide-card__header">
                        <span className="guide-card__badge">
                          <Icon size={15} />
                          {panel.label}
                        </span>
                      </div>

                      <div className="guide-scene">
                        <img className="guide-screenshot" src={panel.imageSrc} alt={panel.imageAlt} />
                        <div className="guide-highlight" style={panel.highlightStyle} />
                        <div className={`guide-bubble guide-bubble--${panel.bubbleTone}`} style={panel.bubbleStyle}>
                          {panel.bubbleText.split('\n').map((paragraph, index) => (
                            <p key={`${panel.id}-${paragraph}`} className={index === 0 ? 'guide-bubble__title' : ''}>
                              {paragraph}
                            </p>
                          ))}
                        </div>
                      </div>
                    </section>
                  );
                })}
              </div>

              <div className="guide-projects-note">
                <strong>Projetos</strong>
                <p>
                  Na aba Projetos é ficam seus projetos salvos.
                  Você pode acessar, editar, excluir ou escolher se quer deixar um projeto público para outros usuarios.
                  Também é possível ver projetos de outros usuários e criar uma cópia para editar..
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default Header;
