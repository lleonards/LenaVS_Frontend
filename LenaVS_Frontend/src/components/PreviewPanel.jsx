import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Play, Pause, Music } from 'lucide-react';
import './PreviewPanel.css';
import { formatFixedTimecode } from '../utils/timecode';
import {
  clampTransitionDuration,
  isStanzaActiveAtTime,
  normalizeOutlineWidth,
  normalizeStanzaTransition,
  normalizeStanzaWidthScale,
} from '../utils/stanza';

const LOGICAL_PREVIEW_SIZE = {
  width: 1280,
  height: 720,
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const buildOutlineShadow = (outlineColor = '#000000', outlineWidth = 2) => {
  const safeWidth = clamp(normalizeOutlineWidth(outlineWidth), 1, 10);
  const shadowPoints = [];

  for (let x = -safeWidth; x <= safeWidth; x += 1) {
    for (let y = -safeWidth; y <= safeWidth; y += 1) {
      if (x === 0 && y === 0) continue;
      if (Math.sqrt((x * x) + (y * y)) <= safeWidth + 0.2) {
        shadowPoints.push(`${x}px ${y}px 0 ${outlineColor}`);
      }
    }
  }

  shadowPoints.push('0 0 14px rgba(0, 0, 0, 0.35)');
  return shadowPoints.join(', ');
};

const getTransitionBaseScales = (transition, stanza) => {
  const baseScaleX = normalizeStanzaWidthScale(stanza?.scaleX ?? 1);
  const rawScaleY = Number(stanza?.scaleY);
  const baseScaleY = Number.isFinite(rawScaleY) ? clamp(rawScaleY, 0.35, 4) : 1;

  switch (transition) {
    case 'zoom-in':
      return {
        hiddenScaleX: Math.max(0.35, Number((baseScaleX * 0.82).toFixed(2))),
        hiddenScaleY: Math.max(0.35, Number((baseScaleY * 0.82).toFixed(2))),
        visibleScaleX: baseScaleX,
        visibleScaleY: baseScaleY,
      };
    case 'zoom-out':
      return {
        hiddenScaleX: Math.min(4, Number((baseScaleX * 1.18).toFixed(2))),
        hiddenScaleY: Math.min(4, Number((baseScaleY * 1.18).toFixed(2))),
        visibleScaleX: baseScaleX,
        visibleScaleY: baseScaleY,
      };
    default:
      return {
        hiddenScaleX: baseScaleX,
        hiddenScaleY: baseScaleY,
        visibleScaleX: baseScaleX,
        visibleScaleY: baseScaleY,
      };
  }
};

const buildTransform = (transition, phase, stanza) => {
  const { hiddenScaleX, hiddenScaleY, visibleScaleX, visibleScaleY } = getTransitionBaseScales(transition, stanza);
  const translateY = transition === 'slide' && phase === 'enter' ? 30 : 0;
  const scaleX = phase === 'enter' ? hiddenScaleX : visibleScaleX;
  const scaleY = phase === 'enter' ? hiddenScaleY : visibleScaleY;

  return `translateY(${translateY}px) scale(${scaleX}, ${scaleY})`;
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
  const [previewBoxSize, setPreviewBoxSize] = useState({ width: 1280, height: 720 });
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
    onPreviewMetricsChange(LOGICAL_PREVIEW_SIZE);
  }, [onPreviewMetricsChange]);

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

      setPreviewBoxSize({
        width: Math.max(320, Math.floor(width)),
        height: Math.max(180, Math.floor(height)),
      });
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
  }, []);

  const previewScale = useMemo(() => {
    const widthScale = previewBoxSize.width / LOGICAL_PREVIEW_SIZE.width;
    const heightScale = previewBoxSize.height / LOGICAL_PREVIEW_SIZE.height;
    return Math.min(widthScale, heightScale) || 1;
  }, [previewBoxSize.height, previewBoxSize.width]);

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
      normalizeOutlineWidth(currentStanza.outlineWidth ?? 2),
      normalizeStanzaWidthScale(currentStanza.scaleX ?? 1),
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
    const appliedFontSize = Math.max(12, Number(stanza?.fontSize) || 32);
    const transitionDuration = clampTransitionDuration(stanza?.transitionDuration ?? 1);
    const transitionType = normalizeStanzaTransition(stanza?.transition);
    const isAnimated = isPlaying && currentStanza?.id === stanza?.id;
    const currentPhase = isAnimated ? transitionPhase : 'visible';

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
      overflowWrap: 'anywhere',
      wordBreak: 'break-word',
      textShadow: buildOutlineShadow(stanza?.outlineColor || '#000000', stanza?.outlineWidth ?? 2),
      opacity: isAnimated && currentPhase === 'enter' ? 0 : 1,
      transform: buildTransform(transitionType, currentPhase, stanza),
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
          Preview em canvas 16:9 fixo para bater com a exportação final.
        </span>
      </div>

      <div className="preview-stage" ref={stageRef}>
        <div
          className="preview-video"
          style={{
            backgroundColor,
            width: `${previewBoxSize.width}px`,
            height: `${previewBoxSize.height}px`,
          }}
        >
          <div
            className="preview-video-canvas"
            style={{
              width: `${LOGICAL_PREVIEW_SIZE.width}px`,
              height: `${LOGICAL_PREVIEW_SIZE.height}px`,
              transform: `translate(-50%, -50%) scale(${previewScale})`,
            }}
          >
            {renderPreviewStanza()}
          </div>
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
