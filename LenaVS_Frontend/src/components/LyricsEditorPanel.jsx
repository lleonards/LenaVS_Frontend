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

const LyricsEditorPanel = ({ stanzas, onStanzasChange }) => {
  const updateStanza = (id, field, value) => {
    const updated = stanzas.map((s) =>
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
      <div className="panel-header">
        <h2>Editor de Letras</h2>
        <button className="add-stanza-btn" onClick={addStanza} title="Adicionar estrofe">
          <Plus size={16} />
        </button>
      </div>

      <div className="stanzas-list">
        {stanzas.map((stanza, idx) => (
          <div key={stanza.id} className="stanza-block">

            {/* Cabeçalho do bloco (só organização visual) */}
            <div className="stanza-top-row">
              <div className="stanza-badge" title={`Estrofe ${idx + 1}`}>{idx + 1}</div>
              <div className="stanza-top-title">Estrofe</div>
            </div>

            {/* Texto da estrofe (espaço maior para visualizar parágrafo) */}
            <textarea
              value={stanza.text}
              onChange={(e) => updateStanza(stanza.id, 'text', e.target.value)}
              rows={6}
            />

            {/* Tempo + tamanho + fonte (tudo aparente em um único bloco) */}
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
              <div className="font-size-group">
                <label>Tamanho</label>
                <input
                  type="number"
                  value={stanza.fontSize}
                  onChange={(e) => updateStanza(stanza.id, 'fontSize', Number(e.target.value))}
                  min="12"
                  max="72"
                />
              </div>
              <div className="font-family-group">
                <label>Fonte</label>
                <select
                  value={stanza.fontFamily}
                  onChange={(e) => updateStanza(stanza.id, 'fontFamily', e.target.value)}
                >
                  {FONT_OPTIONS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Cores + negrito/itálico/sublinhado + alinhamento (organizado e sempre visível) */}
            <div className="style-controls">
              <input
                type="color"
                value={stanza.color}
                onChange={(e) => updateStanza(stanza.id, 'color', e.target.value)}
                title="Cor da letra"
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
                title="Negrito"
              >
                <Bold size={14} />
              </button>
              <button
                className={stanza.italic ? 'active' : ''}
                onClick={() => updateStanza(stanza.id, 'italic', !stanza.italic)}
                title="Itálico"
              >
                <Italic size={14} />
              </button>
              <button
                className={stanza.underline ? 'active' : ''}
                onClick={() => updateStanza(stanza.id, 'underline', !stanza.underline)}
                title="Sublinhado"
              >
                <Underline size={14} />
              </button>

              <div className="style-sep" />

              <button
                className={stanza.alignment === 'left' ? 'active' : ''}
                onClick={() => updateStanza(stanza.id, 'alignment', 'left')}
                title="Alinhar à esquerda"
              >
                <AlignLeft size={14} />
              </button>
              <button
                className={stanza.alignment === 'center' ? 'active' : ''}
                onClick={() => updateStanza(stanza.id, 'alignment', 'center')}
                title="Centralizar"
              >
                <AlignCenter size={14} />
              </button>
              <button
                className={stanza.alignment === 'right' ? 'active' : ''}
                onClick={() => updateStanza(stanza.id, 'alignment', 'right')}
                title="Alinhar à direita"
              >
                <AlignRight size={14} />
              </button>
            </div>

            {/* Transição + duração */}
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

              <span className="transition-label">
                {stanza.transitionDuration}s
              </span>

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

            {/* Botão remover (grande, como na referência) */}
            <button
              className="remove-stanza-btn"
              onClick={() => removeStanza(stanza.id)}
              title="Remover esta estrofe"
            >
              <Trash2 size={14} />
              Remover
            </button>

          </div>
        ))}
      </div>
    </div>
  );
};

export default LyricsEditorPanel;
