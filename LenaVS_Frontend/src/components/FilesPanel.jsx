import React, { useState } from 'react';
import { Upload, Type, X, Loader2 } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './FilesPanel.css';
import { createStanzaFromText } from '../utils/stanza';

const FILE_LABELS = {
  musicaOriginal: 'Música Original',
  musicaInstrumental: 'Música Instrumental',
  video: 'Vídeo / Foto (fundo)',
  letraArquivo: 'Letra (arquivo)',
};

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

const FilesPanel = ({ onLyricsProcessed, onFilesUploaded, stanzaCount = 0 }) => {
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [uploadingType, setUploadingType] = useState(null);
  const [lyricsText, setLyricsText] = useState('');
  const [showLyricsModal, setShowLyricsModal] = useState(false);

  const [uploaded, setUploaded] = useState({
    musicaOriginal: false,
    musicaInstrumental: false,
    video: false,
    letraArquivo: false,
    letraManual: false,
  });

  const isUploading = uploadingType !== null;
  const anyBusy = isUploading;

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

  return (
    <div className="files-panel">
      <div className="files-panel-header">
        <h2>Arquivos</h2>
        <div className="files-panel-counter">
          Blocos no editor: <strong>{stanzaCount}</strong>
        </div>
      </div>

      {isUploading && (
        <div className="upload-progress-bar">
          <div className="upload-progress-fill" />
          <span>Enviando {FILE_LABELS[uploadingType] || 'arquivo'}…</span>
        </div>
      )}

      <div className={`upload-queue-notice${isUploading ? ' active' : ''}`}>
        <strong>{isUploading ? 'Upload em andamento:' : 'Aviso rápido:'}</strong>{' '}
        {isUploading
          ? `enquanto ${FILE_LABELS[uploadingType] || 'o arquivo atual'} estiver sendo enviado, os outros campos ficam bloqueados temporariamente. Faça 1 upload por vez.`
          : `o sistema processa 1 upload por vez. Música original e instrumental aceitam até ${MAX_AUDIO_MINUTES} minutos cada.`}
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
              placeholder={"Cole a letra aqui...\n\nDica: use linhas em branco para separar estrofes."}
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
