import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Play, Pause, Music } from 'lucide-react';
import { getStanzaBoundsInSeconds } from '../utils/time';
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
  const rafRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [previewBoxSize, setPreviewBoxSize] = useState({ width: '100%', height: 'auto' });
  const [transitionClass, setTransitionClass] = useState('');

  const previousStanzaIdRef = useRef(null);

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

  useEffect(() => () => stopRaf(), [stopRaf]);

  const audioSrc = useMemo(() => {
    if (audioType === 'instrumental') return mediaFiles?.musicaInstrumental || null;
    return mediaFiles?.musicaOriginal || null;
  }, [audioType, mediaFiles]);

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

  useEffect(() => {
    if (!stageRef.current) return;
    const element = stageRef.current;

    const calculateSize = () => {
      if (window.matchMedia && window.matchMedia('(max-width: 768px)').matches) {
        setPreviewBoxSize({ width: '100%', height: 'auto' });
        return;
      }

      const rect = element.getBoundingClientRect();
      const maxWidth = rect.width;
      const maxHeight = rect.height;
      if (!maxWidth || !maxHeight) return;

      let width = maxWidth;
      let height = (width * 9) / 16;
      if (height > maxHeight) {
        height = maxHeight;
        width = (height * 16) / 9;
      }

      setPreviewBoxSize({
        width: `${Math.floor(width)}px`,
        height: `${Math.floor(height)}px`,
      });
    };

    calculateSize();
    let resizeObserver;

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => calculateSize());
      resizeObserver.observe(element);
    }

    window.addEventListener('resize', calculateSize);
    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('resize', calculateSize);
    };
  }, []);

  const { currentStanza, currentLineIndex } = useMemo(() => {
    if (!stanzas.length || audioType === 'instrumental') {
      return { currentStanza: null, currentLineIndex: -1 };
    }

    const activeStanza = stanzas.find((stanza) => {
      const { start, end } = getStanzaBoundsInSeconds(stanza);
      if (!Number.isFinite(start) || !Number.isFinite(end)) return false;

      const leadIn = typeof stanza.leadIn === 'number' ? stanza.leadIn : 0.5;
      return currentTime >= Math.max(0, start - leadIn) && currentTime <= end;
    });

    if (!activeStanza) {
      return { currentStanza: null, currentLineIndex: -1 };
    }

    let lineIndex = -1;
    if (Array.isArray(activeStanza.lines) && activeStanza.lines.length > 0) {
      for (let index = 0; index < activeStanza.lines.length; index += 1) {
        const line = activeStanza.lines[index];
        if (Number.isFinite(line.start) && Number.isFinite(line.end)) {
          if (currentTime >= line.start - 0.08 && currentTime <= line.end + 0.08) {
            lineIndex = index;
            break;
          }
        }
      }

      if (lineIndex === -1) {
        const { start, end } = getStanzaBoundsInSeconds(activeStanza);
        const stanzaDuration = Math.max(0, (end || 0) - (start || 0));
        if (stanzaDuration > 0) {
          const relativePosition = (currentTime - start) / stanzaDuration;
          lineIndex = Math.min(activeStanza.lines.length - 1, Math.max(0, Math.floor(relativePosition * activeStanza.lines.length)));
        }
      }
    }

    return { currentStanza: activeStanza, currentLineIndex: lineIndex };
  }, [stanzas, currentTime, audioType]);

  useEffect(() => {
    if (!currentStanza) {
      previousStanzaIdRef.current = null;
      return;
    }

    if (previousStanzaIdRef.current !== currentStanza.id) {
      previousStanzaIdRef.current = currentStanza.id;
      setTransitionClass('stanza-enter');
      const timeout = setTimeout(() => setTransitionClass('stanza-visible'), 50);
      return () => clearTimeout(timeout);
    }
  }, [currentStanza]);

  const getTextStyle = (stanza) => ({
    fontSize: `${stanza.fontSize || 32}px`,
    fontFamily: stanza.fontFamily || 'Montserrat',
    color: stanza.color || '#FFFFFF',
    fontWeight: stanza.bold ? 'bold' : 'normal',
    fontStyle: stanza.italic ? 'italic' : 'normal',
    textDecoration: stanza.underline ? 'underline' : 'none',
    textAlign: stanza.alignment || 'center',
    width: '100%',
  });

  const renderLyricsKaraoke = () => {
    if (!currentStanza || audioType === 'instrumental') return null;

    const lines = currentStanza.text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (!lines.length) {
      return (
        <div className={`lyrics-display ${transitionClass}`} style={getTextStyle(currentStanza)}>
          {currentStanza.text}
        </div>
      );
    }

    return (
      <div className={`lyrics-display lyrics-karaoke ${transitionClass}`}>
        {lines.map((line, index) => {
          const isActive = currentLineIndex === index || (currentLineIndex === -1 && index === 0);
          const isPast = currentLineIndex > index;
          const isFuture = currentLineIndex !== -1 && currentLineIndex < index;

          return (
            <div
              key={`${currentStanza.id}-${index}`}
              className={`karaoke-line${isActive ? ' karaoke-line-active' : ''}${isPast ? ' karaoke-line-past' : ''}${isFuture ? ' karaoke-line-future' : ''}`}
              style={{
                fontFamily: currentStanza.fontFamily || 'Montserrat',
                fontSize: `${currentStanza.fontSize || 32}px`,
                fontWeight: currentStanza.bold ? 'bold' : 'normal',
                fontStyle: currentStanza.italic ? 'italic' : 'normal',
                textDecoration: currentStanza.underline ? 'underline' : 'none',
                color: isActive ? currentStanza.color || '#FFFFFF' : undefined,
                textAlign: currentStanza.alignment || 'center',
                width: '100%',
              }}
            >
              {line}
            </div>
          );
        })}
      </div>
    );
  };

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
    } catch (error) {
      console.error('Erro ao tentar tocar áudio:', error);
    }
  };

  const handleSeek = (event) => {
    const nextTime = Number(event.target.value);
    if (!audioRef.current) return;

    audioRef.current.currentTime = nextTime;
    onTimeUpdate(nextTime);
  };

  const formatClock = (seconds) => {
    if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
    const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${secs}`;
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
        onTimeUpdate={(event) => {
          if (!rafRef.current) onTimeUpdate(event.target.currentTime);
        }}
        onLoadedMetadata={(event) => setDuration(event.target.duration)}
        onEnded={() => {
          setIsPlaying(false);
          stopRaf();
        }}
        onError={() => console.error('Erro ao carregar áudio:', audioSrc)}
        onPlay={() => {
          setIsPlaying(true);
          startRaf();
        }}
        onPause={() => {
          setIsPlaying(false);
          stopRaf();
        }}
      />

      <div className="preview-controls">
        <button className="control-btn" onClick={togglePlay} disabled={!audioSrc}>
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>

        <span className="time-display">
          {formatClock(currentTime)} / {formatClock(duration)}
        </span>

        <input
          type="range"
          min="0"
          max={duration || 0}
          step="0.01"
          value={Math.min(currentTime, duration || currentTime || 0)}
          onChange={handleSeek}
          className="progress-bar"
        />

        <button
          className="audio-switch-btn"
          onClick={() => onAudioTypeChange(audioType === 'original' ? 'instrumental' : 'original')}
          disabled={audioType === 'original' ? !mediaFiles?.musicaInstrumental : !mediaFiles?.musicaOriginal}
        >
          <Music size={18} />
          {audioType === 'original' ? 'Original' : 'Playback'}
        </button>

        <input
          type="color"
          value={backgroundColor}
          onChange={(event) => onBackgroundColorChange(event.target.value)}
          title="Cor de fundo"
        />
      </div>
    </div>
  );
};

export default PreviewPanel;
