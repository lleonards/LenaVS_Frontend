import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  FileAudio,
  FileText,
  Image as ImageIcon,
  LayoutPanelLeft,
  MonitorPlay,
  Music4,
  Palette,
  PlayCircle,
  Sparkles,
  Type,
  Upload,
  Video,
  Wand2,
  X,
} from 'lucide-react';
import './VisualGuideModal.css';

const LYRICS_BLOCKS = [
  {
    title: 'Estrofe 1',
    time: '00:14 → 00:24',
    text: 'Happy birthday to you\nHappy birthday to you\nHappy birthday,\nHappy birthday,',
  },
  {
    title: 'Estrofe 2',
    time: '00:24 → 00:41',
    text: 'Happy birthday to you\nHappy birthday to you\nHappy birthday to you\nHappy birthday\nHappy birthday\nHappy birthday to you',
  },
  {
    title: 'Estrofe 3',
    time: '00:43 → 01:10',
    text: 'Happy birthday to you\nHappy birthday to you\nHappy birthday,\nHappy birthday,\nHappy birthday to you',
  },
];

const GUIDE_STEPS = [
  {
    id: 'intro',
    label: 'Tela inicial',
    eyebrow: 'Visão rápida',
    title: 'Entenda o fluxo da plataforma',
    summary: 'Tudo acontece em sequência: arquivos na esquerda, preview no centro, ajustes na direita e exportação no final.',
    notes: ['Upload simples', 'Preview 16:9', 'Editor por estrofes', 'Exportação guiada'],
  },
  {
    id: 'original',
    label: 'Passo 1',
    eyebrow: 'Música original',
    title: 'Envie a faixa principal',
    summary: 'Clique em Música Original e selecione o arquivo. Exemplo: happy.mp3.',
    notes: ['1 upload por vez', 'Até 15 minutos', 'Validação automática'],
  },
  {
    id: 'instrumental',
    label: 'Passo 2',
    eyebrow: 'Playback',
    title: 'Adicione a versão instrumental',
    summary: 'Se você tiver playback, envie em Música Instrumental. Exemplo: happy instrumental.mp3.',
    notes: ['Opcional, mas útil', 'Troca no preview', 'Escolha o áudio final na exportação'],
  },
  {
    id: 'background',
    label: 'Passo 3',
    eyebrow: 'Fundo visual',
    title: 'Escolha vídeo ou imagem de fundo',
    summary: 'Você pode usar vídeo, foto ou só uma cor. O preview já mostra como vai ficar.',
    notes: ['Vídeo ou imagem', 'Antes e depois', 'Combina com a exportação'],
  },
  {
    id: 'lyrics',
    label: 'Passo 4',
    eyebrow: 'Entrada da letra',
    title: 'Envie a letra ou cole o texto',
    summary: 'A plataforma separa a letra em blocos automaticamente para você editar depois.',
    notes: ['.txt, .docx e .pdf', 'Colar texto manualmente', 'Separação automática em estrofes'],
  },
  {
    id: 'edit',
    label: 'Passo 5',
    eyebrow: 'Ajuste fino',
    title: 'Edite tempo, estilo e posição das estrofes',
    summary: 'Defina início, fim, fonte, cor, borda e transição de cada bloco.',
    notes: ['Tap sync', 'Fonte e cor', 'Reordenação e duplicação'],
  },
  {
    id: 'preview',
    label: 'Passo 6',
    eyebrow: 'Conferência visual',
    title: 'Use o preview para sincronizar',
    summary: 'Dê play, pause, arraste o tempo e clique nas estrofes para revisar o resultado.',
    notes: ['Play e pause', 'Barra de progresso', 'Alternância entre original e instrumental'],
  },
  {
    id: 'export',
    label: 'Passo 7',
    eyebrow: 'Saída final',
    title: 'Exporte o vídeo pronto',
    summary: 'Escolha resolução, formato e áudio final. Depois é só gerar e baixar.',
    notes: ['360p, 480p, 720p', 'MP4, AVI, MOV, MKV', 'Download automático'],
  },
];

