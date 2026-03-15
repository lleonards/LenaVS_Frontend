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

  // ✅ Duração lida do arquivo localmente (sem depender da URL do servidor)
  const [localAudioDuration, setLocalAudioDuration] = useState(null);

  const videoRef = useRef(null);

  // ── Callbacks ───────────────────────────────────────────────────

  const handleLyricsProcessed = (processedStanzas) => {
    setStanzas(processedStanzas);
    setShowLyricsEditor(true);
  };

  const handleFilesUploaded = (files) => {
    setMediaFiles(prev => ({ ...prev, ...files }));
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

  // ── Sincronização automática ─────────────────────────────────────
  // Usa a duração local (lida antes do upload) para nunca falhar
  const handleAutoSync = () => {
    if (!stanzas?.length) {
      alert('Envie/cole a letra antes de gerar a sincronização.');
      return;
    }

    const duration = localAudioDuration;

    if (!duration) {
      alert(
        'Não foi possível ler a duração do áudio.\n' +
        'Tente fazer o upload da Música Original novamente.'
      );
      return;
    }

    // Distribui proporcionalmente pelo número de caracteres (mais preciso que palavras)
    const weights = stanzas.map((s) => {
      const chars = (s.text || '').replace(/\s+/g, ' ').trim().length;
      return Math.max(chars, 1);
    });

    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const usable = Math.max(duration, 1);

    // Pequeno intervalo entre estrofes (0.3s) para o karaokê ficar legível
    const GAP = 0.3;
    const totalGap = GAP * (stanzas.length - 1);
    const availableForStanzas = Math.max(usable - totalGap, usable * 0.8);

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
