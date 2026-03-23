import React, { useMemo, useState } from 'react';
import { Upload, Type, X, Wand2, Lock, Loader2 } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './FilesPanel.css';

/* ─────────────────────────────────────────────────
   Lê a duração de um File de áudio localmente
───────────────────────────────────────────────── */
const readLocalAudioDuration = (file) =>
  new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.src = objectUrl;
    const cleanup = (val) => { URL.revokeObjectURL(objectUrl); resolve(val); };
    audio.onloadedmetadata = () => {
      const d = audio.duration;
      cleanup(Number.isFinite(d) && d > 0 ? d : null);
    };
    audio.onerror = () => cleanup(null);
    setTimeout(() => cleanup(null), 8000);
  });

// ─────────────────────────────────────────────────
// Nomes de exibição de cada tipo de arquivo
// ─────────────────────────────────────────────────
const FILE_LABELS = {
  musicaOriginal:     'Música Original',
  musicaInstrumental: 'Música Instrumental',
  video:              'Vídeo / Foto',
  letraArquivo:       'Letra (arquivo)',
};

const FilesPanel = ({
  onLyricsProcessed,
  onFilesUploaded,
  onAutoSync,
  onAudioDurationRead,
  isSyncing
}) => {
  const { isAuthenticated, loading: authLoading } = useAuth();

  // uploadingType: qual arquivo está sendo enviado agora (ou null)
  const [uploadingType, setUploadingType] = useState(null);
  const [lyricsText, setLyricsText] = useState('');
  const [showLyricsModal, setShowLyricsModal] = useState(false);

  const [uploaded, setUploaded] = useState({
    musicaOriginal:     false,
    musicaInstrumental: false,
    video:              false,
    letraArquivo:       false,
    letraManual:        false,
  });

  const isUploading = uploadingType !== null;

  // ─── Instrumental agora é OBRIGATÓRIO (pedido do usuário) ───────
  // Para habilitar a sincronização: Música Original + Música Instrumental + Letra
  const canSync = useMemo(() => {
    return (
      uploaded.musicaOriginal &&
      uploaded.musicaInstrumental &&
      (uploaded.letraArquivo || uploaded.letraManual)
    );
  }, [uploaded]);

  const lockMessage = useMemo(() => {
    const missing = [];
    if (!uploaded.musicaOriginal)                          missing.push('Música Original');
    if (!uploaded.musicaInstrumental)                      missing.push('Música Instrumental');
    if (!uploaded.letraArquivo && !uploaded.letraManual)   missing.push('Letra');
    return missing.length ? `Faltam: ${missing.join(', ')}` : '';
  }, [uploaded]);

  // ── Botões desabilitados durante qualquer upload ou sync ──────────
  const anyBusy = isUploading || isSyncing;

  // ── Upload genérico de arquivo de mídia ───────────────────────────
  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (authLoading || !isAuthenticated) {
      alert('Você precisa estar logado para enviar arquivos.');
      return;
    }

    if (type === 'musicaOriginal') {
      const dur = await readLocalAudioDuration(file);
      if (dur && onAudioDurationRead) onAudioDurationRead(dur);
    }

    const formData = new FormData();
    formData.append(type, file);

    try {
      setUploadingType(type);
      const response = await api.post('/video/upload', formData);
      const publicUrl = response.data.files[type];
      onFilesUploaded({ [type]: publicUrl });
      setUploaded(prev => ({ ...prev, [type]: true }));
    } catch (error) {
      console.error('Erro no upload:', error.response || error);
      alert(error.response?.data?.error || 'Erro ao enviar arquivo');
    } finally {
      setUploadingType(null);
    }
  };

  // ── Upload de letra por arquivo ───────────────────────────────────
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

      const stanzasData = response.data.stanzas.map((text, idx) => ({
        id: idx, text,
        startTime: '00:00', endTime: '00:00',
        fontSize: 32, fontFamily: 'Montserrat',
        color: '#FFFFFF', outlineColor: '#000000',
        bold: false, italic: false, underline: false,
        transition: 'fade', transitionDuration: 1,
        alignment: 'center', leadIn: 0.5,
        lines: [],
      }));

      onLyricsProcessed(stanzasData);
      setUploaded(prev => ({ ...prev, letraArquivo: true }));
      alert(response.data.message);
    } catch (error) {
      console.error('Erro ao processar letra:', error.response || error);
      alert(error.response?.data?.error || 'Erro ao processar letra');
    } finally {
      setUploadingType(null);
    }
  };

  // ── Letra manual (modal) ──────────────────────────────────────────
  const handleManualLyrics = async () => {
    if (!lyricsText.trim()) return;

    if (authLoading || !isAuthenticated) {
      alert('Você precisa estar logado para enviar letras.');
      return;
    }

    try {
      setUploadingType('letraManual');
      const response = await api.post('/lyrics/manual', { text: lyricsText });

      const stanzasData = response.data.stanzas.map((text, idx) => ({
        id: idx, text,
        startTime: '00:00', endTime: '00:00',
        fontSize: 32, fontFamily: 'Montserrat',
        color: '#FFFFFF', outlineColor: '#000000',
        bold: false, italic: false, underline: false,
        transition: 'fade', transitionDuration: 1,
        alignment: 'center', leadIn: 0.5,
        lines: [],
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
      setUploadingType(null);
    }
  };

  // ── Helper: renderiza o label/badge de cada botão de upload ───────
  const renderBadge = (type, isFile = true) => {
    const isThisUploading = uploadingType === type;
    if (isThisUploading)
      return <span className="upload-loading-badge"><Loader2 size={12} className="spin-icon" /> Enviando...</span>;
    if (uploaded[type])
      return <span className="upload-check">✓</span>;
    if (type === 'video')
      return <span className="upload-optional">opcional</span>;
    return <span className="upload-required">obrigatório</span>;
  };

  const btnDisabled = anyBusy || !canSync;

  return (
    <div className="files-panel">
      <h2>Arquivos</h2>

      {/* ── Barra de loading global (quando qualquer upload ativo) ── */}
      {isUploading && (
        <div className="upload-progress-bar">
          <div className="upload-progress-fill" />
          <span>
            Enviando {FILE_LABELS[uploadingType] || 'arquivo'}…
          </span>
        </div>
      )}

      <div className="upload-section">

        {/* Música Original */}
        <label className={`upload-btn${uploaded.musicaOriginal ? ' uploaded' : ''}${uploadingType === 'musicaOriginal' ? ' uploading' : ''}`}>
          <Upload size={15} />
          <span>Música Original</span>
          {renderBadge('musicaOriginal')}
          <input type="file" accept="audio/*"
            onChange={(e) => handleFileUpload(e, 'musicaOriginal')}
            disabled={anyBusy} />
        </label>

        {/* Música Instrumental (opcional) */}
        <label className={`upload-btn${uploaded.musicaInstrumental ? ' uploaded' : ''}${uploadingType === 'musicaInstrumental' ? ' uploading' : ''}`}>
          <Upload size={15} />
          <span>Música Instrumental</span>
          {renderBadge('musicaInstrumental')}
          <input type="file" accept="audio/*"
            onChange={(e) => handleFileUpload(e, 'musicaInstrumental')}
            disabled={anyBusy} />
        </label>

        <div className="upload-divider">opcional (vídeo/foto)</div>

        {/* Vídeo / Foto */}
        <label className={`upload-btn${uploaded.video ? ' uploaded' : ''}${uploadingType === 'video' ? ' uploading' : ''}`}>
          <Upload size={15} />
          <span>Vídeo / Foto</span>
          {renderBadge('video')}
          <input type="file" accept="video/*,image/*"
            onChange={(e) => handleFileUpload(e, 'video')}
            disabled={anyBusy} />
        </label>

        <div className="upload-divider">letra</div>

        {/* Letra por arquivo */}
        <label className={`upload-btn${uploaded.letraArquivo ? ' uploaded' : ''}${uploadingType === 'letraArquivo' ? ' uploading' : ''}`}>
          <Upload size={15} />
          <span>Letra (arquivo)</span>
          {renderBadge('letraArquivo')}
          <input type="file" accept=".txt,.docx,.pdf"
            onChange={handleLyricsUpload}
            disabled={anyBusy} />
        </label>

        {/* Colar letra */}
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

      {/* ── Botão Sincronizar automaticamente ──────────────────────── */}
      <div className="auto-sync-section">
        <div className="auto-sync-wrapper" title={!canSync ? lockMessage : ''}>
          <button
            className={`auto-sync-btn${canSync ? ' unlocked' : ' locked'}${isSyncing ? ' syncing' : ''}`}
            onClick={() => canSync && !isSyncing && onAutoSync && onAutoSync()}
            disabled={btnDisabled}
            aria-disabled={btnDisabled}
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
            ? 'Analisando o áudio com IA, aguarde...'
            : canSync
            ? uploaded.musicaInstrumental
              ? 'Sincroniza usando Whisper AI (instrumental é obrigatório no app, mas não entra no algoritmo)'
              : 'Sincroniza os tempos usando Whisper AI'
            : lockMessage}
        </div>
      </div>

      {/* ── Modal: Colar letra ──────────────────────────────────────── */}
      {showLyricsModal && (
        <div className="lyrics-modal-overlay"
          onMouseDown={() => !anyBusy && setShowLyricsModal(false)}>
          <div className="lyrics-modal" onMouseDown={e => e.stopPropagation()}>
            <div className="lyrics-modal-header">
              <h3>Colar letra</h3>
              <button className="lyrics-modal-close"
                onClick={() => !anyBusy && setShowLyricsModal(false)}
                title="Fechar">
                <X size={16} />
              </button>
            </div>
            <textarea
              value={lyricsText}
              onChange={e => setLyricsText(e.target.value)}
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
