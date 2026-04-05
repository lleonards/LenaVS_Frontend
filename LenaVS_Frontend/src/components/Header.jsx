import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  FolderOpen,
  HelpCircle,
  LifeBuoy,
  LogOut,
  ArrowUp,
  Gem,
  X,
} from 'lucide-react';
import api from '../services/api';
import './Header.css';

const GUIDE_STEPS = [
  'Faça upload dos arquivos: música original, música instrumental, fundo em imagem/vídeo (opcional) e a letra da música (arquivo ou texto colado).',

  'No painel Editor de Letras, configure cada estrofe: defina o tempo inicial e final, ajuste o tamanho, fonte, cor, contorno e estilos (negrito, itálico, sublinhado), além da transição e duração.',

  'Todas as alterações feitas no Editor de Letras são refletidas automaticamente no preview.',

  'No preview, utilize o player para sincronizar as estrofes com a música. É possível alternar entre o áudio original e o instrumental para auxiliar na criação do karaokê.',

  'Ainda no preview, você pode ajustar o fundo do vídeo, incluindo a escolha de cor quando não houver imagem ou vídeo.',

  'No painel Exportar Vídeo, defina o nome do projeto, a resolução, o formato do vídeo e escolha qual áudio será utilizado no resultado final (original ou instrumental).',

  'Clique em exportar para gerar o vídeo. O sistema irá processar todas as configurações e iniciar o download automaticamente.',

  'Cada exportação consome 1 crédito.'
];

const Header = ({ onOpenProjects = () => {} }) => {
  const { signOut, plan, credits } = useAuth();
  const navigate = useNavigate();

  const [showHelpMenu, setShowHelpMenu] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [loadingUpgrade, setLoadingUpgrade] = useState(false);
  const helpMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (helpMenuRef.current && !helpMenuRef.current.contains(event.target)) {
        setShowHelpMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUpgrade = async () => {
    if (loadingUpgrade) return;
    setLoadingUpgrade(true);

    try {
      const userLang = navigator.language || 'pt-BR';
      const currency = userLang.startsWith('en') ? 'usd' : 'brl';
      const res = await api.post('/payment/create-session', { currency });

      if (res.data?.sessionUrl) {
        window.location.href = res.data.sessionUrl;
      } else {
        alert('Não foi possível iniciar o checkout. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao iniciar checkout:', error.response?.data || error.message);
      alert('Erro ao iniciar o checkout.');
    } finally {
      setLoadingUpgrade(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <>
      <header className="header">
        <div className="header-logo">
          <img src="/logo_oficial.png" alt="LenaVS Logo" className="logo-img" />
        </div>

        <div className="header-nav">
          {plan === 'pro' ? (
            <div className="pro-badge-v2">
              <Gem size={14} />
              <span className="pro-text">PRO</span>
              <span className="pro-status">Ilimitado</span>
            </div>
          ) : (
            <button
              type="button"
              className="upgrade-btn-lenavs"
              onClick={handleUpgrade}
              disabled={loadingUpgrade}
            >
              <div className="credits-section">
                <span className="credits-val">{credits ?? 0}</span>
                <span className="credits-label">Créditos</span>
              </div>

              <div className="upgrade-label">
                <ArrowUp size={14} />
                {loadingUpgrade ? 'Redirecionando...' : 'UPGRADE'}
              </div>
            </button>
          )}

          <div className="header-help-wrap" ref={helpMenuRef}>
            <button
              type="button"
              className="header-btn"
              onClick={() => setShowHelpMenu((prev) => !prev)}
            >
              <HelpCircle size={20} />
              Ajuda
            </button>

            {showHelpMenu ? (
              <div className="header-dropdown">
                <button
                  type="button"
                  className="header-dropdown__item"
                  onClick={() => {
                    setShowGuideModal(true);
                    setShowHelpMenu(false);
                  }}
                >
                  <BookOpen size={16} />
                  Guia completo
                </button>

               <a
  className="header-dropdown__item"
  href="https://mail.google.com/mail/?view=cm&fs=1&to=noreply@lenavs.com&subject=Suporte%20LenaVS"
  target="_blank"
  rel="noopener noreferrer"
  onClick={() => setShowHelpMenu(false)}
>
  <LifeBuoy size={16} />
  Suporte
</a>
              </div>
            ) : null}
          </div>

          <button type="button" className="header-btn" onClick={onOpenProjects}>
            <FolderOpen size={20} />
            Projetos
          </button>

          <button type="button" className="header-btn logout" onClick={handleLogout}>
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {showGuideModal ? (
        <div className="guide-overlay" onClick={() => setShowGuideModal(false)}>
          <div className="guide-modal" onClick={(event) => event.stopPropagation()}>
            <div className="guide-modal__header">
              <div>
                <h3>Guia completo do LenaVS</h3>
                <p>Fluxo recomendado para criar, salvar, publicar e reaproveitar projetos.</p>
              </div>

              <button type="button" className="guide-close-btn" onClick={() => setShowGuideModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="guide-modal__body">
              {GUIDE_STEPS.map((step, index) => (
                <div key={step} className="guide-step">
                  <span className="guide-step__number">{index + 1}</span>
                  <p>{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default Header;
