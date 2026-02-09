import React from 'react';
import { Plus, Trash2, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import './LyricsEditorPanel.css';

const LyricsEditorPanel = ({ stanzas, onStanzasChange, currentTime }) => {
  const updateStanza = (id, field, value) => {
    const updated = stanzas.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    );
    onStanzasChange(updated);
  };

  const addStanza = () => {
    const newStanza = {
      id: stanzas.length,
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
      alignment: 'center'
    };
    onStanzasChange([...stanzas, newStanza]);
  };

  const removeStanza = (id) => {
    onStanzasChange(stanzas.filter(s => s.id !== id));
  };

  return (
    <div className="lyrics-editor-panel">
      <div className="panel-header">
        <h2>Editor de Letras</h2>
        <button className="add-stanza-btn" onClick={addStanza}>
          <Plus size={18} />
        </button>
      </div>

      <div className="stanzas-list">
        {stanzas.map(stanza => (
          <div key={stanza.id} className="stanza-block">
            <textarea
              value={stanza.text}
              onChange={(e) => updateStanza(stanza.id, 'text', e.target.value)}
              rows="3"
            />

            <div className="time-inputs">
              <div>
                <label>Início</label>
                <input
                  type="text"
                  value={stanza.startTime}
                  onChange={(e) => updateStanza(stanza.id, 'startTime', e.target.value)}
                  placeholder="mm:ss"
                />
              </div>
              <div>
                <label>Fim</label>
                <input
                  type="text"
                  value={stanza.endTime}
                  onChange={(e) => updateStanza(stanza.id, 'endTime', e.target.value)}
                  placeholder="mm:ss"
                />
              </div>
            </div>

            <div className="style-controls">
              <input
                type="number"
                value={stanza.fontSize}
                onChange={(e) => updateStanza(stanza.id, 'fontSize', Number(e.target.value))}
                min="12"
                max="72"
                title="Tamanho"
              />
              
              <input
                type="color"
                value={stanza.color}
                onChange={(e) => updateStanza(stanza.id, 'color', e.target.value)}
                title="Cor do texto"
              />
              
              <input
                type="color"
                value={stanza.outlineColor}
                onChange={(e) => updateStanza(stanza.id, 'outlineColor', e.target.value)}
                title="Cor do contorno"
              />

              <button
                className={stanza.bold ? 'active' : ''}
                onClick={() => updateStanza(stanza.id, 'bold', !stanza.bold)}
              >
                <Bold size={16} />
              </button>

              <button
                className={stanza.italic ? 'active' : ''}
                onClick={() => updateStanza(stanza.id, 'italic', !stanza.italic)}
              >
                <Italic size={16} />
              </button>

              <button
                className={stanza.underline ? 'active' : ''}
                onClick={() => updateStanza(stanza.id, 'underline', !stanza.underline)}
              >
                <Underline size={16} />
              </button>
            </div>

            <div className="alignment-controls">
              <button
                className={stanza.alignment === 'left' ? 'active' : ''}
                onClick={() => updateStanza(stanza.id, 'alignment', 'left')}
              >
                <AlignLeft size={16} />
              </button>
              <button
                className={stanza.alignment === 'center' ? 'active' : ''}
                onClick={() => updateStanza(stanza.id, 'alignment', 'center')}
              >
                <AlignCenter size={16} />
              </button>
              <button
                className={stanza.alignment === 'right' ? 'active' : ''}
                onClick={() => updateStanza(stanza.id, 'alignment', 'right')}
              >
                <AlignRight size={16} />
              </button>
            </div>

            <div className="transition-controls">
              <select
                value={stanza.transition}
                onChange={(e) => updateStanza(stanza.id, 'transition', e.target.value)}
              >
                <option value="fade">Fade</option>
                <option value="slide">Slide</option>
                <option value="zoom-in">Zoom In</option>
                <option value="zoom-out">Zoom Out</option>
              </select>

              <input
                type="range"
                min="0.5"
                max="10"
                step="0.5"
                value={stanza.transitionDuration}
                onChange={(e) => updateStanza(stanza.id, 'transitionDuration', Number(e.target.value))}
                title={`Duração: ${stanza.transitionDuration}s`}
              />
            </div>

            <button 
              className="remove-stanza-btn"
              onClick={() => removeStanza(stanza.id)}
            >
              <Trash2 size={16} />
              Remover
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LyricsEditorPanel;
