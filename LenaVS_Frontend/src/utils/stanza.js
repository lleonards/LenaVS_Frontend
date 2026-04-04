import { DEFAULT_TIMECODE, parseFixedTimecode } from './timecode';

export const DEFAULT_STANZA_POSITION = {
  x: 50,
  y: 78,
};

export const DEFAULT_STANZA_TRANSFORM = {
  scaleX: 1,
  scaleY: 1,
};

export const STANZA_FONT_SIZE_MIN = 12;
export const STANZA_FONT_SIZE_MAX = 120;
export const STANZA_SCALE_MIN = 0.35;
export const STANZA_SCALE_MAX = 4;
export const STANZA_TRANSITION_DURATION_MIN = 0.1;
export const STANZA_TRANSITION_DURATION_MAX = 5;
export const STANZA_TRANSITION_TYPES = ['fade', 'slide', 'zoom-in', 'zoom-out'];

const PREVIEW_SAFE_AREA = {
  frameHorizontalPadding: 32,
  frameVerticalPadding: 32,
  stanzaHorizontalPadding: 38,
  stanzaVerticalPadding: 30,
  minWidth: 80,
  minHeight: 56,
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

let canvasContext = null;

const getCanvasContext = () => {
  if (canvasContext) {
    return canvasContext;
  }

  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvasContext = canvas.getContext('2d');
    return canvasContext;
  }

  return null;
};

const normalizeFontSize = (value) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return 32;
  }

  return clamp(Math.round(numericValue), STANZA_FONT_SIZE_MIN, STANZA_FONT_SIZE_MAX);
};

export const normalizeStanzaTransition = (value) => {
  const normalizedValue = String(value || 'fade').trim().toLowerCase();
  return STANZA_TRANSITION_TYPES.includes(normalizedValue) ? normalizedValue : 'fade';
};

export const clampTransitionDuration = (value) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return 1;
  }

  return Number(
    clamp(numericValue, STANZA_TRANSITION_DURATION_MIN, STANZA_TRANSITION_DURATION_MAX).toFixed(2)
  );
};

export const normalizeStanzaScale = (value) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return 1;
  }

  return Number(clamp(numericValue, STANZA_SCALE_MIN, STANZA_SCALE_MAX).toFixed(3));
};

export const getStanzaTransform = (stanza = {}) => ({
  scaleX: normalizeStanzaScale(stanza?.scaleX ?? DEFAULT_STANZA_TRANSFORM.scaleX),
  scaleY: normalizeStanzaScale(stanza?.scaleY ?? DEFAULT_STANZA_TRANSFORM.scaleY),
});

const buildCanvasFont = (stanza, fontSize) => {
  const style = stanza?.italic ? 'italic ' : '';
  const weight = stanza?.bold ? '700 ' : '400 ';
  const family = stanza?.fontFamily || 'Montserrat';
  return `${style}${weight}${fontSize}px ${family}`;
};

const measureApproximateWidth = (text = '', fontSize = 32) => {
  return String(text).length * fontSize * 0.58;
};

