import React, { useState } from "react";
import { Download, Loader } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import "./ExportPanel.css";

const ExportPanel = ({ stanzas, mediaFiles, backgroundColor }) => {
  const [projectName, setProjectName] = useState("Meu_Projeto");
  const [exportAudioType, setExportAudioType] = useState("original");
  const [videoFormat, setVideoFormat] = useState("mp4");
  const [resolution, setResolution] = useState("720p");
  const [loading, setLoading] = useState(false);

  const { credits, plan, refreshCredits } = useAuth();
  const navigate = useNavigate();

  const openCheckout = async () => {
    try {
      const userLang = navigator.language || "pt-BR";
      const currency = userLang.startsWith("en") ? "USD" : "BRL";
      const res = await api.post("/payment/create-session", { currency });
      if (res.data?.sessionUrl) {
        window.location.href = res.data.sessionUrl;
      }
    } catch (error) {
      console.error("Erro checkout:", error);
      alert("Erro ao abrir checkout");
    }
  };

  const handleExport = async () => {
    if (loading) return;

    if (!projectName.trim()) {
      alert("Digite o nome do projeto");
      return;
    }

    if (!mediaFiles.musicaOriginal && !mediaFiles.musicaInstrumental) {
      alert("Faça upload do áudio");
      return;
    }

    try {
      setLoading(true);

      if (plan === "free" && credits <= 0) {
        alert("Você está sem créditos. Upgrade necessário.");
        await openCheckout();
        return;
      }

      if (plan === "free") {
        await api.post("/user/consume-credit");
      }

      const response = await api.post("/video/generate", {
        projectName,
        audioType: exportAudioType,
        audioPath:
          exportAudioType === "original"
            ? mediaFiles.musicaOriginal
            : mediaFiles.musicaInstrumental,
        backgroundType: mediaFiles.video
          ? "video"
          : mediaFiles.imagem
          ? "image"
          : "color",
        backgroundPath: mediaFiles.video || mediaFiles.imagem,
        backgroundColor,
        stanzas,
        videoFormat,
        resolution
      });

      const videoUrl = response.data?.videoUrl;

      if (refreshCredits) await refreshCredits();

      window.open(videoUrl, "_blank");
      alert("Vídeo gerado com sucesso!");

    } catch (error) {
      if (error.response?.status === 403) {
        alert("Sem créditos. Faça upgrade.");
        await openCheckout();
        return;
      }
      console.error(error);
      alert("Erro ao gerar vídeo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="export-panel">
      <h2>Exportar Vídeo</h2>

      <div className="export-form">

        {/* Nome do projeto */}
        <div className="form-group form-group--name">
          <label>Nome do Projeto</label>
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Nome do projeto"
          />
        </div>

        {/* Resolução */}
        <div className="form-group form-group--resolution">
          <label>Resolução</label>
          <select
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
          >
            <option value="360p">360p (SD)</option>
            <option value="480p">480p (SD+)</option>
            <option value="720p">720p (HD)</option>
            <option value="1080p">1080p (Full HD)</option>
            <option value="4K">4K (Ultra HD)</option>
          </select>
        </div>

        {/* Formato do vídeo */}
        <div className="form-group form-group--format">
          <label>Formato</label>
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

        {/* Tipo de áudio */}
        <div className="form-group form-group--audio">
          <label>Áudio</label>
          <div className="audio-type-selector">
            <button
              type="button"
              className={exportAudioType === "original" ? "active" : ""}
              onClick={() => setExportAudioType("original")}
              disabled={!mediaFiles.musicaOriginal}
            >
              Original
            </button>
            <button
              type="button"
              className={exportAudioType === "instrumental" ? "active" : ""}
              onClick={() => setExportAudioType("instrumental")}
              disabled={!mediaFiles.musicaInstrumental}
            >
              Playback
            </button>
          </div>
        </div>

        {/* Botão exportar */}
        <div className="form-group form-group--btn">
          <button
            className="export-btn"
            onClick={handleExport}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader size={16} className="spinner" />
                Gerando...
              </>
            ) : (
              <>
                <Download size={16} />
                EXPORTAR
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ExportPanel;
