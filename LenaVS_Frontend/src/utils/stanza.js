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
export const STANZA_FONT_SIZE_MAX = 160;
export const STANZA_SCALE_MIN = 0.35;
export const STANZA_SCALE_MAX = 4;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const normalizeFontSize = (value) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return 32;
  }

  return clamp(Math.round(numericValue), STANZA_FONT_SIZE_MIN, STANZA_FONT_SIZE_MAX);
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

export const createStanzaFromText = (text = 'Nova estrofe', overrides = {}) => {
  const position = {
    ...DEFAULT_STANZA_POSITION,
    ...(overrides.position || {}),
  };
  const transform = getStanzaTransform(overrides);
  const stanzaId = overrides.id ?? generateStanzaId();

  return {
    id: stanzaId,
    text,
    startTime: DEFAULT_TIMECODE,
    endTime: DEFAULT_TIMECODE,
    fontSize: 32,
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
    fontSize: normalizeFontSize(overrides.fontSize ?? 32),
    position,
    lines: Array.isArray(overrides.lines) ? overrides.lines : [],
    isDuplicateCopy: Boolean(overrides.isDuplicateCopy),
    scaleX: transform.scaleX,
    scaleY: transform.scaleY,
  };
};

export const normalizeStanzas = (stanzas = []) => {
  return stanzas.map((stanza) =>
    createStanzaFromText(stanza?.text || '', {
      ...stanza,
      id: stanza?.id ?? generateStanzaId(),
    })
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
