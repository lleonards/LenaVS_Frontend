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
import './LyricsEditorPanel.css';

const FONT_OPTIONS = [
  { label: 'Montserrat', value: 'Montserrat' },
  { label: 'Arial', value: 'Arial' },
  { label: 'Impact', value: 'Impact' },
  { label: 'Verdana', value: 'Verdana' },
  { label: 'Georgia', value: 'Georgia' },
  { label: 'Courier New', value: 'Courier New' }
];

const LyricsEditorPanel = ({ stanzas, onStanzasChange, currentTime }) => {
  const updateStanza = (id, field, value) => {
    const updated = stanzas.map((s) =>
      s.id === id ? { ...s, [field]: value } : s
    );
    onStanzasChange(updated);
  };

  const addStanza = () => {
    const newStanza = {
      id: Date.now(),
      text: 'Nova estrofe',
      startTime: '00:00',
      endTime: '00:00',
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
      leadIn: 0.5
    };
    onStanzasChange([...stanzas, newStanza]);
  };

  const removeStanza = (id) => {
    onStanzasChange(stanzas.filter((s) => s.id !== id));
  };

  return (
    <div className="lyrics-editor-panel">

      {/* ── Header ─────────────────────────────── */}
      <div className="lep-header">
        <h2>Editor de Letras</h2>
        <button className="lep-add-btn" onClick={addStanza} title="Adicionar estrofe">
          <Plus size={16} />
        </button>
      </div>

      {/* ── Lista com scroll — cada bloco é exibido por completo ─── */}
      <div className="lep-list">
        {stanzas.map((stanza, idx) => (
          <div key={stanza.id} className="lep-block">

            {/* Identificador */}
            <div className="lep-block-header">
              <span className="lep-badge">{idx + 1}</span>
              <span className="lep-block-title">Estrofe</span>
            </div>

            {/* Textarea — texto completo visível */}
            <textarea
              className="lep-textarea"
              value={stanza.text}
              onChange={(e) => updateStanza(stanza.id, 'text', e.target.value)}
              rows={4}
            />

            {/* ── Início / Fim / Tamanho ────────── */}
            <div className="lep-time-row">
              <div className="lep-field">
                <label className="lep-label">Início</label>
                <input
                  className="lep-input"
                  type="text"
                  value={stanza.startTime}
                  onChange={(e) => updateStanza(stanza.id, 'startTime', e.target.value)}
                  placeholder="mm:ss"
                />
              </div>
              <div className="lep-field">
                <label className="lep-label">Fim</label>
                <input
                  className="lep-input"
                  type="text"
                  value={stanza.endTime}
                  onChange={(e) => updateStanza(stanza.id, 'endTime', e.target.value)}
                  placeholder="mm:ss"
                />
              </div>
              <div className="lep-field lep-field-sm">
                <label className="lep-label">Tam.</label>
                <input
                  className="lep-input lep-input-num"
                  type="number"
                  value={stanza.fontSize}
                  onChange={(e) => updateStanza(stanza.id, 'fontSize', Number(e.target.value))}
                  min="12"
                  max="72"
                />
              </div>
            </div>

            {/* ── Fonte ─────────────────────────── */}
            <div className="lep-font-row">
              <div className="lep-field lep-field-grow">
                <label className="lep-label">Fonte</label>
                <select
                  className="lep-select"
                  value={stanza.fontFamily}
                  onChange={(e) => updateStanza(stanza.id, 'fontFamily', e.target.value)}
                >
                  {FONT_OPTIONS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* ── Cores + B I U ─────────────────── */}
            <div className="lep-style-row">
              {/* Cor da letra */}
              <div className="lep-color-wrap" title="Cor da letra">
                <label className="lep-label lep-label-center">Texto</label>
                <div
                  className="lep-color-swatch"
                  style={{ backgroundColor: stanza.color }}
                >
                  <input
                    type="color"
                    value={stanza.color}
                    onChange={(e) => updateStanza(stanza.id, 'color', e.target.value)}
                  />
                </div>
              </div>

              {/* Cor do contorno */}
              <div className="lep-color-wrap" title="Cor do contorno">
                <label className="lep-label lep-label-center">Borda</label>
                <div
                  className="lep-color-swatch lep-color-swatch-outline"
                  style={{ backgroundColor: stanza.outlineColor }}
                >
                  <input
                    type="color"
                    value={stanza.outlineColor}
                    onChange={(e) => updateStanza(stanza.id, 'outlineColor', e.target.value)}
                  />
                </div>
              </div>

              <div className="lep-style-sep" />

              {/* Negrito */}
              <button
                className={`lep-style-btn${stanza.bold ? ' active' : ''}`}
                onClick={() => updateStanza(stanza.id, 'bold', !stanza.bold)}
                title="Negrito"
              >
                <Bold size={14} />
              </button>

              {/* Itálico */}
              <button
                className={`lep-style-btn${stanza.italic ? ' active' : ''}`}
                onClick={() => updateStanza(stanza.id, 'italic', !stanza.italic)}
                title="Itálico"
              >
                <Italic size={14} />
              </button>

              {/* Sublinhado */}
              <button
                className={`lep-style-btn${stanza.underline ? ' active' : ''}`}
                onClick={() => updateStanza(stanza.id, 'underline', !stanza.underline)}
                title="Sublinhado"
              >
                <Underline size={14} />
              </button>
            </div>

            {/* ── Alinhamento ────────────────────── */}
            <div className="lep-align-row">
              <button
                className={`lep-align-btn${stanza.alignment === 'left' ? ' active' : ''}`}
                onClick={() => updateStanza(stanza.id, 'alignment', 'left')}
                title="Alinhar à esquerda"
              >
                <AlignLeft size={14} />
              </button>
              <button
                className={`lep-align-btn${stanza.alignment === 'center' ? ' active' : ''}`}
                onClick={() => updateStanza(stanza.id, 'alignment', 'center')}
                title="Centralizar"
              >
                <AlignCenter size={14} />
              </button>
              <button
                className={`lep-align-btn${stanza.alignment === 'right' ? ' active' : ''}`}
                onClick={() => updateStanza(stanza.id, 'alignment', 'right')}
                title="Alinhar à direita"
              >
                <AlignRight size={14} />
              </button>
            </div>

            {/* ── Transição ──────────────────────── */}
            <div className="lep-transition-row">
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

              <input
                className="lep-slider"
                type="range"
                min="0.5"
                max="10"
                step="0.5"
                value={stanza.transitionDuration}
                onChange={(e) =>
                  updateStanza(stanza.id, 'transitionDuration', Number(e.target.value))
                }
                title={`Duração da transição: ${stanza.transitionDuration}s`}
              />

              <span className="lep-slider-val">{stanza.transitionDuration}s</span>
            </div>

            {/* ── Botão Remover ──────────────────── */}
            <button
              className="lep-remove-btn"
              onClick={() => removeStanza(stanza.id)}
              title="Remover esta estrofe"
            >
              <Trash2 size={14} />
              remover
            </button>

          </div>
        ))}

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
