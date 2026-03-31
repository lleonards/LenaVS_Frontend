import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import FilesPanel from '../components/FilesPanel';
import PreviewPanel from '../components/PreviewPanel';
import LyricsEditorPanel from '../components/LyricsEditorPanel';
import ExportPanel from '../components/ExportPanel';
import { formatTimecode, parseTimecode } from '../utils/timecode';
import { hasConfiguredTiming, normalizeStanzas } from '../utils/stanza';
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

  const [stanzas, setStanzas] = useState([]);
  const [selectedStanzaId, setSelectedStanzaId] = useState(null);
  const [seekRequest, setSeekRequest] = useState(null);
  const [showLyricsEditor, setShowLyricsEditor] = useState(false);
  const [mediaFiles, setMediaFiles] = useState({
    musicaOriginal: null,
    musicaInstrumental: null,
    video: null,
    imagem: null,
  });

  const [currentTime, setCurrentTime] = useState(0);
  const [audioType, setAudioType] = useState('original');
  const [backgroundColor, setBackgroundColor] = useState('#000000');
  const [syncStatus, setSyncStatus] = useState(null);

  const currentTimeRef = useRef(0);

  const handleTimeUpdate = useCallback((time) => {
    currentTimeRef.current = time;
    setCurrentTime(time);
  }, []);

  const handleLyricsProcessed = useCallback((processedStanzas) => {
    const normalized = normalizeStanzas(processedStanzas);

    setStanzas(normalized);
    setSelectedStanzaId(normalized[0]?.id ?? null);
    setShowLyricsEditor(true);
    setSyncStatus({
      type: 'info',
      message:
        `${normalized.length} estrofes carregadas. Agora você pode reordenar, duplicar, posicionar no preview e sincronizar os tempos manualmente.`,
    });
  }, []);

  const handleFilesUploaded = useCallback((files) => {
    setMediaFiles((prev) => ({ ...prev, ...files }));
  }, []);

  const handleStanzasChange = useCallback((nextStanzas) => {
    setStanzas(normalizeStanzas(nextStanzas));
  }, []);

  const secondsToTimecode = (seconds) => formatTimecode(seconds);

  const handleTapSync = useCallback((stanzaId, field) => {
    const current = currentTimeRef.current;
    const flagField = field === 'startTime' ? 'hasManualStart' : 'hasManualEnd';

    setStanzas((prev) =>
      prev.map((stanza) =>
        stanza.id === stanzaId
          ? {
              ...stanza,
              [field]: secondsToTimecode(current),
              [flagField]: true,
            }
          : stanza
      )
    );
  }, []);

  const requestPreviewSeek = useCallback((stanzaId) => {
    const stanza = stanzas.find((item) => item.id === stanzaId);
    if (!stanza || !hasConfiguredTiming(stanza)) return;

    const start = parseTimecode(stanza.startTime);
    if (start === null) return;

    setSeekRequest({
      stanzaId,
      time: start,
      nonce: Date.now(),
    });
  }, [stanzas]);

  const handleSelectStanza = useCallback((stanzaId, options = {}) => {
    const { source = 'editor', shouldSeek = source === 'editor' } = options;
    setSelectedStanzaId(stanzaId);

    if (shouldSeek) {
      requestPreviewSeek(stanzaId);
    }
  }, [requestPreviewSeek]);

  const handleStanzaPositionChange = useCallback((stanzaId, nextPosition) => {
    setStanzas((prev) =>
      prev.map((stanza) =>
        stanza.id === stanzaId
          ? {
              ...stanza,
              position: {
                ...(stanza.position || {}),
                ...nextPosition,
              },
            }
          : stanza
      )
    );
  }, []);

  useEffect(() => {
    if (!stanzas.length) {
      if (selectedStanzaId !== null) {
        setSelectedStanzaId(null);
      }
      return;
    }

    const selectionStillExists = stanzas.some((stanza) => stanza.id === selectedStanzaId);
    if (!selectionStillExists) {
      setSelectedStanzaId(stanzas[0].id);
    }
  }, [stanzas, selectedStanzaId]);

  return (
    <div className="editor-container">
      <Header />

      <div className="editor-main">
        <div className="editor-left">
          <FilesPanel onLyricsProcessed={handleLyricsProcessed} onFilesUploaded={handleFilesUploaded} />

          {syncStatus && (
            <div className={`sync-status sync-status--${syncStatus.type}`}>
              {syncStatus.message}
            </div>
          )}
        </div>

        <div className="preview-wrapper">
          <PreviewPanel
            stanzas={stanzas}
            selectedStanzaId={selectedStanzaId}
            currentTime={currentTime}
            audioType={audioType}
            backgroundColor={backgroundColor}
            mediaFiles={mediaFiles}
            seekRequest={seekRequest}
            onTimeUpdate={handleTimeUpdate}
            onAudioTypeChange={setAudioType}
            onBackgroundColorChange={setBackgroundColor}
            onSelectStanza={(stanzaId) => handleSelectStanza(stanzaId, { source: 'preview', shouldSeek: false })}
            onStanzaPositionChange={handleStanzaPositionChange}
          />
        </div>

        <div className="editor-right">
          {showLyricsEditor ? (
            <LyricsEditorPanel
              stanzas={stanzas}
              selectedStanzaId={selectedStanzaId}
              currentTime={currentTime}
              onStanzasChange={handleStanzasChange}
              onTapSync={handleTapSync}
              onStanzaSelect={(stanzaId) => handleSelectStanza(stanzaId, { source: 'editor', shouldSeek: true })}
            />
          ) : (
            <div className="placeholder-panel">
              <p>O painel Editor de Letras aparecerá aqui após o upload da letra</p>
            </div>
          )}
        </div>

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
