import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import FilesPanel from '../components/FilesPanel';
import PreviewPanel from '../components/PreviewPanel';
import LyricsEditorPanel from '../components/LyricsEditorPanel';
import ExportPanel from '../components/ExportPanel';
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

  // Enquanto verifica sessão
  if (loading) {
    return (
      <div className="editor-container">
        <p style={{ color: '#fff', padding: 40 }}>Carregando sessão...</p>
      </div>
    );
  }

  // Estados principais
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

  // Duração do áudio original (para sincronização automática)
  const [originalAudioDuration, setOriginalAudioDuration] = useState(null);

  const videoRef = useRef(null);

  // Callback quando letras são processadas
  const handleLyricsProcessed = (processedStanzas) => {
    setStanzas(processedStanzas);
    setShowLyricsEditor(true);
  };

  // Callback quando arquivos são carregados
  const handleFilesUploaded = (files) => {
    setMediaFiles(prev => ({ ...prev, ...files }));
  };

  const secondsToMMSS = (sec) => {
    const safe = Math.max(0, Number(sec) || 0);
    const m = Math.floor(safe / 60).toString().padStart(2, '0');
    const s = Math.floor(safe % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const loadAudioDuration = async (audioUrl) => {
    if (!audioUrl) return null;

    return new Promise((resolve) => {
      const a = new Audio();
      a.crossOrigin = 'anonymous';
      a.preload = 'metadata';
      a.src = audioUrl;

      const done = (value) => resolve(value);

      a.onloadedmetadata = () => {
        if (Number.isFinite(a.duration) && a.duration > 0) {
          done(a.duration);
        } else {
          done(null);
        }
      };

      a.onerror = () => done(null);
    });
  };

  // Atualiza duração sempre que o áudio original muda
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!mediaFiles?.musicaOriginal) return;
      const d = await loadAudioDuration(mediaFiles.musicaOriginal);
      if (!cancelled) setOriginalAudioDuration(d);
    })();

    return () => {
      cancelled = true;
    };
  }, [mediaFiles?.musicaOriginal]);

  // ✅ Sincronização automática (heurística) — usuário pode ajustar depois
  const handleAutoSync = async () => {
    if (!mediaFiles?.musicaOriginal) {
      alert('Faça upload da Música Original antes de gerar a sincronização.');
      return;
    }

    if (!stanzas?.length) {
      alert('Envie/cole a letra antes de gerar a sincronização.');
      return;
    }

    const duration = originalAudioDuration || (await loadAudioDuration(mediaFiles.musicaOriginal));

    if (!duration) {
      alert('Não foi possível ler a duração do áudio. Tente novamente.');
      return;
    }

    // Distribui o tempo proporcionalmente pela quantidade de palavras (melhor que dividir igual)
    const weights = stanzas.map((s) => {
      const words = (s.text || '').trim().split(/\s+/).filter(Boolean);
      return Math.max(words.length, 1);
    });

    const total = weights.reduce((a, b) => a + b, 0);
    const usable = Math.max(duration, 1);

    let cursor = 0;

    const updated = stanzas.map((s, idx) => {
      const portion = weights[idx] / total;
      const stanzaDur = usable * portion;

      const start = cursor;
      const end = Math.min(usable, cursor + stanzaDur);
      cursor = end;

      return {
        ...s,
        startTime: secondsToMMSS(start),
        endTime: secondsToMMSS(end),
        // Preview vai exibir 0.5s antes (efeito karaokê)
        leadIn: 0.5
      };
    });

    setStanzas(updated);
    setShowLyricsEditor(true);
    alert('Sincronização automática gerada! Você ainda pode editar tudo no Editor de Letras.');
  };

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
