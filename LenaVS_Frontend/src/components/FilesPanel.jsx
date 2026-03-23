import React, { useMemo, useState } from 'react';
import { Upload, Type, X, Wand2, Lock, Loader2 } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { normalizeTimeFields } from '../utils/time';
import './FilesPanel.css';

const readLocalAudioDuration = (file) =>
  new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.src = objectUrl;

    const cleanup = (value) => {
      URL.revokeObjectURL(objectUrl);
      resolve(value);
    };

    audio.onloadedmetadata = () => {
      const duration = audio.duration;
      cleanup(Number.isFinite(duration) && duration > 0 ? duration : null);
    };

    audio.onerror = () => cleanup(null);
    setTimeout(() => cleanup(null), 8000);
  });

const FILE_LABELS = {
  musicaOriginal: 'Música Original',
  musicaInstrumental: 'Música Instrumental',
  video: 'Vídeo / Foto',
  letraArquivo: 'Letra (arquivo)',
};

const buildLyricsStanzas = (items = []) =>
  items.map((text, index) =>
    normalizeTimeFields({
      id: index,
      text,
      startTime: '',
      endTime: '',
      startSeconds: null,
      endSeconds: null,
      fontSize: 32,
      fontFamily: 'Montserrat',
      color: '#FFFFFF',
      outlineColor: '#000000',
      bold: false,
      italic: false,
      underline: false,
      transition: 'fade',
      transitionDuration: 1,
      alignment: 'center',
      leadIn: 0.5,
      lines: [],
    })
  );

