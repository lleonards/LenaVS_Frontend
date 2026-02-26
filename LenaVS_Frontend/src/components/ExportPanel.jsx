import React, { useState } from "react"; import { Download, Loader } from "lucide-react"; import api from "../services/api"; import { useAuth } from "../contexts/AuthContext"; import { useNavigate } from "react-router-dom"; import "./ExportPanel.css";
const ExportPanel = ({ stanzas, mediaFiles, backgroundColor }) => {
const [projectName, setProjectName] = useState("Meu_Projeto"); const [exportAudioType, setExportAudioType] = useState("original"); const [videoFormat, setVideoFormat] = useState("mp4"); const [loading, setLoading] = useState(false);
const { credits, plan, refreshCredits } = useAuth(); const navigate = useNavigate();
/* ========================================= CHECKOUT AUTOMÁTICO ========================================= */ const openCheckout = async () => { try {
const userLang = navigator.language || "pt-BR";
  const currency = userLang.startsWith("en") ? "USD" : "BRL";

  const res = await api.post("/payment/create-session", {
    currency
  });

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

  /* ==============================
     BLOQUEIO FREE SEM CRÉDITO
  ============================== */

  if (plan === "free" && credits <= 0) {

    alert("Você está sem créditos. Upgrade necessário.");

    await openCheckout();

    return;
  }

  /* ==============================
     CONSUMIR CRÉDITO
  ============================== */

  if (plan === "free") {
    await api.post("/user/consume-credit");
  }

  /* ==============================
     GERAR VIDEO
  ============================== */

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
    videoFormat
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
return (  Exportar Vídeo
<div className="export-form">

    <div className="form-group">
      <label>Nome do Projeto</label>
      <input
        type="text"
        value={projectName}
        onChange={(e) => setProjectName(e.target.value)}
      />
    </div>

    <div className="form-group">
      <label>Tipo de Áudio</label>

      <div className="audio-type-selector">
        <button
          className={exportAudioType === "original" ? "active" : ""}
          onClick={() => setExportAudioType("original")}
          disabled={!mediaFiles.musicaOriginal}
        >
          Música Original
        </button>

        <button
          className={exportAudioType === "instrumental" ? "active" : ""}
          onClick={() => setExportAudioType("instrumental")}
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
          EXPORTAR VÍDEO
        </>
      )}
    </button>

  </div>
</div>
); };
export default ExportPanel;
