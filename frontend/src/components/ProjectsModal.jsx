import React, { useState, useEffect, useCallback } from 'react';
import {
  X, FolderOpen, Globe, Lock, Download, Pencil, Trash2,
  RefreshCw, Copy, Clock, User
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './ProjectsModal.css';

const ProjectsModal = ({ onClose, onLoadProject }) => {
  const { user } = useAuth();
  const [tab, setTab]                       = useState('mine');
  const [myProjects, setMyProjects]         = useState([]);
  const [publicProjects, setPublicProjects] = useState([]);
  const [loading, setLoading]               = useState(false);
  const [toggling, setToggling]             = useState(null);

  const fetchMine = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/projects');
      setMyProjects(res.data.projects || []);
    } catch { }
    finally { setLoading(false); }
  }, []);

  const fetchPublic = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/projects/public');
      setPublicProjects(res.data.projects || []);
    } catch { }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (tab === 'mine')    fetchMine();
    if (tab === 'library') fetchPublic();
  }, [tab]);

  const toggleVisibility = async (project) => {
    setToggling(project.id);
    try {
      await api.patch(`/projects/${project.id}/visibility`, { is_public: !project.is_public });
      setMyProjects((prev) =>
        prev.map((p) => p.id === project.id ? { ...p, is_public: !p.is_public } : p)
      );
    } catch {
      alert('Erro ao alterar visibilidade.');
    } finally {
      setToggling(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que quer deletar este projeto?')) return;
    try {
      await api.delete(`/projects/${id}`);
      setMyProjects((prev) => prev.filter((p) => p.id !== id));
    } catch {
      alert('Erro ao deletar projeto.');
    }
  };

  const handleLoad = (project) => {
    if (onLoadProject) onLoadProject(project);
    onClose();
  };

  const handleFork = async (project) => {
    try {
      const res = await api.post(`/projects/${project.id}/fork`);
      alert(`Cópia "${res.data.project.name}" criada nos seus projetos!`);
      setTab('mine');
    } catch {
      alert('Erro ao duplicar projeto.');
    }
  };

  const handleDownload = (project) => {
    const videoUrl = project.config?.videoUrl || project.config?.lastVideoUrl;
    if (videoUrl) {
      window.open(videoUrl, '_blank');
    } else {
      alert('Este projeto não tem vídeo exportado. Abra-o e exporte primeiro.');
    }
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  };

  return (
    <div className="pm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pm-modal">

        {/* HEADER */}
        <div className="pm-header">
          <div className="pm-header-left">
            <FolderOpen size={20} />
            <span>Projetos</span>
          </div>
          <button className="pm-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* TABS */}
        <div className="pm-tabs">
          <button className={`pm-tab ${tab === 'mine' ? 'active' : ''}`} onClick={() => setTab('mine')}>
            <Lock size={14} />
            Meus Projetos
          </button>
          <button className={`pm-tab ${tab === 'library' ? 'active' : ''}`} onClick={() => setTab('library')}>
            <Globe size={14} />
            Biblioteca Pública
          </button>
        </div>

        {/* CORPO */}
        <div className="pm-body">

          {loading && (
            <div className="pm-loading">
              <RefreshCw size={20} className="pm-spinner" />
              <span>Carregando...</span>
            </div>
          )}

          {/* MEUS PROJETOS */}
          {!loading && tab === 'mine' && (
            myProjects.length === 0 ? (
              <div className="pm-empty">
                <FolderOpen size={40} />
                <p>Nenhum projeto salvo ainda.<br />Salve ou exporte um vídeo para criar seu primeiro projeto.</p>
              </div>
            ) : (
              <div className="pm-list">
                {myProjects.map((p) => (
                  <div key={p.id} className="pm-card">
                    <div className="pm-card-body">
                      <div className="pm-card-title">{p.name}</div>
                      <div className="pm-card-meta">
                        <Clock size={11} />
                        {formatDate(p.updated_at)}
                        {p.resolution && <span className="pm-badge res">{p.resolution}</span>}
                        <span className={`pm-badge ${p.is_public ? 'pub' : 'priv'}`}>
                          {p.is_public ? <Globe size={9} /> : <Lock size={9} />}
                          {p.is_public ? 'Público' : 'Privado'}
                        </span>
                      </div>
                    </div>
                    <div className="pm-card-actions">
                      <button
                        className={`pm-vis-toggle ${p.is_public ? 'pub' : 'priv'}`}
                        onClick={() => toggleVisibility(p)}
                        disabled={toggling === p.id}
                        title={p.is_public ? 'Tornar privado' : 'Tornar público'}
                      >
                        {toggling === p.id
                          ? <RefreshCw size={13} className="pm-spinner" />
                          : p.is_public ? <Lock size={13} /> : <Globe size={13} />}
                      </button>
                      <button className="pm-action-btn edit" onClick={() => handleLoad(p)} title="Abrir no editor">
                        <Pencil size={13} />
                      </button>
                      <button className="pm-action-btn delete" onClick={() => handleDelete(p.id)} title="Deletar">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* BIBLIOTECA */}
          {!loading && tab === 'library' && (
            publicProjects.length === 0 ? (
              <div className="pm-empty">
                <Globe size={40} />
                <p>Ainda não há projetos públicos.<br />Seja o primeiro a publicar!</p>
              </div>
            ) : (
              <div className="pm-list">
                {publicProjects.map((p) => (
                  <div key={p.id} className="pm-card pub-card">
                    <div className="pm-card-body">
                      <div className="pm-card-title">{p.name}</div>
                      <div className="pm-card-meta">
                        <User size={11} />
                        {p.users?.email || 'Usuário'}
                        <Clock size={11} />
                        {formatDate(p.updated_at)}
                        {p.resolution && <span className="pm-badge res">{p.resolution}</span>}
                        {p.download_count > 0 && (
                          <span className="pm-badge dl">
                            <Download size={9} /> {p.download_count}
                          </span>
                        )}
                      </div>
                      {p.description && <p className="pm-card-desc">{p.description}</p>}
                    </div>
                    <div className="pm-card-actions">
                      <button className="pm-action-btn download" onClick={() => handleDownload(p)} title="Baixar vídeo">
                        <Download size={13} />
                      </button>
                      <button className="pm-action-btn fork" onClick={() => handleFork(p)} title="Editar cópia (sem afetar original)">
                        <Copy size={13} />
                        <span>Editar cópia</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

        </div>
      </div>
    </div>
  );
};

export default ProjectsModal;
