export const parseTimestampToSeconds = (value) => {
  if (value === null || value === undefined || value === '') return null;

  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0 ? value : null;
  }

  const cleaned = String(value).trim().replace(',', '.');
  if (!cleaned) return null;

  const parts = cleaned.split(':').map((part) => part.trim()).filter(Boolean);
  if (!parts.length) return null;

  const nums = parts.map((part) => Number(part));
  if (nums.some((part) => !Number.isFinite(part) || part < 0)) return null;

  if (nums.length === 1) return nums[0];
  if (nums.length === 2) return nums[0] * 60 + nums[1];
  if (nums.length === 3) return nums[0] * 3600 + nums[1] * 60 + nums[2];

  return null;
};

export const formatSecondsToTimestamp = (seconds, precision = 2) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '';

  const safeSeconds = Math.max(0, Number(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const rawSeconds = safeSeconds % 60;
  const wholeSeconds = Math.floor(rawSeconds);
  const fraction = rawSeconds - wholeSeconds;

  const fractionText = precision > 0
    ? `.${Math.round(fraction * (10 ** precision)).toString().padStart(precision, '0')}`
    : '';

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(wholeSeconds).padStart(2, '0')}${fractionText}`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(wholeSeconds).padStart(2, '0')}${fractionText}`;
};

export const normalizeTimeFields = (stanza = {}) => {
  const startSeconds = Number.isFinite(stanza.startSeconds)
    ? Math.max(0, Number(stanza.startSeconds))
    : parseTimestampToSeconds(stanza.startTime);

  const endSeconds = Number.isFinite(stanza.endSeconds)
    ? Math.max(0, Number(stanza.endSeconds))
    : parseTimestampToSeconds(stanza.endTime);

  return {
    ...stanza,
    startSeconds,
    endSeconds,
    startTime: Number.isFinite(startSeconds) ? formatSecondsToTimestamp(startSeconds) : '',
    endTime: Number.isFinite(endSeconds) ? formatSecondsToTimestamp(endSeconds) : '',
  };
};

export const getStanzaBoundsInSeconds = (stanza = {}) => {
  const start = Number.isFinite(stanza.startSeconds)
    ? Math.max(0, Number(stanza.startSeconds))
    : parseTimestampToSeconds(stanza.startTime);

  const end = Number.isFinite(stanza.endSeconds)
    ? Math.max(0, Number(stanza.endSeconds))
    : parseTimestampToSeconds(stanza.endTime);

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return { start: null, end: null };
  }

  return { start, end };
};
