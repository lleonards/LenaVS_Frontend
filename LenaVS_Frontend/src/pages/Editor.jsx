import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import FilesPanel from '../components/FilesPanel';
import PreviewPanel from '../components/PreviewPanel';
import LyricsEditorPanel from '../components/LyricsEditorPanel';
import ExportPanel from '../components/ExportPanel';
import api from '../services/api';
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

  const [originalAudioUrl, setOriginalAudioUrl] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioType, setAudioType] = useState('original');
  const [backgroundColor, setBackgroundColor] = useState('#000000');
  const [localAudioDuration, setLocalAudioDuration] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
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
    setSyncStatus({ type: 'info', message: `${processedStanzas.length} estrofes carregadas. Clique em "Sincronizar automaticamente" para definir os tempos.` });
  };

  const handleFilesUploaded = (files) => {
    setMediaFiles(prev => ({ ...prev, ...files }));
    if (files.musicaOriginal) {
      setOriginalAudioUrl(files.musicaOriginal);
    }
  };

  const handleAudioDurationRead = (duration) => {
    setLocalAudioDuration(duration);
  };

  // ── Helpers ─────────────────────────────────────────────────────

  const secondsToMMSS = (sec) => {
    const safe = Math.max(0, Number(sec) || 0);
    const m = Math.floor(safe / 60).toString().padStart(2, '0');
    const s = Math.floor(safe % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // ── TAP SYNC: marca o tempo atual em uma estrofe específica ──────
  const handleTapSync = useCallback((stanzaId, field) => {
    const t = currentTimeRef.current;
    setStanzas(prev =>
      prev.map(s =>
        s.id === stanzaId
          ? { ...s, [field]: secondsToMMSS(t) }
          : s
      )
    );
  }, []);

  // ── Aplica segmentos de sincronização retornados pelo backend ────
  const applySegmentsToStanzas = useCallback((currentStanzas, segments) => {
    return currentStanzas.map((s, idx) => {
      const seg = segments[idx];

      if (!seg) {
        // Interpola com segmentos vizinhos se não vier do backend
        const prevSeg = segments.slice(0, idx).reverse().find(Boolean);
        const nextSeg = segments.slice(idx + 1).find(Boolean);

        if (prevSeg && nextSeg) {
          const gap = nextSeg.start - prevSeg.end;
          const interpolatedStart = prevSeg.end + gap * 0.1;
          const interpolatedEnd   = prevSeg.end + gap * 0.9;
          return {
            ...s,
            startTime: secondsToMMSS(interpolatedStart),
            endTime:   secondsToMMSS(interpolatedEnd),
            leadIn: 0.5,
            lines: []
          };
        } else if (prevSeg) {
          return {
            ...s,
            startTime: secondsToMMSS(prevSeg.end + 0.5),
            endTime:   secondsToMMSS(prevSeg.end + 4),
            leadIn: 0.5,
            lines: []
          };
        }
        return s;
      }

      return {
        ...s,
        startTime: secondsToMMSS(seg.start),
        endTime:   secondsToMMSS(seg.end),
        leadIn: 0.5,
        // Removido: sincronização por linha no painel do editor
        lines: []
      };
    });
  }, []);

  // ── Fallback local: distribui estrofes proporcionalmente ─────────
  const applyProportionalFallback = useCallback((currentStanzas, duration) => {
    const allLines = [];
    currentStanzas.forEach((s, si) => {
      const lines = s.text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      lines.forEach((lineText, li) => {
        const wordCount = lineText.split(/\s+/).filter(w => w.length > 1).length || 1;
        allLines.push({ stanzaIdx: si, lineIdx: li, text: lineText, wordCount });
      });
    });

    if (allLines.length === 0) return currentStanzas;

    const totalWords = allLines.reduce((a, l) => a + l.wordCount, 0);
    const LINE_GAP   = 0.2;
    const available  = Math.max(1, duration - LINE_GAP * (allLines.length - 1));

    let cursor = 0;
    const lineTimings = allLines.map(l => {
      const dur   = available * (l.wordCount / totalWords);
      const start = cursor;
      const end   = Math.min(duration, start + dur);
      cursor = end + LINE_GAP;
      return { ...l, start, end };
    });

    return currentStanzas.map((s, si) => {
      const stanzaLines = lineTimings.filter(l => l.stanzaIdx === si);
      if (stanzaLines.length === 0) return s;
      return {
        ...s,
        startTime: secondsToMMSS(stanzaLines[0].start),
        endTime:   secondsToMMSS(stanzaLines[stanzaLines.length - 1].end),
        leadIn: 0.5,
        lines: []
      };
    });
  }, []);

  // ── Sincronização automática principal ──────────────────────────
  const handleAutoSync = async () => {
    if (!stanzas?.length) {
      alert('Envie/cole a letra antes de gerar a sincronização.');
      return;
    }

    if (!originalAudioUrl) {
      alert('Envie a Música Original antes de sincronizar.');
      return;
    }

    // Instrumental é obrigatório no app (mas NÃO é usado na sincronização automática)
    if (!mediaFiles?.musicaInstrumental) {
      alert('Envie a Música Instrumental antes de sincronizar.');
      return;
    }

    setIsSyncing(true);
    setSyncStatus(null);

    try {
      // ── Sincronização via backend (usa APENAS a música ORIGINAL com vocal) ──
      // Instrumental é obrigatório no projeto, mas não entra no algoritmo de sync.
      let response;
      try {
        response = await api.post('/lyrics/voice-sync', {
          audioUrl: originalAudioUrl,
          stanzas: stanzas.map(s => ({ id: s.id, text: s.text }))
        }, { timeout: 180000 }); // 3 minutos para músicas longas
      } catch (backendErr) {
        throw backendErr; // será capturado abaixo
      }

      if (response.data?.segments?.length > 0) {
        const updated = applySegmentsToStanzas(stanzas, response.data.segments);
        setStanzas(updated);
        setShowLyricsEditor(true);

        setSyncStatus({
          type: 'success',
          message: '✅ Sincronização concluida!'
        });
        return;
      }

      // Resposta OK mas sem segmentos — usa fallback local
      throw new Error('Backend retornou segmentos vazios');

    } catch (err) {
      console.warn('[AutoSync] Backend falhou:', err.message);

      // ── Fallback local: distribuição proporcional por palavras ────
      const duration = localAudioDuration;

      if (!duration) {
        setSyncStatus({
          type: 'error',
          message: '❌ Não foi possível sincronizar. Verifique o upload do áudio.'
        });
        alert(
          'Não foi possível analisar o áudio.\n' +
          'Tente reenviar a Música Original.'
        );
        return;
      }

      console.log('[AutoSync] Usando fallback proporcional local...');
      const updated = applyProportionalFallback(stanzas, duration);
      setStanzas(updated);
      setShowLyricsEditor(true);
      setSyncStatus({
        type: 'info',
        message: '⚠️ Sincronização estimada (IA indisponível). Ajuste manualmente se necessário.'
      });
    } finally {
      setIsSyncing(false);
    }
  };

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
            onAutoSync={handleAutoSync}
            onAudioDurationRead={handleAudioDurationRead}
            isSyncing={isSyncing}
          />

          {/* ── Status da sincronização ── */}
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
