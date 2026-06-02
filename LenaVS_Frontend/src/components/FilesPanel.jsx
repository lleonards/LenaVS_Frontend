import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Upload, Type, X, Loader2, Sparkles } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './FilesPanel.css';
import { createStanzaFromText } from '../utils/stanza';
import {
  DEFAULT_MEDIA_ANIMATION,
  MEDIA_ANIMATION_DURATION_MAX,
  MEDIA_ANIMATION_DURATION_MIN,
  normalizeMediaAnimation,
  clampMediaAnimationDuration,
} from '../utils/mediaAnimation';

const FILE_LABELS = {
  musicaOriginal: 'Música Original',
  musicaInstrumental: 'Música Instrumental',
  video: 'Vídeo / Foto (fundo)',
  letraArquivo: 'Letra (arquivo)',
};

const MEDIA_TRANSITION_OPTIONS = [
  { value: 'fade', label: 'Fade' },
  { value: 'slide', label: 'Slide' },
  { value: 'zoom-in', label: 'Zoom In' },
  { value: 'zoom-out', label: 'Zoom Out' },
];

const MAX_AUDIO_MINUTES = 15;
const MAX_AUDIO_SECONDS = MAX_AUDIO_MINUTES * 60;

const readAudioDuration = (file) => new Promise((resolve, reject) => {
  const audio = document.createElement('audio');
  const objectUrl = URL.createObjectURL(file);

  const cleanup = () => {
    URL.revokeObjectURL(objectUrl);
    audio.removeAttribute('src');
    audio.load();
  };

  audio.preload = 'metadata';
  audio.src = objectUrl;

  audio.onloadedmetadata = () => {
    const duration = Number(audio.duration);
    cleanup();
    resolve(Number.isFinite(duration) ? duration : 0);
  };

  audio.onerror = () => {
    cleanup();
    reject(new Error('Não foi possível validar a duração do áudio.'));
  };
});

const sanitizeDurationDraft = (value) => {
  const normalized = String(value ?? '').replace(',', '.').replace(/[^\d.]/g, '');
  const [integerPart = '', ...fractionParts] = normalized.split('.');
  const fraction = fractionParts.join('');

  return fractionParts.length > 0
    ? `${integerPart.slice(0, 2)}.${fraction.slice(0, 2)}`
    : integerPart.slice(0, 2);
};

