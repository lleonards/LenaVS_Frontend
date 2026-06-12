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
import { buildAppUrl } from '../utils/appPath';

const ABOUT_LENAVS_PARAGRAPHS = [
  'A LenaVS é uma plataforma desenvolvida para facilitar a criação de vídeos de karaokê de forma rápida, prática e acessível.',
  'A ferramenta foi criada com o objetivo de simplificar um processo que normalmente exige diversos programas de edição. Com a LenaVS, é possível importar músicas, letras, imagens ou vídeos de fundo, sincronizar estrofes, personalizar a aparência do texto e exportar o resultado final em poucos passos.',
  'A plataforma permite que cada estrofe seja editada individualmente, oferecendo recursos como definição de tempos de início e fim, ajustes de posição, tamanho, cores, contorno, estilos de texto e efeitos de transição. Também é possível configurar o comportamento de imagens e vídeos de fundo para criar apresentações mais suaves e profissionais.',
  'A LenaVS continua em constante evolução, recebendo melhorias e novos recursos para tornar a criação de vídeos de karaokê cada vez mais simples e eficiente.',
  'Obrigado por utilizar a LenaVS.',
];

const ABOUT_LENAVS_FEATURES = [
  'Sincronização manual de letras com atalhos de teclado para agilizar a edição.',
  'Alternância entre a música original e o playback durante a edição.',
  'Importação de letras por arquivo ou texto colado diretamente no editor.',
  'Organização automática de letras em estrofes.',
  'Personalização completa da aparência das letras.',
  'Transições para textos, imagens e vídeos.',
  'Exportação em diferentes formatos de vídeo.',
  'Compatibilidade com computadores, tablets e dispositivos móveis.',
];

const GUIDE_MODAL_TEXT = {
  title: 'Guia completo do LenaVS',
  description: 'Fluxo recomendado para criar, salvar, publicar e reaproveitar projetos.',
};

const ABOUT_MODAL_TEXT = {
  title: 'Sobre a LenaVS',
  description: 'Conheça a proposta da plataforma e os principais recursos disponíveis.',
};

