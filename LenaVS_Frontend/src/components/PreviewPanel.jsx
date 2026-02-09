import React from 'react';
import { Play, Pause, Music } from 'lucide-react';
import './PreviewPanel.css';

const PreviewPanel = ({ 
  stanzas, 
  currentTime, 
  audioType, 
  backgroundColor,
  onAudioTypeChange,
  onBackgroundColorChange 
}) => {
  const getCurrentStanza = () => {
    // Converter tempo atual para formato mm:ss
    const timeInSeconds = currentTime;
    
    return stanzas.find(stanza => {
      const [startMin, startSec] = stanza.startTime.split(':').map(Number);
      const [endMin, endSec] = stanza.endTime.split(':').map(Number);
      const start = startMin * 60 + startSec;
      const end = endMin * 60 + endSec;
      
      return timeInSeconds >= start && timeInSeconds <= end;
    });
  };

  const currentStanza = getCurrentStanza();

  return (
    <div className="preview-panel">
      <h2>Preview</h2>
      <div 
        className="preview-video" 
        style={{ backgroundColor }}
      >
        {currentStanza && (
          <div 
            className="lyrics-display"
            style={{
              fontSize: `${currentStanza.fontSize}px`,
              fontFamily: currentStanza.fontFamily,
              color: currentStanza.color,
              textShadow: `2px 2px 4px ${currentStanza.outlineColor}`,
              fontWeight: currentStanza.bold ? 'bold' : 'normal',
              fontStyle: currentStanza.italic ? 'italic' : 'normal',
              textDecoration: currentStanza.underline ? 'underline' : 'none',
              textAlign: currentStanza.alignment
            }}
          >
            {currentStanza.text}
          </div>
        )}
      </div>
      
      <div className="preview-controls">
        <button className="control-btn">
          <Play size={20} />
        </button>
        <span className="time-display">00:00 / 00:00</span>
        <button 
          className="audio-switch-btn"
          onClick={() => onAudioTypeChange(audioType === 'original' ? 'instrumental' : 'original')}
        >
          <Music size={18} />
          {audioType === 'original' ? 'Original' : 'Playback'}
        </button>
        <input 
          type="color" 
          value={backgroundColor}
          onChange={(e) => onBackgroundColorChange(e.target.value)}
          title="Cor de fundo"
        />
      </div>
    </div>
  );
};

export default PreviewPanel;
