import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Play, Pause, Music, Move } from 'lucide-react';
import './PreviewPanel.css';
import { formatTimecode } from '../utils/timecode';
import {
  DEFAULT_STANZA_POSITION,
  STANZA_FONT_SIZE_MAX,
  STANZA_FONT_SIZE_MIN,
  hasDefinedStartTime,
  isStanzaActiveAtTime,
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
    `0 0 14px rgba(0, 0, 0, 0.35)`,
  ];

  return shadowPoints.join(', ');
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

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
  onSelectStanza = () => {},
  onStanzaPositionChange = () => {},
  onStanzaFontSizeChange = () => {},
}) => {
  const audioRef = useRef(null);
  const stageRef = useRef(null);
  const previewBoxRef = useRef(null);
  const rafRef = useRef(null);
  const pendingSeekTimeRef = useRef(null);
  const interactionStateRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [previewBoxSize, setPreviewBoxSize] = useState({ width: '100%', height: 'auto' });
  const [transitionClass, setTransitionClass] = useState('');
  const [draggingStanzaId, setDraggingStanzaId] = useState(null);
  const [resizingStanzaId, setResizingStanzaId] = useState(null);

  const prevStanzaIdRef = useRef(null);

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
      if (window.matchMedia && window.matchMedia('(max-width: 768px)').matches) {
        setPreviewBoxSize({ width: '100%', height: 'auto' });
        return;
      }

      const rect = container.getBoundingClientRect();
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

  useEffect(() => {
    if (!currentStanza) {
      prevStanzaIdRef.current = null;
      setTransitionClass('');
      return;
    }

    if (prevStanzaIdRef.current !== currentStanza.id) {
      prevStanzaIdRef.current = currentStanza.id;
      setTransitionClass('stanza-enter');
      const timeout = setTimeout(() => setTransitionClass('stanza-visible'), 45);
      return () => clearTimeout(timeout);
    }
  }, [currentStanza]);

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

  const applyDraggedPosition = useCallback((clientX, clientY) => {
    const interaction = interactionStateRef.current;
    const previewRect = previewBoxRef.current?.getBoundingClientRect();

    if (!interaction || interaction.mode !== 'drag' || !previewRect) return;

    const halfWidth = interaction.elementWidth / 2;
    const halfHeight = interaction.elementHeight / 2;

    const centerX = clamp(
      clientX - previewRect.left - interaction.offsetX + halfWidth,
      halfWidth,
      Math.max(halfWidth, previewRect.width - halfWidth)
    );

    const centerY = clamp(
      clientY - previewRect.top - interaction.offsetY + halfHeight,
      halfHeight,
      Math.max(halfHeight, previewRect.height - halfHeight)
    );

    onStanzaPositionChange(interaction.stanzaId, {
      x: Number(((centerX / previewRect.width) * 100).toFixed(2)),
      y: Number(((centerY / previewRect.height) * 100).toFixed(2)),
    });
  }, [onStanzaPositionChange]);

  const applyResize = useCallback((clientX, clientY) => {
    const interaction = interactionStateRef.current;

    if (!interaction || interaction.mode !== 'resize') return;

    const deltaX = clientX - interaction.pointerStartX;
    const deltaY = clientY - interaction.pointerStartY;
    const delta = (deltaX + deltaY) / 2;
    const nextFontSize = clamp(
      Math.round(interaction.startFontSize + delta * interaction.scaleFactor),
      STANZA_FONT_SIZE_MIN,
      STANZA_FONT_SIZE_MAX
    );

    onStanzaFontSizeChange(interaction.stanzaId, nextFontSize);
  }, [onStanzaFontSizeChange]);

  useEffect(() => {
    const handlePointerMove = (event) => {
      if (!interactionStateRef.current) return;

      if (interactionStateRef.current.mode === 'resize') {
        applyResize(event.clientX, event.clientY);
        return;
      }

      applyDraggedPosition(event.clientX, event.clientY);
    };

    const handlePointerUp = () => {
      interactionStateRef.current = null;
      setDraggingStanzaId(null);
      setResizingStanzaId(null);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [applyDraggedPosition, applyResize]);

  const handleStanzaPointerDown = useCallback((event, stanza, mode = 'drag') => {
    const previewRect = previewBoxRef.current?.getBoundingClientRect();
    const stanzaRect = event.currentTarget.closest('.preview-stanza')?.getBoundingClientRect()
      || event.currentTarget.getBoundingClientRect();

    if (!previewRect || !stanzaRect) return;

    event.preventDefault();
    event.stopPropagation();

    onSelectStanza(stanza.id);

    interactionStateRef.current = {
      mode,
      stanzaId: stanza.id,
      offsetX: event.clientX - stanzaRect.left,
      offsetY: event.clientY - stanzaRect.top,
      elementWidth: stanzaRect.width,
      elementHeight: stanzaRect.height,
      pointerStartX: event.clientX,
      pointerStartY: event.clientY,
      startFontSize: Number(stanza.fontSize) || 32,
      scaleFactor: 0.16,
    };

    if (mode === 'resize') {
      setResizingStanzaId(stanza.id);
      setDraggingStanzaId(null);
      document.body.style.cursor = 'nwse-resize';
    } else {
      setDraggingStanzaId(stanza.id);
      setResizingStanzaId(null);
      document.body.style.cursor = 'grabbing';
    }

    document.body.style.userSelect = 'none';
  }, [onSelectStanza]);

  const getTextStyle = (stanza) => ({
    fontSize: `${stanza.fontSize || 32}px`,
    fontFamily: stanza.fontFamily || 'Montserrat',
    color: stanza.color || '#FFFFFF',
    fontWeight: stanza.bold ? 'bold' : 'normal',
    fontStyle: stanza.italic ? 'italic' : 'normal',
    textDecoration: stanza.underline ? 'underline' : 'none',
    textAlign: stanza.alignment || 'center',
    width: 'fit-content',
    maxWidth: 'min(92%, 900px)',
    textShadow: buildOutlineShadow(stanza.outlineColor || '#000000'),
  });

  const renderPreviewStanza = () => {
    if (!stanzaForPreview) return null;

    const position = {
      ...DEFAULT_STANZA_POSITION,
      ...(stanzaForPreview.position || {}),
    };

    const isSelected = selectedStanzaId === stanzaForPreview.id;
    const isDragging = draggingStanzaId === stanzaForPreview.id;
    const isResizing = resizingStanzaId === stanzaForPreview.id;
    const isPlaybackVisible = currentStanza?.id === stanzaForPreview.id;
    const helperText = hasDefinedStartTime(stanzaForPreview)
      ? 'Arraste livremente como no Canva e use a alça para redimensionar.'
      : 'Defina o início da estrofe para abrir direto no preview.';

    return (
      <div className="lyrics-canvas-layer">
        <div
          className="preview-stanza-anchor"
          style={{ left: `${position.x}%`, top: `${position.y}%` }}
        >
          <div
            className={`lyrics-display lyrics-plain preview-stanza ${isPlaybackVisible ? transitionClass : 'stanza-visible'} ${isSelected ? 'preview-stanza-selected' : ''} ${isDragging ? 'preview-stanza-dragging' : ''} ${isResizing ? 'preview-stanza-resizing' : ''}`}
            style={getTextStyle(stanzaForPreview)}
            onClick={(event) => {
              event.stopPropagation();
              onSelectStanza(stanzaForPreview.id);
            }}
            onPointerDown={(event) => handleStanzaPointerDown(event, stanzaForPreview, 'drag')}
            role="button"
            tabIndex={0}
            title={helperText}
          >
            <span className="preview-stanza-toolbar">
              <span className="preview-stanza-handle">
                <Move size={14} />
              </span>
              <span className="preview-stanza-toolbar-text">Mover</span>
            </span>

            <span className="preview-stanza-content">{stanzaForPreview.text}</span>

            <span
              className="preview-stanza-resize-handle"
              onPointerDown={(event) => handleStanzaPointerDown(event, stanzaForPreview, 'resize')}
              title="Arraste para aumentar ou diminuir o tamanho"
            />
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

  const formatTime = (seconds) => formatTimecode(seconds);
  const selectedStanzaHasStart = hasDefinedStartTime(selectedStanza);

  return (
    <div className="preview-panel">
      <div className="preview-panel-header">
        <h2>Preview</h2>
        <span className="preview-tip">
          {selectedStanza
            ? selectedStanzaHasStart
              ? 'Arraste a estrofe livremente e redimensione pela alça inferior direita.'
              : 'Defina o início da estrofe para o preview abrir nela automaticamente.'
            : 'Selecione uma estrofe no editor para editar posição e tamanho no preview.'}
        </span>
      </div>

      <div className="preview-stage" ref={stageRef}>
        <div className="preview-video" ref={previewBoxRef} style={{ backgroundColor, ...previewBoxSize }}>
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
