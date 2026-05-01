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
    bubblePlacement: 'guide-bubble--top-right guide-bubble--wide',
    shortDescription: 'Tudo começa aqui: áudio, letra e, se quiser, o fundo do vídeo.',
    bubbleLabel: 'Arquivos',
    description: 'É aqui que você monta a base do projeto antes de começar a edição.',
    details: [
      'Envie a música original, a instrumental e a letra para liberar o restante do fluxo.',
      'Se quiser, adicione uma imagem ou vídeo para usar como fundo do karaokê.',
      'Quando a letra é processada, o app já organiza o conteúdo em blocos para edição.',
    ],
  },
  {
    id: 'editor',
    step: 'Passo 2',
    title: 'Ajuste cada bloco da letra',
    image: '/guide/guia_2.png',
    bubblePlacement: 'guide-bubble--top-left',
    shortDescription: 'Aqui você acerta texto, tempo e visual de cada trecho.',
    bubbleLabel: 'Editor de Letras',
    description: 'Neste painel você define como cada trecho vai aparecer no vídeo.',
    details: [
      'Cada bloco pode ser corrigido, reorganizado ou duplicado com poucos cliques.',
      'Você marca o início e o fim de cada parte para sincronizar a letra com a música.',
      'Também dá para ajustar estilo, cor, fonte, posição e efeito de entrada.',
    ],
  },
  {
    id: 'preview',
    step: 'Passo 3',
    title: 'Confira o resultado antes de exportar',
    image: '/guide/guia_3.png',
    bubblePlacement: 'guide-bubble--top-right',
    shortDescription: 'Veja o karaokê funcionando antes de gerar o vídeo final.',
    bubbleLabel: 'Preview',
    description: 'Aqui você assiste uma prévia para revisar tudo antes da exportação.',
    details: [
      'Use os controles para tocar, pausar e conferir se a letra entrou no tempo certo.',
      'Se houver mais de um áudio disponível, você pode alternar o que deseja ouvir.',
      'Esse passo ajuda a encontrar ajustes finais antes de gerar o vídeo.',
    ],
  },
  {
    id: 'export',
    step: 'Passo 4',
    title: 'Crie e baixe o vídeo final',
    image: '/guide/guia_4.png',
    bubblePlacement: 'guide-bubble--top-left',
    shortDescription: 'Defina as opções finais e gere o arquivo para download.',
    bubbleLabel: 'Exportação',
    description: 'No fim, você escolhe como o arquivo será gerado e faz o download.',
    details: [
      'Defina nome do projeto, resolução, formato e qual áudio vai no vídeo final.',
      'O LenaVS salva o projeto antes de exportar para você poder continuar depois, se quiser.',
      'Quando o processamento termina, o vídeo fica pronto para baixar.',
    ],
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
              <button type="button" className="header-helper-link header-helper-link--button" onClick={openGuide}>
                Ajuda → guia
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
                  Guia
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
                <h3>Guia do LenaVS</h3>
                <p>Veja o que cada área da tela faz, com exemplos visuais e explicações mais objetivas.</p>
              </div>

              <button type="button" className="guide-close-btn" onClick={() => setShowGuideModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="guide-modal__body">
              <section className="guide-intro">
                <p>{GUIDE_INTRO}</p>
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
                      <div className="guide-image-wrap">
                        <img src={panel.image} alt={panel.title} className="guide-card__image" />

                        <aside className={`guide-bubble ${panel.bubblePlacement || ''}`}>
                          <h5 className="guide-bubble__title">Painel {panel.bubbleLabel}</h5>
                          <p className="guide-bubble__summary">{panel.description}</p>

                          <ul className="guide-bubble__list">
                            {panel.details.map((detail) => (
                              <li key={detail}>{detail}</li>
                            ))}
                          </ul>
                        </aside>
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
