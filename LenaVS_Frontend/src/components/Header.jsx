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

const GUIDE_PANELS = [
  {
    id: 'arquivos',
    label: 'Painel Arquivos',
    icon: Upload,
    sceneClassName: 'guide-scene--files',
    highlightClassName: 'guide-highlight--files',
    bubbleClassName: 'guide-bubble--files',
    bubbleText:
      'Painel Arquivos\nEnvie a música original, a versão instrumental e a letra. Se quiser, também pode adicionar uma imagem ou vídeo como fundo.\nDepois que a letra é enviada, a LenaVS organiza automaticamente o conteúdo em blocos (estrofes), que serão usados na edição.',
  },
  {
    id: 'editor',
    label: 'Editor de Letras',
    icon: FileText,
    sceneClassName: 'guide-scene--editor',
    highlightClassName: 'guide-highlight--editor',
    bubbleClassName: 'guide-bubble--editor',
    bubbleText:
      'Aqui você ajusta cada parte da letra.\nCada bloco pode ser editado, reorganizado ou duplicado.\nVocê define o tempo de início e fim de cada estrofe e também pode ajustar o visual: fonte, cor, tamanho, alinhamento e efeitos.\nAo clicar em um bloco com tempo definido, o preview vai direto para o início dele.\nEsse é o painel principal para deixar o karaokê sincronizado e com boa aparência.',
  },
  {
    id: 'preview',
    label: 'Preview',
    icon: Monitor,
    sceneClassName: 'guide-scene--preview',
    highlightClassName: 'guide-highlight--preview',
    bubbleClassName: 'guide-bubble--preview',
    bubbleText:
      'Aqui você vê como o vídeo está ficando.\nUse os controles para reproduzir a música e conferir se a letra está aparecendo no tempo certo.\nO preview mostra o resultado com estilo, transições e sincronização, antes da exportação.\nTambém é possível mudar cor de fundo, e alternar entre ouvir a música original ou o playback.',
  },
  {
    id: 'exportar',
    label: 'Exportar Vídeo',
    icon: Download,
    sceneClassName: 'guide-scene--export',
    highlightClassName: 'guide-highlight--export',
    bubbleClassName: 'guide-bubble--export',
    bubbleText:
      'Painel Exportar Vídeo\nAqui você gera o vídeo final.\nEscolha o nome do projeto, a resolução, o formato e qual áudio será usado.\nDepois disso, é só exportar e baixar o vídeo pronto.',
  },
];

const renderGuideScene = (panelId) => {
  switch (panelId) {
    case 'arquivos':
      return (
        <>
          <div className="guide-browser-bar">
            <span />
            <span />
            <span />
          </div>
          <div className="guide-scene-grid guide-scene-grid--files">
            <div className="guide-panel-column guide-panel-column--files">
              <div className="guide-mini-title">Arquivos</div>
              <div className="guide-upload-card">
                <strong>Música Original</strong>
                <small>Áudio com até 15 min</small>
              </div>
              <div className="guide-upload-card">
                <strong>Música Instrumental</strong>
                <small>Áudio com até 15 min</small>
              </div>
              <div className="guide-upload-card guide-upload-card--muted">
                <strong>Vídeo / Foto (fundo)</strong>
                <small>Opcional</small>
              </div>
              <div className="guide-upload-card">
                <strong>Letra</strong>
                <small>Arquivo ou texto colado</small>
              </div>
            </div>
            <div className="guide-preview-shell">
              <div className="guide-workspace-badge">Editor pronto para sincronizar</div>
              <div className="guide-placeholder-lines">
                <span />
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        </>
      );
    case 'editor':
      return (
        <>
          <div className="guide-browser-bar">
            <span />
            <span />
            <span />
          </div>
          <div className="guide-scene-grid guide-scene-grid--editor">
            <div className="guide-lyrics-list">
              <div className="guide-mini-title">Blocos da letra</div>
              <div className="guide-stanza-card guide-stanza-card--active">
                <strong>Estrofe 1</strong>
                <small>00:12 → 00:28</small>
              </div>
              <div className="guide-stanza-card">
                <strong>Refrão</strong>
                <small>00:29 → 00:45</small>
              </div>
              <div className="guide-stanza-card">
                <strong>Estrofe 2</strong>
                <small>00:46 → 01:04</small>
              </div>
            </div>
            <div className="guide-editor-sidebar">
              <div className="guide-mini-title">Ajustes visuais</div>
              <div className="guide-form-line" />
              <div className="guide-form-line guide-form-line--short" />
              <div className="guide-color-row">
                <span />
                <span />
                <span />
                <span />
              </div>
              <div className="guide-form-line" />
              <div className="guide-form-line guide-form-line--short" />
            </div>
          </div>
        </>
      );
    case 'preview':
      return (
        <>
          <div className="guide-browser-bar">
            <span />
            <span />
            <span />
          </div>
          <div className="guide-scene-grid guide-scene-grid--preview">
            <div className="guide-preview-large">
              <div className="guide-preview-video">
                <div className="guide-preview-text">Hoje eu canto sem olhar pra trás</div>
              </div>
              <div className="guide-player-bar">
                <div className="guide-player-progress" />
                <div className="guide-player-controls">
                  <span>▶</span>
                  <span>⏸</span>
                  <span>⏭</span>
                </div>
              </div>
            </div>
            <div className="guide-preview-settings">
              <div className="guide-mini-title">Preview</div>
              <div className="guide-toggle-pill">Original</div>
              <div className="guide-toggle-pill guide-toggle-pill--alt">Playback</div>
              <div className="guide-form-line" />
              <div className="guide-color-row">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        </>
      );
    case 'exportar':
      return (
        <>
          <div className="guide-browser-bar">
            <span />
            <span />
            <span />
          </div>
          <div className="guide-scene-grid guide-scene-grid--export">
            <div className="guide-export-panel">
              <div className="guide-mini-title">Exportar Vídeo</div>
              <div className="guide-form-line" />
              <div className="guide-form-line guide-form-line--short" />
              <div className="guide-chip-row">
                <span>1080p</span>
                <span>MP4</span>
                <span>Original</span>
              </div>
              <div className="guide-export-button">Exportar</div>
            </div>
            <div className="guide-download-card">
              <div className="guide-download-card__thumb" />
              <strong>Projeto pronto</strong>
              <small>Baixe o vídeo após a renderização</small>
            </div>
          </div>
        </>
      );
    default:
      return null;
  }
};

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

                      <div className={`guide-scene ${panel.sceneClassName}`}>
                        {renderGuideScene(panel.id)}
                        <div className={`guide-highlight ${panel.highlightClassName}`} />
                        <div className={`guide-bubble ${panel.bubbleClassName}`}>
                          {panel.bubbleText.split('\n').map((paragraph) => (
                            <p key={`${panel.id}-${paragraph}`}>{paragraph}</p>
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