const WindowDots = () => (
  <div className="guide-window-dots" aria-hidden="true">
    <span />
    <span />
    <span />
  </div>
);

const ChipRow = ({ items }) => (
  <div className="guide-chip-row">
    {items.map((item) => (
      <span key={item} className="guide-chip">
        {item}
      </span>
    ))}
  </div>
);

const FlowNode = ({ icon: Icon, title, subtitle, active = false }) => (
  <div className={`guide-flow-node${active ? ' active' : ''}`}>
    <div className="guide-flow-node__icon">
      <Icon size={18} />
    </div>
    <strong>{title}</strong>
    <span>{subtitle}</span>
  </div>
);

const UploadCard = ({ icon: Icon, title, subtitle, fileName, active = false, uploaded = false }) => (
  <div className={`guide-upload-card${active ? ' active' : ''}${uploaded ? ' uploaded' : ''}`}>
    <div className="guide-upload-card__icon">
      <Icon size={18} />
    </div>
    <div className="guide-upload-card__copy">
      <strong>{title}</strong>
      <span>{subtitle}</span>
      {fileName ? <small>{fileName}</small> : null}
    </div>
    {uploaded ? (
      <span className="guide-upload-card__status uploaded">
        <CheckCircle2 size={15} />
        OK
      </span>
    ) : (
      <span className="guide-upload-card__status">Selecionar</span>
    )}
  </div>
);

const Highlight = ({ text, position = 'top-right' }) => (
  <div className={`guide-highlight guide-highlight--${position}`}>
    <span className="guide-highlight__pulse" />
    <span className="guide-highlight__label">{text}</span>
  </div>
);

const MockPreview = ({ stanzaText = 'Happy birthday to you', badge = 'Preview 16:9', emphasizeControls = false }) => (
  <div className="guide-mock-preview">
    <div className="guide-mock-preview__badge">{badge}</div>
    <div className="guide-mock-preview__screen">
      <div className="guide-mock-preview__background" />
      <div className="guide-mock-preview__lyrics">{stanzaText}</div>
    </div>
    <div className={`guide-mock-preview__controls${emphasizeControls ? ' active' : ''}`}>
      <button type="button">
        <PlayCircle size={15} />
      </button>
      <div className="guide-mock-preview__bar">
        <span />
      </div>
      <div className="guide-mock-preview__time">00:24 / 01:10</div>
    </div>
  </div>
);

const MockExportCard = () => (
  <div className="guide-export-card">
    <div className="guide-export-card__head">
      <strong>Exportar vídeo</strong>
      <span>Último passo</span>
    </div>

    <div className="guide-export-grid">
      <div>
        <label>Projeto</label>
        <div className="guide-export-field">Happy Birthday Demo</div>
      </div>
      <div>
        <label>Resolução</label>
        <div className="guide-export-field">720p</div>
      </div>
      <div>
        <label>Formato</label>
        <div className="guide-export-field">MP4</div>
      </div>
      <div>
        <label>Áudio</label>
        <div className="guide-export-field">Original</div>
      </div>
    </div>

    <div className="guide-export-progress">
      <div className="guide-export-progress__bar">
        <span />
      </div>
      <small>Renderizando e preparando download...</small>
    </div>

    <button type="button" className="guide-export-btn">
      <Download size={15} />
      Gerar vídeo
    </button>
  </div>
);

