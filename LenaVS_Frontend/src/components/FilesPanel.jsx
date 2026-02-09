import React, { useState } from 'react';
import { Upload, Type } from 'lucide-react';
import api from '../services/api';
import './FilesPanel.css';

const FilesPanel = ({ onLyricsProcessed, onFilesUploaded }) => {
  const [loading, setLoading] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [lyricsText, setLyricsText] = useState('');

  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append(type, file);

    try {
      setLoading(true);
      const response = await api.post('/api/video/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      onFilesUploaded({ [type]: response.data.files[type] });
      alert('Arquivo enviado com sucesso!');
    } catch (error) {
      alert('Erro ao enviar arquivo');
    } finally {
      setLoading(false);
    }
  };

  const handleLyricsUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('letra', file);

    try {
      setLoading(true);
      const response = await api.post('/api/lyrics/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
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
      alert(response.data.message);
    } catch (error) {
      alert('Erro ao processar letra');
    } finally {
      setLoading(false);
    }
  };

  const handleManualLyrics = async () => {
    if (!lyricsText.trim()) return;

    try {
      setLoading(true);
      const response = await api.post('/api/lyrics/manual', { text: lyricsText });
      
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
      alert(response.data.message);
    } catch (error) {
      alert('Erro ao processar letra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="files-panel">
      <h2>Arquivos</h2>
      
      <div className="upload-section">
        <label className="upload-btn">
          <Upload size={18} />
          Música Original
          <input type="file" accept="audio/*" onChange={(e) => handleFileUpload(e, 'musicaOriginal')} />
        </label>

        <label className="upload-btn">
          <Upload size={18} />
          Música Instrumental
          <input type="file" accept="audio/*" onChange={(e) => handleFileUpload(e, 'musicaInstrumental')} />
        </label>

        <label className="upload-btn">
          <Upload size={18} />
          Vídeo/Foto
          <input type="file" accept="video/*,image/*" onChange={(e) => handleFileUpload(e, 'video')} />
        </label>

        <label className="upload-btn">
          <Upload size={18} />
          Letra (arquivo)
          <input type="file" accept=".txt,.docx,.pdf" onChange={handleLyricsUpload} />
        </label>

        <button className="upload-btn" onClick={() => setShowTextInput(!showTextInput)}>
          <Type size={18} />
          Colar Letra
        </button>
      </div>

      {showTextInput && (
        <div className="text-input-section">
          <textarea
            value={lyricsText}
            onChange={(e) => setLyricsText(e.target.value)}
            placeholder="Cole a letra aqui..."
            rows="8"
          />
          <button onClick={handleManualLyrics} disabled={loading}>
            Processar Letra
          </button>
        </div>
      )}
    </div>
  );
};

export default FilesPanel;
