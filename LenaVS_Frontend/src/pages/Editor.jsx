import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import FilesPanel from '../components/FilesPanel';
import PreviewPanel from '../components/PreviewPanel';
import LyricsEditorPanel from '../components/LyricsEditorPanel';
import ExportPanel from '../components/ExportPanel';
import { formatTimecode } from '../utils/timecode';
import './Editor.css';

const Editor = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="editor-container">
        <p style={{ color: '#fff', padding: 40 }}>Carregando sessão...</p>
      </div>
    );
  }

  // ── Estados principais ──────────────────────────────────────────
  const [stanzas, setStanzas] = useState([]);
  const [showLyricsEditor, setShowLyricsEditor] = useState(false);
  const [mediaFiles, setMediaFiles] = useState({
    musicaOriginal: null,
    musicaInstrumental: null,
    video: null,
    imagem: null
  });

  const [currentTime, setCurrentTime] = useState(0);
  const [audioType, setAudioType] = useState('original');
  const [backgroundColor, setBackgroundColor] = useState('#000000');
  const [syncStatus, setSyncStatus] = useState(null); // { type: 'success'|'error'|'info', message }

  // currentTime ref para tap-sync sem re-render
  const currentTimeRef = useRef(0);
  const videoRef = useRef(null);

  const handleTimeUpdate = useCallback((t) => {
    currentTimeRef.current = t;
    setCurrentTime(t);
  }, []);

  // ── Callbacks ───────────────────────────────────────────────────

  const handleLyricsProcessed = (processedStanzas) => {
    setStanzas(processedStanzas);
    setShowLyricsEditor(true);
    setSyncStatus({
      type: 'info',
      message: `${processedStanzas.length} estrofes carregadas. Use o Tap Sync no editor para definir os tempos manualmente.`
    });
  };

  const handleFilesUploaded = (files) => {
    setMediaFiles(prev => ({ ...prev, ...files }));
  };

  // ── Helpers ─────────────────────────────────────────────────────

  const secondsToTimecode = (sec) => formatTimecode(sec);

  // ── TAP SYNC: marca o tempo atual em uma estrofe específica ──────
  const handleTapSync = useCallback((stanzaId, field) => {
    const t = currentTimeRef.current;
    setStanzas(prev =>
      prev.map(s =>
        s.id === stanzaId
          ? { ...s, [field]: secondsToTimecode(t) }
          : s
      )
    );
  }, []);

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="editor-container">
      <Header />

      <div className="editor-main">
        {/* Coluna esquerda - Arquivos */}
        <div className="editor-left">
          <FilesPanel
            onLyricsProcessed={handleLyricsProcessed}
            onFilesUploaded={handleFilesUploaded}
          />

          {/* ── Status informativo ── */}
          {syncStatus && (
            <div className={`sync-status sync-status--${syncStatus.type}`}>
              {syncStatus.message}
            </div>
          )}
        </div>

        {/* Preview - fixo em 16:9 */}
        <div className="preview-wrapper">
          <PreviewPanel
            stanzas={stanzas}
            currentTime={currentTime}
            audioType={audioType}
            backgroundColor={backgroundColor}
            mediaFiles={mediaFiles}
            videoRef={videoRef}
            onTimeUpdate={handleTimeUpdate}
            onAudioTypeChange={setAudioType}
            onBackgroundColorChange={setBackgroundColor}
          />
        </div>

        {/* Coluna direita - Editor de Letras */}
        <div className="editor-right">
          {showLyricsEditor ? (
            <LyricsEditorPanel
              stanzas={stanzas}
              onStanzasChange={setStanzas}
              currentTime={currentTime}
              onTapSync={handleTapSync}
            />
          ) : (
            <div className="placeholder-panel">
              <p>O painel Editor de Letras aparecerá aqui após o upload da letra</p>
            </div>
          )}
        </div>

        {/* Exportar - abaixo do preview */}
        <div className="export-wrapper">
          <ExportPanel
            stanzas={stanzas}
            mediaFiles={mediaFiles}
            audioType={audioType}
            backgroundColor={backgroundColor}
          />
        </div>
      </div>
    </div>
  );
};

export default Editor;
