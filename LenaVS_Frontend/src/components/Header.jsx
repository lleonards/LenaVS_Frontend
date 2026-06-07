import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  'No painel Comportamento, você ajusta como o fundo entra, sai e se repete para o vídeo ficar mais suave.',
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
Neste painel você adiciona todos os arquivos necessários para criar seu vídeo. Envie a música original e a música instrumental 
(até 15 minutos cada). Adicione uma imagem ou vídeo de fundo opcional para personalizar o resultado final.
Se o vídeo for maior que o áudio, ele será ajustado para acompanhar a duração da música. Se o vídeo for menor que o áudio, 
ele será repetido automaticamente durante a reprodução. Pelo botão Comportamento, 
você pode configurar efeitos suaves de entrada, saída e repetição do vídeo para evitar cortes bruscos. Você também pode adicionar 
a letra enviando um arquivo ou simplesmente colando o texto.
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
O botão Comportamento é exibido quando um vídeo ou imagem é adicionado ao projeto. Nele, você pode configurar transições para tornar a exibição mais suave. 
Quando o vídeo é maior que o áudio, ele é ajustado automaticamente para a mesma duração da música, permitindo configurar apenas as transições de início e fim. 
Se o vídeo for menor que o áudio, ele será repetido automaticamente, e você poderá definir transições de início, fim e entre os loops. Para imagens, 
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
Neste painel você define as configurações finais do vídeo antes da exportação. Para liberar o download, é necessário informar um nome para o projeto. 
Você pode escolher a resolução do vídeo (atualmente até 720p), selecionar o formato de saída (MP4, AVI, MOV ou MKV)
e definir qual áudio será utilizado no resultado final, entre a música original ou o playback. Após a conclusão da exportação, 
você pode baixar o vídeo gerado ou iniciar um novo projeto pelo botão Novo Projeto.`,
  },
];

const GUIDE_SCENE_PADDING = 16;
const GUIDE_HIGHLIGHT_CLEARANCE = 12;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const parseSceneValue = (value, total = 0) => {
  if (value == null) return null;
  if (typeof value === 'number') return value;

  const normalizedValue = String(value).trim();

  if (normalizedValue.endsWith('%')) {
    return (parseFloat(normalizedValue) / 100) * total;
  }

  const parsedValue = parseFloat(normalizedValue);
  return Number.isFinite(parsedValue) ? parsedValue : null;
};

const getHighlightRect = (style, sceneWidth, sceneHeight) => {
  if (!style) return null;

  const width = parseSceneValue(style.width, sceneWidth) ?? 0;
  const height = parseSceneValue(style.height, sceneHeight) ?? 0;
  const left =
    parseSceneValue(style.left, sceneWidth) ??
    (sceneWidth - (parseSceneValue(style.right, sceneWidth) ?? 0) - width);
  const top =
    parseSceneValue(style.top, sceneHeight) ??
    (sceneHeight - (parseSceneValue(style.bottom, sceneHeight) ?? 0) - height);

  return {
    x: left,
    y: top,
    width,
    height,
  };
};

const expandRect = (rect, padding) => {
  if (!rect) return null;

  return {
    x: rect.x - padding,
    y: rect.y - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  };
};

const rectsOverlap = (rectA, rectB) => {
  if (!rectA || !rectB) return false;

  return !(
    rectA.x + rectA.width <= rectB.x ||
    rectB.x + rectB.width <= rectA.x ||
    rectA.y + rectA.height <= rectB.y ||
    rectB.y + rectB.height <= rectA.y
  );
};

const getAnchoredBubbleRect = (style, width, height, sceneWidth, sceneHeight, padding = GUIDE_SCENE_PADDING) => {
  const boundedWidth = Math.min(width, Math.max(0, sceneWidth - padding * 2));
  const boundedHeight = Math.min(height, Math.max(0, sceneHeight - padding * 2));

  let x = parseSceneValue(style?.left, sceneWidth);
  if (x == null) {
    const right = parseSceneValue(style?.right, sceneWidth) ?? padding;
    x = sceneWidth - right - boundedWidth;
  }

  let y = parseSceneValue(style?.top, sceneHeight);
  if (y == null) {
    const bottom = parseSceneValue(style?.bottom, sceneHeight) ?? padding;
    y = sceneHeight - bottom - boundedHeight;
  }

  return {
    x: clamp(x, padding, Math.max(padding, sceneWidth - boundedWidth - padding)),
    y: clamp(y, padding, Math.max(padding, sceneHeight - boundedHeight - padding)),
    width: boundedWidth,
    height: boundedHeight,
  };
};

const clampRectToScene = (rect, sceneWidth, sceneHeight, padding = GUIDE_SCENE_PADDING) => ({
  ...rect,
  x: clamp(rect.x, padding, Math.max(padding, sceneWidth - rect.width - padding)),
  y: clamp(rect.y, padding, Math.max(padding, sceneHeight - rect.height - padding)),
});

const createBubbleCandidates = (bubbleWidth, bubbleHeight, sceneWidth, sceneHeight, padding = GUIDE_SCENE_PADDING) => {
  const horizontalCenter = (sceneWidth - bubbleWidth) / 2;

  return [
    { x: padding, y: padding, width: bubbleWidth, height: bubbleHeight },
    { x: sceneWidth - bubbleWidth - padding, y: padding, width: bubbleWidth, height: bubbleHeight },
    { x: padding, y: sceneHeight - bubbleHeight - padding, width: bubbleWidth, height: bubbleHeight },
    {
      x: sceneWidth - bubbleWidth - padding,
      y: sceneHeight - bubbleHeight - padding,
      width: bubbleWidth,
      height: bubbleHeight,
    },
    { x: horizontalCenter, y: padding, width: bubbleWidth, height: bubbleHeight },
    {
      x: horizontalCenter,
      y: sceneHeight - bubbleHeight - padding,
      width: bubbleWidth,
      height: bubbleHeight,
    },
  ].map((rect) => clampRectToScene(rect, sceneWidth, sceneHeight, padding));
};

const createDirectionalFallbacks = (highlightRect, bubbleWidth, bubbleHeight, sceneWidth, sceneHeight) => {
  if (!highlightRect) return [];

  return [
    {
      x: highlightRect.x,
      y: highlightRect.y - bubbleHeight - GUIDE_HIGHLIGHT_CLEARANCE,
      width: bubbleWidth,
      height: bubbleHeight,
    },
    {
      x: highlightRect.x,
      y: highlightRect.y + highlightRect.height + GUIDE_HIGHLIGHT_CLEARANCE,
      width: bubbleWidth,
      height: bubbleHeight,
    },
    {
      x: highlightRect.x - bubbleWidth - GUIDE_HIGHLIGHT_CLEARANCE,
      y: highlightRect.y,
      width: bubbleWidth,
      height: bubbleHeight,
    },
    {
      x: highlightRect.x + highlightRect.width + GUIDE_HIGHLIGHT_CLEARANCE,
      y: highlightRect.y,
      width: bubbleWidth,
      height: bubbleHeight,
    },
  ].map((rect) => clampRectToScene(rect, sceneWidth, sceneHeight));
};

const bubbleRectToStyle = (rect) => ({
  left: `${Math.round(rect.x)}px`,
  top: `${Math.round(rect.y)}px`,
  width: `${Math.round(rect.width)}px`,
});

const GuidePanelCard = ({ panel }) => {
  const Icon = panel.icon;
  const sceneRef = useRef(null);
  const bubbleRef = useRef(null);
  const [resolvedBubbleStyle, setResolvedBubbleStyle] = useState(panel.bubbleStyle);

  const updateBubblePosition = useCallback(() => {
    const sceneElement = sceneRef.current;
    const bubbleElement = bubbleRef.current;

    if (!sceneElement || !bubbleElement) return;

    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches) {
      setResolvedBubbleStyle((currentStyle) => {
        if (
          currentStyle?.left === panel.bubbleStyle?.left &&
          currentStyle?.top === panel.bubbleStyle?.top &&
          currentStyle?.right === panel.bubbleStyle?.right &&
          currentStyle?.bottom === panel.bubbleStyle?.bottom &&
          currentStyle?.width === panel.bubbleStyle?.width
        ) {
          return currentStyle;
        }

        return panel.bubbleStyle;
      });
      return;
    }

    const sceneWidth = sceneElement.clientWidth;
    const sceneHeight = sceneElement.clientHeight;

    if (!sceneWidth || !sceneHeight) return;

    const measuredRect = bubbleElement.getBoundingClientRect();
    const bubbleWidth = Math.min(measuredRect.width, Math.max(0, sceneWidth - GUIDE_SCENE_PADDING * 2));
    const bubbleHeight = measuredRect.height;
    const highlightRect = expandRect(
      getHighlightRect(panel.highlightStyle, sceneWidth, sceneHeight),
      GUIDE_HIGHLIGHT_CLEARANCE
    );

    if (!highlightRect || !bubbleWidth || !bubbleHeight) {
      setResolvedBubbleStyle(panel.bubbleStyle);
      return;
    }

    const preferredRect = getAnchoredBubbleRect(
      panel.bubbleStyle,
      bubbleWidth,
      bubbleHeight,
      sceneWidth,
      sceneHeight
    );

    const candidateRects = [
      preferredRect,
      ...createBubbleCandidates(bubbleWidth, bubbleHeight, sceneWidth, sceneHeight),
      ...createDirectionalFallbacks(highlightRect, bubbleWidth, bubbleHeight, sceneWidth, sceneHeight),
    ];

    const safeRect = candidateRects.find((candidateRect) => !rectsOverlap(candidateRect, highlightRect)) ?? preferredRect;
    const nextStyle = bubbleRectToStyle(safeRect);

    setResolvedBubbleStyle((currentStyle) => {
      if (
        currentStyle?.left === nextStyle.left &&
        currentStyle?.top === nextStyle.top &&
        currentStyle?.width === nextStyle.width
      ) {
        return currentStyle;
      }

      return nextStyle;
    });
  }, [panel]);

  useEffect(() => {
    const sceneElement = sceneRef.current;
    const bubbleElement = bubbleRef.current;
    const imageElement = sceneElement?.querySelector('.guide-screenshot');

    if (!sceneElement || !bubbleElement) return undefined;

    const runUpdate = () => {
      window.requestAnimationFrame(() => {
        updateBubblePosition();
      });
    };

    runUpdate();
    imageElement?.addEventListener('load', runUpdate);
    window.addEventListener('resize', runUpdate);

    let resizeObserver;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(runUpdate);
      resizeObserver.observe(sceneElement);
      resizeObserver.observe(bubbleElement);
    }

    return () => {
      imageElement?.removeEventListener('load', runUpdate);
      window.removeEventListener('resize', runUpdate);
      resizeObserver?.disconnect();
    };
  }, [updateBubblePosition]);

  return (
    <section className="guide-card">
      <div className="guide-card__header">
        <span className="guide-card__badge">
          <Icon size={15} />
          {panel.label}
        </span>
      </div>

      <div ref={sceneRef} className="guide-scene">
        <img className="guide-screenshot" src={panel.imageSrc} alt={panel.imageAlt} />
        {panel.showHighlight !== false && panel.highlightStyle ? (
          <div className="guide-highlight" style={panel.highlightStyle} />
        ) : null}
        <div ref={bubbleRef} className={`guide-bubble guide-bubble--${panel.bubbleTone}`} style={resolvedBubbleStyle}>
          {panel.bubbleText.split('\n').map((paragraph, index) => (
            <p key={`${panel.id}-${paragraph}`} className={index === 0 ? 'guide-bubble__title' : ''}>
              {paragraph}
            </p>
          ))}
        </div>
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
                {GUIDE_PANELS.map((panel) => (
                  <GuidePanelCard key={panel.id} panel={panel} />
                ))}
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