const wrapParagraph = (paragraph, maxWidth, measureText) => {
  const normalizedParagraph = String(paragraph ?? '');
  const words = normalizedParagraph.trim().split(/\s+/).filter(Boolean);

  if (!words.length) {
    return [''];
  }

  const lines = [];
  let currentLine = '';

  words.forEach((word) => {
    const candidate = currentLine ? `${currentLine} ${word}` : word;

    if (!currentLine || measureText(candidate) <= maxWidth) {
      currentLine = candidate;
      return;
    }

    lines.push(currentLine);
    currentLine = word;
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
};

const measureWrappedText = (stanza, fontSize, previewWidth = 1280) => {
  const maxWidth = Math.max(
    PREVIEW_SAFE_AREA.minWidth,
    previewWidth
      - PREVIEW_SAFE_AREA.frameHorizontalPadding
      - PREVIEW_SAFE_AREA.stanzaHorizontalPadding
  );
  const paragraphs = String(stanza?.text || '').replace(/\r/g, '').split('\n');
  const ctx = getCanvasContext();

  if (ctx) {
    ctx.font = buildCanvasFont(stanza, fontSize);
  }

  const measureText = (text) => {
    if (ctx) {
      return ctx.measureText(text).width;
    }

    return measureApproximateWidth(text, fontSize);
  };

  const wrappedLines = paragraphs.flatMap((paragraph) => wrapParagraph(paragraph, maxWidth, measureText));
  const nonEmptyLines = wrappedLines.length ? wrappedLines : [''];
  const widestLine = nonEmptyLines.reduce((max, line) => Math.max(max, measureText(line || ' ')), 0);

  return {
    lineCount: nonEmptyLines.length,
    maxLineWidth: widestLine,
    allowedWidth: maxWidth,
  };
};

export const getMaxSafeFontSizeForStanza = (stanza, options = {}) => {
  const previewWidth = Number(options.previewWidth ?? options.width) || 1280;
  const previewHeight = Number(options.previewHeight ?? options.height) || 720;
  const maxTextHeight = Math.max(
    PREVIEW_SAFE_AREA.minHeight,
    previewHeight
      - PREVIEW_SAFE_AREA.frameVerticalPadding
      - PREVIEW_SAFE_AREA.stanzaVerticalPadding
  );

  let low = STANZA_FONT_SIZE_MIN;
  let high = STANZA_FONT_SIZE_MAX;
  let best = STANZA_FONT_SIZE_MIN;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const metrics = measureWrappedText(stanza, middle, previewWidth);
    const estimatedHeight = metrics.lineCount * middle * 1.5;
    const fitsWidth = metrics.maxLineWidth <= metrics.allowedWidth;
    const fitsHeight = estimatedHeight <= maxTextHeight;

    if (fitsWidth && fitsHeight) {
      best = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return clamp(best, STANZA_FONT_SIZE_MIN, STANZA_FONT_SIZE_MAX);
};

export const generateStanzaId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `stanza-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const hasDefinedStartTime = (stanza) => {
  const rawStart = String(stanza?.startTime ?? '').trim();
  const parsedStart = parseFixedTimecode(rawStart);

  if (parsedStart === null) {
    return false;
  }

  return Boolean(stanza?.hasManualStart) || rawStart !== DEFAULT_TIMECODE;
};

export const createStanzaFromText = (text = 'Nova estrofe', overrides = {}, options = {}) => {
  const finalText = overrides.text ?? text;
  const position = {
    ...DEFAULT_STANZA_POSITION,
    ...(overrides.position || {}),
  };
  const transform = getStanzaTransform(overrides);
  const stanzaId = overrides.id ?? generateStanzaId();
  const safeFontMax = getMaxSafeFontSizeForStanza({
    text: finalText,
    fontFamily: overrides.fontFamily,
    bold: overrides.bold,
    italic: overrides.italic,
  }, options);

  return {
    id: stanzaId,
    text: finalText,
    startTime: DEFAULT_TIMECODE,
    endTime: DEFAULT_TIMECODE,
    fontSize: Math.min(normalizeFontSize(overrides.fontSize ?? 32), safeFontMax),
    fontFamily: 'Montserrat',
    color: '#FFFFFF',
    outlineColor: '#000000',
    bold: false,
    italic: false,
    underline: false,
    transition: 'fade',
    transitionDuration: 1,
    alignment: 'center',
    leadIn: 0.5,
    lines: [],
    hasManualStart: false,
    hasManualEnd: false,
    isDuplicateCopy: false,
    position,
    scaleX: transform.scaleX,
    scaleY: transform.scaleY,
    ...overrides,
    id: stanzaId,
    text: finalText,
    fontSize: Math.min(normalizeFontSize(overrides.fontSize ?? 32), safeFontMax),
    transition: normalizeStanzaTransition(overrides.transition ?? 'fade'),
    transitionDuration: clampTransitionDuration(overrides.transitionDuration ?? 1),
    position,
    lines: Array.isArray(overrides.lines) ? overrides.lines : [],
    isDuplicateCopy: Boolean(overrides.isDuplicateCopy),
    scaleX: transform.scaleX,
    scaleY: transform.scaleY,
  };
};

export const normalizeStanzas = (stanzas = [], options = {}) => {
  return stanzas.map((stanza) =>
    createStanzaFromText(stanza?.text || '', {
      ...stanza,
      id: stanza?.id ?? generateStanzaId(),
    }, options)
  );
};

export const duplicateStanza = (stanza) => {
  return createStanzaFromText(stanza?.text || 'Nova estrofe', {
    ...stanza,
    id: undefined,
    isDuplicateCopy: true,
    position: stanza?.position
      ? { ...DEFAULT_STANZA_POSITION, ...stanza.position }
      : { ...DEFAULT_STANZA_POSITION },
    scaleX: stanza?.scaleX ?? DEFAULT_STANZA_TRANSFORM.scaleX,
    scaleY: stanza?.scaleY ?? DEFAULT_STANZA_TRANSFORM.scaleY,
  });
};

export const hasConfiguredTiming = (stanza) => {
  const start = parseFixedTimecode(stanza?.startTime);
  const end = parseFixedTimecode(stanza?.endTime);

  if (start === null || end === null || end < start) {
    return false;
  }

  if (stanza?.hasManualStart && stanza?.hasManualEnd) {
    return true;
  }

  const rawStart = String(stanza?.startTime ?? '').trim();
  const rawEnd = String(stanza?.endTime ?? '').trim();

  return !(rawStart === DEFAULT_TIMECODE && rawEnd === DEFAULT_TIMECODE);
};

export const getStanzaDisplayStart = (stanza) => {
  const start = parseFixedTimecode(stanza?.startTime);
  if (start === null) return null;

  const leadIn = typeof stanza?.leadIn === 'number' ? stanza.leadIn : 0.5;
  const vocalOnly = stanza?.showOnlyDuringVocal === true;

  return vocalOnly ? start : Math.max(0, start - leadIn);
};

export const isStanzaActiveAtTime = (stanza, currentTime) => {
  if (!hasConfiguredTiming(stanza)) {
    return false;
  }

  const displayStart = getStanzaDisplayStart(stanza);
  const end = parseFixedTimecode(stanza?.endTime);

  if (displayStart === null || end === null) {
    return false;
  }

  return currentTime >= displayStart && currentTime <= end;
};