const HelpRichCard = ({ title, paragraphs = [], bullets = [] }) => (
  <section className="guide-intro-card guide-intro-card--rich">
    {title ? <h4>{title}</h4> : null}

    {paragraphs.map((paragraph) => (
      <p key={paragraph}>{paragraph}</p>
    ))}

    {bullets.length ? (
      <ul className="guide-bullet-list">
        {bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>
    ) : null}
  </section>
);

const GuideProjectsNote = () => (
  <div className="guide-projects-note">
    <strong>Projetos</strong>
    <p>
      Na aba Projetos ficam seus projetos salvos.
      Você pode acessar, editar, excluir ou escolher se quer deixar um projeto público para outros usuários.
      Também é possível ver projetos de outros usuários e criar uma cópia para editar.
    </p>
  </div>
);

const SUPPORT_HREF = 'mailto:noreply@lenavs.com?subject=Suporte%20LenaVS';

const ACCOUNT_DELETION_REASONS = [
  { value: 'not_found', label: 'Não encontrei o que precisava' },
  { value: 'difficult_to_use', label: 'A plataforma é difícil de usar' },
  { value: 'alternative_tool', label: 'Encontrei outra ferramenta' },
  { value: 'technical_issues', label: 'Problemas técnicos' },
  { value: 'price', label: 'Preço' },
  { value: 'no_longer_use', label: 'Não utilizo mais a plataforma' },
  { value: 'other', label: 'Outro' },
];

const ACCOUNT_DELETION_REASON_PROMPTS = {
  difficult_to_use: 'Como podemos melhorar sua experiência?',
  technical_issues: 'Quais problemas você encontrou?',
  price: 'O que tornaria o plano mais interessante para você?',
  other: 'Conte-nos mais',
};

const GUIDE_PANELS = [
  {
    id: 'arquivos',
    label: 'Painel Arquivos',
    icon: Upload,
    imageSrc: '/guide/guide_01.png',
    imageAlt: 'Captura do LenaVS com destaque no painel Arquivos.',
    showHighlight: false,
    highlightStyle: {
      left: '1.2%',
      top: '12.1%',
      width: '30.8%',
      height: '73.2%',
    },
    bubbleStyle: {
      right: '2.6%',
      top: '15.5%',
      width: '28%',
    },
    bubbleTone: 'peach',
    bubbleText:
      `Arquivos
Neste painel você adiciona todos os arquivos necessários para criar seu vídeo.
Envie a música original e a música instrumental (até 15 minutos cada).
Adicione uma imagem ou vídeo de fundo opcional para personalizar o resultado final.
Se o vídeo for maior que o áudio, ele será ajustado para acompanhar a duração da música.
Se o vídeo for menor que o áudio, ele será repetido automaticamente durante a reprodução.
Pelo botão Comportamento, você pode configurar efeitos suaves de entrada, saída e repetição do vídeo para evitar cortes bruscos.
Você também pode adicionar a letra enviando um arquivo ou simplesmente colando o texto.
Caso a letra não esteja organizada em estrofes, a LenaVS faz a separação automaticamente para facilitar a edição.`,
  },
  {
    id: 'preview',
    label: 'Preview',
    icon: Monitor,
    imageSrc: '/guide/guide_02.png',
    imageAlt: 'Captura do LenaVS com destaque na área de Preview.',
    showHighlight: false,
    highlightStyle: {
      left: '25.7%',
      top: '8.1%',
      width: '49%',
      height: '60.9%',
    },
    bubbleStyle: {
      left: '2.4%',
      bottom: '8%',
      width: '31%',
    },
    bubbleTone: 'green',
  bubbleText:
  `Preview
Neste painel você acompanha, em tempo real, como o vídeo de karaokê está ficando durante a edição.
É possível reproduzir, pausar e continuar a reprodução do projeto, 
navegar pela linha do tempo e alternar entre a música original e a instrumental usando a tecla T.
Para uma edição mais rápida, utilize a tecla Espaço para reproduzir ou 
pausar o vídeo e Ctrl + ← / → para voltar ou avançar 1 segundo.
Também é possível alterar a cor de fundo do vídeo diretamente pelo painel.
Quando uma estrofe possui os tempos inicial e final definidos no Editor de Letras, 
o Preview retorna automaticamente para o tempo inicial da estrofe ao selecioná-la.`,
  },
  {
    id: 'editor',
    label: 'Editor de Letras',
    icon: FileText,
    imageSrc: '/guide/guide_03.png',
    imageAlt: 'Captura do LenaVS com destaque no Editor de Letras.',
    showHighlight: false,
    highlightStyle: {
      left: '72.1%',
      top: '8.3%',
      width: '25.3%',
      height: '69.8%',
    },
    bubbleStyle: {
      left: '2.4%',
      bottom: '6.8%',
      width: '39%',
    },
    bubbleTone: 'blue',
    bubbleText:
      `Editor de Letras
Neste painel você edita e sincroniza as estrofes da música. 
Cada estrofe fica organizada em um bloco individual, 
onde é possível definir os tempos de início e fim, 
ajustar o tamanho do texto e personalizar sua aparência. 
Você pode aplicar negrito, itálico, sublinhado, alterar cores, 
contorno e posicionamento da letra. Também é possível adicionar transições como Fade, 
Slide, Zoom In e Zoom Out, ajustar sua duração e remover blocos de estrofes quando necessário. 
Para agilizar a edição, utilize M para marcar o início da estrofe, 
N para marcar o fim e as teclas ↑ e ↓ para navegar entre as estrofes.`,
  },
  {
    id: 'comportamento',
    label: 'Comportamento',
    icon: LifeBuoy,
    imageSrc: '/guide/guide_04.png',
    imageAlt: 'Captura do LenaVS com destaque no painel Comportamento.',
    showHighlight: false,
    highlightStyle: {
      left: '14.1%',
      top: '15.6%',
      width: '72.5%',
      height: '68.3%',
    },
    bubbleStyle: {
      left: '29%',
      bottom: '4.5%',
      width: '42%',
    },
    bubbleTone: 'peach',
    bubbleText:
      `Comportamento
O botão Comportamento é exibido quando um vídeo ou imagem é adicionado ao projeto. 
Nele, você pode configurar transições para tornar a exibição mais suave. 
Quando o vídeo é maior que o áudio, ele é ajustado automaticamente para a mesma duração da música, 
permitindo configurar apenas as transições de início e fim. 
Se o vídeo for menor que o áudio, ele será repetido automaticamente, 
e você poderá definir transições de início, fim e entre os loops. Para imagens, 
ficam disponíveis apenas as transições de início e fim.`,
  },
  {
    id: 'exportar',
    label: 'Exportar Vídeo',
    icon: Download,
    imageSrc: '/guide/guide_05.png',
    imageAlt: 'Captura do LenaVS com destaque no painel Exportar Vídeo.',
    showHighlight: false,
    highlightStyle: {
      left: '3.4%',
      top: '72.8%',
      width: '93.3%',
      height: '24.2%',
    },
    bubbleStyle: {
      right: '2.4%',
      top: '15.5%',
      width: '25%',
    },
    bubbleTone: 'gold',
    bubbleText:
      `Exportar Vídeo
Neste painel você define as configurações finais do vídeo antes da exportação. 
Para liberar o download, é necessário informar um nome para o projeto. 
Você pode escolher a resolução do vídeo (atualmente até 720p), 
selecionar o formato de saída (MP4, AVI, MOV ou MKV)
e definir qual áudio será utilizado no resultado final, 
entre a música original ou o playback. Após a conclusão da exportação, 
você pode baixar o vídeo gerado ou iniciar um novo projeto pelo botão Novo Projeto.`,
  },
];

const GuidePanelCard = ({ panel }) => {
  const Icon = panel.icon;

  return (
    <section className="guide-card">
      <div className="guide-card__header">
        <span className="guide-card__badge">
          <Icon size={15} />
          {panel.label}
        </span>
      </div>

      <div className={`guide-text guide-text--${panel.bubbleTone}`}>
        {panel.bubbleText.split('\n').map((paragraph, index) => (
          <p key={`${panel.id}-${paragraph}`} className={index === 0 ? 'guide-text__title' : ''}>
            {paragraph}
          </p>
        ))}
      </div>

      <div className="guide-scene">
        <img className="guide-screenshot" src={panel.imageSrc} alt={panel.imageAlt} />
        {panel.showHighlight !== false && panel.highlightStyle ? (
          <div className="guide-highlight" style={panel.highlightStyle} />
        ) : null}
      </div>
    </section>
  );
};

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
    deleteAccount,
  } = useAuth();

  const [showHelpMenu, setShowHelpMenu] = useState(false);
  const [activeHelpModal, setActiveHelpModal] = useState(null);
  const [openingCheckout, setOpeningCheckout] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editingName, setEditingName] = useState('');
  const [selectedAvatarFile, setSelectedAvatarFile] = useState(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState('');
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [openingBillingPortal, setOpeningBillingPortal] = useState(false);
  const [profileModalStep, setProfileModalStep] = useState('edit');
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteFeedback, setDeleteFeedback] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  const helpMenuRef = useRef(null);
  const profileMenuRef = useRef(null);
  const fileInputRef = useRef(null);

  const resolvedDisplayName = useMemo(
    () => getDisplayName(displayName, userEmail),
    [displayName, userEmail]
  );

  const resolvedAvatarUrl = avatarPreviewUrl || (removeAvatar ? '' : avatarUrl || '');
  const isProfileModalBusy = savingProfile || deletingAccount;
  const deleteFeedbackPrompt = ACCOUNT_DELETION_REASON_PROMPTS[deleteReason] || '';
  const shouldShowDeleteFeedbackField = Boolean(deleteFeedbackPrompt);
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
    setActiveHelpModal('guide');
    setShowHelpMenu(false);
  };

  const openAboutModal = () => {
    setActiveHelpModal('about');
    setShowHelpMenu(false);
  };

  const resetDeleteAccountFlow = () => {
    setDeleteReason('');
    setDeleteFeedback('');
    setProfileModalStep('edit');
  };

  const openProfileModal = () => {
    setEditingName(resolvedDisplayName);
    setSelectedAvatarFile(null);
    setAvatarPreviewUrl('');
    setRemoveAvatar(false);
    resetDeleteAccountFlow();
    setShowProfileMenu(false);
    setShowProfileModal(true);
  };

  const openPrivacyPolicy = () => {
    setShowProfileMenu(false);
    window.open(buildAppUrl('/privacy-policy'), '_blank', 'noopener,noreferrer');
  };

  const openDeleteAccountFlow = () => {
    setProfileModalStep('delete-reason');
    setDeleteReason('');
    setDeleteFeedback('');
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

  const handleContinueDeleteAccount = () => {
    if (!deleteReason) {
      window.alert('Selecione um motivo para continuar.');
      return;
    }

    setProfileModalStep('delete-confirm');
  };

  const handleConfirmDeleteAccount = async () => {
    if (deletingAccount) return;
    if (!deleteReason) {
      setProfileModalStep('delete-reason');
      return;
    }

    try {
      setDeletingAccount(true);
      await deleteAccount({
        reason: deleteReason,
        feedback: deleteFeedback,
      });
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = buildAppUrl('/login');
    } catch (error) {
      const message =
        error.response?.data?.error ||
        error.message ||
        'Não foi possível excluir sua conta agora.';
      window.alert(message);
    } finally {
      setDeletingAccount(false);
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

          <div className={`header-help-wrap${showHelpMenu ? ' header-help-wrap--open' : ''}`} ref={helpMenuRef}>
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

                <button
                  type="button"
                  className="header-dropdown__item"
                  onClick={openAboutModal}
                >
                  <HelpCircle size={16} />
                  Sobre a LenaVS
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

          <div className={`header-profile-wrap${showProfileMenu ? ' header-profile-wrap--open' : ''}`} ref={profileMenuRef}>
            <button
              type="button"
              className="header-profile-button"
              onClick={() => setShowProfileMenu((prev) => !prev)}
              title={resolvedDisplayName}
              aria-label={`Perfil de ${resolvedDisplayName}`}
            >
              <span className="header-profile-avatar" aria-hidden="true">
                {resolvedAvatarUrl ? (
                  <img src={resolvedAvatarUrl} alt={resolvedDisplayName} className="header-profile-avatar__image" />
                ) : (
                  <span className="header-profile-avatar__initials">{getInitials(resolvedDisplayName)}</span>
                )}
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
                  onClick={openPrivacyPolicy}
                >
                  <FileText size={16} />
                  Política de Privacidade
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

      {activeHelpModal ? (
        <div className="guide-overlay" onClick={() => setActiveHelpModal(null)}>
          <div
            className={`guide-modal${activeHelpModal === 'about' ? ' guide-modal--narrow' : ''}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="guide-modal__header">
              <div>
                <h3>{activeHelpModal === 'about' ? ABOUT_MODAL_TEXT.title : GUIDE_MODAL_TEXT.title}</h3>
                <p>{activeHelpModal === 'about' ? ABOUT_MODAL_TEXT.description : GUIDE_MODAL_TEXT.description}</p>
              </div>

              <button type="button" className="guide-close-btn" onClick={() => setActiveHelpModal(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="guide-modal__body">
              {activeHelpModal === 'about' ? (
                <>
                  <HelpRichCard
                    paragraphs={ABOUT_LENAVS_PARAGRAPHS.slice(0, 3)}
                    bullets={ABOUT_LENAVS_FEATURES}
                  />
                  <HelpRichCard
                    title="Evolução contínua"
                    paragraphs={ABOUT_LENAVS_PARAGRAPHS.slice(3)}
                  />
                </>
              ) : (
                <>
                  <div className="guide-gallery">
                    {GUIDE_PANELS.map((panel) => (
                      <GuidePanelCard key={panel.id} panel={panel} />
                    ))}
                  </div>

                  <GuideProjectsNote />
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {showProfileModal ? (
        <div className="guide-overlay" onClick={() => !isProfileModalBusy && setShowProfileModal(false)}>
          <div className="profile-modal" onClick={(event) => event.stopPropagation()}>
            <div className="guide-modal__header profile-modal__header">
              <div>
                <h3>
                  {profileModalStep === 'edit'
                    ? 'Editar perfil'
                    : profileModalStep === 'delete-reason'
                      ? 'Excluir conta'
                      : 'Confirmar exclusão'}
                </h3>
                <p>
                  {profileModalStep === 'edit'
                    ? 'Atualize seu nome e sua foto de perfil.'
                    : profileModalStep === 'delete-reason'
                      ? 'Queremos entender o motivo do seu cancelamento para melhorar a LenaVS.'
                      : 'Antes de continuar, revise o que acontece quando sua conta for excluída.'}
                </p>
              </div>

              <button
                type="button"
                className="guide-close-btn"
                onClick={() => !isProfileModalBusy && setShowProfileModal(false)}
                disabled={isProfileModalBusy}
              >
                <X size={18} />
              </button>
            </div>

            {profileModalStep === 'edit' ? (
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

                    <div className="profile-modal__avatar-action-row">
                      <button
                        type="button"
                        className="profile-modal__secondary-btn"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload size={16} />
                        Escolher foto
                      </button>

                      <button
                        type="button"
                        className="profile-modal__danger-cta profile-modal__danger-cta--inline"
                        onClick={openDeleteAccountFlow}
                        disabled={savingProfile}
                      >
                        <Trash2 size={16} />
                        Excluir conta
                      </button>
                    </div>

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
            ) : null}

            {profileModalStep === 'delete-reason' ? (
              <div className="profile-modal__body">
                <div className="profile-modal__section-heading">
                  <strong>Por que você está excluindo sua conta?</strong>
                  <span>Seu feedback nos ajuda a melhorar a plataforma.</span>
                </div>

                <div className="profile-modal__reason-list" role="radiogroup" aria-label="Motivo da exclusão da conta">
                  {ACCOUNT_DELETION_REASONS.map((option) => {
                    const isSelected = deleteReason === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={`profile-modal__reason-option${isSelected ? ' profile-modal__reason-option--selected' : ''}`}
                        onClick={() => setDeleteReason(option.value)}
                        aria-pressed={isSelected}
                      >
                        <span className="profile-modal__reason-marker" aria-hidden="true" />
                        <span>{option.label}</span>
                      </button>
                    );
                  })}
                </div>

                {shouldShowDeleteFeedbackField ? (
                  <label className="profile-modal__field">
                    <span>{deleteFeedbackPrompt}</span>
                    <textarea
                      value={deleteFeedback}
                      onChange={(event) => setDeleteFeedback(event.target.value)}
                      placeholder="Feedback opcional"
                      maxLength={1200}
                      rows={4}
                    />
                  </label>
                ) : null}

                <div className="profile-modal__footer">
                  <button
                    type="button"
                    className="profile-modal__ghost-btn"
                    onClick={resetDeleteAccountFlow}
                  >
                    Voltar
                  </button>

                  <button type="button" className="profile-modal__primary-btn" onClick={handleContinueDeleteAccount}>
                    Continuar
                  </button>
                </div>
              </div>
            ) : null}

            {profileModalStep === 'delete-confirm' ? (
              <div className="profile-modal__body">
                <div className="profile-modal__warning-card">
                  <AlertTriangle size={18} />
                  <div>
                    <strong>A exclusão da conta é permanente.</strong>
                    <p>Depois da confirmação, sua conta será encerrada e você será redirecionado para a tela de login.</p>
                  </div>
                </div>

                <ul className="profile-modal__confirmation-list">
                  <li>Os dados de acesso serão removidos.</li>
                  <li>A assinatura será cancelada.</li>
                  <li>Os projetos privados serão excluídos.</li>
                  <li>Projetos públicos poderão permanecer disponíveis na biblioteca da comunidade sem identificação pessoal.</li>
                </ul>

                <div className="profile-modal__danger-zone profile-modal__danger-zone--compact profile-modal__danger-zone--footer">
                  <div>
                    <strong>Exclusão de conta</strong>
                    <p className="profile-modal__danger-note profile-modal__confirmation-note">Remova sua conta de forma permanente, com cancelamento da assinatura e tratamento dos seus projetos conforme a política da LenaVS.</p>
                  </div>
                </div>

                <div className="profile-modal__footer">
                  <button
                    type="button"
                    className="profile-modal__ghost-btn"
                    onClick={() => setProfileModalStep('delete-reason')}
                    disabled={deletingAccount}
                  >
                    Voltar
                  </button>

                  <button
                    type="button"
                    className="profile-modal__danger-solid-btn"
                    onClick={handleConfirmDeleteAccount}
                    disabled={deletingAccount}
                  >
                    {deletingAccount ? (
                      <>
                        <Loader2 size={16} className="spin" />
                        Excluindo conta...
                      </>
                    ) : (
                      <>
                        <Trash2 size={16} />
                        Excluir conta permanentemente
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
};

export default Header;
