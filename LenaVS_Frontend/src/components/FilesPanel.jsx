import React, { useState } from 'react';
import { Upload, Type, X, Loader2 } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './FilesPanel.css';
import { createStanzaFromText } from '../utils/stanza';

const FILE_LABELS = {
  musicaOriginal: 'Música Original',
  musicaInstrumental: 'Música Instrumental',
  video: 'Vídeo / Foto',
  letraArquivo: 'Letra (arquivo)',
};

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

  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (authLoading || !isAuthenticated) {
      alert('Você precisa estar logado para enviar arquivos.');
      return;
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

      <div className="upload-section">
        <label className={`upload-btn${uploaded.musicaOriginal ? ' uploaded' : ''}${uploadingType === 'musicaOriginal' ? ' uploading' : ''}`}>
          <Upload size={15} />
          <span>Música Original</span>
          {renderBadge('musicaOriginal')}
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => handleFileUpload(e, 'musicaOriginal')}
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
            onChange={(e) => handleFileUpload(e, 'musicaInstrumental')}
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
            onChange={(e) => handleFileUpload(e, 'video')}
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
            accept=".txt,.docx,.pdf"
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

      {showLyricsModal && (
        <div className="lyrics-modal-overlay" onMouseDown={() => !anyBusy && setShowLyricsModal(false)}>
          <div className="lyrics-modal" onMouseDown={(e) => e.stopPropagation()}>
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
              onChange={(e) => setLyricsText(e.target.value)}
              placeholder={"Cole a letra aqui...\n\nDica: use linhas em branco para separar estrofes."}
              rows={10}
              disabled={anyBusy}
            />

            <div className="lyrics-modal-actions">
              <button
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
