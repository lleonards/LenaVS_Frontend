import React, { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { DEFAULT_TIMECODE, normalizeFixedTimecode } from '../utils/timecode';

const EDITABLE_POSITIONS = [0, 1, 3, 4];
const CARET_BY_DIGIT_INDEX = [0, 1, 3, 4, 5];

const NON_TEXT_INPUT_TYPES = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'hidden',
  'image',
  'radio',
  'range',
  'reset',
  'submit',
]);

const countEditableBeforeCaret = (caretPosition = 0) =>
  EDITABLE_POSITIONS.filter((position) => position < caretPosition).length;

const digitIndexToCaret = (digitIndex = 0) =>
  CARET_BY_DIGIT_INDEX[Math.max(0, Math.min(4, digitIndex))];

const getDigitsFromValue = (value) =>
  normalizeFixedTimecode(value, DEFAULT_TIMECODE).replace(':', '');

const digitsToTimecode = (digits) => {
  const safeDigits = String(digits ?? '')
    .replace(/\D/g, '')
    .padEnd(4, '0')
    .slice(0, 4);

  const minutes = Number(safeDigits.slice(0, 2)) || 0;
  const seconds = Math.min(59, Number(safeDigits.slice(2, 4)) || 0);

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const TimecodeInput = ({
  value = DEFAULT_TIMECODE,
  onChange = () => {},
  onCommit = () => {},
  className = '',
  placeholder = 'MM:SS',
  ariaLabel = 'Tempo',
  title,
}) => {
  const inputRef = useRef(null);
  const pendingSelectionRef = useRef(null);

  const displayValue = useMemo(
    () => normalizeFixedTimecode(value, DEFAULT_TIMECODE),
    [value]
  );

  useLayoutEffect(() => {
    if (!inputRef.current || pendingSelectionRef.current === null) return;

    const caretPosition = pendingSelectionRef.current;

    inputRef.current.setSelectionRange(caretPosition, caretPosition);

    pendingSelectionRef.current = null;
  }, [displayValue]);

  const applyNextValue = useCallback((nextDigits, nextDigitIndex) => {
    pendingSelectionRef.current = digitIndexToCaret(nextDigitIndex);
    onChange(digitsToTimecode(nextDigits));
  }, [onChange]);

  const handleDigitInput = useCallback((digit, selectionStart, selectionEnd) => {
    const digits = getDigitsFromValue(displayValue).split('');

    const startDigit = countEditableBeforeCaret(selectionStart);
    const endDigit = countEditableBeforeCaret(selectionEnd);

    const targetDigit = Math.min(startDigit, 3);

    // Impede segundos acima de 59
    if (targetDigit === 2 && Number(digit) > 5) {
      return;
    }

    for (let index = targetDigit; index < endDigit; index += 1) {
      digits[index] = '0';
    }

    digits[targetDigit] = digit;

    applyNextValue(
      digits.join(''),
      Math.min(targetDigit + 1, 4)
    );
  }, [applyNextValue, displayValue]);

  const handleBackspace = useCallback((selectionStart, selectionEnd) => {
    const digits = getDigitsFromValue(displayValue).split('');

    const startDigit = countEditableBeforeCaret(selectionStart);
    const endDigit = countEditableBeforeCaret(selectionEnd);

    // Quando houver seleção
    if (startDigit !== endDigit) {
      for (let index = startDigit; index < endDigit; index += 1) {
        digits[index] = '';
      }

      applyNextValue(
        digits.join('').padEnd(4, '0'),
        startDigit
      );

      return;
    }

    // Não deixa apagar antes do primeiro dígito
    if (startDigit <= 0) {
      return;
    }

    // Backspace apaga o número anterior
    const targetDigit = startDigit - 1;

    digits[targetDigit] = '';

    applyNextValue(
      digits.join('').padEnd(4, '0'),
      targetDigit
    );
  }, [applyNextValue, displayValue]);

  const handleDelete = useCallback((selectionStart, selectionEnd) => {
    const digits = getDigitsFromValue(displayValue).split('');

    const startDigit = countEditableBeforeCaret(selectionStart);
    const endDigit = countEditableBeforeCaret(selectionEnd);

    // Quando houver seleção
    if (startDigit !== endDigit) {
      for (let index = startDigit; index < endDigit; index += 1) {
        digits[index] = '';
      }

      applyNextValue(
        digits.join('').padEnd(4, '0'),
        startDigit
      );

      return;
    }

    // Não deixa apagar depois do último dígito
    if (startDigit >= 4) {
      return;
    }

    // Delete apaga o número atual
    digits[startDigit] = '';

    applyNextValue(
      digits.join('').padEnd(4, '0'),
      startDigit
    );
  }, [applyNextValue, displayValue]);

  const moveCaret = useCallback((nextDigitIndex) => {
    pendingSelectionRef.current = digitIndexToCaret(nextDigitIndex);

    requestAnimationFrame(() => {
      if (!inputRef.current || pendingSelectionRef.current === null) {
        return;
      }

      const caretPosition = pendingSelectionRef.current;

      inputRef.current.setSelectionRange(caretPosition, caretPosition);

      pendingSelectionRef.current = null;
    });
  }, []);

  const handleKeyDown = useCallback((event) => {
    if (!inputRef.current) return;

    const {
      selectionStart = 0,
      selectionEnd = 0,
    } = inputRef.current;

    // Permite atalhos globais do preview
    if (
      (event.ctrlKey || event.metaKey) &&
      (event.key === 'ArrowLeft' || event.key === 'ArrowRight')
    ) {
      return;
    }

    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    // Digitação numérica
    if (/^\d$/.test(event.key)) {
      event.preventDefault();

      handleDigitInput(
        event.key,
        selectionStart,
        selectionEnd
      );

      return;
    }

    // Backspace
    if (event.key === 'Backspace') {
      event.preventDefault();

      handleBackspace(
        selectionStart,
        selectionEnd
      );

      return;
    }

    // Delete
    if (event.key === 'Delete') {
      event.preventDefault();

      handleDelete(
        selectionStart,
        selectionEnd
      );

      return;
    }

    // Navegação esquerda
    if (event.key === 'ArrowLeft') {
      event.preventDefault();

      const currentDigit =
        countEditableBeforeCaret(selectionStart);

      moveCaret(Math.max(0, currentDigit - 1));

      return;
    }

    // Navegação direita
    if (event.key === 'ArrowRight') {
      event.preventDefault();

      const currentDigit =
        countEditableBeforeCaret(selectionEnd);

      moveCaret(
        Math.min(
          4,
          currentDigit + (selectionStart === selectionEnd ? 1 : 0)
        )
      );

      return;
    }

    // Home
    if (event.key === 'Home') {
      event.preventDefault();
      moveCaret(0);
      return;
    }

    // End
    if (event.key === 'End') {
      event.preventDefault();
      moveCaret(4);
    }
  }, [
    handleBackspace,
    handleDelete,
    handleDigitInput,
    moveCaret,
  ]);

  const handlePaste = useCallback((event) => {
    event.preventDefault();

    const pastedText =
      event.clipboardData?.getData('text') || '';

    const normalized = normalizeFixedTimecode(
      pastedText,
      displayValue
    );

    onChange(normalized);

    pendingSelectionRef.current = digitIndexToCaret(4);
  }, [displayValue, onChange]);

  const handleChange = useCallback((event) => {
    onChange(
      normalizeFixedTimecode(
        event.target.value,
        displayValue
      )
    );
  }, [displayValue, onChange]);

  const handleBlur = useCallback((event) => {
    onCommit(
      normalizeFixedTimecode(
        event.target.value,
        DEFAULT_TIMECODE
      )
    );
  }, [onCommit]);

  const handleMouseUp = useCallback(() => {
    if (!inputRef.current) return;

    const {
      selectionStart = 0,
      selectionEnd = 0,
    } = inputRef.current;

    if (
      selectionStart === selectionEnd &&
      selectionStart === 2
    ) {
      moveCaret(2);
    }
  }, [moveCaret]);

  return (
    <input
      ref={inputRef}
      className={className}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      spellCheck={false}
      maxLength={5}
      value={displayValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      onBlur={handleBlur}
      onMouseUp={handleMouseUp}
      placeholder={placeholder}
      aria-label={ariaLabel}
      title={title}
      data-timecode-input="true"
    />
  );
};

export const isTextEntryElement = (element) => {
  if (!element || !(element instanceof HTMLElement)) {
    return false;
  }

  if (element.isContentEditable) {
    return true;
  }

  const tagName = element.tagName;

  if (tagName === 'TEXTAREA' || tagName === 'SELECT') {
    return true;
  }

  if (tagName !== 'INPUT') {
    return false;
  }

  const type = String(
    element.getAttribute('type') || 'text'
  ).toLowerCase();

  return !NON_TEXT_INPUT_TYPES.has(type);
};

export default TimecodeInput
