import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Play, Pause, Music } from 'lucide-react';
import './PreviewPanel.css';
import { formatFixedTimecode } from '../utils/timecode';
import {
  clampTransitionDuration,
  getMaxSafeFontSizeForStanza,
  isStanzaActiveAtTime,
  normalizeStanzaTransition,
} from '../utils/stanza';

const buildOutlineShadow = (outlineColor = '#000000') => {
  const shadowPoints = [
    `-1px -1px 0 ${outlineColor}`,
    `0 -1px 0 ${outlineColor}`,
    `1px -1px 0 ${outlineColor}`,
    `-1px 0 0 ${outlineColor}`,
    `1px 0 0 ${outlineColor}`,
    `-1px 1px 0 ${outlineColor}`,
    `0 1px 0 ${outlineColor}`,
    `1px 1px 0 ${outlineColor}`,
    '0 0 14px rgba(0, 0, 0, 0.35)',
  ];

  return shadowPoints.join(', ');
};

const getTransitionStartTransform = (transition) => {
  switch (transition) {
    case 'slide':
      return 'translateY(30px)';
    case 'zoom-in':
      return 'scale(0.82)';
    case 'zoom-out':
      return 'scale(1.18)';
    case 'fade':
    default:
      return 'translateY(0) scale(1)';
  }
};

