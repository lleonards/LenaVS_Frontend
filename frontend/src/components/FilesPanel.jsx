import React, { useState, useRef } from 'react';
import { Music, Music2, Film, FileText, ClipboardType, CheckCircle2, UploadCloud } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './FilesPanel.css';

const UploadItem = ({ icon: Icon, label, accept, uploaded, loading, onChange, type }) => {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      const syntheticEvent = { target: { files: [file] } };
      onChange(syntheticEvent, type);
    }
  };

  return (
    <div
      className={`upload-item ${uploaded ? 'uploaded' : ''} ${dragging ? 'dragging' : ''}`}
      onClick={() => !loading && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <div className="upload-item-icon">
        {uploaded ? <CheckCircle2 size={22} className="check-icon" /> : <Icon size={22} />}
      </div>
      <div className="upload-item-info">
        <span className="upload-item-label">{label}</span>
        <span className="upload-item-hint">
          {uploaded ? 'Enviado com sucesso ✓' : 'Clique ou arraste o arquivo'}
        </span>
      </div>
      {!uploaded && <UploadCloud size={18} className="upload-cloud-icon" />}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={(e) => onChange(e, type)}
        disabled={loading}
        style={{ display: 'none' }}
      />
    </div>
  );
};

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
    letraManual: false,
  });

  const checkAuth = () => {
    if (authLoading || !isAuthenticated) {
      alert('Você precisa estar logado para enviar arquivos.');
      return false;
    }
    return true;
  };

  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file || !checkAuth()) return;

    const formData = new FormData();
    formData.append(type, file);

    try {
      setLoading(true);
      const response = await api.post('/video/upload', formData);
      const publicUrl = response.data.files[type];
      onFilesUploaded({ [type]: publicUrl });
      setUploaded((prev) => ({ ...prev, [type]: true }));
    } catch (error) {
      console.error('Erro no upload:', error.response || error);
      alert(error.response?.data?.error || 'Erro ao enviar arquivo');
    } finally {
      setLoading(false);
    }
  };

  const handleLyricsUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !checkAuth()) return;

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
        alignment: 'center',
      }));
      onLyricsProcessed(stanzasData);
      setUploaded((prev) => ({ ...prev, letraArquivo: true }));
      alert(response.data.message);
    } catch (error) {
      alert(error.response?.data?.error || 'Erro ao processar letra');
    } finally {
      setLoading(false);
    }
  };

  const handleManualLyrics = async () => {
    if (!lyricsText.trim() || !checkAuth()) return;

    try {
      setLoading(true);
      const response = await api.post('/lyrics/manual', { text: lyricsText });
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
        alignment: 'center',
      }));
      onLyricsProcessed(stanzasData);
      setShowTextInput(false);
      setLyricsText('');
      setUploaded((prev) => ({ ...prev, letraManual: true }));
    } catch (error) {
      alert(error.response?.data?.error || 'Erro ao processar letra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="files-panel">
      <h2 className="files-panel-title">Arquivos</h2>

      {loading && (
        <div className="files-loading-bar">
          <div className="files-loading-progress" />
        </div>
      )}

      <div className="upload-list">
        <UploadItem
          icon={Music}
          label="Música Original"
          accept="audio/*"
          uploaded={uploaded.musicaOriginal}
          loading={loading}
          onChange={handleFileUpload}
          type="musicaOriginal"
        />
        <UploadItem
          icon={Music2}
          label="Música Instrumental"
          accept="audio/*"
          uploaded={uploaded.musicaInstrumental}
          loading={loading}
          onChange={handleFileUpload}
          type="musicaInstrumental"
        />
        <UploadItem
          icon={Film}
          label="Vídeo / Foto"
          accept="video/*,image/*"
          uploaded={uploaded.video}
          loading={loading}
          onChange={handleFileUpload}
          type="video"
        />
        <UploadItem
          icon={FileText}
          label="Letra (arquivo)"
          accept=".txt,.docx,.pdf"
          uploaded={uploaded.letraArquivo}
          loading={loading}
          onChange={handleLyricsUpload}
          type="letra"
        />

        {/* Colar Letra manual */}
        <div
          className={`upload-item manual-item ${uploaded.letraManual ? 'uploaded' : ''} ${showTextInput ? 'active' : ''}`}
          onClick={() => !loading && setShowTextInput(!showTextInput)}
        >
          <div className="upload-item-icon">
            {uploaded.letraManual
              ? <CheckCircle2 size={22} className="check-icon" />
              : <ClipboardType size={22} />}
          </div>
          <div className="upload-item-info">
            <span className="upload-item-label">Colar Letra</span>
            <span className="upload-item-hint">
              {uploaded.letraManual ? 'Letra inserida ✓' : 'Digite ou cole a letra manualmente'}
            </span>
          </div>
        </div>
      </div>

      {showTextInput && (
        <div className="manual-lyrics-box">
          <textarea
            value={lyricsText}
            onChange={(e) => setLyricsText(e.target.value)}
            placeholder="Cole ou digite a letra aqui...&#10;&#10;Use linhas em branco para separar as estrofes."
            rows={8}
          />
          <button
            className="manual-lyrics-btn"
            onClick={handleManualLyrics}
            disabled={loading || !lyricsText.trim()}
          >
            {loading ? 'Processando...' : 'Processar Letra'}
          </button>
        </div>
      )}
    </div>
  );
};

export default FilesPanel;
