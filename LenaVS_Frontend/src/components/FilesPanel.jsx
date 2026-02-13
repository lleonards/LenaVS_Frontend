import React, { useState } from 'react';
import { Upload, Type, Check } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './FilesPanel.css';

const FilesPanel = ({ onLyricsProcessed, onFilesUploaded }) => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [lyricsText, setLyricsText] = useState('');
  const [uploadStatus, setUploadStatus] = useState(null); 
  // null | musicaOriginal | musicaInstrumental | video | letraArquivo | letraManual

  const triggerSuccess = (type) => {
    setUploadStatus(type);
    setTimeout(() => setUploadStatus(null), 3000);
  };

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

      const response = await api.post('/api/video/upload', formData);
      const publicUrl = response.data.files[type];

      onFilesUploaded({ [type]: publicUrl });

      triggerSuccess(type);

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

      const response = await api.post('/api/lyrics/upload', formData);

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
      triggerSuccess('letraArquivo');

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

      const response = await api.post('/api/lyrics/manual', {
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
      triggerSuccess('letraManual');

    } catch (error) {
      console.error('Erro ao processar letra manual:', error.response || error);
      alert(error.response?.data?.error || 'Erro ao processar letra');
    } finally {
      setLoading(false);
    }
  };

  const getButtonClass = (type) => {
    if (uploadStatus === type) return 'upload-btn success';
    if (loading) return 'upload-btn loading';
    return 'upload-btn';
  };

  const getButtonContent = (label, type) => {
    if (uploadStatus === type) {
      return (
        <>
          <Check size={18} />
          Upload concluído
        </>
      );
    }

    if (loading) {
      return (
        <>
          <Upload size={18} />
          Enviando...
        </>
      );
    }

    return (
      <>
        <Upload size={18} />
        {label}
      </>
    );
  };

  return (
    <div className="files-panel">
      <h2>Arquivos</h2>

      <div className="upload-section">
        <label className={getButtonClass('musicaOriginal')}>
          {getButtonContent('Música Original', 'musicaOriginal')}
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => handleFileUpload(e, 'musicaOriginal')}
            disabled={loading}
          />
        </label>

        <label className={getButtonClass('musicaInstrumental')}>
          {getButtonContent('Música Instrumental', 'musicaInstrumental')}
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => handleFileUpload(e, 'musicaInstrumental')}
            disabled={loading}
          />
        </label>

        <label className={getButtonClass('video')}>
          {getButtonContent('Vídeo/Foto', 'video')}
          <input
            type="file"
            accept="video/*,image/*"
            onChange={(e) => handleFileUpload(e, 'video')}
            disabled={loading}
          />
        </label>

        <label className={getButtonClass('letraArquivo')}>
          {getButtonContent('Letra (arquivo)', 'letraArquivo')}
          <input
            type="file"
            accept=".txt,.docx,.pdf"
            onChange={handleLyricsUpload}
            disabled={loading}
          />
        </label>

        <button
          className={getButtonClass('letraManual')}
          onClick={() => setShowTextInput(!showTextInput)}
          disabled={loading}
        >
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
            {uploadStatus === 'letraManual' ? '✓ Processado!' : 'Processar Letra'}
          </button>
        </div>
      )}
    </div>
  );
};

export default FilesPanel;
