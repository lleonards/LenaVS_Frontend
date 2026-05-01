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
    mediaLayoutClassName: 'guide-card__media--bubble-left',
    shortDescription: 'Comece colocando a música, a letra e, se quiser, um fundo para o vídeo.',
    bubbleLabel: 'Arquivos',
    description:
      'Este painel é a porta de entrada do projeto. Tudo o que a LenaVS precisa para começar nasce aqui: áudios, fundo e a letra que será transformada em blocos editáveis.',
    details: [
      'Música Original e Música Instrumental aceitam arquivos de áudio com até 15 minutos. A duração é validada antes do envio para evitar erro mais tarde.',
      'O sistema trabalha com 1 upload por vez. Enquanto um arquivo está sendo enviado, os outros campos ficam bloqueados temporariamente.',
      'Vídeo / Foto (fundo) é opcional. Se você enviar uma imagem, ela vira fundo estático; se enviar um vídeo, ele vira fundo animado.',
      'A letra pode entrar por arquivo (.txt, .docx ou .pdf) ou pelo botão Colar Letra, para digitar ou colar manualmente o texto.',
      'Depois que a letra é processada, a LenaVS separa o conteúdo em blocos/estrofes e libera automaticamente o Editor de Letras para você continuar.',
    ],
    tip: 'Olhe o contador “Blocos no editor”: ele mostra quantas estrofes já foram criadas a partir da letra enviada.',
  },
  {
    id: 'editor',
    step: 'Passo 2',
    title: 'Ajuste cada bloco da letra',
    image: '/guide/guia_2.png',
    mediaLayoutClassName: 'guide-card__media--bubble-right',
    shortDescription: 'Edite o texto, o tempo e o visual de cada trecho com calma.',
    bubbleLabel: 'Editor de Letras',
    description:
      'Aqui acontece a sincronização fina e a personalização visual de cada estrofe. É o painel mais importante para definir quando a letra aparece e como ela vai ficar no vídeo.',
    details: [
      'Cada bloco pode ser selecionado, reordenado, duplicado, removido ou criado do zero pelo botão +. O bloco escolhido também é destacado para facilitar a edição.',
      'Os campos Início e Fim usam o formato MM:SS. Você pode digitar manualmente ou usar o botão de marcação para capturar o tempo exato do áudio no instante atual.',
      'O painel calcula um tamanho máximo seguro para cada estrofe, ajudando a evitar textos grandes demais para a área visível do vídeo.',
      'Você pode ajustar fonte, tamanho, cor do texto, cor da borda, negrito, itálico, sublinhado, alinhamento e espessura do contorno.',
      'Cada bloco também tem transição própria: efeito (fade, slide, zoom-in ou zoom-out) e duração com ajuste fino por campo numérico e slider.',
      'Se um bloco ainda não tiver início válido, o sistema avisa que o preview não conseguirá pular automaticamente para ele.',
    ],
    tip: 'Quando o preview estiver pausado, ele mostra o bloco selecionado; quando estiver tocando, acompanha o bloco ativo pelo tempo da música.',
  },
  {
    id: 'preview',
    step: 'Passo 3',
    title: 'Confira o resultado antes de exportar',
    image: '/guide/guia_3.png',
    mediaLayoutClassName: 'guide-card__media--bubble-right',
    shortDescription: 'Veja como o karaokê está ficando antes de criar o vídeo final.',
    bubbleLabel: 'Preview',
    description:
      'Este painel simula o vídeo final em um canvas fixo 16:9, para você validar sincronização, leitura da letra, transições e visual antes da exportação.',
    details: [
      'O preview usa uma área lógica fixa de 1280x720 para ficar coerente com a exportação final, mesmo quando a tela do usuário muda de tamanho.',
      'Os botões de play/pause, a barra de progresso e o contador de tempo ajudam a navegar pela música e revisar pontos específicos.',
      'Ao escolher uma estrofe no Editor de Letras, o sistema tenta voltar automaticamente para o início desse bloco, desde que ele tenha um tempo válido.',
      'Se existirem os dois áudios, você pode alternar entre Original e Playback para conferir a experiência do usuário em cada versão.',
      'O seletor de cor muda o fundo do preview. Isso é útil principalmente quando não há vídeo ou imagem de fundo carregados.',
      'Durante a reprodução, o preview aplica as transições configuradas em cada estrofe e mostra a letra ativa no momento certo.',
    ],
    tip: 'Use este painel para revisar legibilidade, tempo de entrada/saída e se o bloco escolhido está confortável de ler antes de exportar.',
  },
  {
    id: 'export',
    step: 'Passo 4',
    title: 'Crie e baixe o vídeo final',
    image: '/guide/guia_4.png',
    mediaLayoutClassName: 'guide-card__media--bubble-right',
    shortDescription: 'Escolha as opções finais e gere o arquivo para baixar.',
    bubbleLabel: 'Exportar Vídeo',
    description:
      'Aqui você transforma a edição em arquivo final. O painel reúne nome do projeto, formato, resolução, áudio final e o botão que dispara a geração do vídeo.',
    details: [
      'O nome do projeto é obrigatório. Sem ele, a exportação fica bloqueada para evitar arquivos sem identificação.',
      'Você pode escolher resolução entre 360p, 480p e 720p. A opção 1080p aparece no menu, mas está marcada como indisponível no momento.',
      'O formato final pode ser MP4, AVI, MOV ou MKV, de acordo com a necessidade do usuário.',
      'O áudio final pode ser Original ou Playback, respeitando a disponibilidade dos arquivos enviados e as travas de projetos carregados da biblioteca.',
      'Antes de exportar, a aplicação salva ou atualiza o projeto automaticamente. Depois, o frontend acompanha o processamento assíncrono do backend até o vídeo ficar pronto.',
      'Quando o vídeo termina de ser gerado, o sistema tenta baixar o arquivo automaticamente. Se o usuário estiver sem créditos, o fluxo oferece o upgrade antes de continuar.',
    ],
    tip: 'Se quiser começar outro trabalho sem misturar arquivos e estrofes, use o botão “Novo projeto” depois de terminar ou salvar o atual.',
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

                    <div className={`guide-card__media ${panel.mediaLayoutClassName || ''}`}>
                      <div className="guide-image-wrap">
                        <img src={panel.image} alt={panel.title} className="guide-card__image" />
                      </div>

                      <aside className="guide-bubble">
                        <span className="guide-bubble__eyebrow">Painel destacado</span>
                        <h5 className="guide-bubble__title">{panel.bubbleLabel}</h5>
                        <p className="guide-bubble__summary">{panel.description}</p>

                        <ul className="guide-bubble__list">
                          {panel.details.map((detail) => (
                            <li key={detail}>{detail}</li>
                          ))}
                        </ul>

                        <p className="guide-bubble__tip">
                          <strong>Dica prática:</strong> {panel.tip}
                        </p>
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
