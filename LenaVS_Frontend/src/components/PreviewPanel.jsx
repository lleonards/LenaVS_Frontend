import React, { useEffect, useLayoutEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Play, Pause, Music } from 'lucide-react';
import './PreviewPanel.css';
import { formatTimecode } from '../utils/timecode';
import {
  DEFAULT_STANZA_POSITION,
  STANZA_FONT_SIZE_MAX,
  STANZA_FONT_SIZE_MIN,
  STANZA_SCALE_MAX,
  STANZA_SCALE_MIN,
  getStanzaTransform,
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
    '0 0 14px rgba(0, 0, 0, 0.35)',
  ];

  return shadowPoints.join(', ');
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const POSITION_DECIMAL_PRECISION = 2;
const POSITION_EPSILON = 0.05;
const SCALE_EPSILON = 0.01;
const PREVIEW_SAFE_PADDING = 8;
const PREVIEW_MAX_WIDTH_RATIO = 0.92;
const SCALE_DRAG_MULTIPLIER = 0.005;
const FONT_DRAG_MULTIPLIER = 0.16;

const toPositionPercentage = (value, total) => {
  if (!total) return 0;
  return Number(((value / total) * 100).toFixed(POSITION_DECIMAL_PRECISION));
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
  onSelectStanza = () => {},
  onStanzaPositionChange = () => {},
  onStanzaFontSizeChange = () => {},
  onStanzaScaleChange = () => {},
}) => {
  const audioRef = useRef(null);
  const stageRef = useRef(null);
  const previewBoxRef = useRef(null);
  const rafRef = useRef(null);
  const pendingSeekTimeRef = useRef(null);
  const interactionStateRef = useRef(null);
  const stanzaElementRef = useRef(null);
  const measureStanzaRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [previewBoxSize, setPreviewBoxSize] = useState({ width: '100%', height: 'auto' });
  const [transitionClass, setTransitionClass] = useState('');
  const [interactionState, setInteractionState] = useState({ stanzaId: null, mode: null });

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

  const getPreviewMetrics = useCallback(() => {
    const previewRect = previewBoxRef.current?.getBoundingClientRect();

    if (!previewRect?.width || !previewRect?.height) {
      return null;
    }

    return {
      width: previewRect.width,
      height: previewRect.height,
    };
  }, []);

  const getNormalizedPosition = useCallback((position = {}) => ({
    ...DEFAULT_STANZA_POSITION,
    ...(position || {}),
  }), []);

  const getPreviewMaxWidth = useCallback((metrics) => {
    if (!metrics?.width) return 48;
    return Math.max(48, Math.min(metrics.width * PREVIEW_MAX_WIDTH_RATIO, 900));
  }, []);

  const getPositionLimits = useCallback((position = {}, metrics) => {
    if (!metrics?.width || !metrics?.height) {
      return null;
    }

    const normalizedPosition = getNormalizedPosition(position);
    const centerX = clamp((normalizedPosition.x / 100) * metrics.width, 0, metrics.width);
    const centerY = clamp((normalizedPosition.y / 100) * metrics.height, 0, metrics.height);

    return {
      centerX,
      centerY,
      maxWidth: Math.max(56, Math.floor((Math.min(centerX, metrics.width - centerX) * 2) - (PREVIEW_SAFE_PADDING * 2))),
      maxHeight: Math.max(36, Math.floor((Math.min(centerY, metrics.height - centerY) * 2) - (PREVIEW_SAFE_PADDING * 2))),
    };
  }, [getNormalizedPosition]);

  const clampPositionToPreview = useCallback((position = {}, size = {}, metrics) => {
    if (!metrics?.width || !metrics?.height) {
      return getNormalizedPosition(position);
    }

    const normalizedPosition = getNormalizedPosition(position);
    const halfWidth = Math.min((size.width || 0) / 2, metrics.width / 2);
    const halfHeight = Math.min((size.height || 0) / 2, metrics.height / 2);

    const minCenterX = halfWidth;
    const maxCenterX = Math.max(halfWidth, metrics.width - halfWidth);
    const minCenterY = halfHeight;
    const maxCenterY = Math.max(halfHeight, metrics.height - halfHeight);

    const nextCenterX = clamp((normalizedPosition.x / 100) * metrics.width, minCenterX, maxCenterX);
    const nextCenterY = clamp((normalizedPosition.y / 100) * metrics.height, minCenterY, maxCenterY);

    return {
      x: toPositionPercentage(nextCenterX, metrics.width),
      y: toPositionPercentage(nextCenterY, metrics.height),
    };
  }, [getNormalizedPosition]);

  const measureStanzaBaseSize = useCallback((stanza, fontSize, maxWidth) => {
    const measureNode = measureStanzaRef.current;
    const metrics = getPreviewMetrics();

    if (!measureNode || !stanza || !metrics) {
      return null;
    }

    const contentNode = measureNode.querySelector('.preview-stanza-content');
    if (contentNode) {
      contentNode.textContent = stanza.text || '';
    }

    const previewMaxWidth = getPreviewMaxWidth(metrics);
    const effectiveMaxWidth = Math.max(48, Math.min(previewMaxWidth, maxWidth ?? previewMaxWidth));

    Object.assign(measureNode.style, {
      fontSize: `${fontSize}px`,
      fontFamily: stanza.fontFamily || 'Montserrat',
      color: stanza.color || '#FFFFFF',
      fontWeight: stanza.bold ? 'bold' : 'normal',
      fontStyle: stanza.italic ? 'italic' : 'normal',
      textDecoration: stanza.underline ? 'underline' : 'none',
      textAlign: stanza.alignment || 'center',
      maxWidth: `${effectiveMaxWidth}px`,
      width: 'fit-content',
      transform: 'none',
      textShadow: buildOutlineShadow(stanza.outlineColor || '#000000'),
    });

    const rect = measureNode.getBoundingClientRect();

    if (!rect.width || !rect.height) {
      return null;
    }

    return {
      width: rect.width,
      height: rect.height,
    };
  }, [getPreviewMaxWidth, getPreviewMetrics]);

  const measureScaledSize = useCallback((stanza, { fontSize, scaleX, scaleY, maxWidth } = {}) => {
    const baseSize = measureStanzaBaseSize(stanza, fontSize, maxWidth);

    if (!baseSize) {
      return null;
    }

    return {
      baseWidth: baseSize.width,
      baseHeight: baseSize.height,
      width: baseSize.width * scaleX,
      height: baseSize.height * scaleY,
    };
  }, [measureStanzaBaseSize]);

  const findMaxFittingFontSize = useCallback((stanza, position, scaleX, scaleY, maxCandidate = STANZA_FONT_SIZE_MAX) => {
    const metrics = getPreviewMetrics();

    if (!stanza || !metrics) {
      return STANZA_FONT_SIZE_MIN;
    }

    const limits = getPositionLimits(position, metrics);
    if (!limits) {
      return STANZA_FONT_SIZE_MIN;
    }

    let low = STANZA_FONT_SIZE_MIN;
    let high = Math.max(STANZA_FONT_SIZE_MIN, Math.min(Math.round(maxCandidate), STANZA_FONT_SIZE_MAX));
    let best = STANZA_FONT_SIZE_MIN;

    while (low <= high) {
      const middle = Math.floor((low + high) / 2);
      const size = measureScaledSize(stanza, {
        fontSize: middle,
        scaleX,
        scaleY,
        maxWidth: limits.maxWidth / Math.max(scaleX, STANZA_SCALE_MIN),
      });

      if (size && size.width <= limits.maxWidth && size.height <= limits.maxHeight) {
        best = middle;
        low = middle + 1;
      } else {
        high = middle - 1;
      }
    }

    return best;
  }, [getPositionLimits, getPreviewMetrics, measureScaledSize]);

  const findMaxScaleForAxis = useCallback((stanza, axis, position, fontSize, maxCandidate = STANZA_SCALE_MAX) => {
    const metrics = getPreviewMetrics();
    if (!stanza || !metrics) {
      return STANZA_SCALE_MIN;
    }

    const limits = getPositionLimits(position, metrics);
    if (!limits) {
      return STANZA_SCALE_MIN;
    }

    const baseSize = measureStanzaBaseSize(stanza, fontSize, getPreviewMaxWidth(metrics));
    if (!baseSize) {
      return STANZA_SCALE_MIN;
    }

    const rawMax = axis === 'x'
      ? limits.maxWidth / Math.max(baseSize.width, 1)
      : limits.maxHeight / Math.max(baseSize.height, 1);

    return clamp(rawMax, STANZA_SCALE_MIN, Math.min(maxCandidate, STANZA_SCALE_MAX));
  }, [getPositionLimits, getPreviewMaxWidth, getPreviewMetrics, measureStanzaBaseSize]);

  const applyDraggedPosition = useCallback((clientX, clientY) => {
    const interaction = interactionStateRef.current;
    const previewRect = previewBoxRef.current?.getBoundingClientRect();

    if (!interaction || interaction.mode !== 'move' || !previewRect) return;

    const liveRect = stanzaElementRef.current?.getBoundingClientRect();
    const halfWidth = (liveRect?.width || interaction.elementWidth || 0) / 2;
    const halfHeight = (liveRect?.height || interaction.elementHeight || 0) / 2;
    const deltaX = clientX - interaction.pointerStartX;
    const deltaY = clientY - interaction.pointerStartY;

    const centerX = clamp(
      interaction.startCenterX + deltaX,
      halfWidth,
      Math.max(halfWidth, previewRect.width - halfWidth)
    );

    const centerY = clamp(
      interaction.startCenterY + deltaY,
      halfHeight,
      Math.max(halfHeight, previewRect.height - halfHeight)
    );

    onStanzaPositionChange(interaction.stanzaId, {
      x: toPositionPercentage(centerX, previewRect.width),
      y: toPositionPercentage(centerY, previewRect.height),
    });
  }, [onStanzaPositionChange]);

  const applyResize = useCallback((clientX, clientY) => {
    const interaction = interactionStateRef.current;

    if (!interaction || interaction.mode === 'move') return;

    const stanza = stanzas.find((item) => item.id === interaction.stanzaId);
    if (!stanza) return;

    const position = getNormalizedPosition(stanza.position || {});
    const { scaleX, scaleY } = getStanzaTransform(stanza);
    const currentFontSize = Number(stanza.fontSize) || 32;

    if (interaction.mode === 'uniform') {
      const deltaX = clientX - interaction.pointerStartX;
      const deltaY = clientY - interaction.pointerStartY;
      const delta = (deltaX + deltaY) / 2;
      const proposedFontSize = clamp(
        Math.round(interaction.startFontSize + (delta * FONT_DRAG_MULTIPLIER)),
        STANZA_FONT_SIZE_MIN,
        STANZA_FONT_SIZE_MAX
      );

      const maxFittingFontSize = findMaxFittingFontSize(stanza, position, scaleX, scaleY, proposedFontSize);
      onStanzaFontSizeChange(interaction.stanzaId, Math.min(proposedFontSize, maxFittingFontSize));
      return;
    }

    if (interaction.mode === 'horizontal') {
      const deltaX = clientX - interaction.pointerStartX;
      const proposedScaleX = clamp(
        Number((interaction.startScaleX + (deltaX * SCALE_DRAG_MULTIPLIER)).toFixed(3)),
        STANZA_SCALE_MIN,
        STANZA_SCALE_MAX
      );
      const maxScaleX = findMaxScaleForAxis(stanza, 'x', position, currentFontSize, proposedScaleX);
      onStanzaScaleChange(interaction.stanzaId, { scaleX: Number(Math.min(proposedScaleX, maxScaleX).toFixed(3)) });
      return;
    }

    if (interaction.mode === 'vertical') {
      const deltaY = clientY - interaction.pointerStartY;
      const proposedScaleY = clamp(
        Number((interaction.startScaleY + (deltaY * SCALE_DRAG_MULTIPLIER)).toFixed(3)),
        STANZA_SCALE_MIN,
        STANZA_SCALE_MAX
      );
      const maxScaleY = findMaxScaleForAxis(stanza, 'y', position, currentFontSize, proposedScaleY);
      onStanzaScaleChange(interaction.stanzaId, { scaleY: Number(Math.min(proposedScaleY, maxScaleY).toFixed(3)) });
    }
  }, [findMaxFittingFontSize, findMaxScaleForAxis, getNormalizedPosition, onStanzaFontSizeChange, onStanzaScaleChange, stanzas]);

  useEffect(() => {
    const handlePointerMove = (event) => {
      if (!interactionStateRef.current) return;

      if (interactionStateRef.current.mode === 'move') {
        applyDraggedPosition(event.clientX, event.clientY);
        return;
      }

      applyResize(event.clientX, event.clientY);
    };

    const handlePointerUp = () => {
      interactionStateRef.current = null;
      setInteractionState({ stanzaId: null, mode: null });
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [applyDraggedPosition, applyResize]);

  useLayoutEffect(() => {
    if (!stanzaForPreview) return;

    const metrics = getPreviewMetrics();
    const stanzaRect = stanzaElementRef.current?.getBoundingClientRect();

    if (!metrics || !stanzaRect?.width || !stanzaRect?.height) {
      return;
    }

    const currentPosition = getNormalizedPosition(stanzaForPreview.position || {});
    const clampedPosition = clampPositionToPreview(
      currentPosition,
      {
        width: stanzaRect.width,
        height: stanzaRect.height,
      },
      metrics
    );

    const hasPositionOverflow =
      Math.abs(clampedPosition.x - currentPosition.x) > POSITION_EPSILON
      || Math.abs(clampedPosition.y - currentPosition.y) > POSITION_EPSILON;

    if (hasPositionOverflow) {
      onStanzaPositionChange(stanzaForPreview.id, clampedPosition);
      return;
    }

    const currentFontSize = Number(stanzaForPreview.fontSize) || 32;
    const { scaleX, scaleY } = getStanzaTransform(stanzaForPreview);
    const maxScaleX = findMaxScaleForAxis(stanzaForPreview, 'x', clampedPosition, currentFontSize, scaleX);
    const maxScaleY = findMaxScaleForAxis(stanzaForPreview, 'y', clampedPosition, currentFontSize, scaleY);
    const nextScaleX = Number(Math.min(scaleX, maxScaleX).toFixed(3));
    const nextScaleY = Number(Math.min(scaleY, maxScaleY).toFixed(3));

    if (Math.abs(nextScaleX - scaleX) > SCALE_EPSILON || Math.abs(nextScaleY - scaleY) > SCALE_EPSILON) {
      onStanzaScaleChange(stanzaForPreview.id, {
        scaleX: nextScaleX,
        scaleY: nextScaleY,
      });
      return;
    }

    const maxFittingFontSize = findMaxFittingFontSize(stanzaForPreview, clampedPosition, nextScaleX, nextScaleY, currentFontSize);

    if (currentFontSize > maxFittingFontSize) {
      onStanzaFontSizeChange(stanzaForPreview.id, maxFittingFontSize);
    }
  }, [
    clampPositionToPreview,
    findMaxFittingFontSize,
    findMaxScaleForAxis,
    getNormalizedPosition,
    getPreviewMetrics,
    onStanzaFontSizeChange,
    onStanzaPositionChange,
    onStanzaScaleChange,
    previewBoxSize,
    stanzaForPreview,
  ]);

  const handleControlPointerDown = useCallback((event, stanza, mode) => {
    const previewRect = previewBoxRef.current?.getBoundingClientRect();
    const stanzaRect = stanzaElementRef.current?.getBoundingClientRect();

    if (!previewRect || !stanzaRect) return;

    event.preventDefault();
    event.stopPropagation();

    onSelectStanza(stanza.id);

    const position = getNormalizedPosition(stanza.position || {});
    const transform = getStanzaTransform(stanza);

    interactionStateRef.current = {
      mode,
      stanzaId: stanza.id,
      pointerStartX: event.clientX,
      pointerStartY: event.clientY,
      startCenterX: (position.x / 100) * previewRect.width,
      startCenterY: (position.y / 100) * previewRect.height,
      elementWidth: stanzaRect.width,
      elementHeight: stanzaRect.height,
      startFontSize: Number(stanza.fontSize) || 32,
      startScaleX: transform.scaleX,
      startScaleY: transform.scaleY,
    };

    setInteractionState({ stanzaId: stanza.id, mode });

    document.body.style.userSelect = 'none';
    document.body.style.cursor = mode === 'move'
      ? 'grabbing'
      : mode === 'horizontal'
        ? 'ew-resize'
        : mode === 'vertical'
          ? 'ns-resize'
          : 'nwse-resize';
  }, [getNormalizedPosition, onSelectStanza]);

  const getTextStyle = (stanza) => {
    const { scaleX, scaleY } = getStanzaTransform(stanza);

    return {
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
      transform: `scale(${scaleX}, ${scaleY})`,
      transformOrigin: 'center center',
    };
  };

  const renderPreviewStanza = () => {
    if (!stanzaForPreview) return null;

    const position = getNormalizedPosition(stanzaForPreview.position || {});
    const isSelected = selectedStanzaId === stanzaForPreview.id;
    const isPlaybackVisible = currentStanza?.id === stanzaForPreview.id;
    const activeMode = interactionState.stanzaId === stanzaForPreview.id ? interactionState.mode : null;
    const selectedStanzaHasStart = hasDefinedStartTime(stanzaForPreview);
    const helperText = selectedStanzaHasStart
      ? 'Use as alças discretas: topo para mover, lateral para largura, base para altura e canto para escala geral.'
      : 'Defina o início da estrofe para abrir direto no preview.';

    return (
      <div className="lyrics-canvas-layer">
        <div
          className="preview-stanza-anchor"
          style={{ left: `${position.x}%`, top: `${position.y}%` }}
        >
          <div
            ref={stanzaElementRef}
            className={`lyrics-display lyrics-plain preview-stanza ${isSelected ? 'preview-stanza-selected' : ''} ${activeMode ? `preview-stanza-mode-${activeMode}` : ''}`}
            style={getTextStyle(stanzaForPreview)}
            onClick={(event) => {
              event.stopPropagation();
              onSelectStanza(stanzaForPreview.id);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelectStanza(stanzaForPreview.id);
              }
            }}
            role="button"
            tabIndex={0}
            title={helperText}
          >
            <span className={`preview-stanza-content ${isPlaybackVisible ? transitionClass : 'stanza-visible'}`}>
              {stanzaForPreview.text}
            </span>

            {isSelected && (
              <>
                <button
                  type="button"
                  className={`preview-control-handle preview-control-handle-move${activeMode === 'move' ? ' is-active' : ''}`}
                  onPointerDown={(event) => handleControlPointerDown(event, stanzaForPreview, 'move')}
                  title="Mover"
                  aria-label="Mover estrofe"
                />
                <button
                  type="button"
                  className={`preview-control-handle preview-control-handle-horizontal${activeMode === 'horizontal' ? ' is-active' : ''}`}
                  onPointerDown={(event) => handleControlPointerDown(event, stanzaForPreview, 'horizontal')}
                  title="Ajustar largura"
                  aria-label="Ajustar largura"
                />
                <button
                  type="button"
                  className={`preview-control-handle preview-control-handle-vertical${activeMode === 'vertical' ? ' is-active' : ''}`}
                  onPointerDown={(event) => handleControlPointerDown(event, stanzaForPreview, 'vertical')}
                  title="Ajustar altura"
                  aria-label="Ajustar altura"
                />
                <button
                  type="button"
                  className={`preview-control-handle preview-control-handle-uniform${activeMode === 'uniform' ? ' is-active' : ''}`}
                  onPointerDown={(event) => handleControlPointerDown(event, stanzaForPreview, 'uniform')}
                  title="Escala geral"
                  aria-label="Ajustar escala geral"
                />
              </>
            )}
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
              ? 'Controles independentes: topo move, lateral ajusta largura, base ajusta altura e canto altera a escala geral.'
              : 'Defina o início da estrofe para o preview abrir nela automaticamente.'
            : 'Selecione uma estrofe no editor para ajustar posição, escala, largura e altura no preview.'}
        </span>
      </div>

      <div className="preview-stage" ref={stageRef}>
        <div className="preview-video" ref={previewBoxRef} style={{ backgroundColor, ...previewBoxSize }}>
          {renderPreviewStanza()}
          <div className="preview-stanza-measure-layer" aria-hidden="true">
            <div ref={measureStanzaRef} className="lyrics-display lyrics-plain preview-stanza preview-stanza-measure">
              <span className="preview-stanza-content" />
            </div>
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
