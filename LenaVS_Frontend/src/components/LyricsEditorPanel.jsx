import React, { useEffect, useMemo, useRef } from 'react';
import {
  Plus,
  Trash2,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Copy,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import './LyricsEditorPanel.css';
import {
  DEFAULT_TIMECODE,
  formatFixedTimecode,
  normalizeFixedTimecode,
  sanitizeFixedTimecodeInput,
} from '../utils/timecode';
import {
  clampTransitionDuration,
  createStanzaFromText,
  duplicateStanza,
  FONT_OPTIONS,
  getActiveStanzaAtTime,
  getMaxSafeFontSizeForStanza,
  hasDefinedStartTime,
  normalizeOutlineWidth,
  STANZA_FONT_SIZE_MIN,
  STANZA_OUTLINE_WIDTH_MAX,
  STANZA_OUTLINE_WIDTH_MIN,
  STANZA_TRANSITION_DURATION_MAX,
  STANZA_TRANSITION_DURATION_MIN,
} from '../utils/stanza';

const clampFontSize = (value, maxAllowed) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return Math.min(32, maxAllowed);
  }

  return Math.min(maxAllowed, Math.max(STANZA_FONT_SIZE_MIN, Math.round(parsed)));
};

const LyricsEditorPanel = ({
  stanzas,
  selectedStanzaId,
  onStanzasChange,
  currentTime,
  onTapSync,
  onStanzaSelect,
  previewMetrics,
}) => {
  const blockRefs = useRef({});

  useEffect(() => {
    if (!selectedStanzaId) return;

    const node = blockRefs.current[selectedStanzaId];
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedStanzaId]);

  const selectedIndex = useMemo(
    () => stanzas.findIndex((stanza) => stanza.id === selectedStanzaId),
    [stanzas, selectedStanzaId]
  );

  const activeStanzaId = useMemo(
    () => getActiveStanzaAtTime(stanzas, currentTime)?.id || null,
    [stanzas, currentTime]
  );

  const updateStanza = (id, field, value) => {
    onStanzasChange(
      stanzas.map((stanza) =>
        stanza.id === id
          ? {
              ...stanza,
              [field]: value,
            }
          : stanza
      )
    );
  };

  const updateTimeField = (id, field, rawValue, markConfigured = false) => {
    const normalized = normalizeFixedTimecode(rawValue, DEFAULT_TIMECODE);
    const flagField = field === 'startTime' ? 'hasManualStart' : 'hasManualEnd';

    onStanzasChange(
      stanzas.map((stanza) =>
        stanza.id === id
          ? {
              ...stanza,
              [field]: normalized,
              [flagField]: markConfigured ? true : stanza[flagField],
            }
          : stanza
      )
    );
  };

  const handleTimeInputChange = (id, field, rawValue) => {
    updateStanza(id, field, sanitizeFixedTimecodeInput(rawValue));
  };

  const addStanza = () => {
    const newStanza = createStanzaFromText('Nova estrofe');
    onStanzasChange([...stanzas, newStanza]);
    onStanzaSelect?.(newStanza.id);
  };

  const removeStanza = (id) => {
    onStanzasChange(stanzas.filter((stanza) => stanza.id !== id));
  };

  const moveStanza = (id, direction) => {
    const index = stanzas.findIndex((stanza) => stanza.id === id);
    if (index === -1) return;

    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= stanzas.length) return;

    const reordered = [...stanzas];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(nextIndex, 0, moved);

    onStanzasChange(reordered);
    onStanzaSelect?.(id);
  };

  const handleDuplicate = (id) => {
    const index = stanzas.findIndex((stanza) => stanza.id === id);
    if (index === -1) return;

    const cloned = duplicateStanza(stanzas[index]);
    const nextStanzas = [...stanzas];
    nextStanzas.splice(index + 1, 0, cloned);

    onStanzasChange(nextStanzas);
    onStanzaSelect?.(cloned.id);
  };

  const formatCurrentTime = (seconds) => formatFixedTimecode(seconds);

  const handleTransitionDurationChange = (stanzaId, rawValue) => {
    updateStanza(stanzaId, 'transitionDuration', clampTransitionDuration(rawValue));
  };

  const handleOutlineWidthChange = (stanzaId, rawValue) => {
    updateStanza(stanzaId, 'outlineWidth', normalizeOutlineWidth(rawValue));
  };

  const handleTap = (event, stanzaId, field) => {
    event.preventDefault();
    event.stopPropagation();
    onTapSync?.(stanzaId, field);
  };

  return (
    <div className="lyrics-editor-panel">
      <div className="lep-header">
        <h2>Editor de Letras</h2>

        <div className="lep-header-right">
          <span className="lep-time-badge" title="Tempo atual do áudio">
            ⏱ {formatCurrentTime(currentTime)}
          </span>

          <button className="lep-add-btn" onClick={addStanza} title="Adicionar estrofe">
            <Plus size={16} />
          </button>
        </div>
      </div>

      <div className="lep-list">
        {stanzas.map((stanza, idx) => {
          const active = activeStanzaId === stanza.id;
          const selected = stanza.id === selectedStanzaId;
          const needsStartTime = !hasDefinedStartTime(stanza, { allowFirstBlockAtZero: idx === 0 });
          const maxFontSize = getMaxSafeFontSizeForStanza(stanza, previewMetrics);
          const safeTransitionDuration = clampTransitionDuration(stanza.transitionDuration);
          const safeOutlineWidth = normalizeOutlineWidth(stanza.outlineWidth);

          return (
            <div
              key={stanza.id}
              ref={(node) => {
                if (node) blockRefs.current[stanza.id] = node;
              }}
              className={`lep-block${active ? ' lep-block-active' : ''}${selected ? ' lep-block-selected' : ''}`}
              onClick={() => onStanzaSelect?.(stanza.id)}
            >
              <div className="lep-block-header">
                <span className="lep-badge">{idx + 1}</span>
                <span className="lep-block-title">Estrofe</span>

                {stanza.isDuplicateCopy && <span className="lep-copy-pill">cópia</span>}
                {selected && <span className="lep-selected-pill">SELECIONADA</span>}
                {active && <span className="lep-active-dot" title="Ativa agora">● ATIVA</span>}
              </div>

              <div className="lep-block-actions" onClick={(e) => e.stopPropagation()}>
                <button
                  className="lep-mini-btn"
                  onClick={() => moveStanza(stanza.id, 'up')}
                  disabled={idx === 0}
                  title="Mover para cima"
                >
                  <ArrowUp size={14} />
                </button>

                <button
                  className="lep-mini-btn"
                  onClick={() => moveStanza(stanza.id, 'down')}
                  disabled={idx === stanzas.length - 1}
                  title="Mover para baixo"
                >
                  <ArrowDown size={14} />
                </button>

                <button
                  className="lep-mini-btn"
                  onClick={() => handleDuplicate(stanza.id)}
                  title="Duplicar estrofe"
                >
                  <Copy size={14} />
                </button>
              </div>

              <textarea
                className="lep-textarea"
                value={stanza.text}
                onChange={(e) => updateStanza(stanza.id, 'text', e.target.value)}
                rows={4}
              />

              <div className="lep-time-row">
                <div className="lep-field">
                  <label className="lep-label">Início</label>
                  <div className="lep-time-input-group">
                    <input
                      className="lep-input"
                      type="text"
                      inputMode="numeric"
                      maxLength={5}
                      value={stanza.startTime}
                      onChange={(e) => handleTimeInputChange(stanza.id, 'startTime', e.target.value)}
                      onBlur={(e) => updateTimeField(stanza.id, 'startTime', e.target.value, true)}
                      placeholder="MM:SS"
                    />

                    <button
                      type="button"
                      className="lep-tap-btn"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                      onClick={(event) => handleTap(event, stanza.id, 'startTime')}
                      title={`Marcar início agora (${formatCurrentTime(currentTime)})`}
                    >
                      <span className="lep-tap-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="2" />
                          <circle cx="12" cy="12" r="1.6" fill="currentColor" />
                          <line x1="12" y1="3" x2="12" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          <line x1="3" y1="12" x2="7" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          <line x1="17" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      </span>
                    </button>
                  </div>
                </div>

                <div className="lep-field">
                  <label className="lep-label">Fim</label>
                  <div className="lep-time-input-group">
                    <input
                      className="lep-input"
                      type="text"
                      inputMode="numeric"
                      maxLength={5}
                      value={stanza.endTime}
                      onChange={(e) => handleTimeInputChange(stanza.id, 'endTime', e.target.value)}
                      onBlur={(e) => updateTimeField(stanza.id, 'endTime', e.target.value, true)}
                      placeholder="MM:SS"
                    />

                    <button
                      type="button"
                      className="lep-tap-btn"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                      onClick={(event) => handleTap(event, stanza.id, 'endTime')}
                      title={`Marcar fim agora (${formatCurrentTime(currentTime)})`}
                    >
                      <span className="lep-tap-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="2" />
                          <circle cx="12" cy="12" r="1.6" fill="currentColor" />
                          <line x1="12" y1="3" x2="12" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          <line x1="12" y1="17" x2="12" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          <line x1="3" y1="12" x2="7" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          <line x1="17" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                      </span>
                    </button>
                  </div>
                </div>

                <div className="lep-field lep-field-sm">
                  <label className="lep-label">Tam.</label>
                  <input
                    className="lep-input lep-input-num"
                    type="number"
                    value={stanza.fontSize}
                    onChange={(e) => updateStanza(stanza.id, 'fontSize', clampFontSize(e.target.value, maxFontSize))}
                    min={STANZA_FONT_SIZE_MIN}
                    max={maxFontSize}
                    title={`Máximo seguro para esta estrofe: ${maxFontSize}`}
                  />
                </div>
              </div>

              <div className="lep-size-limit-info">
                Máximo seguro desta estrofe: <strong>{maxFontSize}px</strong>
              </div>

              {needsStartTime && (
                <div className="lep-timing-warning">
                  Defina o início desta estrofe para o preview abrir nela automaticamente.
                </div>
              )}

              <div className="lep-font-row">
                <div className="lep-field lep-field-grow">
                  <label className="lep-label">Fonte</label>
                  <select
                    className="lep-select"
                    value={stanza.fontFamily}
                    onChange={(e) => updateStanza(stanza.id, 'fontFamily', e.target.value)}
                  >
                    {FONT_OPTIONS.map((font) => (
                      <option key={font.value} value={font.value}>
                        {font.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="lep-style-row">
                <div className="lep-color-wrap" title="Cor da letra">
                  <label className="lep-label lep-label-center">Texto</label>
                  <div className="lep-color-swatch" style={{ backgroundColor: stanza.color }}>
                    <input
                      type="color"
                      value={stanza.color}
                      onChange={(e) => updateStanza(stanza.id, 'color', e.target.value)}
                    />
                  </div>
                </div>

                <div className="lep-color-wrap" title="Cor do contorno">
                  <label className="lep-label lep-label-center">Borda</label>
                  <div className="lep-color-swatch lep-color-swatch-outline" style={{ backgroundColor: stanza.outlineColor }}>
                    <input
                      type="color"
                      value={stanza.outlineColor}
                      onChange={(e) => updateStanza(stanza.id, 'outlineColor', e.target.value)}
                    />
                  </div>
                </div>

                <div className="lep-style-sep" />

                <button
                  className={`lep-style-btn${stanza.bold ? ' active' : ''}`}
                  onClick={() => updateStanza(stanza.id, 'bold', !stanza.bold)}
                  title="Negrito"
                >
                  <Bold size={14} />
                </button>

                <button
                  className={`lep-style-btn${stanza.italic ? ' active' : ''}`}
                  onClick={() => updateStanza(stanza.id, 'italic', !stanza.italic)}
                  title="Itálico"
                >
                  <Italic size={14} />
                </button>

                <button
                  className={`lep-style-btn${stanza.underline ? ' active' : ''}`}
                  onClick={() => updateStanza(stanza.id, 'underline', !stanza.underline)}
                  title="Sublinhado"
                >
                  <Underline size={14} />
                </button>
              </div>

              <div className="lep-adjustments-grid">
                <div className="lep-adjust-card lep-adjust-card--minimal">
                  <div className="lep-adjust-card__head">
                    <span className="lep-adjust-card__title">Contorno</span>
                    <span className="lep-adjust-card__value lep-adjust-card__value--pill">{safeOutlineWidth}px</span>
                  </div>

                  <div className="lep-adjust-card__slider-wrap">
                    <span className="lep-adjust-card__edge">fino</span>
                    <input
                      className="lep-slider lep-slider--minimal"
                      type="range"
                      min={STANZA_OUTLINE_WIDTH_MIN}
                      max={STANZA_OUTLINE_WIDTH_MAX}
                      step="1"
                      value={safeOutlineWidth}
                      onChange={(e) => handleOutlineWidthChange(stanza.id, e.target.value)}
                      title={`Espessura do contorno entre ${STANZA_OUTLINE_WIDTH_MIN} e ${STANZA_OUTLINE_WIDTH_MAX}`}
                    />
                    <span className="lep-adjust-card__edge">forte</span>
                  </div>
                </div>
              </div>

              <div className="lep-align-row">
                <button
                  className={`lep-align-btn${stanza.alignment === 'left' ? ' active' : ''}`}
                  onClick={() => updateStanza(stanza.id, 'alignment', 'left')}
                >
                  <AlignLeft size={14} />
                </button>
                <button
                  className={`lep-align-btn${stanza.alignment === 'center' ? ' active' : ''}`}
                  onClick={() => updateStanza(stanza.id, 'alignment', 'center')}
                >
                  <AlignCenter size={14} />
                </button>
                <button
                  className={`lep-align-btn${stanza.alignment === 'right' ? ' active' : ''}`}
                  onClick={() => updateStanza(stanza.id, 'alignment', 'right')}
                >
                  <AlignRight size={14} />
                </button>
              </div>

              <div className="lep-transition-panel">
                <div className="lep-transition-panel-head">
                  <span className="lep-transition-title">Transição</span>
                  <span className="lep-transition-duration-badge">{safeTransitionDuration.toFixed(1)}s</span>
                </div>

                <div className="lep-transition-row">
                  <div className="lep-transition-control lep-transition-control-type">
                    <span className="lep-transition-field-label">Efeito</span>
                    <select
                      className="lep-select lep-select-transition"
                      value={stanza.transition}
                      onChange={(e) => updateStanza(stanza.id, 'transition', e.target.value)}
                    >
                      <option value="fade">Fade</option>
                      <option value="slide">Slide</option>
                      <option value="zoom-in">Zoom In</option>
                      <option value="zoom-out">Zoom Out</option>
                    </select>
                  </div>

                  <div className="lep-transition-control lep-transition-control-duration">
                    <span className="lep-transition-field-label">Duração</span>
                    <div className="lep-transition-duration-wrap">
                      <input
                        className="lep-input lep-input-num lep-transition-input"
                        type="number"
                        min={STANZA_TRANSITION_DURATION_MIN}
                        max={STANZA_TRANSITION_DURATION_MAX}
                        step="0.1"
                        value={safeTransitionDuration}
                        onChange={(e) => handleTransitionDurationChange(stanza.id, e.target.value)}
                        onBlur={(e) => handleTransitionDurationChange(stanza.id, e.target.value)}
                        title={`Duração máxima permitida: ${STANZA_TRANSITION_DURATION_MAX}s`}
                      />
                      <span className="lep-transition-unit">s</span>
                    </div>
                  </div>

                  <div className="lep-transition-control lep-transition-control-slider">
                    <span className="lep-transition-field-label">Ajuste fino</span>
                    <input
                      className="lep-slider"
                      type="range"
                      min={STANZA_TRANSITION_DURATION_MIN}
                      max={STANZA_TRANSITION_DURATION_MAX}
                      step="0.1"
                      value={safeTransitionDuration}
                      onChange={(e) => handleTransitionDurationChange(stanza.id, e.target.value)}
                      title={`Duração da transição: ${safeTransitionDuration}s`}
                    />
                  </div>
                </div>
              </div>

              <button
                className="lep-remove-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  removeStanza(stanza.id);
                }}
                title="Remover esta estrofe"
              >
                <Trash2 size={14} />
                remover
              </button>
            </div>
          );
        })}

        {stanzas.length === 0 && (
          <div className="lep-empty">
            <p>Nenhuma estrofe ainda.</p>
            <p>Use o botão <strong>+</strong> para adicionar.</p>
          </div>
        )}
      </div>

      {selectedIndex >= 0 && (
        <div className="lep-selection-footer">
          Bloco selecionado: <strong>{selectedIndex + 1}</strong>
        </div>
      )}
    </div>
  );
};

export default LyricsEditorPanel;
