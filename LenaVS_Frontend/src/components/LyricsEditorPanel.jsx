import React from 'react';
import {
  Plus,
  Trash2,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight
} from 'lucide-react';
import { formatSecondsToTimestamp, getStanzaBoundsInSeconds, parseTimestampToSeconds } from '../utils/time';
import './LyricsEditorPanel.css';

const FONT_OPTIONS = [
  { label: 'Montserrat', value: 'Montserrat' },
  { label: 'Arial', value: 'Arial' },
  { label: 'Impact', value: 'Impact' },
  { label: 'Verdana', value: 'Verdana' },
  { label: 'Georgia', value: 'Georgia' },
  { label: 'Courier New', value: 'Courier New' }
];

const createDefaultStanza = () => ({
  id: Date.now(),
  text: 'Nova estrofe',
  startTime: '',
  endTime: '',
  startSeconds: null,
  endSeconds: null,
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
  syncConfidence: null,
  syncStatus: 'pending',
  needsReview: false,
});

const LyricsEditorPanel = ({ stanzas, onStanzasChange, currentTime, onTapSync }) => {
  const updateStanza = (id, field, value) => {
    const updated = stanzas.map((stanza) =>
      stanza.id === id ? { ...stanza, [field]: value } : stanza
    );
    onStanzasChange(updated);
  };

  const updateTimeField = (id, field, value) => {
    const numericField = field === 'startTime' ? 'startSeconds' : 'endSeconds';
    const parsedSeconds = parseTimestampToSeconds(value);

    const updated = stanzas.map((stanza) => {
      if (stanza.id !== id) return stanza;
      return {
        ...stanza,
        [field]: value,
        [numericField]: parsedSeconds,
      };
    });

    onStanzasChange(updated);
  };

  const addStanza = () => {
    onStanzasChange([...stanzas, createDefaultStanza()]);
  };

  const removeStanza = (id) => {
    onStanzasChange(stanzas.filter((stanza) => stanza.id !== id));
  };

  const handleTap = (stanzaId, field) => {
    if (onTapSync) onTapSync(stanzaId, field);
  };

  const isActiveStanza = (stanza) => {
    const { start, end } = getStanzaBoundsInSeconds(stanza);
    if (!Number.isFinite(start) || !Number.isFinite(end)) return false;
    return currentTime >= start && currentTime <= end;
  };

  const getSyncBadge = (stanza) => {
    if (stanza.needsReview) return '⚠ revisar';
    if (typeof stanza.syncConfidence === 'number') {
      return `IA ${Math.round(stanza.syncConfidence * 100)}%`;
    }
    return null;
  };

  return (
    <div className="lyrics-editor-panel">
      <div className="lep-header">
        <h2>Editor de Letras</h2>
        <div className="lep-header-right">
          <span className="lep-time-badge" title="Tempo atual do áudio">
            ⏱ {formatSecondsToTimestamp(currentTime) || '00:00.00'}
          </span>
          <button className="lep-add-btn" onClick={addStanza} title="Adicionar estrofe">
            <Plus size={16} />
          </button>
        </div>
      </div>

      <div className="lep-list">
        {stanzas.map((stanza, index) => {
          const active = isActiveStanza(stanza);
          const syncBadge = getSyncBadge(stanza);

          return (
            <div key={stanza.id} className={`lep-block${active ? ' lep-block-active' : ''}`}>
              <div className="lep-block-header">
                <span className="lep-badge">{index + 1}</span>
                <span className="lep-block-title">Estrofe</span>
                {syncBadge && (
                  <span className="lep-active-dot" title="Resultado da sincronização automática">
                    {syncBadge}
                  </span>
                )}
                {active && <span className="lep-active-dot" title="Ativa agora">● ATIVA</span>}
              </div>

              <textarea
                className="lep-textarea"
                value={stanza.text}
                onChange={(event) => updateStanza(stanza.id, 'text', event.target.value)}
                rows={4}
              />

              <div className="lep-time-row">
                <div className="lep-field">
                  <label className="lep-label">Início</label>
                  <div className="lep-time-input-group">
                    <input
                      className="lep-input"
                      type="text"
                      value={stanza.startTime || ''}
                      onChange={(event) => updateTimeField(stanza.id, 'startTime', event.target.value)}
                      placeholder="mm:ss.cc"
                    />
                    <button
                      className="lep-tap-btn"
                      onClick={() => handleTap(stanza.id, 'startTime')}
                      title={`Marcar início agora (${formatSecondsToTimestamp(currentTime) || '00:00.00'})`}
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
                      value={stanza.endTime || ''}
                      onChange={(event) => updateTimeField(stanza.id, 'endTime', event.target.value)}
                      placeholder="mm:ss.cc"
                    />
                    <button
                      className="lep-tap-btn"
                      onClick={() => handleTap(stanza.id, 'endTime')}
                      title={`Marcar fim agora (${formatSecondsToTimestamp(currentTime) || '00:00.00'})`}
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
                    onChange={(event) => updateStanza(stanza.id, 'fontSize', Number(event.target.value))}
                    min="12"
                    max="72"
                  />
                </div>
              </div>

              <div className="lep-font-row">
                <div className="lep-field lep-field-grow">
                  <label className="lep-label">Fonte</label>
                  <select
                    className="lep-select"
                    value={stanza.fontFamily}
                    onChange={(event) => updateStanza(stanza.id, 'fontFamily', event.target.value)}
                  >
                    {FONT_OPTIONS.map((font) => (
                      <option key={font.value} value={font.value}>{font.label}</option>
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
                      onChange={(event) => updateStanza(stanza.id, 'color', event.target.value)}
                    />
                  </div>
                </div>

                <div className="lep-color-wrap" title="Cor do contorno">
                  <label className="lep-label lep-label-center">Borda</label>
                  <div className="lep-color-swatch lep-color-swatch-outline" style={{ backgroundColor: stanza.outlineColor }}>
                    <input
                      type="color"
                      value={stanza.outlineColor}
                      onChange={(event) => updateStanza(stanza.id, 'outlineColor', event.target.value)}
                    />
                  </div>
                </div>

                <div className="lep-style-sep" />

                <button
                  className={`lep-style-btn${stanza.bold ? ' active' : ''}`}
                  onClick={() => updateStanza(stanza.id, 'bold', !stanza.bold)}
                  title="Negrito"
                ><Bold size={14} /></button>

                <button
                  className={`lep-style-btn${stanza.italic ? ' active' : ''}`}
                  onClick={() => updateStanza(stanza.id, 'italic', !stanza.italic)}
                  title="Itálico"
                ><Italic size={14} /></button>

                <button
                  className={`lep-style-btn${stanza.underline ? ' active' : ''}`}
                  onClick={() => updateStanza(stanza.id, 'underline', !stanza.underline)}
                  title="Sublinhado"
                ><Underline size={14} /></button>
              </div>

              <div className="lep-align-row">
                <button
                  className={`lep-align-btn${stanza.alignment === 'left' ? ' active' : ''}`}
                  onClick={() => updateStanza(stanza.id, 'alignment', 'left')}
                ><AlignLeft size={14} /></button>
                <button
                  className={`lep-align-btn${stanza.alignment === 'center' ? ' active' : ''}`}
                  onClick={() => updateStanza(stanza.id, 'alignment', 'center')}
                ><AlignCenter size={14} /></button>
                <button
                  className={`lep-align-btn${stanza.alignment === 'right' ? ' active' : ''}`}
                  onClick={() => updateStanza(stanza.id, 'alignment', 'right')}
                ><AlignRight size={14} /></button>
              </div>

              <div className="lep-transition-row">
                <select
                  className="lep-select lep-select-transition"
                  value={stanza.transition}
                  onChange={(event) => updateStanza(stanza.id, 'transition', event.target.value)}
                >
                  <option value="fade">Fade</option>
                  <option value="slide">Slide</option>
                  <option value="zoom-in">Zoom In</option>
                  <option value="zoom-out">Zoom Out</option>
                </select>

                <input
                  className="lep-slider"
                  type="range"
                  min="0.5"
                  max="10"
                  step="0.5"
                  value={stanza.transitionDuration}
                  onChange={(event) => updateStanza(stanza.id, 'transitionDuration', Number(event.target.value))}
                  title={`Duração da transição: ${stanza.transitionDuration}s`}
                />

                <span className="lep-slider-val">{stanza.transitionDuration}s</span>
              </div>

              <button
                className="lep-remove-btn"
                onClick={() => removeStanza(stanza.id)}
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
    </div>
  );
};

export default LyricsEditorPanel;
