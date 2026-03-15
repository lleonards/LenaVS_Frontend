import React, { useMemo, useState } from 'react';
import { Upload, Type, X, Wand2 } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './FilesPanel.css';

const FilesPanel = ({ onLyricsProcessed, onFilesUploaded, onAutoSync }) => {
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(false);
  const [lyricsText, setLyricsText] = useState('');
  const [showLyricsModal, setShowLyricsModal] = useState(false);

  const [uploaded, setUploaded] = useState({
    musicaOriginal: false,
    musicaInstrumental: false,
    video: false,
    letraArquivo: false,
    letraManual: false
  });

  const canShowAutoSync = useMemo(() => {
    const hasAudio = uploaded.musicaOriginal;
    const hasLyrics = uploaded.letraArquivo || uploaded.letraManual;
    return hasAudio && hasLyrics;
  }, [uploaded]);

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
      setLoading(true);
      const response = await api.post('/video/upload', formData);
      const publicUrl = response.data.files[type];
      onFilesUploaded({ [type]: publicUrl });
      setUploaded(prev => ({ ...prev, [type]: true }));
      alert('Arquivo enviado com sucesso!');
    } catch (error) {
      console.error('Erro no upload:', error.response || error);
      alert(error.response?.data?.error || 'Erro ao enviar arquivo');
    } finally {
      setLoading(false);
    }
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
      setLoading(true);
      const response = await api.post('/lyrics/upload', formData);

      const stanzasData = response.data.stanzas.map((text, idx) => ({
        id: idx,
        text,
        startTime: '00:00',
        endTime: '00:00',
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
        leadIn: 0.5
      }));

      onLyricsProcessed(stanzasData);
      setUploaded(prev => ({ ...prev, letraArquivo: true }));
      alert(response.data.message);
    } catch (error) {
      console.error('Erro ao processar letra:', error.response || error);
      alert(error.response?.data?.error || 'Erro ao processar letra');
    } finally {
      setLoading(false);
    }
  };

  const handleManualLyrics = async () => {
    if (!lyricsText.trim()) return;

    if (authLoading || !isAuthenticated) {
      alert('Você precisa estar logado para enviar letras.');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/lyrics/manual', { text: lyricsText });

      const stanzasData = response.data.stanzas.map((text, idx) => ({
        id: idx,
        text,
        startTime: '00:00',
        endTime: '00:00',
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
        leadIn: 0.5
      }));

      onLyricsProcessed(stanzasData);
      setLyricsText('');
      setUploaded(prev => ({ ...prev, letraManual: true }));
      setShowLyricsModal(false);
      alert(response.data.message);
    } catch (error) {
      console.error('Erro ao processar letra manual:', error.response || error);
      alert(error.response?.data?.error || 'Erro ao processar letra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="files-panel">
      <h2>Arquivos</h2>

      <div className="upload-section">

        {/* Música Original */}
        <label className="upload-btn">
          <Upload size={15} />
          <span>Música Original</span>
          {uploaded.musicaOriginal
            ? <span className="upload-check">✓</span>
            : null
          }
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => handleFileUpload(e, 'musicaOriginal')}
            disabled={loading}
          />
        </label>

        {/* Música Instrumental */}
        <label className="upload-btn">
          <Upload size={15} />
          <span>Música Instrumental</span>
          {uploaded.musicaInstrumental
            ? <span className="upload-check">✓</span>
            : null
          }
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => handleFileUpload(e, 'musicaInstrumental')}
            disabled={loading}
          />
        </label>

        {/* Divisor opcional */}
        <div className="upload-divider">opcional</div>

        {/* Vídeo/Foto - opcional */}
        <label className="upload-btn">
          <Upload size={15} />
          <span>Vídeo / Foto</span>
          {uploaded.video
            ? <span className="upload-check">✓</span>
            : <span className="upload-optional">opcional</span>
          }
          <input
            type="file"
            accept="video/*,image/*"
            onChange={(e) => handleFileUpload(e, 'video')}
            disabled={loading}
          />
        </label>

        {/* Divisor letra */}
        <div className="upload-divider">letra</div>

        {/* Letra por arquivo */}
        <label className="upload-btn">
          <Upload size={15} />
          <span>Letra (arquivo)</span>
          {uploaded.letraArquivo
            ? <span className="upload-check">✓</span>
            : null
          }
          <input
            type="file"
            accept=".txt,.docx,.pdf"
            onChange={handleLyricsUpload}
            disabled={loading}
          />
        </label>

        {/* Colar letra (abre modal flutuante) */}
        <button
          className="upload-btn"
          onClick={() => setShowLyricsModal(true)}
          disabled={loading}
        >
          <Type size={15} />
          <span>Colar Letra</span>
          {uploaded.letraManual && <span className="upload-check">✓</span>}
        </button>

      </div>

      {/* Botão de sincronização automática — aparece só depois dos uploads necessários */}
      {canShowAutoSync && (
        <div className="auto-sync-section">
          <button
            className="auto-sync-btn"
            onClick={() => onAutoSync && onAutoSync()}
            disabled={loading}
            title="Gera automaticamente os tempos das estrofes"
          >
            <Wand2 size={16} />
            <span>Gerar automaticamente</span>
          </button>
          <div className="auto-sync-hint">
            Gera os tempos automaticamente (você pode editar depois)
          </div>
        </div>
      )}

      {/* Modal flutuante para colar letra */}
      {showLyricsModal && (
        <div className="lyrics-modal-overlay" onMouseDown={() => !loading && setShowLyricsModal(false)}>
          <div className="lyrics-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="lyrics-modal-header">
              <h3>Colar letra</h3>
              <button
                className="lyrics-modal-close"
                onClick={() => !loading && setShowLyricsModal(false)}
                title="Fechar"
              >
                <X size={16} />
              </button>
            </div>

            <textarea
              value={lyricsText}
              onChange={(e) => setLyricsText(e.target.value)}
              placeholder="Cole a letra aqui...\n\nDica: use linhas em branco para separar estrofes."
              rows={10}
              disabled={loading}
            />

            <div className="lyrics-modal-actions">
              <button
                className="lyrics-modal-primary"
                onClick={handleManualLyrics}
                disabled={loading || !lyricsText.trim()}
              >
                {loading ? 'Processando...' : 'Processar letra'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilesPanel;