const renderStepVisual = (stepId) => {
  switch (stepId) {
    case 'intro':
      return (
        <div className="guide-visual-grid guide-visual-grid--single">
          <section className="guide-surface-card guide-surface-card--hero">
            <WindowDots />
            <div className="guide-flow-head">
              <div>
                <span className="guide-kicker">Fluxo principal</span>
                <h3>Esquerda → centro → direita → exportar</h3>
              </div>
              <span className="guide-mini-pill">Tutorial rápido</span>
            </div>

            <div className="guide-flow-row">
              <FlowNode icon={Upload} title="Arquivos" subtitle="música, fundo e letra" active />
              <ArrowRight size={20} className="guide-arrow" />
              <FlowNode icon={MonitorPlay} title="Preview" subtitle="veja o resultado" active />
              <ArrowRight size={20} className="guide-arrow" />
              <FlowNode icon={Type} title="Editor" subtitle="tempos e estilo" active />
              <ArrowRight size={20} className="guide-arrow" />
              <FlowNode icon={Download} title="Exportar" subtitle="gera o vídeo final" active />
            </div>

            <div className="guide-intro-panels">
              <div className="guide-intro-panel guide-intro-panel--left">
                <strong>Esquerda</strong>
                <span>Uploads e letra</span>
              </div>
              <div className="guide-intro-panel guide-intro-panel--center">
                <strong>Centro</strong>
                <span>Preview 16:9</span>
              </div>
              <div className="guide-intro-panel guide-intro-panel--right">
                <strong>Direita</strong>
                <span>Editor de estrofes</span>
              </div>
            </div>

            <Highlight text="Comece pela esquerda" position="bottom-left" />
          </section>
        </div>
      );

    case 'original':
      return (
        <div className="guide-visual-grid">
          <section className="guide-surface-card">
            <WindowDots />
            <div className="guide-panel-title">
              <LayoutPanelLeft size={16} />
              <span>Painel de arquivos</span>
            </div>
            <div className="guide-upload-stack">
              <UploadCard icon={Music4} title="Música Original" subtitle="Áudio com até 15 min" fileName="happy.mp3" active uploaded />
              <UploadCard icon={FileAudio} title="Música Instrumental" subtitle="Opcional" />
              <UploadCard icon={Video} title="Vídeo / Foto" subtitle="Fundo opcional" />
              <UploadCard icon={FileText} title="Letra" subtitle="Arquivo ou texto" />
            </div>
            <Highlight text="Clique aqui primeiro" position="top-left" />
          </section>

          <section className="guide-surface-card guide-surface-card--compact">
            <div className="guide-callout">
              <Music4 size={18} />
              <div>
                <strong>Exemplo usado no guia</strong>
                <span>Arquivo original: happy.mp3</span>
              </div>
            </div>
            <div className="guide-status-line success">Upload concluído</div>
            <div className="guide-status-line">O sistema libera o próximo envio logo depois.</div>
          </section>
        </div>
      );

    case 'instrumental':
      return (
        <div className="guide-visual-grid">
          <section className="guide-surface-card">
            <WindowDots />
            <div className="guide-upload-stack">
              <UploadCard icon={Music4} title="Música Original" subtitle="Arquivo enviado" fileName="happy.mp3" uploaded />
              <UploadCard icon={FileAudio} title="Música Instrumental" subtitle="Playback com até 15 min" fileName="happy instrumental.mp3" active uploaded />
              <UploadCard icon={Video} title="Vídeo / Foto" subtitle="Pode enviar depois" />
            </div>
            <Highlight text="Agora envie o playback" position="top-right" />
          </section>

          <section className="guide-surface-card guide-surface-card--compact">
            <div className="guide-audio-switch-demo active">
              <span>Áudio do preview</span>
              <div className="guide-audio-switch-demo__buttons">
                <button type="button">Original</button>
                <button type="button" className="active">Instrumental</button>
              </div>
            </div>
            <div className="guide-status-line">Quando os dois áudios existem, você pode alternar no preview.</div>
          </section>
        </div>
      );

    case 'background':
      return (
        <div className="guide-visual-grid">
          <section className="guide-surface-card">
            <WindowDots />
            <div className="guide-before-after">
              <div className="guide-before-after__card">
                <span className="guide-mini-pill">Antes</span>
                <MockPreview badge="Sem fundo" stanzaText="Happy birthday to you" />
              </div>
              <div className="guide-before-after__card">
                <span className="guide-mini-pill accent">Depois</span>
                <MockPreview badge="Com imagem ou vídeo" stanzaText="Happy birthday to you" />
              </div>
            </div>
            <Highlight text="Escolha vídeo ou foto" position="bottom-right" />
          </section>

          <section className="guide-surface-card guide-surface-card--compact">
            <div className="guide-callout">
              <ImageIcon size={18} />
              <div>
                <strong>Fundo flexível</strong>
                <span>Vídeo, imagem ou cor sólida</span>
              </div>
            </div>
            <div className="guide-background-swatches">
              <span style={{ background: '#ff8c5a' }} />
              <span style={{ background: '#6c63ff' }} />
              <span style={{ background: '#101010' }} />
            </div>
          </section>
        </div>
      );

    case 'lyrics':
      return (
        <div className="guide-visual-grid">
          <section className="guide-surface-card">
            <WindowDots />
            <div className="guide-lyrics-entry-layout">
              <div className="guide-lyrics-entry-card active">
                <div className="guide-panel-title">
                  <FileText size={16} />
                  <span>Arquivo da letra</span>
                </div>
                <div className="guide-file-badges">
                  <span>.txt</span>
                  <span>.docx</span>
                  <span>.pdf</span>
                </div>
              </div>

              <div className="guide-lyrics-arrow">
                <ArrowRight size={20} />
              </div>

              <div className="guide-lyrics-entry-card active">
                <div className="guide-panel-title">
                  <Type size={16} />
                  <span>Ou colar texto</span>
                </div>
                <div className="guide-manual-textarea">
                  Happy birthday to you\n\nHappy birthday to you
                </div>
              </div>
            </div>

            <div className="guide-lyrics-blocks-preview">
              {LYRICS_BLOCKS.map((block) => (
                <div key={block.title} className="guide-lyrics-blocks-preview__item">
                  <strong>{block.title}</strong>
                  <span>{block.text.split('\n')[0]}...</span>
                </div>
              ))}
            </div>

            <Highlight text="A letra vira blocos automaticamente" position="bottom-left" />
          </section>
        </div>
      );

    case 'edit':
      return (
        <div className="guide-visual-grid">
          <section className="guide-surface-card">
            <WindowDots />
            <div className="guide-panel-title">
              <Wand2 size={16} />
              <span>Editor de letras</span>
            </div>

            <div className="guide-stanza-editor-list">
              {LYRICS_BLOCKS.map((block, index) => (
                <div key={block.title} className={`guide-stanza-editor-card${index === 1 ? ' active' : ''}`}>
                  <div className="guide-stanza-editor-card__head">
                    <strong>{block.title}</strong>
                    <span>{block.time}</span>
                  </div>
                  <div className="guide-stanza-editor-card__text">{block.text}</div>
                  <div className="guide-stanza-editor-card__controls">
                    <span>Fonte: Montserrat</span>
                    <span>Texto: branco</span>
                    <span>Borda: preta</span>
                    <span>Transição: fade</span>
                  </div>
                </div>
              ))}
            </div>

            <Highlight text="Ajuste início, fim e estilo" position="top-right" />
          </section>

          <section className="guide-surface-card guide-surface-card--compact">
            <div className="guide-before-after guide-before-after--stacked">
              <div className="guide-before-after__mini">
                <span className="guide-mini-pill">Antes</span>
                <div className="guide-unstyled-preview">Texto sem tempo e sem estilo</div>
              </div>
              <div className="guide-before-after__mini">
                <span className="guide-mini-pill accent">Depois</span>
                <div className="guide-styled-preview">Texto sincronizado, centralizado e com borda</div>
              </div>
            </div>
          </section>
        </div>
      );

    case 'preview':
      return (
        <div className="guide-visual-grid">
          <section className="guide-surface-card">
            <WindowDots />
            <MockPreview
              badge="Preview em tempo real"
              stanzaText="Happy birthday to you"
              emphasizeControls
            />
            <div className="guide-preview-actions-row">
              <div className="guide-small-action active">
                <PlayCircle size={15} /> Play / Pause
              </div>
              <div className="guide-small-action active">
                <Clock3 size={15} /> Arrastar tempo
              </div>
              <div className="guide-small-action">
                <Palette size={15} /> Cor de fundo
              </div>
            </div>
            <Highlight text="Confira tudo antes de exportar" position="bottom-right" />
          </section>

          <section className="guide-surface-card guide-surface-card--compact">
            <div className="guide-audio-switch-demo active">
              <span>Troca rápida</span>
              <div className="guide-audio-switch-demo__buttons">
                <button type="button" className="active">Original</button>
                <button type="button">Instrumental</button>
              </div>
            </div>
            <div className="guide-status-line">Clique numa estrofe para levar o preview até aquele ponto.</div>
          </section>
        </div>
      );

    case 'export':
      return (
        <div className="guide-visual-grid">
          <section className="guide-surface-card">
            <WindowDots />
            <MockExportCard />
            <Highlight text="Último clique" position="top-right" />
          </section>

          <section className="guide-surface-card guide-surface-card--compact">
            <div className="guide-callout">
              <Sparkles size={18} />
              <div>
                <strong>Fluxo final</strong>
                <span>Salvar → renderizar → baixar automaticamente</span>
              </div>
            </div>
            <div className="guide-status-line success">Free consome crédito no download/exportação.</div>
            <div className="guide-status-line">Unlimited libera o uso enquanto o acesso estiver ativo.</div>
          </section>
        </div>
      );

    default:
      return null;
  }
};