const PreviewPanel = ({
  stanzas = [],
  selectedStanzaId = null,
  currentTime = 0,
  audioType = 'original',
  backgroundColor = '#000000',
  mediaFiles = {},
  seekRequest = null,
  onTimeUpdate = () => {},
  onAudioTypeChange = () => {},
  onBackgroundColorChange = () => {},
  onPreviewMetricsChange = () => {},
}) => {
  const audioRef = useRef(null);
  const stageRef = useRef(null);
  const rafRef = useRef(null);
  const pendingSeekTimeRef = useRef(null);
  const prevAnimatedStanzaKeyRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [previewBoxSize, setPreviewBoxSize] = useState({ width: '100%', height: 'auto' });
  const [previewMetrics, setPreviewMetrics] = useState({ width: 1280, height: 720 });
  const [transitionPhase, setTransitionPhase] = useState('visible');

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

  const cleanUrl = (url) => (url ? url : null);

  const audioSrc = useMemo(() => {
    const src = audioType === 'instrumental' ? mediaFiles?.musicaInstrumental : mediaFiles?.musicaOriginal;
    return cleanUrl(src);
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
      const seekTo = pendingSeekTimeRef.current ?? previousTime;
      audio.currentTime = Math.max(0, seekTo);
      onTimeUpdate(audio.currentTime);

      if (wasPlaying) {
        audio.play().catch(() => {});
        startRaf();
      }
    };
  }, [audioSrc, onTimeUpdate, startRaf]);

  useEffect(() => {
    if (!stageRef.current) return;

    const container = stageRef.current;

    const calcAndSet = () => {
      const rect = container.getBoundingClientRect();
      const maxWidth = rect.width;
      const maxHeight = rect.height;
      const isMobile = window.matchMedia && window.matchMedia('(max-width: 768px)').matches;

      if (!maxWidth) return;

      let width = maxWidth;
      let height = (width * 9) / 16;

      if (!isMobile && maxHeight && height > maxHeight) {
        height = maxHeight;
        width = (height * 16) / 9;
      }

      const nextMetrics = {
        width: Math.max(320, Math.floor(width)),
        height: Math.max(180, Math.floor(height)),
      };

      setPreviewMetrics(nextMetrics);
      onPreviewMetricsChange(nextMetrics);
      setPreviewBoxSize(
        isMobile
          ? { width: '100%', height: 'auto' }
          : { width: `${nextMetrics.width}px`, height: `${nextMetrics.height}px` }
      );
    };

    calcAndSet();

    let resizeObserver;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(calcAndSet);
      resizeObserver.observe(container);
    }

    window.addEventListener('resize', calcAndSet);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', calcAndSet);
    };
  }, [onPreviewMetricsChange]);

  const currentStanza = useMemo(() => {
    if (!stanzas.length) return null;
    return stanzas.find((stanza) => isStanzaActiveAtTime(stanza, currentTime)) || null;
  }, [stanzas, currentTime]);

  const selectedStanza = useMemo(
    () => stanzas.find((stanza) => stanza.id === selectedStanzaId) || null,
    [stanzas, selectedStanzaId]
  );

  const stanzaForPreview = useMemo(() => {
    if (isPlaying) {
      return currentStanza;
    }

    return selectedStanza || currentStanza;
  }, [currentStanza, isPlaying, selectedStanza]);

  const animatedStanzaKey = useMemo(() => {
    if (!currentStanza) return null;

    return [
      currentStanza.id,
      normalizeStanzaTransition(currentStanza.transition),
      clampTransitionDuration(currentStanza.transitionDuration ?? 1),
    ].join(':');
  }, [currentStanza]);

  useEffect(() => {
    if (!animatedStanzaKey || !isPlaying) {
      prevAnimatedStanzaKeyRef.current = animatedStanzaKey;
      setTransitionPhase('visible');
      return;
    }

    if (prevAnimatedStanzaKeyRef.current !== animatedStanzaKey) {
      prevAnimatedStanzaKeyRef.current = animatedStanzaKey;
      setTransitionPhase('enter');
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => setTransitionPhase('visible'));
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [animatedStanzaKey, isPlaying]);

  useEffect(() => {
    if (!seekRequest || typeof seekRequest.time !== 'number') return;

    const targetTime = Math.max(0, seekRequest.time);
    pendingSeekTimeRef.current = targetTime;

    if (audioRef.current) {
      try {
        audioRef.current.currentTime = targetTime;
      } catch (error) {
        console.warn('Não foi possível aplicar o seek imediatamente:', error);
      }
    }

    onTimeUpdate(targetTime);
  }, [seekRequest, onTimeUpdate]);

  const getTextStyle = (stanza) => {
    const safeFontSize = getMaxSafeFontSizeForStanza(stanza, previewMetrics);
    const appliedFontSize = Math.min(Number(stanza?.fontSize) || 32, safeFontSize);
    const transitionDuration = clampTransitionDuration(stanza?.transitionDuration ?? 1);
    const transitionType = normalizeStanzaTransition(stanza?.transition);
    const isAnimated = isPlaying && currentStanza?.id === stanza?.id;
    const startTransform = getTransitionStartTransform(transitionType);

    return {
      fontSize: `${appliedFontSize}px`,
      fontFamily: stanza?.fontFamily || 'Montserrat',
      color: stanza?.color || '#FFFFFF',
      fontWeight: stanza?.bold ? 'bold' : 'normal',
      fontStyle: stanza?.italic ? 'italic' : 'normal',
      textDecoration: stanza?.underline ? 'underline' : 'none',
      textAlign: stanza?.alignment || 'center',
      width: 'fit-content',
      maxWidth: '100%',
      textShadow: buildOutlineShadow(stanza?.outlineColor || '#000000'),
      opacity: isAnimated && transitionPhase === 'enter' ? 0 : 1,
      transform: isAnimated && transitionPhase === 'enter' ? startTransform : 'translateY(0) scale(1)',
      transition: `opacity ${transitionDuration}s ease, transform ${transitionDuration}s ease`,
      willChange: 'opacity, transform',
    };
  };

  const renderPreviewStanza = () => {
    if (!stanzaForPreview) return null;

    return (
      <div className="lyrics-canvas-layer">
        <div className="preview-stanza-anchor">
          <div
            className="lyrics-display lyrics-plain preview-stanza"
            style={getTextStyle(stanzaForPreview)}
          >
            <span className="preview-stanza-content">{stanzaForPreview.text}</span>
          </div>
        </div>
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
    const newTime = Number(event.target.value);

    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }

    pendingSeekTimeRef.current = newTime;
    onTimeUpdate(newTime);
  };

  const formatTime = (seconds) => formatFixedTimecode(seconds);

  return (
    <div className="preview-panel">
      <div className="preview-panel-header">
        <h2>Preview</h2>
        <span className="preview-tip">
          Preview somente visual. Ajuste tamanho e transição no Editor de Letras.
        </span>
      </div>

      <div className="preview-stage" ref={stageRef}>
        <div className="preview-video" style={{ backgroundColor, ...previewBoxSize }}>
          {renderPreviewStanza()}
        </div>
      </div>

      <audio
        ref={audioRef}
        crossOrigin="anonymous"
        onTimeUpdate={(event) => {
          if (!rafRef.current) onTimeUpdate(event.target.currentTime);
        }}
        onLoadedMetadata={(event) => {
          const target = pendingSeekTimeRef.current;
          setDuration(event.target.duration);

          if (typeof target === 'number') {
            try {
              event.target.currentTime = target;
            } catch (error) {
              console.warn('Seek pendente falhou após metadata:', error);
            }
            onTimeUpdate(target);
          }
        }}
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
