import React, { useEffect, useMemo, useState } from 'react';
import { Download, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './ExportPanel.css';

const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

const RESOLUTION_OPTIONS = [
  { value: '360p', label: '360p' },
  { value: '480p', label: '480p' },
  { value: '720p', label: '720p' },
  {
    value: '1080p',
    label: '1080p',
    disabled: true,
    tooltip: 'disponível em breve',
  },
];

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

  const navigate = useNavigate();
  const { credits, hasUnlimitedAccess, refreshCredits } = useAuth();

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
    navigate('/upgrade');
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

  const waitForGeneration = async (response) => {
    if (response.data?.status === 'completed' && response.data?.videoUrl) {
      return response.data;
    }

    const taskId = response.data?.taskId;
    if (!taskId) {
      throw new Error('O backend não retornou o processamento do vídeo.');
    }

    let attempts = 0;
    const maxAttempts = 450;

    while (attempts < maxAttempts) {
      attempts += 1;
      await wait(2000);
      setLoadingLabel(`Gerando vídeo... (${Math.min(99, attempts)}%)`);

      const statusResponse = await api.get(`/video/status/${taskId}`);
      const data = statusResponse.data || {};

      if (data.status === 'completed' && data.videoUrl) {
        return data;
      }

      if (data.status === 'error') {
        throw new Error(data.error || data.message || 'Erro ao gerar vídeo');
      }

      if (data.message) {
        setLoadingLabel(data.message);
      }
    }

    throw new Error('Tempo limite excedido ao gerar o vídeo.');
  };

  const downloadGeneratedVideo = async (videoUrl, fallbackFileName, exactProjectName) => {
    let lastError = null;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        setLoadingLabel(attempt === 1 ? 'Baixando vídeo...' : `Baixando vídeo... (tentativa ${attempt})`);

        const downloadResponse = await api.get(videoUrl, {
          responseType: 'blob',
        });

        const fileNameFromHeader = getFileNameFromDisposition(
          downloadResponse.headers['content-disposition'],
          fallbackFileName
        );
        const finalFileName = fileNameFromHeader || `${exactProjectName}.${videoFormat}`;

        triggerBrowserDownload(downloadResponse.data, finalFileName);
        return;
      } catch (error) {
        lastError = error;

        if (error.response?.status !== 404 || attempt === 3) {
          throw error;
        }

        await wait(1200);
      }
    }

    throw lastError || new Error('Não foi possível baixar o vídeo gerado.');
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

    if (!hasUnlimitedAccess && Number(credits) <= 0) {
      alert('Você está sem créditos. Ative o LenaVS Unlimited para continuar exportando.');
      await openCheckout();
      return;
    }

    try {
      setLoading(true);
      setLoadingLabel('Salvando projeto...');

      await saveProjectBeforeExport();

      setLoadingLabel('Enviando para renderização...');
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

      const generationResult = await waitForGeneration(response);
      const videoUrl = generationResult.videoUrl;
      const exactProjectName = projectName.trim();
      const fallbackFileName = generationResult.downloadFileName || `${exactProjectName}.${videoFormat}`;

      if (!videoUrl) {
        throw new Error('O backend não retornou o link do vídeo gerado.');
      }

      await downloadGeneratedVideo(videoUrl, fallbackFileName, exactProjectName);

      if (refreshCredits) {
        await refreshCredits();
      }

      alert(
        hasUnlimitedAccess
          ? 'Vídeo gerado e baixado com sucesso! Seu plano Unlimited permaneceu ativo.'
          : 'Vídeo gerado e baixado com sucesso! 1 crédito foi consumido neste download.'
      );
    } catch (error) {
      if (error.response?.status === 403 && error.response?.data?.code === 'NO_CREDITS') {
        alert('Sem créditos. Ative o LenaVS Unlimited para continuar.');
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
          <div className="resolution-selector" role="group" aria-label="Selecionar resolução">
            {RESOLUTION_OPTIONS.map((option) => {
              const content = (
                <button
                  key={option.value}
                  type="button"
                  className={`resolution-chip ${resolution === option.value ? 'active' : ''}`}
                  onClick={() => !option.disabled && setResolution(option.value)}
                  disabled={option.disabled}
                  title={option.tooltip || option.label}
                >
                  {option.label}
                </button>
              );

              if (!option.disabled) {
                return content;
              }

              return (
                <div
                  key={option.value}
                  className="resolution-chip-wrapper"
                  data-tooltip={option.tooltip}
                >
                  {content}
                </div>
              );
            })}
          </div>
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
