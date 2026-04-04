import React, { useEffect, useMemo, useState } from 'react';
import { Download, Loader } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './ExportPanel.css';

const extractErrorData = async (error) => {
  const responseData = error?.response?.data;

  if (!responseData || typeof Blob === 'undefined' || !(responseData instanceof Blob)) {
    return error?.response?.data || {};
  }

  try {
    const rawText = await responseData.text();
    return JSON.parse(rawText);
  } catch (_parseError) {
    return {};
  }
};

const getDownloadFileName = (headers = {}, fallbackName = 'video.mp4') => {
  const contentDisposition = headers?.['content-disposition'] || headers?.['Content-Disposition'];

  if (!contentDisposition) {
    return fallbackName;
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const simpleMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  if (simpleMatch?.[1]) {
    return simpleMatch[1];
  }

  return fallbackName;
};

const triggerBrowserDownload = (blob, fileName) => {
  const blobUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(blobUrl);
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

  const downloadRenderedVideo = async (fileName, downloadPath) => {
    const response = await api.get(downloadPath || `/video/download/${encodeURIComponent(fileName)}`, {
      responseType: 'blob',
    });

    const fallbackName = fileName || `${projectName.trim() || 'video'}.mp4`;
    const finalFileName = getDownloadFileName(response.headers, fallbackName);
    const videoBlob = new Blob([response.data], {
      type: response.data?.type || 'video/mp4',
    });

    triggerBrowserDownload(videoBlob, finalFileName);
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
      alert('Você está sem créditos. Cada download consome 1 crédito.');
      await openCheckout();
      return;
    }

    try {
      setLoading(true);

      await saveProjectBeforeExport();

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

      const fileName = response.data?.fileName;
      const downloadPath = response.data?.downloadPath?.replace('/api', '');

      if (!fileName) {
        throw new Error('Arquivo exportado não retornou um nome válido.');
      }

      await downloadRenderedVideo(fileName, downloadPath);

      if (refreshCredits) {
        await refreshCredits();
      }

      alert('Vídeo exportado com sucesso! O download começou e o crédito foi consumido somente agora.');
    } catch (error) {
      const parsedError = await extractErrorData(error);

      if (error.response?.status === 403 && parsedError?.code === 'NO_CREDITS') {
        alert('Sem créditos para download. Faça upgrade para continuar.');
        await openCheckout();
        return;
      }

      console.error(error);
      alert(parsedError?.error || error.message || 'Erro ao exportar vídeo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="export-panel">
      <h2>Exportar Vídeo</h2>
      <p className="export-note">
        O preview é apenas visual. O download final usa as opções abaixo e consome 1 crédito por arquivo baixado.
      </p>

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
          </select>
        </div>

        <div className="form-group form-group--audio">
          <label>Áudio</label>
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
                Gerando e baixando...
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