const VisualGuideModal = ({ open = false, onClose = () => {} }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (open) {
      setActiveIndex(0);
    }
  }, [open]);

  const currentStep = useMemo(() => GUIDE_STEPS[activeIndex] || GUIDE_STEPS[0], [activeIndex]);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key === 'ArrowRight') {
        setActiveIndex((prev) => Math.min(prev + 1, GUIDE_STEPS.length - 1));
      }

      if (event.key === 'ArrowLeft') {
        setActiveIndex((prev) => Math.max(prev - 1, 0));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  const isFirst = activeIndex === 0;
  const isLast = activeIndex === GUIDE_STEPS.length - 1;

  return (
    <div className="visual-guide-overlay" onClick={onClose}>
      <div className="visual-guide-modal" onClick={(event) => event.stopPropagation()}>
        <aside className="visual-guide-sidebar">
          <div className="visual-guide-brand">
            <span className="visual-guide-brand__pill">LenaVS</span>
            <h2>Guia visual</h2>
            <p>Passo a passo rápido, simples e com mockups da interface.</p>
          </div>

          <div className="visual-guide-step-list">
            {GUIDE_STEPS.map((step, index) => (
              <button
                key={step.id}
                type="button"
                className={`visual-guide-step-btn${index === activeIndex ? ' active' : ''}`}
                onClick={() => setActiveIndex(index)}
              >
                <span className="visual-guide-step-btn__index">{index === 0 ? '0' : index}</span>
                <span className="visual-guide-step-btn__copy">
                  <strong>{step.label}</strong>
                  <small>{step.eyebrow}</small>
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="visual-guide-content">
          <div className="visual-guide-header">
            <div>
              <span className="visual-guide-header__eyebrow">{currentStep.eyebrow}</span>
              <h3>{currentStep.title}</h3>
              <p>{currentStep.summary}</p>
            </div>

            <button type="button" className="visual-guide-close" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          <ChipRow items={currentStep.notes} />

          <div className="visual-guide-stage">{renderStepVisual(currentStep.id)}</div>

          <div className="visual-guide-footer">
            <div className="visual-guide-progress">
              <span>{activeIndex + 1} / {GUIDE_STEPS.length}</span>
              <div className="visual-guide-progress__bar">
                <span style={{ width: `${((activeIndex + 1) / GUIDE_STEPS.length) * 100}%` }} />
              </div>
            </div>

            <div className="visual-guide-actions">
              <button
                type="button"
                className="visual-guide-nav secondary"
                onClick={() => setActiveIndex((prev) => Math.max(prev - 1, 0))}
                disabled={isFirst}
              >
                <ChevronLeft size={16} />
                Voltar
              </button>

              <button
                type="button"
                className="visual-guide-nav primary"
                onClick={() => {
                  if (isLast) {
                    onClose();
                    return;
                  }
                  setActiveIndex((prev) => Math.min(prev + 1, GUIDE_STEPS.length - 1));
                }}
              >
                {isLast ? 'Fechar guia' : 'Próximo passo'}
                {!isLast ? <ChevronRight size={16} /> : null}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default VisualGuideModal;
