import React, { useEffect, useMemo, useState } from 'react';
import { Download, Loader } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './ExportPanel.css';

const getFileNameFromDisposition = (contentDisposition, fallbackName) => {
  const rawHeader = String(contentDisposition || '');
  const utf8Match = rawHeader.match(/filename\*=UTF-8''([^;]+)/i);

  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const asciiMatch = rawHeader.match(/filename="?([^";]+)"?/i);
  if (asciiMatch?.[1]) {
    return asciiMatch[1];
  }

  return fallbackName;
};

const triggerBrowserDownload = (blob, fileName) => {
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => {
    window.URL.revokeObjectURL(objectUrl);
  }, 1000);
};

const ExportPanel = ({
  stanzas,
  mediaFiles,
  backgroundColor,
  audioType,
  projectName,
  onProjectNameChange,
  currentProjectId,
  onProjectSaved,
}) => {
  const [exportAudioType, setExportAudioType] = useState(audioType || 'original');
  const [videoFormat, setVideoFormat] = useState('mp4');
  const [resolution, setResolution] = useState('720p');
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState('Gerando...');

  const { credits, plan, refreshCredits } = useAuth();

  useEffect(() => {
    setExportAudioType(audioType || 'original');
  }, [audioType]);

  const effectiveAudioType = useMemo(() => {
    if (exportAudioType === 'instrumental' && !mediaFiles?.musicaInstrumental) {
      return 'original';
    }

    return exportAudioType;
  }, [exportAudioType, mediaFiles]);

  const openCheckout = async () => {
    try {
      const userLang = navigator.language || 'pt-BR';
      const currency = userLang.startsWith('en') ? 'USD' : 'BRL';
      const res = await api.post('/payment/create-session', { currency });

      if (res.data?.sessionUrl) {
        window.location.href = res.data.sessionUrl;
      }
    } catch (error) {
      console.error('Erro checkout:', error);
      alert('Erro ao abrir checkout');
    }
  };

  const saveProjectBeforeExport = async () => {
    const payload = {
      name: projectName.trim(),
      resolution,
      isPublic: true,
      config: {
        stanzas,
        mediaFiles,
        backgroundColor,
        audioType: effectiveAudioType,
        videoFormat,
      },
    };

    const response = currentProjectId
      ? await api.put(`/projects/${currentProjectId}`, payload)
      : await api.post('/projects', payload);

    const savedProject = response.data?.project;
    if (savedProject && onProjectSaved) {
      onProjectSaved(savedProject);
    }

    return savedProject;
  };

  const handleExport = async () => {
    if (loading) return;

    if (!projectName.trim()) {
      alert('Digite o nome do projeto');
      return;
    }

    if (!mediaFiles.musicaOriginal && !mediaFiles.musicaInstrumental) {
      alert('Faça upload do áudio');
      return;
    }

    if (plan === 'free' && credits <= 0) {
      alert('Você está sem créditos. Faça upgrade para continuar exportando.');
      await openCheckout();
      return;
    }

    try {
      setLoading(true);
      setLoadingLabel('Salvando projeto...');

      await saveProjectBeforeExport();

      setLoadingLabel('Gerando vídeo...');
      const response = await api.post('/video/generate', {
        projectName,
        audioType: effectiveAudioType,
        audioPath:
          effectiveAudioType === 'original'
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
        videoFormat,
        resolution,
      });

      const videoUrl = response.data?.videoUrl;
      const fallbackFileName = response.data?.fileName || `${projectName.trim()}.${videoFormat}`;

      if (!videoUrl) {
        throw new Error('O backend não retornou o link do vídeo gerado.');
      }

      setLoadingLabel('Baixando vídeo...');
      const downloadResponse = await api.get(videoUrl, {
        responseType: 'blob',
      });

      const fileName = getFileNameFromDisposition(
        downloadResponse.headers['content-disposition'],
        fallbackFileName
      );

      triggerBrowserDownload(downloadResponse.data, fileName);

      if (refreshCredits) {
        await refreshCredits();
      }

      alert('Vídeo gerado e baixado com sucesso! 1 crédito foi consumido neste download.');
    } catch (error) {
      if (error.response?.status === 403 && error.response?.data?.code === 'NO_CREDITS') {
        alert('Sem créditos. Faça upgrade para continuar.');
        await openCheckout();
        return;
      }

      console.error(error);
      alert(error.response?.data?.error || error.message || 'Erro ao exportar vídeo');
    } finally {
      setLoading(false);
      setLoadingLabel('Gerando...');
    }
  };

  return (
    <div className="export-panel">
      <h2>Exportar Vídeo</h2>

      <div className="export-form">
        <div className="form-group form-group--name">
          <label>Nome do Projeto</label>
          <input
            type="text"
            value={projectName}
            onChange={(event) => onProjectNameChange(event.target.value)}
            placeholder="Nome do projeto"
          />
        </div>

        <div className="form-group form-group--resolution">
          <label>Resolução</label>
          <select value={resolution} onChange={(event) => setResolution(event.target.value)}>
            <option value="360p">360p (SD)</option>
            <option value="480p">480p (SD+)</option>
            <option value="720p">720p (HD)</option>
            <option value="1080p">1080p (Full HD)</option>
            <option value="4K">4K (Ultra HD)</option>
          </select>
        </div>

        <div className="form-group form-group--format">
          <label>Formato</label>
          <select value={videoFormat} onChange={(event) => setVideoFormat(event.target.value)}>
            <option value="mp4">MP4</option>
            <option value="avi">AVI</option>
            <option value="mov">MOV</option>
            <option value="mkv">MKV</option>
          </select>
        </div>

        <div className="form-group form-group--audio">
          <label>Áudio final</label>
          <div className="audio-type-selector">
            <button
              type="button"
              className={effectiveAudioType === 'original' ? 'active' : ''}
              onClick={() => setExportAudioType('original')}
              disabled={!mediaFiles.musicaOriginal}
            >
              Original
            </button>
            <button
              type="button"
              className={effectiveAudioType === 'instrumental' ? 'active' : ''}
              onClick={() => setExportAudioType('instrumental')}
              disabled={!mediaFiles.musicaInstrumental}
            >
              Playback
            </button>
          </div>
        </div>

        <div className="form-group form-group--btn">
          <button className="export-btn" onClick={handleExport} disabled={loading}>
            {loading ? (
              <>
                <Loader size={16} className="spinner" />
                {loadingLabel}
              </>
            ) : (
              <>
                <Download size={16} />
                EXPORTAR E BAIXAR
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportPanel;