const FilesPanel = ({
  onLyricsProcessed,
  onFilesUploaded,
  onAutoSync,
  onAudioDurationRead,
  isSyncing
}) => {
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
  const anyBusy = isUploading || isSyncing;

  const canSync = useMemo(() => {
    return uploaded.musicaOriginal && (uploaded.letraArquivo || uploaded.letraManual);
  }, [uploaded]);

  const lockMessage = useMemo(() => {
    const missing = [];
    if (!uploaded.musicaOriginal) missing.push('Música Original');
    if (!uploaded.letraArquivo && !uploaded.letraManual) missing.push('Letra');
    return missing.length ? `Faltam: ${missing.join(', ')}` : '';
  }, [uploaded]);

  const handleFileUpload = async (event, type) => {
    const file = event.target.files[0];
    if (!file) return;

    if (authLoading || !isAuthenticated) {
      alert('Você precisa estar logado para enviar arquivos.');
      return;
    }

    if (type === 'musicaOriginal') {
      const duration = await readLocalAudioDuration(file);
      if (duration && onAudioDurationRead) onAudioDurationRead(duration);
    }

    const formData = new FormData();
    formData.append(type, file);

    try {
      setUploadingType(type);
      const response = await api.post('/video/upload', formData);
      const publicUrl = response.data.files[type];
      onFilesUploaded({ [type]: publicUrl });
      setUploaded((prev) => ({ ...prev, [type]: true }));
    } catch (error) {
      console.error('Erro no upload:', error.response || error);
      alert(error.response?.data?.error || 'Erro ao enviar arquivo');
    } finally {
      setUploadingType(null);
      event.target.value = '';
    }
  };

  const handleLyricsUpload = async (event) => {
    const file = event.target.files[0];
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
      onLyricsProcessed(buildLyricsStanzas(response.data.stanzas || []));
      setUploaded((prev) => ({ ...prev, letraArquivo: true }));
      alert('Letra processada com sucesso.');
    } catch (error) {
      console.error('Erro ao processar letra:', error.response || error);
      alert(error.response?.data?.error || 'Erro ao processar letra');
    } finally {
      setUploadingType(null);
      event.target.value = '';
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
      onLyricsProcessed(buildLyricsStanzas(response.data.stanzas || []));
      setLyricsText('');
      setUploaded((prev) => ({ ...prev, letraManual: true }));
      setShowLyricsModal(false);
      alert('Letra processada com sucesso.');
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
    if (uploaded[type]) return <span className="upload-check">✓</span>;
    if (type === 'video' || type === 'musicaInstrumental') {
      return <span className="upload-optional">opcional</span>;
    }
    return <span className="upload-required">obrigatório</span>;
  };

  const buttonDisabled = anyBusy || !canSync;

  return (
    <div className="files-panel">
      <h2>Arquivos</h2>

      {isUploading && (
        <div className="upload-progress-bar">
          <div className="upload-progress-fill" />
          <span>Enviando {FILE_LABELS[uploadingType] || 'arquivo'}…</span>
        </div>
      )}

      <div className="upload-section">
        <label className={`upload-btn${uploaded.musicaOriginal ? ' uploaded' : ''}${uploadingType === 'musicaOriginal' ? ' uploading' : ''}`}>
          <Upload size={15} />
          <span>Música Original</span>
          {renderBadge('musicaOriginal')}
          <input
            type="file"
            accept="audio/*"
            onChange={(event) => handleFileUpload(event, 'musicaOriginal')}
            disabled={anyBusy}
          />
        </label>

        <label className={`upload-btn${uploaded.musicaInstrumental ? ' uploaded' : ''}${uploadingType === 'musicaInstrumental' ? ' uploading' : ''}`}>
          <Upload size={15} />
          <span>Música Instrumental</span>
          {renderBadge('musicaInstrumental')}
          <input
            type="file"
            accept="audio/*"
            onChange={(event) => handleFileUpload(event, 'musicaInstrumental')}
            disabled={anyBusy}
          />
        </label>

        <div className="upload-divider">opcional (vídeo/foto)</div>

        <label className={`upload-btn${uploaded.video ? ' uploaded' : ''}${uploadingType === 'video' ? ' uploading' : ''}`}>
          <Upload size={15} />
          <span>Vídeo / Foto</span>
          {renderBadge('video')}
          <input
            type="file"
            accept="video/*,image/*"
            onChange={(event) => handleFileUpload(event, 'video')}
            disabled={anyBusy}
          />
        </label>

        <div className="upload-divider">letra</div>

        <label className={`upload-btn${uploaded.letraArquivo ? ' uploaded' : ''}${uploadingType === 'letraArquivo' ? ' uploading' : ''}`}>
          <Upload size={15} />
          <span>Letra (arquivo)</span>
          {renderBadge('letraArquivo')}
          <input
            type="file"
            accept=".txt,.docx,.pdf,.doc"
            onChange={handleLyricsUpload}
            disabled={anyBusy}
          />
        </label>

        <button
          className={`upload-btn${uploaded.letraManual ? ' uploaded' : ''}${uploadingType === 'letraManual' ? ' uploading' : ''}`}
          onClick={() => setShowLyricsModal(true)}
          disabled={anyBusy}
        >
          <Type size={15} />
          <span>Colar Letra</span>
          {renderBadge('letraManual')}
        </button>
      </div>

      <div className="auto-sync-section">
        <div className="auto-sync-wrapper" title={!canSync ? lockMessage : ''}>
          <button
            className={`auto-sync-btn${canSync ? ' unlocked' : ' locked'}${isSyncing ? ' syncing' : ''}`}
            onClick={() => canSync && !isSyncing && onAutoSync && onAutoSync()}
            disabled={buttonDisabled}
            aria-disabled={buttonDisabled}
          >
            {isSyncing ? (
              <><Loader2 size={16} className="spin-icon" /><span>Sincronizando...</span></>
            ) : canSync ? (
              <><Wand2 size={16} /><span>Sincronizar automaticamente</span></>
            ) : (
              <><Lock size={15} /><span>Sincronizar automaticamente</span></>
            )}
          </button>
        </div>

        <div className="auto-sync-hint">
          {isSyncing
            ? 'Isolando a voz da música original e validando o tempo de cada estrofe...'
            : canSync
            ? 'Usa a música original com vocal, cria uma guia vocal automática, valida repetições e só mostra letra quando houver voz.'
            : lockMessage}
        </div>
      </div>

      {showLyricsModal && (
        <div className="lyrics-modal-overlay" onMouseDown={() => !anyBusy && setShowLyricsModal(false)}>
          <div className="lyrics-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="lyrics-modal-header">
              <h3>Colar letra</h3>
              <button
                className="lyrics-modal-close"
                onClick={() => !anyBusy && setShowLyricsModal(false)}
                title="Fechar"
              >
                <X size={16} />
              </button>
            </div>

            <textarea
              value={lyricsText}
              onChange={(event) => setLyricsText(event.target.value)}
              placeholder={'Cole a letra aqui...\n\nDica: use linhas em branco para separar estrofes.'}
              rows={10}
              disabled={anyBusy}
            />

            <div className="lyrics-modal-actions">
              <button
                className="lyrics-modal-primary"
                onClick={handleManualLyrics}
                disabled={anyBusy || !lyricsText.trim()}
              >
                {uploadingType === 'letraManual'
                  ? <><Loader2 size={14} className="spin-icon" /> Processando...</>
                  : 'Processar letra'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilesPanel;
