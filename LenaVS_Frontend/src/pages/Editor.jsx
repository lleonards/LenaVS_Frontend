import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import FilesPanel from '../components/FilesPanel';
import PreviewPanel from '../components/PreviewPanel';
import LyricsEditorPanel from '../components/LyricsEditorPanel';
import ExportPanel from '../components/ExportPanel';
import api from '../services/api';
import { formatSecondsToTimestamp, normalizeTimeFields } from '../utils/time';
import './Editor.css';

const DEFAULT_STANZA_STYLE = {
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
  syncConfidence: null,
  syncStatus: 'pending',
  needsReview: false,
};

const buildEditorStanza = (stanza = {}, idx = 0, baseStyle = {}) => {
  const merged = {
    ...DEFAULT_STANZA_STYLE,
    ...baseStyle,
    ...stanza,
    id: stanza.id ?? idx,
    text: String(stanza.text || ''),
    lines: Array.isArray(stanza.lines) ? stanza.lines : [],
  };

  return normalizeTimeFields(merged);
};

const clearTimingFromStanzas = (items = []) =>
  items.map((stanza, idx) =>
    buildEditorStanza(
      {
        ...stanza,
        startTime: '',
        endTime: '',
        startSeconds: null,
        endSeconds: null,
        lines: [],
        syncConfidence: null,
        syncStatus: 'pending',
        needsReview: false,
      },
      idx,
      items[0] || {}
    )
  );

