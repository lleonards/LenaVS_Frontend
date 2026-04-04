import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import FilesPanel from '../components/FilesPanel';
import PreviewPanel from '../components/PreviewPanel';
import LyricsEditorPanel from '../components/LyricsEditorPanel';
import ExportPanel from '../components/ExportPanel';
import ProjectsPanel from '../components/ProjectsPanel';
import { formatFixedTimecode, parseFixedTimecode } from '../utils/timecode';
import { hasDefinedStartTime, normalizeStanzas } from '../utils/stanza';
import api from '../services/api';
import './Editor.css';

const EMPTY_MEDIA_FILES = {
  musicaOriginal: null,
  musicaInstrumental: null,
  video: null,
  imagem: null,
};

const Editor = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [stanzas, setStanzas] = useState([]);
  const [selectedStanzaId, setSelectedStanzaId] = useState(null);
  const [seekRequest, setSeekRequest] = useState(null);
  const [showLyricsEditor, setShowLyricsEditor] = useState(false);
  const [mediaFiles, setMediaFiles] = useState(EMPTY_MEDIA_FILES);
  const [projectName, setProjectName] = useState('Meu_Projeto');
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioType, setAudioType] = useState('original');
  const [backgroundColor, setBackgroundColor] = useState('#000000');
  const [previewMetrics, setPreviewMetrics] = useState({ width: 1280, height: 720 });
  const [syncStatus, setSyncStatus] = useState(null);
  const [showProjectsPanel, setShowProjectsPanel] = useState(false);
  const [projectsTab, setProjectsTab] = useState('history');
  const [myProjects, setMyProjects] = useState([]);
  const [libraryProjects, setLibraryProjects] = useState([]);
  const [loadingMyProjects, setLoadingMyProjects] = useState(false);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [librarySearch, setLibrarySearch] = useState('');

  const currentTimeRef = useRef(0);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  const fetchMyProjects = useCallback(async () => {
    if (!user) return;

    try {
      setLoadingMyProjects(true);
      const response = await api.get('/projects');
      setMyProjects(response.data?.projects || []);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    } finally {
      setLoadingMyProjects(false);
    }
  }, [user]);

  const fetchLibraryProjects = useCallback(async () => {
    if (!user) return;

    try {
      setLoadingLibrary(true);
      const response = await api.get('/projects/library');
      setLibraryProjects(response.data?.projects || []);
    } catch (error) {
      console.error('Erro ao carregar biblioteca:', error);
    } finally {
      setLoadingLibrary(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchMyProjects();
    fetchLibraryProjects();
  }, [user, fetchMyProjects, fetchLibraryProjects]);

  const handleTimeUpdate = useCallback((time) => {
    currentTimeRef.current = time;
    setCurrentTime(time);
  }, []);

  const handleLyricsProcessed = useCallback((processedStanzas) => {
    const normalized = normalizeStanzas(processedStanzas, previewMetrics);

    setStanzas(normalized);
    setSelectedStanzaId(normalized[0]?.id ?? null);
    setShowLyricsEditor(true);
    setSyncStatus({
      type: 'info',
      message: `${normalized.length} blocos carregados. O preview agora é somente visual e os ajustes ficam centralizados no Editor de Letras.`,
    });
  }, [previewMetrics]);

  const handleFilesUploaded = useCallback((files) => {
    setMediaFiles((prev) => ({ ...prev, ...files }));
  }, []);

  const handleStanzasChange = useCallback((nextStanzas) => {
    const normalized = normalizeStanzas(nextStanzas, previewMetrics);
    setStanzas(normalized);
    setShowLyricsEditor(normalized.length > 0);
  }, [previewMetrics]);

  const secondsToTimecode = (seconds) => formatFixedTimecode(seconds);

  const handleTapSync = useCallback((stanzaId, field) => {
    const current = currentTimeRef.current;
    const flagField = field === 'startTime' ? 'hasManualStart' : 'hasManualEnd';

    setStanzas((prev) =>
      prev.map((stanza) =>
        stanza.id === stanzaId
          ? {
              ...stanza,
              [field]: secondsToTimecode(current),
              [flagField]: true,
            }
          : stanza
      )
    );
  }, []);

  const requestPreviewSeek = useCallback((stanzaId, options = {}) => {
    const { notifyIfMissingStart = false } = options;
    const stanza = stanzas.find((item) => item.id === stanzaId);

    if (!stanza) return false;

    if (!hasDefinedStartTime(stanza)) {
      if (notifyIfMissingStart) {
        setSyncStatus({
          type: 'warning',
          message: 'Defina o tempo inicial da estrofe para o preview abrir nela automaticamente.',
        });
      }
      return false;
    }

    const start = parseFixedTimecode(stanza.startTime);
    if (start === null) {
      if (notifyIfMissingStart) {
        setSyncStatus({
          type: 'warning',
          message: 'Defina um tempo inicial válido para esta estrofe antes de abrir no preview.',
        });
      }
      return false;
    }

    setSeekRequest({
      stanzaId,
      time: start,
      nonce: Date.now(),
    });

    return true;
  }, [stanzas]);

  const handleSelectStanza = useCallback((stanzaId, options = {}) => {
    const { source = 'editor', shouldSeek = source === 'editor', notifyIfMissingStart = source === 'editor' } = options;

    setSelectedStanzaId(stanzaId);

    if (shouldSeek) {
      requestPreviewSeek(stanzaId, { notifyIfMissingStart });
    }
  }, [requestPreviewSeek]);

  const openBlankProject = useCallback(() => {
    setCurrentProjectId(null);
    setProjectName('Meu_Projeto');
    setStanzas([]);
    setSelectedStanzaId(null);
    setShowLyricsEditor(false);
    setMediaFiles(EMPTY_MEDIA_FILES);
    setAudioType('original');
    setBackgroundColor('#000000');
    setCurrentTime(0);
    currentTimeRef.current = 0;
    setSeekRequest(null);
    setSyncStatus({
      type: 'info',
      message: 'Novo projeto iniciado. Faça upload dos arquivos e personalize o vídeo.',
    });
    setShowProjectsPanel(false);
  }, []);

  const loadProjectIntoEditor = useCallback((project, successMessage) => {
    const config = project?.config || {};
    const normalizedStanzas = normalizeStanzas(config.stanzas || [], previewMetrics);

    setCurrentProjectId(project?.id || null);
    setProjectName(project?.name || 'Meu_Projeto');
    setStanzas(normalizedStanzas);
    setSelectedStanzaId(normalizedStanzas[0]?.id ?? null);
    setShowLyricsEditor(normalizedStanzas.length > 0);
    setMediaFiles({
      ...EMPTY_MEDIA_FILES,
      ...(config.mediaFiles || {}),
    });
    setAudioType(config.audioType || 'original');
    setBackgroundColor(config.backgroundColor || '#000000');
    setSyncStatus({
      type: 'success',
      message: successMessage || `Projeto "${project?.name || 'sem nome'}" carregado com sucesso.`,
    });
    setShowProjectsPanel(false);
  }, [previewMetrics]);

  const handleSavedProject = useCallback((project) => {
    if (!project) return;

    setCurrentProjectId(project.id);
    setProjectName(project.name || 'Meu_Projeto');
    setMyProjects((prev) => {
      const otherProjects = prev.filter((item) => item.id !== project.id);
      return [project, ...otherProjects];
    });
    setLibraryProjects((prev) => {
      const withoutCurrent = prev.filter((item) => item.id !== project.id);
      return project.is_public ? [project, ...withoutCurrent] : withoutCurrent;
    });
  }, []);

  const handleOpenProject = useCallback((project) => {
    loadProjectIntoEditor(project, `Projeto "${project.name}" aberto no editor.`);
  }, [loadProjectIntoEditor]);

  const handleTogglePublic = useCallback(async (project) => {
    try {
      const response = await api.patch(`/projects/${project.id}/toggle-public`);
      const updatedProject = response.data?.project;
      if (!updatedProject) return;

      setMyProjects((prev) => prev.map((item) => (item.id === updatedProject.id ? updatedProject : item)));
      setLibraryProjects((prev) => {
        const withoutCurrent = prev.filter((item) => item.id !== updatedProject.id);
        return updatedProject.is_public ? [updatedProject, ...withoutCurrent] : withoutCurrent;
      });
      setSyncStatus({
        type: 'success',
        message: updatedProject.is_public
          ? `Projeto "${updatedProject.name}" publicado na biblioteca.`
          : `Projeto "${updatedProject.name}" voltou para privado.`,
      });
    } catch (error) {
      console.error('Erro ao alterar publicação do projeto:', error);
      alert(error.response?.data?.error || 'Não foi possível alterar a visibilidade do projeto.');
    }
  }, []);

  const handleDeleteProject = useCallback(async (project) => {
    const confirmed = window.confirm(`Deseja realmente excluir o projeto "${project.name}"?`);
    if (!confirmed) return;

    try {
      await api.delete(`/projects/${project.id}`);
      setMyProjects((prev) => prev.filter((item) => item.id !== project.id));
      setLibraryProjects((prev) => prev.filter((item) => item.id !== project.id));

      if (currentProjectId === project.id) {
        setCurrentProjectId(null);
      }

      setSyncStatus({
        type: 'success',
        message: `Projeto "${project.name}" excluído com sucesso.`,
      });
    } catch (error) {
      console.error('Erro ao excluir projeto:', error);
      alert(error.response?.data?.error || 'Não foi possível excluir o projeto.');
    }
  }, [currentProjectId]);

  const handleForkProject = useCallback(async (project) => {
    try {
      const response = await api.post(`/projects/${project.id}/fork`, {
        name: `${project.name} (cópia)`,
      });

      const forkedProject = response.data?.project;
      if (!forkedProject) return;

      setMyProjects((prev) => [forkedProject, ...prev.filter((item) => item.id !== forkedProject.id)]);
      loadProjectIntoEditor(
        forkedProject,
        `Uma cópia de "${project.name}" foi criada para você. Agora você pode editar nome, fonte e cores sem interferir no original.`
      );
    } catch (error) {
      console.error('Erro ao criar cópia do projeto:', error);
      alert(error.response?.data?.error || 'Não foi possível criar uma cópia deste projeto.');
    }
  }, [loadProjectIntoEditor]);

  useEffect(() => {
    if (!stanzas.length) {
      if (selectedStanzaId !== null) {
        setSelectedStanzaId(null);
      }
      return;
    }

    const selectionStillExists = stanzas.some((stanza) => stanza.id === selectedStanzaId);
    if (!selectionStillExists) {
      setSelectedStanzaId(stanzas[0].id);
    }
  }, [stanzas, selectedStanzaId]);

  useEffect(() => {
    if (!stanzas.length) return;

    setStanzas((prev) => {
      const normalized = normalizeStanzas(prev, previewMetrics);
      const hasChanges = normalized.some((stanza, index) => (
        stanza.fontSize !== prev[index]?.fontSize
        || stanza.transition !== prev[index]?.transition
        || stanza.transitionDuration !== prev[index]?.transitionDuration
      ));

      return hasChanges ? normalized : prev;
    });
  }, [previewMetrics, stanzas.length]);

  if (loading) {
    return (
      <div className="editor-container">
        <p style={{ color: '#fff', padding: 40 }}>Carregando sessão...</p>
      </div>
    );
  }

  return (
    <div className="editor-container">
      <Header onOpenProjects={() => setShowProjectsPanel(true)} />

      <div className="editor-main">
        <div className="editor-left">
          <FilesPanel
            onLyricsProcessed={handleLyricsProcessed}
            onFilesUploaded={handleFilesUploaded}
            stanzaCount={stanzas.length}
          />

          {syncStatus && <div className={`sync-status sync-status--${syncStatus.type}`}>{syncStatus.message}</div>}
        </div>

        <div className="preview-wrapper">
          <PreviewPanel
            stanzas={stanzas}
            selectedStanzaId={selectedStanzaId}
            currentTime={currentTime}
            audioType={audioType}
            backgroundColor={backgroundColor}
            mediaFiles={mediaFiles}
            seekRequest={seekRequest}
            onTimeUpdate={handleTimeUpdate}
            onAudioTypeChange={setAudioType}
            onBackgroundColorChange={setBackgroundColor}
            onPreviewMetricsChange={setPreviewMetrics}
          />
        </div>

        <div className="editor-right">
          {showLyricsEditor ? (
            <LyricsEditorPanel
              stanzas={stanzas}
              selectedStanzaId={selectedStanzaId}
              currentTime={currentTime}
              onStanzasChange={handleStanzasChange}
              onTapSync={handleTapSync}
              onStanzaSelect={(stanzaId) => handleSelectStanza(stanzaId, { source: 'editor', shouldSeek: true, notifyIfMissingStart: true })}
              previewMetrics={previewMetrics}
            />
          ) : (
            <div className="placeholder-panel">
              <p>O painel Editor de Letras aparecerá aqui após o upload da letra</p>
            </div>
          )}
        </div>

        <div className="export-wrapper">
          <ExportPanel
            stanzas={stanzas}
            mediaFiles={mediaFiles}
            audioType={audioType}
            backgroundColor={backgroundColor}
            projectName={projectName}
            onProjectNameChange={setProjectName}
            currentProjectId={currentProjectId}
            onProjectSaved={handleSavedProject}
          />
        </div>
      </div>

      <ProjectsPanel
        isOpen={showProjectsPanel}
        activeTab={projectsTab}
        onTabChange={setProjectsTab}
        myProjects={myProjects}
        libraryProjects={libraryProjects}
        librarySearch={librarySearch}
        onLibrarySearchChange={setLibrarySearch}
        loadingMyProjects={loadingMyProjects}
        loadingLibrary={loadingLibrary}
        onRefreshMyProjects={fetchMyProjects}
        onRefreshLibrary={fetchLibraryProjects}
        onOpenProject={handleOpenProject}
        onTogglePublic={handleTogglePublic}
        onDeleteProject={handleDeleteProject}
        onForkProject={handleForkProject}
        onCreateNewProject={openBlankProject}
        onClose={() => setShowProjectsPanel(false)}
      />
    </div>
  );
};

export default Editor;
