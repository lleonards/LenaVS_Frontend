import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import FilesPanel from '../components/FilesPanel';
import PreviewPanel from '../components/PreviewPanel';
import LyricsEditorPanel from '../components/LyricsEditorPanel';
import ExportPanel from '../components/ExportPanel';
import './Editor.css';

const Editor = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // 🔒 Proteger rota: só usuário logado
  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  // Enquanto verifica sessão
  if (loading) {
    return (
      <div className="editor-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#FF8C5A', padding: 40, fontSize: 16 }}>Carregando sessão...</p>
      </div>
    );
  }

  // Estados principais
  const [stanzas, setStanzas] = useState([]);
  const [showLyricsEditor, setShowLyricsEditor] = useState(false);
  const [mediaFiles, setMediaFiles] = useState({
    musicaOriginal: null,
    musicaInstrumental: null,
    video: null,
    imagem: null
  });

  const [currentTime, setCurrentTime] = useState(0);
  const [audioType, setAudioType] = useState('original');
  const [backgroundColor, setBackgroundColor] = useState('#000000');

  const videoRef = useRef(null);

  // Callback quando letras são processadas
  const handleLyricsProcessed = (processedStanzas) => {
    setStanzas(processedStanzas);
    setShowLyricsEditor(true);
  };

  // Callback quando arquivos são carregados
  const handleFilesUploaded = (files) => {
    setMediaFiles(prev => ({ ...prev, ...files }));
  };

  return (
    <div className="editor-container">
      <Header />

      <div className="editor-main">
        {/* Coluna esquerda - Arquivos (span 2 linhas via CSS) */}
        <div className="editor-left">
          <FilesPanel
            onLyricsProcessed={handleLyricsProcessed}
            onFilesUploaded={handleFilesUploaded}
          />
        </div>

        {/* Preview - linha 1 do centro */}
        <div className="preview-wrapper">
          <PreviewPanel
            stanzas={stanzas}
            currentTime={currentTime}
            audioType={audioType}
            backgroundColor={backgroundColor}
            mediaFiles={mediaFiles}
            videoRef={videoRef}
            onTimeUpdate={setCurrentTime}
            onAudioTypeChange={setAudioType}
            onBackgroundColorChange={setBackgroundColor}
          />
        </div>

        {/* Coluna direita - Editor de Letras (span 2 linhas via CSS) */}
        <div className="editor-right">
          {showLyricsEditor ? (
            <LyricsEditorPanel
              stanzas={stanzas}
              onStanzasChange={setStanzas}
              currentTime={currentTime}
            />
          ) : (
            <div className="placeholder-panel">
              <p>📝 O Editor de Letras aparecerá aqui após o upload ou colagem da letra</p>
            </div>
          )}
        </div>

        {/* Exportar - linha 2 do centro, sempre visível */}
        <div className="export-wrapper">
          <ExportPanel
            stanzas={stanzas}
            mediaFiles={mediaFiles}
            audioType={audioType}
            backgroundColor={backgroundColor}
          />
        </div>
      </div>
    </div>
  );
};

export default Editor;
