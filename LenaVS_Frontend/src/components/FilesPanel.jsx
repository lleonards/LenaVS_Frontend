import React, { useMemo, useState } from 'react';
import { Upload, Type, X, Wand2, Lock, Loader2 } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './FilesPanel.css';

/* ─────────────────────────────────────────────────
   Lê a duração de um File de áudio localmente
   (sem depender da URL do servidor)
───────────────────────────────────────────────── */
const readLocalAudioDuration = (file) =>
  new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.src = objectUrl;

    const cleanup = (val) => {
      URL.revokeObjectURL(objectUrl);
      resolve(val);
    };

    audio.onloadedmetadata = () => {
      const d = audio.duration;
      cleanup(Number.isFinite(d) && d > 0 ? d : null);
    };
    audio.onerror = () => cleanup(null);

    // Timeout de segurança: 8s
    setTimeout(() => cleanup(null), 8000);
  });

const FilesPanel = ({
  onLyricsProcessed,
  onFilesUploaded,
  onAutoSync,
  onAudioDurationRead,   // ← informa duração local ao pai
  isSyncing              // ← recebe estado de sincronia do pai
}) => {
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

  // Controla se o botão está desbloqueado
  // Requer: Música Original + Música Instrumental + Letra
  const canSync = useMemo(() => {
    const hasOriginal = uploaded.musicaOriginal;
    const hasInstrumental = uploaded.musicaInstrumental;
    const hasLyrics = uploaded.letraArquivo || uploaded.letraManual;
    return hasOriginal && hasInstrumental && hasLyrics;
  }, [uploaded]);

  // Mensagem de bloqueio para tooltip
  const lockMessage = useMemo(() => {
    const hasOriginal = uploaded.musicaOriginal;
    const hasInstrumental = uploaded.musicaInstrumental;
    const hasLyrics = uploaded.letraArquivo || uploaded.letraManual;
    const missing = [];
    if (!hasOriginal) missing.push('Música Original');
    if (!hasInstrumental) missing.push('Música Instrumental');
    if (!hasLyrics) missing.push('Letra');
    if (missing.length === 0) return '';
    return `Faltam: ${missing.join(', ')}`;
  }, [uploaded]);

  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (authLoading || !isAuthenticated) {
      alert('Você precisa estar logado para enviar arquivos.');
      return;
    }

    // Lê duração localmente ANTES do upload (só para áudio original)
    if (type === 'musicaOriginal') {
      const dur = await readLocalAudioDuration(file);
      if (dur && onAudioDurationRead) {
        onAudioDurationRead(dur);
      }
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

  // Botão desativado se upload em andamento OU sincronia em andamento
  const btnDisabled = loading || isSyncing || !canSync;

  return (
    <div className="files-panel">
      <h2>Arquivos</h2>

      <div className="upload-section">

        {/* Música Original */}
        <label className={`upload-btn${uploaded.musicaOriginal ? ' uploaded' : ''}`}>
          <Upload size={15} />
          <span>Música Original</span>
          {uploaded.musicaOriginal
            ? <span className="upload-check">✓</span>
            : <span className="upload-required">obrigatório</span>
          }
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => handleFileUpload(e, 'musicaOriginal')}
            disabled={loading}
          />
        </label>

        {/* Música Instrumental — obrigatório */}
        <label className={`upload-btn${uploaded.musicaInstrumental ? ' uploaded' : ''}`}>
          <Upload size={15} />
          <span>Música Instrumental</span>
          {uploaded.musicaInstrumental
            ? <span className="upload-check">✓</span>
            : <span className="upload-required">obrigatório</span>
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
        <label className={`upload-btn${uploaded.video ? ' uploaded' : ''}`}>
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
        <label className={`upload-btn${uploaded.letraArquivo ? ' uploaded' : ''}`}>
          <Upload size={15} />
          <span>Letra (arquivo)</span>
          {uploaded.letraArquivo
            ? <span className="upload-check">✓</span>
            : <span className="upload-required">obrigatório</span>
          }
          <input
            type="file"
            accept=".txt,.docx,.pdf"
            onChange={handleLyricsUpload}
            disabled={loading}
          />
        </label>

        {/* Colar letra */}
        <button
          className={`upload-btn${uploaded.letraManual ? ' uploaded' : ''}`}
          onClick={() => setShowLyricsModal(true)}
          disabled={loading}
        >
          <Type size={15} />
          <span>Colar Letra</span>
          {uploaded.letraManual
            ? <span className="upload-check">✓</span>
            : <span className="upload-required">obrigatório</span>
          }
        </button>

      </div>

      {/* ═══════════════════════════════════════════════
          Botão de sincronização automática
          Sempre visível — desbloqueado só após uploads
      ═══════════════════════════════════════════════ */}
      <div className="auto-sync-section">
        <div
          className="auto-sync-wrapper"
          title={!canSync ? lockMessage : ''}
        >
          <button
            className={`auto-sync-btn${canSync ? ' unlocked' : ' locked'}${isSyncing ? ' syncing' : ''}`}
            onClick={() => canSync && !isSyncing && onAutoSync && onAutoSync()}
            disabled={btnDisabled}
            aria-disabled={btnDisabled}
          >
            {isSyncing ? (
              <>
                <Loader2 size={16} className="spin-icon" />
                <span>Gerando...</span>
              </>
            ) : canSync ? (
              <>
                <Wand2 size={16} />
                <span>Sincronizar automaticamente</span>
              </>
            ) : (
              <>
                <Lock size={15} />
                <span>Sincronizar automaticamente</span>
              </>
            )}
          </button>
        </div>
        <div className="auto-sync-hint">
          {isSyncing
            ? 'Analisando o áudio, aguarde...'
            : canSync
            ? 'Sincroniza os tempos usando IA (Whisper OpenAI)'
            : lockMessage
          }
        </div>
      </div>

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
              placeholder={"Cole a letra aqui...\n\nDica: use linhas em branco para separar estrofes."}
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
