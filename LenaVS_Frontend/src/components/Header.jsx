import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  BookOpen,
  FolderOpen,
  HelpCircle,
  LifeBuoy,
  LogOut,
  ArrowUp,
  Gem,
  X,
  AlertTriangle,
  Upload,
  FileText,
  Monitor,
  Download,
  User,
  Pencil,
  CreditCard,
  Trash2,
  Loader2,
} from 'lucide-react';
import './Header.css';
import { startUpgradeCheckout } from '../utils/checkout';
import { openBillingPortal } from '../utils/billingPortal';

const GUIDE_INTRO_PARAGRAPHS = [
  'A LenaVS é uma ferramenta para criar vídeos de karaokê de forma simples.',
  'Você usa a música original para marcar o tempo de cada parte da letra e depois visualiza tudo com a versão instrumental.',
  'As frases aparecem em blocos, onde você pode editar o estilo, posição e aparência de cada trecho.',
  'Também é possível enviar sua própria música, letra ou fundo.',
  'Quando tudo estiver pronto, você pode exportar o vídeo em diferentes formatos.',
  'Seus projetos ficam salvos no histórico, e você pode escolher deixá-los públicos ou não.',
];

const SUPPORT_HREF = 'mailto:noreply@lenavs.com?subject=Suporte%20LenaVS';

const GUIDE_PANELS = [
  {
    id: 'arquivos',
    label: 'Painel Arquivos',
    icon: Upload,
    imageSrc: '/guide/guide_01.png',
    imageAlt: 'Captura do LenaVS com destaque no painel Arquivos.',
    highlightStyle: {
      left: '1.2%',
      top: '12.1%',
      width: '30.8%',
      height: '73.2%',
    },
    bubbleStyle: {
      right: '2.4%',
      top: '16%',
      width: '28%',
    },
    bubbleTone: 'peach',
    bubbleText:
      'Painel Arquivos\nEnvie a música original, a versão instrumental e a letra. Se quiser, também pode adicionar uma imagem ou vídeo como fundo.\nDepois que a letra é enviada, a LenaVS organiza automaticamente o conteúdo em blocos (estrofes), que serão usados na edição.',
  },
  {
    id: 'editor',
    label: 'Editor de Letras',
    icon: FileText,
    imageSrc: '/guide/guide_02.png',
    imageAlt: 'Captura do LenaVS com destaque no Editor de Letras.',
    highlightStyle: {
      left: '71.1%',
      top: '12.1%',
      width: '27.7%',
      height: '75.6%',
    },
    bubbleStyle: {
      left: '2.2%',
      bottom: '6.5%',
      width: '42%',
    },
    bubbleTone: 'blue',
    bubbleText:
      'Aqui você ajusta e sincroniza cada parte da letra.\n\nOs blocos podem ser editados, reorganizados ou duplicados facilmente.\n\nDefina o tempo de início e fim de cada estrofe e personalize o visual com fonte, cor, tamanho, alinhamento e efeitos.\n\nAo clicar em um bloco com tempo definido, o preview vai direto para o início dele.\n\nAtalhos úteis:\nSetas “↑” e “↓” navegam entre os blocos e já selecionam automaticamente a estrofe atual\n“M” marca o início\n“N” marca o fim\n\nEsse é o principal painel para deixar o karaokê sincronizado e com boa aparência.',
  },
  {
    id: 'preview',
    label: 'Preview',
    icon: Monitor,
    imageSrc: '/guide/guide_03.png',
    imageAlt: 'Captura do LenaVS com destaque na área de Preview.',
    highlightStyle: {
      left: '32.9%',
      top: '11.9%',
      width: '39.1%',
      height: '56.4%',
    },
    bubbleStyle: {
      right: '1.8%',
      top: '15.5%',
      width: '30%',
    },
    bubbleTone: 'green',
    bubbleText:
      'Aqui você acompanha como o vídeo está ficando antes da exportação.\n\nUse os controles para reproduzir a música e conferir se a letra aparece no tempo certo.\n\nO preview mostra o resultado com estilo, transições e sincronização em tempo real.\n\nAtalhos úteis:\n“Espaço” reproduz ou pausa\n“Ctrl + →” avança 1 segundo\n“Ctrl + ←” volta 1 segundo\n“T” alterna entre música original e playback\n\nTambém é possível mudar a cor de fundo e alternar entre ouvir a música original ou a versão instrumental.',
  },
  {
    id: 'exportar',
    label: 'Exportar Vídeo',
    icon: Download,
    imageSrc: '/guide/guide_04.png',
    imageAlt: 'Captura do LenaVS com destaque no painel Exportar Vídeo.',
    highlightStyle: {
      left: '32.9%',
      top: '69%',
      width: '39%',
      height: '23.2%',
    },
    bubbleStyle: {
      right: '2.2%',
      top: '16.5%',
      width: '24%',
    },
    bubbleTone: 'gold',
    bubbleText:
      'Painel Exportar Vídeo\nAqui você gera o vídeo final.\nEscolha o nome do projeto, a resolução, o formato e qual áudio será usado.',
  },
];

