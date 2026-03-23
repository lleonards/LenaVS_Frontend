export const DEFAULT_TIMECODE = '00:00.00';

export const parseTimecode = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, value);
  }

  const raw = String(value ?? '').trim().replace(',', '.');
  if (!raw) return null;

  if (/^\d+(\.\d+)?$/.test(raw)) {
    return Math.max(0, Number(raw));
  }

  const parts = raw.split(':').map((part) => part.trim()).filter((part) => part.length > 0);
  if (!parts.length) return null;

  let totalSeconds = 0;
  for (const part of parts) {
    const numeric = Number(part);
    if (!Number.isFinite(numeric)) return null;
    totalSeconds = totalSeconds * 60 + numeric;
  }

  return Math.max(0, totalSeconds);
};

export const formatTimecode = (value, { decimals = 2 } = {}) => {
  const safe = Math.max(0, Number(value) || 0);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secondsFloat = safe % 60;
  const seconds = Math.floor(secondsFloat);
  const fractionBase = 10 ** decimals;
  const fraction = Math.round((secondsFloat - seconds) * fractionBase);

  let carrySeconds = seconds;
  let carryMinutes = minutes;
  let carryHours = hours;
  let normalizedFraction = fraction;

  if (normalizedFraction >= fractionBase) {
    normalizedFraction = 0;
    carrySeconds += 1;
  }
  if (carrySeconds >= 60) {
    carrySeconds = 0;
    carryMinutes += 1;
  }
  if (carryMinutes >= 60) {
    carryMinutes = 0;
    carryHours += 1;
  }

  const fractionSuffix = decimals > 0
    ? `.${String(normalizedFraction).padStart(decimals, '0')}`
    : '';

  if (carryHours > 0) {
    return `${String(carryHours).padStart(2, '0')}:${String(carryMinutes).padStart(2, '0')}:${String(carrySeconds).padStart(2, '0')}${fractionSuffix}`;
  }

  return `${String(carryMinutes).padStart(2, '0')}:${String(carrySeconds).padStart(2, '0')}${fractionSuffix}`;
};
