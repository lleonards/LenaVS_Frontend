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

const GUIDE_INTRO = `A LenaVS trabalha em 4 etapas: enviar arquivos, editar estrofes, revisar no preview e exportar.
A música original ajuda na marcação do tempo; o preview e a exportação usam original ou playback conforme os arquivos disponíveis.
Você também pode usar cor, imagem ou vídeo de fundo e continuar o trabalho depois salvando o projeto.`;

const GUIDE_PANELS = [
  {
    id: 'files',
    step: 'Passo 1',
    title: 'Envie os arquivos principais',
    image: '/guide/guia_1.png',
    mediaLayoutClassName: 'guide-card__media--bubble-left',
    shortDescription: 'Tudo começa aqui: áudio, letra e, se quiser, o fundo do vídeo.',
    bubbleLabel: 'Arquivos',
    description: 'Este painel reúne tudo o que inicia o projeto.',
    details: [
      'Música Original e Música Instrumental aceitam áudio com até 15 minutos, com validação antes do envio.',
      'O sistema processa 1 upload por vez; enquanto um arquivo sobe, os outros campos ficam bloqueados.',
      'Vídeo / Foto (fundo) é opcional: imagem vira fundo estático e vídeo vira fundo animado.',
      'A letra pode entrar por arquivo (.txt, .docx ou .pdf) ou pelo botão Colar Letra.',
      'Depois do processamento, a letra é separada em blocos/estrofes e o Editor de Letras é liberado automaticamente.',
    ],
  },
  {
    id: 'editor',
    step: 'Passo 2',
    title: 'Ajuste cada bloco da letra',
    image: '/guide/guia_2.png',
    mediaLayoutClassName: 'guide-card__media--bubble-right',
    shortDescription: 'Aqui você acerta texto, tempo e visual de cada trecho.',
    bubbleLabel: 'Editor de Letras',
    description: 'Aqui acontece a edição fina de cada estrofe.',
    details: [
      'Cada bloco pode ser selecionado, reordenado, duplicado, removido ou criado pelo botão +.',
      'Início e Fim usam MM:SS e também podem ser marcados no tempo atual pelos botões de marcação.',
      'O painel calcula o tamanho máximo seguro de fonte para cada estrofe.',
      'Você pode ajustar fonte, tamanho, cor do texto, cor da borda, negrito, itálico, sublinhado e alinhamento.',
      'Também dá para configurar contorno, transição (fade, slide, zoom-in e zoom-out) e duração.',
      'Se faltar início válido, o sistema avisa que o preview não vai pular automaticamente para a estrofe.',
    ],
  },
  {
    id: 'preview',
    step: 'Passo 3',
    title: 'Confira o resultado antes de exportar',
    image: '/guide/guia_3.png',
    mediaLayoutClassName: 'guide-card__media--bubble-right',
    shortDescription: 'Veja o karaokê funcionando antes de gerar o vídeo final.',
    bubbleLabel: 'Preview',
    description: 'Este painel simula o vídeo final para revisão.',
    details: [
      'O preview usa uma área lógica fixa de 1280x720 para ficar coerente com a exportação.',
      'Play/pause, barra de progresso e contador de tempo ajudam a revisar pontos específicos.',
      'Ao selecionar uma estrofe no editor, o sistema tenta voltar para o início desse bloco quando o tempo é válido.',
      'Se os dois áudios existirem, você pode alternar entre Original e Playback.',
      'O seletor de cor muda o fundo quando não há mídia carregada, e as transições configuradas aparecem durante a reprodução.',
    ],
  },
  {
    id: 'export',
    step: 'Passo 4',
    title: 'Crie e baixe o vídeo final',
    image: '/guide/guia_4.png',
    mediaLayoutClassName: 'guide-card__media--bubble-right',
    shortDescription: 'Defina as opções finais e gere o arquivo para download.',
    bubbleLabel: 'Exportar Vídeo',
    description: 'Aqui a edição vira arquivo final.',
    details: [
      'O nome do projeto é obrigatório antes de exportar.',
      'Você pode escolher resolução entre 360p, 480p e 720p; 1080p aparece, mas ainda está indisponível.',
      'O formato final pode ser MP4, AVI, MOV ou MKV.',
      'O áudio final pode ser Original ou Playback, respeitando os arquivos enviados e travas do projeto carregado.',
      'Antes de exportar, o app salva ou atualiza o projeto; depois acompanha o processamento do backend até o vídeo ficar pronto e tenta baixar automaticamente.',
      'Se o usuário estiver sem créditos, o fluxo oferece upgrade antes de continuar.',
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
              <button type="button" className="header-helper-cta" onClick={openGuide}>
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

                    <div className={`guide-card__media ${panel.mediaLayoutClassName || ''}`}>
                      <div className="guide-image-wrap">
                        <img src={panel.image} alt={panel.title} className="guide-card__image" />
                      </div>

                      <aside className="guide-bubble">
                        <h5 className="guide-bubble__title">Painel {panel.bubbleLabel}</h5>
                        <p className="guide-bubble__summary">{panel.description}</p>

                        <ul className="guide-bubble__list">
                          {panel.details.map((detail) => (
                            <li key={detail}>{detail}</li>
                          ))}
                        </ul>
                      </aside>
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
