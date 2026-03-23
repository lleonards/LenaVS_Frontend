import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Play, Pause, Music } from 'lucide-react';
import './PreviewPanel.css';

const PreviewPanel = ({
  stanzas = [],
  currentTime = 0,
  audioType = 'original',
  backgroundColor = '#000000',
  mediaFiles = {},
  onTimeUpdate = () => {},
  onAudioTypeChange = () => {},
  onBackgroundColorChange = () => {}
}) => {
  const audioRef = useRef(null);
  const stageRef = useRef(null);
  const rafRef   = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [previewBoxSize, setPreviewBoxSize] = useState({ width: '100%', height: 'auto' });

  // Guarda o índice da estrofe ativa anterior para animação de transição
  const prevStanzaIdRef = useRef(null);
  const [transitionClass, setTransitionClass] = useState('');

  // ── RAF loop para sincronização de alta frequência (~60fps) ──────
  const startRaf = useCallback(() => {
    const tick = () => {
      if (audioRef.current && !audioRef.current.paused) {
        onTimeUpdate(audioRef.current.currentTime);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, [onTimeUpdate]);

  const stopRaf = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  // Limpa RAF ao desmontar
  useEffect(() => {
    return () => stopRaf();
  }, [stopRaf]);

  const cleanUrl = (url) => {
    if (!url) return null;
    return url;
  };

  const audioSrc = useMemo(() => {
    const src =
      audioType === 'instrumental'
        ? mediaFiles?.musicaInstrumental
        : mediaFiles?.musicaOriginal;
    return cleanUrl(src);
  }, [audioType, mediaFiles]);

  // Troca áudio mantendo posição
  useEffect(() => {
    if (!audioRef.current || !audioSrc) return;
    const audio = audioRef.current;
    const previousTime = audio.currentTime;
    const wasPlaying = !audio.paused;
    audio.pause();
    audio.src = audioSrc;
    audio.load();
    audio.onloadedmetadata = () => {
      audio.currentTime = previousTime;
      if (wasPlaying) {
        audio.play().catch(() => {});
        startRaf();
      }
    };
  }, [audioSrc, startRaf]);

  // Calcula proporção 16:9
  useEffect(() => {
    if (!stageRef.current) return;
    const el = stageRef.current;

    const calcAndSet = () => {
      if (window.matchMedia && window.matchMedia('(max-width: 768px)').matches) {
        setPreviewBoxSize({ width: '100%', height: 'auto' });
        return;
      }
      const rect = el.getBoundingClientRect();
      const wMax = rect.width;
      const hMax = rect.height;
      if (!wMax || !hMax) return;
      let w = wMax;
      let h = (w * 9) / 16;
      if (h > hMax) { h = hMax; w = (h * 16) / 9; }
      setPreviewBoxSize({ width: `${Math.floor(w)}px`, height: `${Math.floor(h)}px` });
    };

    calcAndSet();
    let ro;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => calcAndSet());
      ro.observe(el);
    }
    window.addEventListener('resize', calcAndSet);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', calcAndSet);
    };
  }, []);

  // ── Busca estrofe + linha ativas no tempo atual ──────────────────
  const { currentStanza, currentLineIndex } = useMemo(() => {
    if (!stanzas.length) return { currentStanza: null, currentLineIndex: -1 };

    const active = stanzas.find((stanza) => {
      if (!stanza.startTime || !stanza.endTime) return false;
      const [sm, ss] = stanza.startTime.split(':').map(Number);
      const [em, es] = stanza.endTime.split(':').map(Number);
      const leadIn = typeof stanza.leadIn === 'number' ? stanza.leadIn : 0.5;
      const start  = Math.max(0, sm * 60 + ss - leadIn);
      const end    = em * 60 + es;
      return currentTime >= start && currentTime <= end;
    });

    if (!active) return { currentStanza: null, currentLineIndex: -1 };

    let lineIdx = -1;
    if (active.lines && active.lines.length > 0) {
      for (let i = 0; i < active.lines.length; i++) {
        const line = active.lines[i];
        if (line.start !== null && line.end !== null) {
          if (currentTime >= line.start - 0.1 && currentTime <= line.end + 0.1) {
            lineIdx = i;
            break;
          }
        }
      }
      if (lineIdx === -1) {
        const [sm, ss] = active.startTime.split(':').map(Number);
        const [em, es] = active.endTime.split(':').map(Number);
        const stanzaStart = sm * 60 + ss;
        const stanzaEnd   = em * 60 + es;
        const stanzaDur   = stanzaEnd - stanzaStart;
        const lineCount   = active.lines.length;
        if (stanzaDur > 0 && lineCount > 0) {
          const relPos = (currentTime - stanzaStart) / stanzaDur;
          lineIdx = Math.min(lineCount - 1, Math.floor(relPos * lineCount));
        }
      }
    }

    return { currentStanza: active, currentLineIndex: lineIdx };
  }, [stanzas, currentTime]);

  // Dispara classe de transição ao mudar estrofe
  useEffect(() => {
    if (!currentStanza) {
      prevStanzaIdRef.current = null;
      return;
    }
    if (prevStanzaIdRef.current !== currentStanza.id) {
      prevStanzaIdRef.current = currentStanza.id;
      setTransitionClass('stanza-enter');
      const t = setTimeout(() => setTransitionClass('stanza-visible'), 50);
      return () => clearTimeout(t);
    }
  }, [currentStanza]);

  // Renderiza as linhas da estrofe com destaque karaokê
  const renderLyricsKaraoke = () => {
    if (!currentStanza) return null;

    const lines = currentStanza.text
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    // Alinhamento de texto — aplicado a cada linha individualmente
    const textAlign = currentStanza.alignment || 'center';

    if (lines.length === 0) return (
      <div
        className={`lyrics-display ${transitionClass}`}
        style={getTextStyle(currentStanza)}
      >
        {currentStanza.text}
      </div>
    );

    return (
      <div
        className={`lyrics-display lyrics-karaoke ${transitionClass}`}
      >
        {lines.map((line, i) => {
          const isActive  = currentLineIndex === i || (currentLineIndex === -1 && i === 0);
          const isPast    = currentLineIndex > i;
          const isFuture  = currentLineIndex !== -1 && currentLineIndex < i;

          return (
            <div
              key={i}
              className={`karaoke-line${isActive ? ' karaoke-line-active' : ''}${isPast ? ' karaoke-line-past' : ''}${isFuture ? ' karaoke-line-future' : ''}`}
              style={{
                fontFamily:     currentStanza.fontFamily || 'Montserrat',
                fontSize:       `${currentStanza.fontSize || 32}px`,
                fontWeight:     currentStanza.bold ? 'bold' : 'normal',
                fontStyle:      currentStanza.italic ? 'italic' : 'normal',
                textDecoration: currentStanza.underline ? 'underline' : 'none',
                color:          isActive ? (currentStanza.color || '#FFFFFF') : undefined,
                // ── FIX: centralização horizontal garantida por textAlign em cada linha ──
                textAlign:      textAlign,
                width:          '100%',
              }}
            >
              {line}
            </div>
          );
        })}
      </div>
    );
  };

  const getTextStyle = (stanza) => ({
    fontSize:       `${stanza.fontSize || 32}px`,
    fontFamily:     stanza.fontFamily || 'Montserrat',
    color:          stanza.color || '#FFFFFF',
    fontWeight:     stanza.bold ? 'bold' : 'normal',
    fontStyle:      stanza.italic ? 'italic' : 'normal',
    textDecoration: stanza.underline ? 'underline' : 'none',
    textAlign:      stanza.alignment || 'center',
    width:          '100%',
  });

  const togglePlay = async () => {
    if (!audioRef.current || !audioSrc) return;
    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        stopRaf();
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
        startRaf();
      }
    } catch (err) {
      console.error('Erro ao tentar tocar áudio:', err);
    }
  };

  const handleSeek = (e) => {
    const newTime = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      onTimeUpdate(newTime);
    }
  };

  const formatTime = (sec) => {
    if (!sec || isNaN(sec)) return '00:00';
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="preview-panel">
      <h2>Preview</h2>

      <div className="preview-stage" ref={stageRef}>
        <div className="preview-video" style={{ backgroundColor, ...previewBoxSize }}>
          {renderLyricsKaraoke()}
        </div>
      </div>

      <audio
        ref={audioRef}
        crossOrigin="anonymous"
        onTimeUpdate={(e) => {
          if (!rafRef.current) onTimeUpdate(e.target.currentTime);
        }}
        onLoadedMetadata={(e) => setDuration(e.target.duration)}
        onEnded={() => { setIsPlaying(false); stopRaf(); }}
        onError={() => console.error('Erro ao carregar áudio:', audioSrc)}
        onPlay={() => { setIsPlaying(true); startRaf(); }}
        onPause={() => { setIsPlaying(false); stopRaf(); }}
      />

      <div className="preview-controls">
        <button className="control-btn" onClick={togglePlay} disabled={!audioSrc}>
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>

        <span className="time-display">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        <input
          type="range"
          min="0"
          max={duration || 0}
          step="0.1"
          value={currentTime}
          onChange={handleSeek}
          className="progress-bar"
        />

        <button
          className="audio-switch-btn"
          onClick={() => onAudioTypeChange(audioType === 'original' ? 'instrumental' : 'original')}
          disabled={
            audioType === 'original'
              ? !mediaFiles?.musicaInstrumental
              : !mediaFiles?.musicaOriginal
          }
        >
          <Music size={18} />
          {audioType === 'original' ? 'Original' : 'Playback'}
        </button>

        <input
          type="color"
          value={backgroundColor}
          onChange={(e) => onBackgroundColorChange(e.target.value)}
          title="Cor de fundo"
        />
      </div>
    </div>
  );
};

export default PreviewPanel;
