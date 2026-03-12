import React from 'react';
import {
  Plus, Trash2, Bold, Italic, Underline,
  AlignLeft, AlignCenter, AlignRight, Clock, Type
} from 'lucide-react';
import './LyricsEditorPanel.css';

const LyricsEditorPanel = ({ stanzas, onStanzasChange, currentTime }) => {
  const updateStanza = (id, field, value) => {
    onStanzasChange(stanzas.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const setCurrentTimeAs = (id, field) => {
    const m = Math.floor(currentTime / 60).toString().padStart(2, '0');
    const s = Math.floor(currentTime % 60).toString().padStart(2, '0');
    updateStanza(id, field, `${m}:${s}`);
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
    };
    onStanzasChange([...stanzas, newStanza]);
  };

  const removeStanza = (id) => {
    onStanzasChange(stanzas.filter((s) => s.id !== id));
  };

  return (
    <div className="lyrics-editor-panel">
      {/* HEADER */}
      <div className="lep-header">
        <h2>Editor de Letras</h2>
        <button className="lep-add-btn" onClick={addStanza} title="Adicionar estrofe">
          <Plus size={18} />
        </button>
      </div>

      {stanzas.length === 0 && (
        <div className="lep-empty">
          <Type size={32} />
          <p>Nenhuma estrofe ainda.<br />Faça upload da letra para começar.</p>
        </div>
      )}

      {/* LISTA */}
      <div className="lep-list">
        {stanzas.map((stanza, index) => (
          <div key={stanza.id} className="lep-block">
            {/* NÚMERO */}
            <div className="lep-block-number">#{index + 1}</div>

            {/* TEXTAREA */}
            <textarea
              className="lep-textarea"
              value={stanza.text}
              onChange={(e) => updateStanza(stanza.id, 'text', e.target.value)}
              rows={3}
              placeholder="Digite a letra da estrofe..."
            />

            {/* TEMPO + TAMANHO */}
            <div className="lep-row lep-time-row">
              <div className="lep-field">
                <label>início</label>
                <div className="lep-time-input-wrap">
                  <input
                    type="text"
                    value={stanza.startTime}
                    onChange={(e) => updateStanza(stanza.id, 'startTime', e.target.value)}
                    placeholder="mm:ss"
                  />
                  <button
                    className="lep-time-stamp-btn"
                    onClick={() => setCurrentTimeAs(stanza.id, 'startTime')}
                    title="Usar tempo atual"
                  >
                    <Clock size={12} />
                  </button>
                </div>
              </div>
              <div className="lep-field">
                <label>fim</label>
                <div className="lep-time-input-wrap">
                  <input
                    type="text"
                    value={stanza.endTime}
                    onChange={(e) => updateStanza(stanza.id, 'endTime', e.target.value)}
                    placeholder="mm:ss"
                  />
                  <button
                    className="lep-time-stamp-btn"
                    onClick={() => setCurrentTimeAs(stanza.id, 'endTime')}
                    title="Usar tempo atual"
                  >
                    <Clock size={12} />
                  </button>
                </div>
              </div>
              <div className="lep-field">
                <label>tamanho do texto</label>
                <input
                  type="number"
                  value={stanza.fontSize}
                  onChange={(e) => updateStanza(stanza.id, 'fontSize', Number(e.target.value))}
                  min={10}
                  max={120}
                  className="lep-fontsize"
                />
              </div>
            </div>

            {/* CORES + ESTILOS */}
            <div className="lep-row lep-style-row">
              <input
                type="color"
                value={stanza.color}
                onChange={(e) => updateStanza(stanza.id, 'color', e.target.value)}
                title="Cor do texto"
                className="lep-color-picker"
              />
              <input
                type="color"
                value={stanza.outlineColor}
                onChange={(e) => updateStanza(stanza.id, 'outlineColor', e.target.value)}
                title="Cor do contorno"
                className="lep-color-picker outline"
              />
              <button
                className={`lep-style-btn ${stanza.underline ? 'active' : ''}`}
                onClick={() => updateStanza(stanza.id, 'underline', !stanza.underline)}
                title="Sublinhado"
              >
                <Underline size={15} />
              </button>
              <button
                className={`lep-style-btn ${stanza.italic ? 'active' : ''}`}
                onClick={() => updateStanza(stanza.id, 'italic', !stanza.italic)}
                title="Itálico"
              >
                <Italic size={15} />
              </button>
              <button
                className={`lep-style-btn lep-bold ${stanza.bold ? 'active' : ''}`}
                onClick={() => updateStanza(stanza.id, 'bold', !stanza.bold)}
                title="Negrito"
              >
                <Bold size={15} />
              </button>
            </div>

            {/* ALINHAMENTO */}
            <div className="lep-row lep-align-row">
              <button
                className={`lep-align-btn ${stanza.alignment === 'left' ? 'active' : ''}`}
                onClick={() => updateStanza(stanza.id, 'alignment', 'left')}
              >
                <AlignLeft size={16} />
              </button>
              <button
                className={`lep-align-btn ${stanza.alignment === 'center' ? 'active' : ''}`}
                onClick={() => updateStanza(stanza.id, 'alignment', 'center')}
              >
                <AlignCenter size={16} />
              </button>
              <button
                className={`lep-align-btn ${stanza.alignment === 'right' ? 'active' : ''}`}
                onClick={() => updateStanza(stanza.id, 'alignment', 'right')}
              >
                <AlignRight size={16} />
              </button>
            </div>

            {/* TRANSIÇÃO */}
            <div className="lep-row lep-transition-row">
              <select
                value={stanza.transition}
                onChange={(e) => updateStanza(stanza.id, 'transition', e.target.value)}
                className="lep-select"
              >
                <option value="fade">Fade</option>
                <option value="slide">Slide</option>
                <option value="zoom-in">Zoom In</option>
                <option value="zoom-out">Zoom Out</option>
                <option value="none">Nenhuma</option>
              </select>
              <input
                type="range"
                min={0.5}
                max={5}
                step={0.5}
                value={stanza.transitionDuration}
                onChange={(e) =>
                  updateStanza(stanza.id, 'transitionDuration', Number(e.target.value))
                }
                className="lep-range"
                title={`Duração: ${stanza.transitionDuration}s`}
              />
              <span className="lep-range-val">{stanza.transitionDuration}s</span>
            </div>

            {/* BOTÃO REMOVER */}
            <button className="lep-remove-btn" onClick={() => removeStanza(stanza.id)}>
              <Trash2 size={14} />
              remover
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LyricsEditorPanel;
