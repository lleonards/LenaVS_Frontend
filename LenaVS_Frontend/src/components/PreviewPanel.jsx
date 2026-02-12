import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Music } from 'lucide-react';
import './PreviewPanel.css';

const PreviewPanel = ({
  stanzas = [],
  currentTime = 0,
  audioType = 'original',
  backgroundColor = '#000000',
  mediaFiles = {},
  onTimeUpdate = () => {},
  onAudioTypeChange = () => {},
  onBackgroundColorChange = () => {}
}) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);

  // Define qual áudio usar
  const audioSrc =
    audioType === 'instrumental'
      ? mediaFiles?.musicaInstrumental
      : mediaFiles?.musicaOriginal;

  // Atualizar áudio ao trocar tipo
  useEffect(() => {
    if (audioRef.current && audioSrc) {
      audioRef.current.pause();
      audioRef.current.load();
      setIsPlaying(false);
    }
  }, [audioSrc]);

  // Play / Pause com tratamento de erro
  const togglePlay = async () => {
    if (!audioRef.current || !audioSrc) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error("Erro ao tentar tocar áudio:", err);
    }
  };

  // Estrofe atual
  const getCurrentStanza = () => {
    return stanzas.find(stanza => {
      const [sm, ss] = stanza.startTime.split(':').map(Number);
      const [em, es] = stanza.endTime.split(':').map(Number);
      const start = sm * 60 + ss;
      const end = em * 60 + es;
      return currentTime >= start && currentTime <= end;
    });
  };

  const currentStanza = getCurrentStanza();

  // Formatador de tempo
  const formatTime = (sec) => {
    if (!sec || isNaN(sec)) return "00:00";
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

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

      {/* PLAYER REAL CORRIGIDO */}
      <audio
        ref={audioRef}
        crossOrigin="anonymous"
        onTimeUpdate={(e) => onTimeUpdate(e.target.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.target.duration)}
        onEnded={() => setIsPlaying(false)}
        onError={() => {
          console.error("Erro ao carregar áudio:", audioSrc);
        }}
      >
        {audioSrc && (
          <source src={audioSrc} type="audio/mpeg" />
        )}
        Seu navegador não suporta áudio.
      </audio>

      <div className="preview-controls">
        <button
          className="control-btn"
          onClick={togglePlay}
          disabled={!audioSrc}
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>

        <span className="time-display">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        <button
          className="audio-switch-btn"
          onClick={() =>
            onAudioTypeChange(
              audioType === 'original' ? 'instrumental' : 'original'
            )
          }
          disabled={
            audioType === 'original'
              ? !mediaFiles?.musicaInstrumental
              : !mediaFiles?.musicaOriginal
          }
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