const Editor = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [stanzas, setStanzas] = useState([]);
  const [showLyricsEditor, setShowLyricsEditor] = useState(false);
  const [mediaFiles, setMediaFiles] = useState({
    musicaOriginal: null,
    musicaInstrumental: null,
    video: null,
    imagem: null,
  });
  const [originalAudioUrl, setOriginalAudioUrl] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioType, setAudioType] = useState('original');
  const [backgroundColor, setBackgroundColor] = useState('#000000');
  const [localAudioDuration, setLocalAudioDuration] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);

  const currentTimeRef = useRef(0);
  const videoRef = useRef(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  const handleTimeUpdate = useCallback((timeInSeconds) => {
    currentTimeRef.current = timeInSeconds;
    setCurrentTime(timeInSeconds);
  }, []);

  const handleLyricsProcessed = useCallback((processedStanzas) => {
    const normalized = (processedStanzas || []).map((stanza, idx) =>
      buildEditorStanza(stanza, idx, processedStanzas?.[0] || {})
    );

    setStanzas(normalized);
    setShowLyricsEditor(true);
    setSyncStatus({
      type: 'info',
      message: `${normalized.length} estrofes carregadas. Clique em "Sincronizar automaticamente" para gerar os tempos com validação automática.`,
    });
  }, []);

  const handleFilesUploaded = useCallback((files) => {
    setMediaFiles((prev) => ({ ...prev, ...files }));

    if (files.musicaOriginal) {
      setOriginalAudioUrl(files.musicaOriginal);
      setAudioType('original');
    }
  }, []);

  const handleAudioDurationRead = useCallback((duration) => {
    setLocalAudioDuration(duration);
  }, []);

  const handleTapSync = useCallback((stanzaId, field) => {
    const currentSeconds = currentTimeRef.current;
    const numericField = field === 'startTime' ? 'startSeconds' : 'endSeconds';

    setStanzas((prev) =>
      prev.map((stanza, idx) => {
        if (stanza.id !== stanzaId) return stanza;

        return buildEditorStanza(
          {
            ...stanza,
            [field]: formatSecondsToTimestamp(currentSeconds),
            [numericField]: currentSeconds,
          },
          idx,
          stanza
        );
      })
    );
  }, []);

  const applySegmentsToStanzas = useCallback((currentStanzas, segments, report) => {
    const reportByIndex = Array.isArray(report?.stanzas) ? report.stanzas : [];

    return currentStanzas.map((stanza, idx) => {
      const segment = segments[idx];
      const reportItem = reportByIndex[idx] || {};

      if (!segment) {
        const previousSegment = segments.slice(0, idx).reverse().find(Boolean);
        const nextSegment = segments.slice(idx + 1).find(Boolean);

        if (previousSegment && nextSegment) {
          const gap = nextSegment.start - previousSegment.end;
          const interpolatedStart = previousSegment.end + gap * 0.1;
          const interpolatedEnd = previousSegment.end + gap * 0.9;

          return buildEditorStanza(
            {
              ...stanza,
              startSeconds: interpolatedStart,
              endSeconds: interpolatedEnd,
              lines: [],
              syncConfidence: reportItem.confidence ?? 0,
              syncStatus: reportItem.status || 'fallback-interpolated',
              needsReview: true,
            },
            idx,
            currentStanzas[0] || {}
          );
        }

        if (previousSegment) {
          return buildEditorStanza(
            {
              ...stanza,
              startSeconds: previousSegment.end + 0.5,
              endSeconds: previousSegment.end + 4,
              lines: [],
              syncConfidence: reportItem.confidence ?? 0,
              syncStatus: reportItem.status || 'fallback-interpolated',
              needsReview: true,
            },
            idx,
            currentStanzas[0] || {}
          );
        }

        return buildEditorStanza(
          {
            ...stanza,
            syncConfidence: reportItem.confidence ?? null,
            syncStatus: reportItem.status || 'pending',
            needsReview: Boolean(reportItem.needsReview),
          },
          idx,
          currentStanzas[0] || {}
        );
      }

      return buildEditorStanza(
        {
          ...stanza,
          startSeconds: segment.start,
          endSeconds: segment.end,
          lines: Array.isArray(segment.lines) ? segment.lines : [],
          syncConfidence: reportItem.confidence ?? null,
          syncStatus: reportItem.status || 'synced',
          needsReview: Boolean(reportItem.needsReview),
        },
        idx,
        currentStanzas[0] || {}
      );
    });
  }, []);

  const applyProportionalFallback = useCallback((currentStanzas, duration) => {
    const allLines = [];

    currentStanzas.forEach((stanza, stanzaIndex) => {
      const lines = stanza.text
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      lines.forEach((lineText, lineIndex) => {
        const wordCount = lineText.split(/\s+/).filter((word) => word.length > 1).length || 1;
        allLines.push({ stanzaIndex, lineIndex, text: lineText, wordCount });
      });
    });

    if (!allLines.length) return currentStanzas;

    const totalWords = allLines.reduce((acc, line) => acc + line.wordCount, 0);
    const lineGap = 0.2;
    const availableDuration = Math.max(1, duration - lineGap * (allLines.length - 1));

    let cursor = 0;
    const lineTimings = allLines.map((line) => {
      const lineDuration = availableDuration * (line.wordCount / totalWords);
      const start = cursor;
      const end = Math.min(duration, start + lineDuration);
      cursor = end + lineGap;
      return { ...line, start, end };
    });

    return currentStanzas.map((stanza, stanzaIndex) => {
      const stanzaLines = lineTimings.filter((line) => line.stanzaIndex === stanzaIndex);
      if (!stanzaLines.length) return stanza;

      return buildEditorStanza(
        {
          ...stanza,
          startSeconds: stanzaLines[0].start,
          endSeconds: stanzaLines[stanzaLines.length - 1].end,
          lines: [],
          syncConfidence: 0,
          syncStatus: 'fallback-interpolated',
          needsReview: true,
        },
        stanzaIndex,
        currentStanzas[0] || {}
      );
    });
  }, []);

  const handleAutoSync = async () => {
    if (!stanzas.length) {
      alert('Envie ou cole a letra antes de gerar a sincronização.');
      return;
    }

    if (!originalAudioUrl) {
      alert('Envie a Música Original com vocal antes de sincronizar.');
      return;
    }

    setIsSyncing(true);
    setSyncStatus({
      type: 'info',
      message: 'Analisando a música original, isolando a guia vocal e validando as estrofes...',
    });

    try {
      const response = await api.post(
        '/lyrics/voice-sync',
        {
          audioUrl: originalAudioUrl,
          stanzas: stanzas.map((stanza) => ({ id: stanza.id, text: stanza.text })),
        },
        { timeout: 180000 }
      );

      const report = response.data?.report || {};
      const instrumentalOnly = Boolean(response.data?.instrumentalOnly || report?.instrumentalOnly);
      const segments = Array.isArray(response.data?.segments) ? response.data.segments : [];

      if (instrumentalOnly || segments.length === 0) {
        setStanzas((prev) => clearTimingFromStanzas(prev));
        setShowLyricsEditor(true);
        setSyncStatus({
          type: 'info',
          message: 'Nenhuma voz útil foi encontrada nesse áudio. Como ele parece instrumental, nenhuma estrofe será exibida no preview até que você envie uma faixa com vocal.',
        });
        return;
      }

      const updatedStanzas = applySegmentsToStanzas(stanzas, segments, report);
      setStanzas(updatedStanzas);
      setShowLyricsEditor(true);

      const retriedCount = Number(report?.retriedCount || 0);
      const fallbackCount = Number(report?.fallbackCount || 0);
      const needsReviewCount = Number(report?.needsReviewCount || 0);
      const selectedSourceKind = report?.selectedSourceKind === 'vocal-guide'
        ? 'guia vocal isolada'
        : 'áudio original';

      let message = `✅ Sincronização concluída usando ${selectedSourceKind}.`;
      if (retriedCount > 0) {
        message += ` ${retriedCount} estrofe(s) precisaram de nova busca automática.`;
      }
      if (fallbackCount > 0) {
        message += ` ${fallbackCount} estrofe(s) receberam interpolação defensiva.`;
      }
      if (needsReviewCount > 0) {
        message += ` ${needsReviewCount} estrofe(s) ficaram marcadas para revisão manual.`;
      }

      setSyncStatus({
        type: fallbackCount > 0 || needsReviewCount > 0 ? 'info' : 'success',
        message,
      });
    } catch (error) {
      console.warn('[AutoSync] Falha no backend:', error?.message || error);

      if (!localAudioDuration) {
        setSyncStatus({
          type: 'error',
          message: '❌ Não foi possível sincronizar. Verifique o upload da música original.',
        });
        alert('Não foi possível analisar o áudio. Tente reenviar a Música Original.');
        return;
      }

      const fallbackStanzas = applyProportionalFallback(stanzas, localAudioDuration);
      setStanzas(fallbackStanzas);
      setShowLyricsEditor(true);
      setSyncStatus({
        type: 'info',
        message: '⚠️ A IA ficou indisponível. Foi aplicada uma distribuição estimada para você ajustar manualmente.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="editor-container">
        <p style={{ color: '#fff', padding: 40 }}>Carregando sessão...</p>
      </div>
    );
  }

  return (
    <div className="editor-container">
      <Header />

      <div className="editor-main">
        <div className="editor-left">
          <FilesPanel
            onLyricsProcessed={handleLyricsProcessed}
            onFilesUploaded={handleFilesUploaded}
            onAutoSync={handleAutoSync}
            onAudioDurationRead={handleAudioDurationRead}
            isSyncing={isSyncing}
          />

          {syncStatus && (
            <div className={`sync-status sync-status--${syncStatus.type}`}>
              {syncStatus.message}
            </div>
          )}
        </div>

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
              <p>O painel Editor de Letras aparecerá aqui após o upload da letra.</p>
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
