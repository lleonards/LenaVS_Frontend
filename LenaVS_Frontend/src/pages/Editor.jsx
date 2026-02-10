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
      <div className="editor-container">
        <p style={{ color: '#fff', padding: 40 }}>Carregando sessão...</p>
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
        <div className="editor-left">
          <FilesPanel
            onLyricsProcessed={handleLyricsProcessed}
            onFilesUploaded={handleFilesUploaded}
          />
        </div>

        <div className="editor-center">
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

          <ExportPanel
            stanzas={stanzas}
            mediaFiles={mediaFiles}
            audioType={audioType}
            backgroundColor={backgroundColor}
          />
        </div>

        <div className="editor-right">
          {showLyricsEditor ? (
            <LyricsEditorPanel
              stanzas={stanzas}
              onStanzasChange={setStanzas}
              currentTime={currentTime}
            />
          ) : (
            <div className="placeholder-panel">
              <p>O painel Editor de Letras aparecerá aqui após o upload da letra</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Editor;

