import React, { useState, useRef, useEffect } from 'react';
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

  // 🔒 Proteger rota: só usuário logado
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

  // URL pública do áudio original — usada para análise de voz no backend
  const [originalAudioUrl, setOriginalAudioUrl] = useState(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [audioType, setAudioType] = useState('original');
  const [backgroundColor, setBackgroundColor] = useState('#000000');

  // ✅ Duração lida do arquivo localmente (fallback quando análise de voz falha)
  const [localAudioDuration, setLocalAudioDuration] = useState(null);

  const videoRef = useRef(null);

  // ── Callbacks ───────────────────────────────────────────────────

  const handleLyricsProcessed = (processedStanzas) => {
    setStanzas(processedStanzas);
    setShowLyricsEditor(true);
  };

  const handleFilesUploaded = (files) => {
    setMediaFiles(prev => ({ ...prev, ...files }));
    // Guarda URL pública do áudio original para sincronização por voz
    if (files.musicaOriginal) {
      setOriginalAudioUrl(files.musicaOriginal);
    }
  };

  // Recebe a duração lida localmente no FilesPanel
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

  // ── Sincronização automática BASEADA NA VOZ ──────────────────────
  // 1ª tentativa: análise de voz pelo backend (ffmpeg silence-detect)
  // Fallback: distribuição proporcional por duração local
  const handleAutoSync = async () => {
    if (!stanzas?.length) {
      alert('Envie/cole a letra antes de gerar a sincronização.');
      return;
    }

    // ── Tenta sincronização via análise de voz no backend ──────────
    if (originalAudioUrl) {
      try {
        const response = await api.post('/lyrics/voice-sync', {
          audioUrl: originalAudioUrl,
          stanzaCount: stanzas.length
        });

        if (response.data?.segments?.length > 0) {
          const segments = response.data.segments;

          const updated = stanzas.map((s, idx) => {
            // Se houver mais estrofes que segmentos, reutiliza o último
            const seg = segments[idx] || segments[segments.length - 1];
            return {
              ...s,
              startTime: secondsToMMSS(seg.start),
              endTime: secondsToMMSS(seg.end),
              leadIn: 0.5
            };
          });

          setStanzas(updated);
          setShowLyricsEditor(true);
          alert(
            '✅ Sincronização automática gerada com base na voz!\n\n' +
            `${segments.length} segmento(s) de voz detectado(s).\n` +
            'Ajuste fino manual disponível no Editor de Letras.'
          );
          return;
        }
      } catch (err) {
        console.warn('Sincronização por voz falhou, usando fallback:', err.message);
      }
    }

    // ── Fallback: distribuição proporcional por duração ────────────
    const duration = localAudioDuration;

    if (!duration) {
      alert(
        'Não foi possível analisar o áudio.\n' +
        'Tente fazer o upload da Música Original novamente.'
      );
      return;
    }

    const weights = stanzas.map((s) => {
      const chars = (s.text || '').replace(/\s+/g, ' ').trim().length;
      return Math.max(chars, 1);
    });

    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const usable = Math.max(duration, 1);
    const GAP = 0.3;
    const availableForStanzas = Math.max(usable - GAP * (stanzas.length - 1), usable * 0.8);

    let cursor = 0;

    const updated = stanzas.map((s, idx) => {
      const portion = weights[idx] / totalWeight;
      const stanzaDur = availableForStanzas * portion;
      const start = cursor;
      const end = Math.min(usable, cursor + stanzaDur);
      cursor = end + GAP;
      return {
        ...s,
        startTime: secondsToMMSS(start),
        endTime: secondsToMMSS(end),
        leadIn: 0.5
      };
    });

    setStanzas(updated);
    setShowLyricsEditor(true);
    alert(
      '✅ Sincronização automática gerada!\n\n' +
      'Os tempos foram distribuídos com base na duração da música original.\n' +
      'Você ainda pode ajustar manualmente no Editor de Letras.'
    );
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
          />
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
            onTimeUpdate={setCurrentTime}
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