const getDisplayName = (displayName, userEmail) => {
  const trimmed = String(displayName || '').trim();
  if (trimmed) return trimmed;
  const emailPart = String(userEmail || '').split('@')[0];
  return emailPart ? emailPart : 'Meu perfil';
};

const getInitials = (value) => {
  const words = String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!words.length) return 'LP';
  return words.map((word) => word[0]?.toUpperCase() || '').join('');
};

const Header = ({ onOpenProjects = () => {} }) => {
  const {
    signOut,
    hasUnlimitedAccess,
    credits,
    creditsLabel,
    displayName,
    avatarUrl,
    userEmail,
    updateProfile,
  } = useAuth();

  const [showHelpMenu, setShowHelpMenu] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [openingCheckout, setOpeningCheckout] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [selectedAvatarFile, setSelectedAvatarFile] = useState(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState('');
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [openingBillingPortal, setOpeningBillingPortal] = useState(false);

  const helpMenuRef = useRef(null);
  const profileMenuRef = useRef(null);
  const fileInputRef = useRef(null);

  const resolvedDisplayName = useMemo(
    () => getDisplayName(displayName, userEmail),
    [displayName, userEmail]
  );

  const resolvedAvatarUrl = avatarPreviewUrl || (removeAvatar ? '' : avatarUrl || '');

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (helpMenuRef.current && !helpMenuRef.current.contains(event.target)) {
        setShowHelpMenu(false);
      }

      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setEditingName(resolvedDisplayName);
    setSelectedAvatarFile(null);
    setAvatarPreviewUrl('');
    setRemoveAvatar(false);
  }, [resolvedDisplayName, avatarUrl]);

  useEffect(() => () => {
    if (avatarPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(avatarPreviewUrl);
    }
  }, [avatarPreviewUrl]);

  const handleUpgrade = async () => {
    if (openingCheckout) return;

    try {
      await startUpgradeCheckout({
        onStart: () => setOpeningCheckout(true),
        onFinish: () => setOpeningCheckout(false),
      });
    } catch {
      // Erro já tratado no helper.
    }
  };

  const handleLogout = async () => {
    await signOut();
    window.location.href = `${window.location.origin}${window.location.pathname}#/login`;
  };

  const openGuideModal = () => {
    setShowGuideModal(true);
    setShowHelpMenu(false);
  };

  const openProfileModal = () => {
    setEditingName(resolvedDisplayName);
    setSelectedAvatarFile(null);
    setAvatarPreviewUrl('');
    setRemoveAvatar(false);
    setShowProfileMenu(false);
    setShowProfileModal(true);
  };

  const handleAvatarFileChange = (event) => {
    const nextFile = event.target.files?.[0] || null;

    if (!nextFile) return;

    if (avatarPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(avatarPreviewUrl);
    }

    setSelectedAvatarFile(nextFile);
    setAvatarPreviewUrl(URL.createObjectURL(nextFile));
    setRemoveAvatar(false);
  };

  const handleRemoveAvatar = () => {
    if (avatarPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(avatarPreviewUrl);
    }

    setSelectedAvatarFile(null);
    setAvatarPreviewUrl('');
    setRemoveAvatar(true);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();

    if (savingProfile) return;

    try {
      setSavingProfile(true);
      await updateProfile({
        displayName: editingName,
        avatarFile: selectedAvatarFile,
        removeAvatar,
      });
      setShowProfileModal(false);
    } catch (error) {
      const message =
        error.response?.data?.error ||
        error.message ||
        'Não foi possível atualizar o perfil.';
      window.alert(message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleOpenBillingPortal = async () => {
    if (openingBillingPortal) return;

    try {
      await openBillingPortal({
        onStart: () => setOpeningBillingPortal(true),
        onFinish: () => setOpeningBillingPortal(false),
      });
    } catch {
      // Erro já tratado no helper.
    }
  };

  const showFreeLimitNotice = !hasUnlimitedAccess && Number(credits) <= 0;

  return (
    <>
      <header className="header">
        <div className="header-logo">
          <img src="/logo_oficial.png" alt="LenaVS Logo" className="logo-img" />
        </div>

        <div className="header-center-slot" aria-live="polite">
          {showFreeLimitNotice ? (
            <button type="button" className="header-free-limit-notice" onClick={() => void handleUpgrade()}>
              <AlertTriangle size={15} />
              <span>{openingCheckout ? 'Abrindo checkout...' : 'Limite gratuito atingido. Ative o LenaVS Unlimited'}</span>
            </button>
          ) : (
            <div className="header-inline-help-notice">
              <span className="header-inline-help-text">Novo na LenaVS? Confira</span>

              <button
                type="button"
                className="header-inline-help-link"
                onClick={openGuideModal}
              >
                Ajuda → Guia
              </button>
            </div>
          )}
        </div>

        <div className="header-nav">
          {hasUnlimitedAccess ? (
            <div className="pro-badge-v2">
              <Gem size={14} />
              <span className="pro-text">UNLIMITED</span>
              <span className="pro-status">Acesso ativo</span>
            </div>
          ) : (
            <button
              type="button"
              className="upgrade-btn-lenavs"
              onClick={() => void handleUpgrade()}
              disabled={openingCheckout}
            >
              <div className="credits-section">
                <span className="credits-val">{creditsLabel}</span>
                <span className="credits-label">Créditos</span>
              </div>

              <div className="upgrade-label">
                <ArrowUp size={14} />
                {openingCheckout ? 'ABRINDO' : 'UPGRADE'}
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
                  onClick={openGuideModal}
                >
                  <BookOpen size={16} />
                  Guia completo
                </button>

                <a
                  className="header-dropdown__item"
                  href={SUPPORT_HREF}
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

          <div className="header-profile-wrap" ref={profileMenuRef}>
            <button
              type="button"
              className="header-profile-button"
              onClick={() => setShowProfileMenu((prev) => !prev)}
            >
              <span className="header-profile-avatar" aria-hidden="true">
                {resolvedAvatarUrl ? (
                  <img src={resolvedAvatarUrl} alt={resolvedDisplayName} className="header-profile-avatar__image" />
                ) : (
                  <span className="header-profile-avatar__initials">{getInitials(resolvedDisplayName)}</span>
                )}
              </span>

              <span className="header-profile-button__text">
                <span className="header-profile-button__label">Perfil</span>
                <span className="header-profile-button__name">{resolvedDisplayName}</span>
              </span>
            </button>

            {showProfileMenu ? (
              <div className="header-dropdown header-dropdown--profile">
                <div className="header-profile-summary">
                  <span className="header-profile-summary__avatar" aria-hidden="true">
                    {resolvedAvatarUrl ? (
                      <img src={resolvedAvatarUrl} alt={resolvedDisplayName} className="header-profile-summary__image" />
                    ) : (
                      <span className="header-profile-summary__initials">{getInitials(resolvedDisplayName)}</span>
                    )}
                  </span>

                  <div className="header-profile-summary__text">
                    <strong>{resolvedDisplayName}</strong>
                    <span>{userEmail || 'Conta LenaVS'}</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="header-dropdown__item"
                  onClick={openProfileModal}
                >
                  <Pencil size={16} />
                  Editar perfil
                </button>

                <button
                  type="button"
                  className="header-dropdown__item"
                  onClick={() => {
                    setShowProfileMenu(false);
                    void handleOpenBillingPortal();
                  }}
                >
                  <CreditCard size={16} />
                  {openingBillingPortal ? 'Abrindo Stripe...' : 'Gerenciar assinatura'}
                </button>

                <button
                  type="button"
                  className="header-dropdown__item header-dropdown__item--danger"
                  onClick={() => {
                    setShowProfileMenu(false);
                    void handleLogout();
                  }}
                >
                  <LogOut size={16} />
                  Sair da conta
                </button>
              </div>
            ) : null}
          </div>
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
              <section className="guide-intro-card">
                {GUIDE_INTRO_PARAGRAPHS.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </section>

              <div className="guide-gallery">
                {GUIDE_PANELS.map((panel) => {
                  const Icon = panel.icon;

                  return (
                    <section key={panel.id} className="guide-card">
                      <div className="guide-card__header">
                        <span className="guide-card__badge">
                          <Icon size={15} />
                          {panel.label}
                        </span>
                      </div>

                      <div className="guide-scene">
                        <img className="guide-screenshot" src={panel.imageSrc} alt={panel.imageAlt} />
                        <div className="guide-highlight" style={panel.highlightStyle} />
                        <div className={`guide-bubble guide-bubble--${panel.bubbleTone}`} style={panel.bubbleStyle}>
                          {panel.bubbleText.split('\n').map((paragraph, index) => (
                            <p key={`${panel.id}-${paragraph}`} className={index === 0 ? 'guide-bubble__title' : ''}>
                              {paragraph}
                            </p>
                          ))}
                        </div>
                      </div>
                    </section>
                  );
                })}
              </div>

              <div className="guide-projects-note">
                <strong>Projetos</strong>
                <p>
                  Na aba Projetos ficam seus projetos salvos.
                  Você pode acessar, editar, excluir ou escolher se quer deixar um projeto público para outros usuários.
                  Também é possível ver projetos de outros usuários e criar uma cópia para editar.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showProfileModal ? (
        <div className="guide-overlay" onClick={() => !savingProfile && setShowProfileModal(false)}>
          <div className="profile-modal" onClick={(event) => event.stopPropagation()}>
            <div className="guide-modal__header profile-modal__header">
              <div>
                <h3>Editar perfil</h3>
                <p>Atualize seu nome e sua foto de perfil.</p>
              </div>

              <button
                type="button"
                className="guide-close-btn"
                onClick={() => !savingProfile && setShowProfileModal(false)}
                disabled={savingProfile}
              >
                <X size={18} />
              </button>
            </div>

            <form className="profile-modal__body" onSubmit={handleSaveProfile}>
              <div className="profile-modal__avatar-row">
                <div className="profile-modal__avatar-preview" aria-hidden="true">
                  {resolvedAvatarUrl ? (
                    <img src={resolvedAvatarUrl} alt={resolvedDisplayName} className="profile-modal__avatar-image" />
                  ) : (
                    <span className="profile-modal__avatar-initials">{getInitials(editingName || resolvedDisplayName)}</span>
                  )}
                </div>

                <div className="profile-modal__avatar-actions">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="profile-modal__file-input"
                    onChange={handleAvatarFileChange}
                  />

                  <button
                    type="button"
                    className="profile-modal__secondary-btn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={16} />
                    Escolher foto
                  </button>

                  {(avatarUrl || avatarPreviewUrl) ? (
                    <button
                      type="button"
                      className="profile-modal__danger-btn"
                      onClick={handleRemoveAvatar}
                    >
                      <Trash2 size={16} />
                      Remover foto
                    </button>
                  ) : null}
                </div>
              </div>

              <label className="profile-modal__field">
                <span>Nome</span>
                <input
                  type="text"
                  value={editingName}
                  onChange={(event) => setEditingName(event.target.value)}
                  placeholder="Seu nome"
                  maxLength={80}
                  disabled={savingProfile}
                />
              </label>

              <div className="profile-modal__footer">
                <button
                  type="button"
                  className="profile-modal__ghost-btn"
                  onClick={() => setShowProfileModal(false)}
                  disabled={savingProfile}
                >
                  Cancelar
                </button>

                <button type="submit" className="profile-modal__primary-btn" disabled={savingProfile}>
                  {savingProfile ? (
                    <>
                      <Loader2 size={16} className="spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <User size={16} />
                      Salvar perfil
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default Header;