const FilesPanel = ({
  onLyricsProcessed,
  onFilesUploaded,
  onMediaAnimationChange,
  stanzaCount = 0,
  syncStatus = null,
  mediaFiles = {},
  mediaAnimation = DEFAULT_MEDIA_ANIMATION,
}) => {
  const { isAuthenticated, loading: authLoading } = useAuth();

  const panelRef = useRef(null);
  const [uploadingType, setUploadingType] = useState(null);
  const [lyricsText, setLyricsText] = useState('');
  const [showLyricsModal, setShowLyricsModal] = useState(false);
  const [showAnimationsPanel, setShowAnimationsPanel] = useState(false);
  const [durationDrafts, setDurationDrafts] = useState({});

  const normalizedMediaAnimation = useMemo(
    () => normalizeMediaAnimation(mediaAnimation),
    [mediaAnimation]
  );

  const [uploaded, setUploaded] = useState({
    musicaOriginal: false,
    musicaInstrumental: false,
    video: false,
    letraArquivo: false,
    letraManual: false,
  });

  const isUploading = uploadingType !== null;
  const anyBusy = isUploading;
  const hasBackgroundMedia = Boolean(mediaFiles?.video || mediaFiles?.imagem);

  useEffect(() => {
    setDurationDrafts({
      introDuration: String(normalizedMediaAnimation.introDuration),
      outroDuration: String(normalizedMediaAnimation.outroDuration),
      loopTransitionDuration: String(normalizedMediaAnimation.loopTransitionDuration),
    });
  }, [normalizedMediaAnimation]);

  useEffect(() => {
    if (!showAnimationsPanel) return undefined;

    const handlePointerDown = (event) => {
      if (!panelRef.current?.contains(event.target)) {
        setShowAnimationsPanel(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [showAnimationsPanel]);

  const validateAudioLengthIfNeeded = async (file, type) => {
    if (!file || !['musicaOriginal', 'musicaInstrumental'].includes(type)) {
      return;
    }

    const durationInSeconds = await readAudioDuration(file);

    if (durationInSeconds > MAX_AUDIO_SECONDS) {
      throw new Error(`O áudio excede ${MAX_AUDIO_MINUTES} minutos. Envie um arquivo com até ${MAX_AUDIO_MINUTES} minutos.`);
    }
  };

  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (authLoading || !isAuthenticated) {
      alert('Você precisa estar logado para enviar arquivos.');
      return;
    }

    const formData = new FormData();
    const isBackgroundImage = type === 'video' && file.type.startsWith('image/');
    const backendField = isBackgroundImage ? 'imagem' : type;

    try {
      await validateAudioLengthIfNeeded(file, type);
      formData.append(backendField, file);
      setUploadingType(type);

      const response = await api.post('/video/upload', formData);
      const publicUrl = response.data.files[backendField];

      if (type === 'video') {
        onFilesUploaded({
          video: isBackgroundImage ? null : publicUrl,
          imagem: isBackgroundImage ? publicUrl : null,
        });
      } else {
        onFilesUploaded({ [type]: publicUrl });
      }

      setUploaded((prev) => ({ ...prev, [type]: true }));
      if (type === 'video') {
        setShowAnimationsPanel(true);
      }
    } catch (error) {
      console.error('Erro no upload:', error.response || error);
      alert(error.response?.data?.error || error.message || 'Erro ao enviar arquivo');
    } finally {
      setUploadingType(null);
      e.target.value = '';
    }
  };

  const mapTextsToStanzas = (stanzaTexts = []) => {
    return stanzaTexts.map((text) => createStanzaFromText(text));
  };

  const handleLyricsUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (authLoading || !isAuthenticated) {
      alert('Você precisa estar logado para enviar letras.');
      return;
    }

    const formData = new FormData();
    formData.append('letra', file);

    try {
      setUploadingType('letraArquivo');
      const response = await api.post('/lyrics/upload', formData);
      const stanzasData = mapTextsToStanzas(response.data.stanzas);

      onLyricsProcessed(stanzasData);
      setUploaded((prev) => ({ ...prev, letraArquivo: true }));
      alert(response.data.message);
    } catch (error) {
      console.error('Erro ao processar letra:', error.response || error);
      alert(error.response?.data?.error || 'Erro ao processar letra');
    } finally {
      setUploadingType(null);
      e.target.value = '';
    }
  };

  const handleManualLyrics = async () => {
    if (!lyricsText.trim()) return;

    if (authLoading || !isAuthenticated) {
      alert('Você precisa estar logado para enviar letras.');
      return;
    }

    try {
      setUploadingType('letraManual');
      const response = await api.post('/lyrics/manual', { text: lyricsText });
      const stanzasData = mapTextsToStanzas(response.data.stanzas);

      onLyricsProcessed(stanzasData);
      setLyricsText('');
      setUploaded((prev) => ({ ...prev, letraManual: true }));
      setShowLyricsModal(false);
      alert(response.data.message);
    } catch (error) {
      console.error('Erro ao processar letra manual:', error.response || error);
      alert(error.response?.data?.error || 'Erro ao processar letra');
    } finally {
      setUploadingType(null);
    }
  };

  const applyMediaAnimationPatch = (patch) => {
    const nextValue = normalizeMediaAnimation({
      ...normalizedMediaAnimation,
      ...patch,
    });

    onMediaAnimationChange?.(nextValue);
  };

  const handleDurationDraftChange = (field, value) => {
    setDurationDrafts((prev) => ({
      ...prev,
      [field]: sanitizeDurationDraft(value),
    }));
  };

  const commitDurationDraft = (field, fallbackValue) => {
    const rawValue = durationDrafts[field] ?? String(fallbackValue ?? '');
    const nextValue = clampMediaAnimationDuration(rawValue, fallbackValue);

    setDurationDrafts((prev) => ({
      ...prev,
      [field]: String(nextValue),
    }));
    applyMediaAnimationPatch({ [field]: nextValue });
  };

  const renderBadge = (type) => {
    const isThisUploading = uploadingType === type;

    if (isThisUploading) {
      return (
        <span className="upload-loading-badge">
          <Loader2 size={12} className="spin-icon" /> Enviando...
        </span>
      );
    }

    if (uploaded[type]) {
      return <span className="upload-check">✓</span>;
    }

    if (type === 'video') {
      return <span className="upload-optional">opcional</span>;
    }

    return <span className="upload-required">obrigatório</span>;
  };

  const getUploadButtonClassName = (type, isManualAction = false) => {
    const isBusyByOtherUpload = isUploading && uploadingType !== type;

    return `upload-btn${uploaded[type] ? ' uploaded' : ''}${uploadingType === type ? ' uploading' : ''}${isBusyByOtherUpload ? ' upload-disabled' : ''}${isManualAction ? ' upload-manual' : ''}`;
  };

  const getUploadBlockedTitle = (type) => (
    isUploading && uploadingType !== type
      ? 'Aguarde o upload atual terminar. O sistema envia um arquivo por vez.'
      : undefined
  );

  const currentUploadLabel = FILE_LABELS[uploadingType] || 'arquivo';

  const renderAnimationControl = (title, transitionField, durationField, options = {}) => {
    const safeDuration = normalizedMediaAnimation[durationField];
    const draftValue = durationDrafts[durationField] ?? String(safeDuration);

    return (
      <div className="files-animation-card">
        <div className="files-animation-card__head">
          <span className="files-animation-card__title">{title}</span>
          <span className="files-animation-card__badge">{safeDuration.toFixed(1)}s</span>
        </div>

        <div className="files-animation-grid">
          <div className="files-animation-field">
            <span className="files-animation-label">Efeito</span>
            <select
              className="files-animation-select"
              value={normalizedMediaAnimation[transitionField]}
              onChange={(event) => applyMediaAnimationPatch({ [transitionField]: event.target.value })}
            >
              {MEDIA_TRANSITION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="files-animation-field files-animation-field--duration">
            <span className="files-animation-label">Duração</span>
            <div className="files-animation-duration-wrap">
              <input
                className="files-animation-input"
                type="text"
                inputMode="decimal"
                enterKeyHint="done"
                value={draftValue}
                onChange={(event) => handleDurationDraftChange(durationField, event.target.value)}
                onBlur={() => commitDurationDraft(durationField, safeDuration)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    commitDurationDraft(durationField, safeDuration);
                  }
                }}
                aria-label={`Duração de ${title.toLowerCase()}`}
              />
              <span className="files-animation-unit">s</span>
            </div>
          </div>
        </div>

        <div className="files-animation-slider-row">
          <span className="files-animation-slider-edge">rápido</span>
          <input
            className="files-animation-slider"
            type="range"
            min={MEDIA_ANIMATION_DURATION_MIN}
            max={MEDIA_ANIMATION_DURATION_MAX}
            step="0.1"
            value={safeDuration}
            onChange={(event) => {
              const nextValue = clampMediaAnimationDuration(event.target.value, safeDuration);
              setDurationDrafts((prev) => ({
                ...prev,
                [durationField]: String(nextValue),
              }));
              applyMediaAnimationPatch({ [durationField]: nextValue });
            }}
          />
          <span className="files-animation-slider-edge">suave</span>
        </div>

        {options.helper ? <p className="files-animation-helper">{options.helper}</p> : null}
      </div>
    );
  };

  return (
    <div className="files-panel" ref={panelRef}>
      <div className="files-panel-header">
        <h2>Arquivos</h2>
        <div className="files-panel-counter">
          Blocos no editor: <strong>{stanzaCount}</strong>
        </div>
      </div>

      <div className="upload-feedback-stack" aria-live="polite" aria-atomic="true">
        {isUploading ? (
          <div className="upload-progress-bar" role="status">
            <div className="upload-progress-fill" />
            <span>Enviando {currentUploadLabel}…</span>
          </div>
        ) : null}

        <div className={`upload-queue-notice${isUploading ? ' active' : ''}`}>
          <strong>{isUploading ? 'Upload em andamento:' : 'Aviso rápido:'}</strong>{' '}
          {isUploading
            ? `enquanto ${currentUploadLabel} estiver sendo enviado, os outros campos ficam bloqueados temporariamente. Faça 1 upload por vez.`
            : `o sistema processa 1 upload por vez. Música original e instrumental aceitam até ${MAX_AUDIO_MINUTES} minutos cada.`}
        </div>
      </div>

      <div className="upload-section">
        <label className={getUploadButtonClassName('musicaOriginal')} title={getUploadBlockedTitle('musicaOriginal')}>
          <Upload size={15} />
          <div className="upload-btn-copy">
            <span>Música Original</span>
            <small>Áudio com até 15 min</small>
          </div>
          {renderBadge('musicaOriginal')}
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => handleFileUpload(e, 'musicaOriginal')}
            disabled={anyBusy}
          />
        </label>

        <label className={getUploadButtonClassName('musicaInstrumental')} title={getUploadBlockedTitle('musicaInstrumental')}>
          <Upload size={15} />
          <div className="upload-btn-copy">
            <span>Música Instrumental</span>
            <small>Áudio com até 15 min</small>
          </div>
          {renderBadge('musicaInstrumental')}
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => handleFileUpload(e, 'musicaInstrumental')}
            disabled={anyBusy}
          />
        </label>

        <div className="upload-divider">opcional (vídeo/foto de fundo)</div>

        <label className={getUploadButtonClassName('video')} title={getUploadBlockedTitle('video')}>
          <Upload size={15} />
          <div className="upload-btn-copy">
            <span>Vídeo / Foto (fundo)</span>
            <small>Opcional</small>
          </div>
          {renderBadge('video')}
          <input
            type="file"
            accept="video/*,image/*"
            onChange={(e) => handleFileUpload(e, 'video')}
            disabled={anyBusy}
          />
        </label>

        <div className="upload-divider">letra</div>

        <label className={getUploadButtonClassName('letraArquivo')} title={getUploadBlockedTitle('letraArquivo')}>
          <Upload size={15} />
          <span>Letra (arquivo)</span>
          {renderBadge('letraArquivo')}
          <input
            type="file"
            accept=".txt,.docx,.pdf"
            onChange={handleLyricsUpload}
            disabled={anyBusy}
          />
        </label>

        <button
          type="button"
          className={getUploadButtonClassName('letraManual', true)}
          onClick={() => setShowLyricsModal(true)}
          disabled={anyBusy}
          title={getUploadBlockedTitle('letraManual')}
        >
          <Type size={15} />
          <span>Colar Letra</span>
          {renderBadge('letraManual')}
        </button>
      </div>

      <div className="files-animation-wrapper">
        <button
          type="button"
          className={`files-animation-trigger${showAnimationsPanel ? ' open' : ''}`}
          onClick={() => setShowAnimationsPanel((prev) => !prev)}
        >
          <Sparkles size={15} />
          <span>Animações</span>
        </button>

        {showAnimationsPanel ? (
          <div className="files-animation-popover">
            <div className="files-animation-popover__header">
              <div>
                <strong>Animações de mídia</strong>
                <p>
                  Ajuste introdução, saída e a transição usada quando o vídeo precisar repetir.
                </p>
              </div>

              <button
                type="button"
                className="files-animation-close"
                onClick={() => setShowAnimationsPanel(false)}
                title="Fechar painel de animações"
              >
                <X size={15} />
              </button>
            </div>

            {!hasBackgroundMedia ? (
              <div className="files-animation-empty">
                Faça upload de uma foto ou vídeo de fundo para visualizar as animações no preview e na exportação final.
              </div>
            ) : (
              <div className="files-animation-popover__body">
                {renderAnimationControl('Introdução', 'introTransition', 'introDuration')}
                {renderAnimationControl('Final', 'outroTransition', 'outroDuration')}
                {renderAnimationControl('Loop do vídeo', 'loopTransition', 'loopTransitionDuration', {
                  helper: mediaFiles?.video
                    ? 'Esse ajuste só entra em ação quando o vídeo for menor que o áudio e precisar repetir.'
                    : 'Para foto, o loop não é usado. Ele fica salvo para quando você trocar por um vídeo.',
                })}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {syncStatus ? (
        <div className={`sync-status sync-status--${syncStatus.type} files-panel-status`}>
          {syncStatus.message}
        </div>
      ) : null}

      {showLyricsModal && (
        <div className="lyrics-modal-overlay" onMouseDown={() => !anyBusy && setShowLyricsModal(false)}>
          <div className="lyrics-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="lyrics-modal-header">
              <h3>Colar letra</h3>
              <button
                type="button"
                className="lyrics-modal-close"
                onClick={() => !anyBusy && setShowLyricsModal(false)}
                title="Fechar"
              >
                <X size={16} />
              </button>
            </div>

            <textarea
              value={lyricsText}
              onChange={(e) => setLyricsText(e.target.value)}
              placeholder={'Cole a letra aqui...\n\nDica: use linhas em branco para separar estrofes.'}
              rows={10}
              disabled={anyBusy}
            />

            <div className="lyrics-modal-actions">
              <button
                type="button"
                className="lyrics-modal-primary"
                onClick={handleManualLyrics}
                disabled={anyBusy || !lyricsText.trim()}
              >
                {uploadingType === 'letraManual' ? (
                  <>
                    <Loader2 size={14} className="spin-icon" /> Processando...
                  </>
                ) : (
                  'Processar letra'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilesPanel;
