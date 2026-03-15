import React, { useEffect, useRef, useState, useMemo } from 'react';
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

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);

  // Mantém o preview SEMPRE 16:9 e sempre visível (sem scroll)
  const [previewBoxSize, setPreviewBoxSize] = useState({ width: '100%', height: 'auto' });

  // ✅ NÃO DUPLICA URL
  const cleanUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return url;
  };

  const audioSrc = useMemo(() => {
    const src =
      audioType === 'instrumental'
        ? mediaFiles?.musicaInstrumental
        : mediaFiles?.musicaOriginal;

    return cleanUrl(src);
  }, [audioType, mediaFiles]);

  // 🔥 CORREÇÃO: troca áudio mantendo tempo atual
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
      }
    };

  }, [audioSrc]);

  // ✅ Calcula o maior retângulo 16:9 que cabe no espaço disponível
  useEffect(() => {
    if (!stageRef.current) return;

    const el = stageRef.current;

    const calcAndSet = () => {
      // 🔒 Não mexe no mobile (layout já está bom): mantém 16:9 só pela largura
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

      if (h > hMax) {
        h = hMax;
        w = (h * 16) / 9;
      }

      setPreviewBoxSize({
        width: `${Math.floor(w)}px`,
        height: `${Math.floor(h)}px`
      });
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

  const togglePlay = async () => {
    if (!audioRef.current || !audioSrc) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
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

  const getCurrentStanza = () => {
    return stanzas.find((stanza) => {
      if (!stanza.startTime || !stanza.endTime) return false;

      const [sm, ss] = stanza.startTime.split(':').map(Number);
      const [em, es] = stanza.endTime.split(':').map(Number);

      const start = sm * 60 + ss;
      const end = em * 60 + es;

      return currentTime >= start && currentTime <= end;
    });
  };

  const currentStanza = getCurrentStanza();

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
          {currentStanza && (
            <div
              className="lyrics-display"
              style={{
                fontSize: `${currentStanza.fontSize}px`,
                fontFamily: currentStanza.fontFamily,
                color: currentStanza.color,
                textShadow: `2px 2px 4px ${currentStanza.outlineColor}`,
                fontWeight: currentStanza.bold ? 'bold' : 'normal',
                fontStyle: currentStanza.italic ? 'italic' : 'normal',
                textDecoration: currentStanza.underline ? 'underline' : 'none',
                textAlign: currentStanza.alignment
              }}
            >
              {currentStanza.text}
            </div>
          )}
        </div>
      </div>

      <audio
        ref={audioRef}
        crossOrigin="anonymous"
        onTimeUpdate={(e) => onTimeUpdate(e.target.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.target.duration)}
        onEnded={() => setIsPlaying(false)}
        onError={() => {
          console.error('Erro ao carregar áudio:', audioSrc);
        }}
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
