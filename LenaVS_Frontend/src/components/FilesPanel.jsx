import React, { useState } from 'react';
import { Upload, Type } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './FilesPanel.css';

const FilesPanel = ({ onLyricsProcessed, onFilesUploaded }) => {
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [lyricsText, setLyricsText] = useState('');

  const [uploaded, setUploaded] = useState({
    musicaOriginal: false,
    musicaInstrumental: false,
    video: false,
    letraArquivo: false,
    letraManual: false
  });

  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (authLoading || !isAuthenticated) {
      alert('Você precisa estar logado para enviar arquivos.');
      return;
    }

    const formData = new FormData();
    formData.append(type, file);

    try {
      setLoading(true);

      const response = await api.post('/video/upload', formData);

      const publicUrl = response.data.files[type];

      onFilesUploaded({ [type]: publicUrl });

      setUploaded(prev => ({
        ...prev,
        [type]: true
      }));

      alert('Arquivo enviado com sucesso!');

    } catch (error) {
      console.error('Erro no upload:', error.response || error);
      alert(error.response?.data?.error || 'Erro ao enviar arquivo');
    } finally {
      setLoading(false);
    }
  };

  const handleLyricsUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (authLoading || !isAuthenticated) {
      alert('Você precisa estar logado para enviar letras.');
      return;
    }

    const formData = new FormData();
    formData.append('letra', file);

    try {
      setLoading(true);

      const response = await api.post('/lyrics/upload', formData);

      const stanzasData = response.data.stanzas.map((text, idx) => ({
        id: idx,
        text,
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
      }));

      onLyricsProcessed(stanzasData);

      setUploaded(prev => ({
        ...prev,
        letraArquivo: true
      }));

      alert(response.data.message);

    } catch (error) {
      console.error('Erro ao processar letra:', error.response || error);
      alert(error.response?.data?.error || 'Erro ao processar letra');
    } finally {
      setLoading(false);
    }
  };

  const handleManualLyrics = async () => {

    if (!lyricsText.trim()) return;

    if (authLoading || !isAuthenticated) {
      alert('Você precisa estar logado para enviar letras.');
      return;
    }

    try {
      setLoading(true);

      const response = await api.post('/lyrics/manual', {
        text: lyricsText
      });

      const stanzasData = response.data.stanzas.map((text, idx) => ({
        id: idx,
        text,
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
      }));

      onLyricsProcessed(stanzasData);

      setShowTextInput(false);
      setLyricsText('');

      setUploaded(prev => ({
        ...prev,
        letraManual: true
      }));

      alert(response.data.message);

    } catch (error) {
      console.error('Erro ao processar letra manual:', error.response || error);
      alert(error.response?.data?.error || 'Erro ao processar letra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="files-panel">

      <h2>Arquivos</h2>

      <div className="upload-section">

        {/* Música Original */}
        <label className="upload-btn">
          <Upload size={15} />
          <span>Música Original</span>

          {uploaded.musicaOriginal &&
            <span className="upload-check">✓</span>
          }

          <input
            type="file"
            accept="audio/*"
            onChange={(e) => handleFileUpload(e, 'musicaOriginal')}
            disabled={loading}
          />
        </label>


        {/* Música Instrumental */}
        <label className="upload-btn">
          <Upload size={15} />
          <span>Música Instrumental</span>

          {uploaded.musicaInstrumental &&
            <span className="upload-check">✓</span>
          }

          <input
            type="file"
            accept="audio/*"
            onChange={(e) => handleFileUpload(e, 'musicaInstrumental')}
            disabled={loading}
          />
        </label>


        {/* DIVISOR OPCIONAL */}
        <div className="upload-divider">
          OPCIONAL
        </div>


        {/* Vídeo ou Foto */}
        <label className="upload-btn">
          <Upload size={15} />
          <span>Vídeo / Foto</span>

          {uploaded.video
            ? <span className="upload-check">✓</span>
            : <span className="upload-optional">OPCIONAL</span>
          }

          <input
            type="file"
            accept="video/*,image/*"
            onChange={(e) => handleFileUpload(e, 'video')}
            disabled={loading}
          />
        </label>


        {/* DIVISOR LETRA */}
        <div className="upload-divider">
          LETRA
        </div>


        {/* Letra arquivo */}
        <label className="upload-btn">
          <Upload size={15} />
          <span>Letra (arquivo)</span>

          {uploaded.letraArquivo &&
            <span className="upload-check">✓</span>
          }

          <input
            type="file"
            accept=".txt,.docx,.pdf"
            onChange={handleLyricsUpload}
            disabled={loading}
          />
        </label>


        {/* Colar letra */}
        <button
          className="upload-btn"
          onClick={() => setShowTextInput(!showTextInput)}
          disabled={loading}
        >

          <Type size={15} />
          <span>Colar Letra</span>

          {uploaded.letraManual &&
            <span className="upload-check">✓</span>
          }

        </button>

      </div>


      {showTextInput && (
        <div className="text-input-section">

          <textarea
            value={lyricsText}
            onChange={(e) => setLyricsText(e.target.value)}
            placeholder="Cole a letra aqui..."
            rows="6"
          />

          <button
            onClick={handleManualLyrics}
            disabled={loading}
          >
            {loading ? 'Processando...' : 'Processar Letra'}
          </button>

        </div>
      )}

    </div>
  );
};

export default FilesPanel;
