import React, { useState } from 'react';
import { Download, Loader, Globe, Lock, Video, Save } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './ExportPanel.css';

const RESOLUTIONS = [
  { value: '480p',  label: '480p',  sub: 'SD · 854×480' },
  { value: '720p',  label: '720p',  sub: 'HD · 1280×720' },
  { value: '1080p', label: '1080p', sub: 'Full HD · 1920×1080' },
  { value: '4k',    label: '4K',    sub: 'Ultra HD · 3840×2160' },
];

const ExportPanel = ({ stanzas, mediaFiles, backgroundColor }) => {
  const [projectName, setProjectName]         = useState('Meu_Projeto');
  const [exportAudioType, setExportAudioType] = useState('original');
  const [resolution, setResolution]           = useState('720p');
  const [isPublic, setIsPublic]               = useState(false);
  const [loading, setLoading]                 = useState(false);

  const { credits, plan, refreshCredits } = useAuth();

  /* ─── Checkout Stripe ─── */
  const openCheckout = async () => {
    try {
      const currency = navigator.language?.startsWith('en') ? 'USD' : 'BRL';
      const res = await api.post('/payment/create-session', { currency });
      if (res.data?.sessionUrl) window.location.href = res.data.sessionUrl;
    } catch {
      alert('Erro ao abrir checkout');
    }
  };

  /* ─── Salvar projeto ─── */
  const handleSaveProject = async () => {
    if (!projectName.trim()) { alert('Digite o nome do projeto'); return; }
    try {
      await api.post('/projects', {
        name: projectName,
        data: { stanzas, mediaFiles, backgroundColor, audioType: exportAudioType },
        is_public: isPublic,
        resolution,
      });
      alert('Projeto salvo com sucesso!');
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar projeto');
    }
  };

  /* ─── Exportar vídeo ─── */
  const handleExport = async () => {
    if (loading) return;
    if (!projectName.trim()) { alert('Digite o nome do projeto'); return; }
    if (!mediaFiles.musicaOriginal && !mediaFiles.musicaInstrumental) {
      alert('Faça upload do áudio');
      return;
    }

    try {
      setLoading(true);

      if (plan === 'free' && credits <= 0) {
        alert('Você está sem créditos. Upgrade necessário.');
        await openCheckout();
        return;
      }
      if (plan === 'free') {
        await api.post('/user/consume-credit');
      }

      const response = await api.post('/video/generate', {
        projectName,
        audioType: exportAudioType,
        audioPath:
          exportAudioType === 'original'
            ? mediaFiles.musicaOriginal
            : mediaFiles.musicaInstrumental,
        backgroundType: mediaFiles.video ? 'video' : mediaFiles.imagem ? 'image' : 'color',
        backgroundPath: mediaFiles.video || mediaFiles.imagem,
        backgroundColor,
        stanzas,
        resolution,
        is_public: isPublic,
      });

      const videoUrl = response.data?.videoUrl;
      if (refreshCredits) await refreshCredits();
      window.open(videoUrl, '_blank');
      alert('Vídeo gerado com sucesso!');
    } catch (error) {
      if (error.response?.status === 403) {
        alert('Sem créditos. Faça upgrade.');
        await openCheckout();
        return;
      }
      alert('Erro ao gerar vídeo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="export-panel">
      <h2>Exportar Vídeo</h2>

      <div className="export-form">

        {/* NOME */}
        <div className="ep-group">
          <label>Nome do Projeto</label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Nome do projeto"
          />
        </div>

        {/* ÁUDIO */}
        <div className="ep-group">
          <label>Tipo de Áudio</label>
          <div className="ep-toggle-pair">
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

        {/* RESOLUÇÃO */}
        <div className="ep-group">
          <label>Resolução do Vídeo</label>
          <div className="ep-resolution-grid">
            {RESOLUTIONS.map((r) => (
              <button
                key={r.value}
                type="button"
                className={`ep-res-btn ${resolution === r.value ? 'active' : ''}`}
                onClick={() => setResolution(r.value)}
              >
                <span className="ep-res-label">{r.label}</span>
                <span className="ep-res-sub">{r.sub}</span>
              </button>
            ))}
          </div>
        </div>

        {/* VISIBILIDADE */}
        <div className="ep-group">
          <label>Visibilidade do Projeto</label>
          <div className="ep-visibility-toggle">
            <button
              type="button"
              className={`ep-vis-btn ${!isPublic ? 'active private' : ''}`}
              onClick={() => setIsPublic(false)}
            >
              <Lock size={15} />
              <span>Privado</span>
            </button>
            <button
              type="button"
              className={`ep-vis-btn ${isPublic ? 'active public' : ''}`}
              onClick={() => setIsPublic(true)}
            >
              <Globe size={15} />
              <span>Público</span>
            </button>
          </div>
          <p className="ep-vis-hint">
            {isPublic
              ? 'Outros usuários poderão ver e baixar este projeto na Biblioteca.'
              : 'Apenas você pode ver este projeto.'}
          </p>
        </div>

        {/* BOTÕES */}
        <div className="ep-actions">
          <button
            className="ep-save-btn"
            type="button"
            onClick={handleSaveProject}
            disabled={loading}
          >
            <Save size={16} />
            Salvar Projeto
          </button>

          <button
            className="ep-export-btn"
            type="button"
            onClick={handleExport}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader size={18} className="spinner" />
                Gerando vídeo...
              </>
            ) : (
              <>
                <Video size={18} />
                EXPORTAR VÍDEO
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ExportPanel;
