import React, { useState } from 'react';
import { Download, Loader } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './ExportPanel.css';

const ExportPanel = ({ stanzas, mediaFiles, audioType, backgroundColor }) => {
  const [projectName, setProjectName] = useState('Meu_Projeto');
  const [exportAudioType, setExportAudioType] = useState('original');
  const [videoFormat, setVideoFormat] = useState('mp4');
  const [loading, setLoading] = useState(false);

  // Alterado de 'refreshSubscription' para 'fetchSubscription' conforme seu AuthContext
  const { credits, plan, fetchSubscription } = useAuth(); 
  const navigate = useNavigate();

  const handleExport = async () => {
    if (!projectName.trim()) {
      alert('Por favor, digite um nome para o projeto');
      return;
    }

    if (!mediaFiles.musicaOriginal && !mediaFiles.musicaInstrumental) {
      alert('Por favor, faça upload de pelo menos um arquivo de áudio');
      return;
    }

    // BLOQUEIO FRONTEND
    if (plan === 'free' && credits <= 0) {
      alert('Você está sem créditos. Faça upgrade para continuar.');
      navigate('/upgrade');
      return;
    }

    setLoading(true);

    try {
      // 1️⃣ Consumir crédito (somente FREE)
      // Ajustado: Removido o '/api' extra e adicionado o prefixo '/user' que está no server.js
      if (plan === 'free') {
        await api.post('/user/consume-credit');
      }

      // 2️⃣ Gerar vídeo
      const response = await api.post('/video/generate', {
        projectName,
        audioType: exportAudioType,
        audioPath:
          exportAudioType === 'original'
            ? mediaFiles.musicaOriginal
            : mediaFiles.musicaInstrumental,
        backgroundType: mediaFiles.video
          ? 'video'
          : mediaFiles.imagem
          ? 'image'
          : 'color',
        backgroundPath: mediaFiles.video || mediaFiles.imagem,
        backgroundColor,
        stanzas,
        videoFormat
      });

      const videoUrl = response.data.videoUrl;

      // 3️⃣ Atualiza créditos no contexto global para refletir no Header imediatamente
      if (fetchSubscription) {
        await fetchSubscription();
      }

      window.open(videoUrl, '_blank');
      alert('Vídeo gerado com sucesso!');

    } catch (error) {
      if (error.response?.status === 403) {
        alert('Você está sem créditos. Faça upgrade para continuar.');
        navigate('/upgrade');
        return;
      }
      console.error('Erro ao gerar vídeo:', error);
      alert('Erro ao gerar vídeo. Verifique seus arquivos e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="export-panel">
      <h2>Exportar Vídeo</h2>

      <div className="export-form">
        <div className="form-group">
          <label>Nome do Projeto</label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Digite o nome do projeto"
          />
        </div>

        <div className="form-group">
          <label>Tipo de Áudio</label>
          <div className="audio-type-selector">
            <button
              type="button"
              className={exportAudioType === 'original' ? 'active' : ''}
              onClick={() => setExportAudioType('original')}
              disabled={!mediaFiles.musicaOriginal}
            >
              Música Original
            </button>

            <button
              type="button"
              className={exportAudioType === 'instrumental' ? 'active' : ''}
              onClick={() => setExportAudioType('instrumental')}
              disabled={!mediaFiles.musicaInstrumental}
            >
              Playback
            </button>
          </div>
        </div>

        <div className="form-group">
          <label>Formato do Vídeo</label>
          <select
            value={videoFormat}
            onChange={(e) => setVideoFormat(e.target.value)}
          >
            <option value="mp4">MP4</option>
            <option value="avi">AVI</option>
            <option value="mov">MOV</option>
            <option value="mkv">MKV</option>
          </select>
        </div>

        <button
          className="export-btn"
          onClick={handleExport}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader size={20} className="spinner" />
              Gerando vídeo...
            </>
          ) : (
            <>
              <Download size={20} />
              {plan === 'free'
                ? `EXPORTAR VÍDEO (${credits} créditos)`
                : 'EXPORTAR VÍDEO (PRO)'}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ExportPanel;
