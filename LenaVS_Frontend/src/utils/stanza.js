import { DEFAULT_TIMECODE, parseTimecode } from './timecode';

export const DEFAULT_STANZA_POSITION = {
  x: 50,
  y: 78,
};

export const STANZA_FONT_SIZE_MIN = 12;
export const STANZA_FONT_SIZE_MAX = 160;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const normalizeFontSize = (value) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return 32;
  }

  return clamp(Math.round(numericValue), STANZA_FONT_SIZE_MIN, STANZA_FONT_SIZE_MAX);
};

export const generateStanzaId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `stanza-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const hasDefinedStartTime = (stanza) => {
  const rawStart = String(stanza?.startTime ?? '').trim();
  const parsedStart = parseTimecode(rawStart);

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
    ...overrides,
    id: stanzaId,
    fontSize: normalizeFontSize(overrides.fontSize ?? 32),
    position,
    lines: Array.isArray(overrides.lines) ? overrides.lines : [],
    isDuplicateCopy: Boolean(overrides.isDuplicateCopy),
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
  });
};

export const hasConfiguredTiming = (stanza) => {
  const start = parseTimecode(stanza?.startTime);
  const end = parseTimecode(stanza?.endTime);

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
  const start = parseTimecode(stanza?.startTime);
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
  const end = parseTimecode(stanza?.endTime);

  if (displayStart === null || end === null) {
    return false;
  }

  return currentTime >= displayStart && currentTime <= end;
};
