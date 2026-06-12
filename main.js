const rootEl = document.getElementById('chat-root');
const listEl = document.getElementById('chat-list');

const pathParts = window.location.pathname.split('/').filter(Boolean);
const addonId = pathParts[1] || 'widget_chat';
const pageToken = new URLSearchParams(window.location.search).get('token') || '';

/** @type {Record<string, { url: string; title?: string }>} */
let badgeMap = {};

/** @type {Record<string, { iconUrl?: string }>} */
let platformMap = {};

/** @type {Record<string, Record<string, string>>} */
let registeredEmoteMap = {};

/** @type {Record<string, unknown>} */
let settings = {
  maxMessages: 20,
  messageOrder: 'bottom-new',
  showAvatar: true,
  showBadges: true,
  showPlatform: false,
  showTimestamp: false,
  usernameColorMode: 'platform',
  customUsernameColor: '#9147ff',
  messageAnimation: 'slide-up',
  fadeOutSeconds: 0,
  layout: 'vertical',
  theme: 'dark',
};

/** @type {Map<string, HTMLElement>} */
const messageNodes = new Map();

/** @type {Map<string, { text: string; emotes?: { word: string; url: string }[]; platform?: string }>} */
const messagePayloads = new Map();

/** @type {import('socket.io-client').Socket | null} */
let socket = null;

const PLATFORM_COLORS = {
  twitch: '#9147ff',
  kick: '#53fc18',
  youtube: '#ff0000',
};

/**
 * Serializes a DOM node into plain text for clipboard export.
 * Emote images are replaced with their original token from `alt`.
 * @param {Node} node
 * @returns {string}
 */
const serializeCopyNode = node => {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || '';
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }
  if (node.classList.contains('chat-message__emote')) {
    return node.getAttribute('alt') || '';
  }
  let result = '';
  for (const child of node.childNodes) {
    result += serializeCopyNode(child);
  }
  return result;
};

/**
 * Builds plain-text clipboard payload from the current selection.
 * @returns {string | null}
 */
const getSelectionCopyText = () => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return null;
  }
  const container = document.createElement('div');
  container.appendChild(selection.getRangeAt(0).cloneContents());
  return serializeCopyNode(container);
};

const formatTime = ts => {
  const date = new Date(Number(ts) || Date.now());
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const resolveUsernameColor = (msg, user) => {
  if (settings.usernameColorMode === 'custom') {
    return settings.customUsernameColor || '#9147ff';
  }
  if (settings.usernameColorMode === 'user' && user?.color) {
    return user.color;
  }
  const platform = (msg.platform || user?.platform || '').toLowerCase();
  return PLATFORM_COLORS[platform] || settings.customUsernameColor || '#9147ff';
};

const renderContentWithEmotes = (text, emotes, platformId) => {
  const fragment = document.createDocumentFragment();
  const messageEmoteMap = {};
  for (const emote of emotes || []) {
    if (emote && typeof emote.word === 'string' && typeof emote.url === 'string') {
      messageEmoteMap[emote.word] = emote.url;
    }
  }

  const registered = registeredEmoteMap[platformId] ?? {};

  const parts = String(text || '').split(/(\s+)/);
  for (const part of parts) {
    if (!part) {
      continue;
    }
    const url = messageEmoteMap[part] ?? registered[part];
    if (url) {
      const img = document.createElement('img');
      img.className = 'chat-message__emote';
      img.src = url;
      img.alt = part;
      img.title = part;
      img.draggable = false;
      fragment.appendChild(img);
    } else {
      fragment.appendChild(document.createTextNode(part));
    }
  }

  return fragment;
};

const resolveBadges = (user, inlineBadges) => {
  if (Array.isArray(inlineBadges) && inlineBadges.length) {
    return inlineBadges;
  }
  const icons = user?.icons;
  if (!Array.isArray(icons)) {
    return [];
  }
  return icons
    .map(id => {
      const entry = badgeMap[id];
      return entry ? { id, url: entry.url, title: entry.title } : null;
    })
    .filter(Boolean);
};

const createMessageElement = msg => {
  const user = msg.user || null;
  const row = document.createElement('article');
  row.className = 'chat-message';
  row.dataset.id = msg.id;

  const anim = settings.messageAnimation || 'none';
  if (anim !== 'none') {
    row.classList.add(`chat-message--anim-${anim}`);
  }

  if (settings.showAvatar) {
    const avatar = document.createElement('img');
    avatar.className = 'chat-message__avatar';
    avatar.src = user?.avatar || '';
    avatar.alt = '';
    if (!user?.avatar) {
      avatar.style.visibility = 'hidden';
    }
    row.appendChild(avatar);
  }

  const body = document.createElement('div');
  body.className = 'chat-message__body';

  const meta = document.createElement('div');
  meta.className = 'chat-message__meta';

  if (settings.showPlatform && msg.platform) {
    const iconUrl =
      msg.platformIcon || platformMap[msg.platform]?.iconUrl || '';
    if (iconUrl) {
      const platformEl = document.createElement('img');
      platformEl.className = 'chat-message__platform';
      platformEl.src = iconUrl;
      platformEl.alt = msg.platform;
      platformEl.title = msg.platform;
      meta.appendChild(platformEl);
    }
  }

  if (settings.showBadges) {
    const badges = resolveBadges(user, user?.badges);
    if (badges.length) {
      const badgesEl = document.createElement('span');
      badgesEl.className = 'chat-message__badges';
      for (const badge of badges) {
        const img = document.createElement('img');
        img.className = 'chat-message__badge';
        img.src = badge.url;
        img.alt = badge.title || '';
        img.title = badge.title || '';
        badgesEl.appendChild(img);
      }
      meta.appendChild(badgesEl);
    }
  }

  if (user?.name) {
    const nameEl = document.createElement('span');
    nameEl.className = 'chat-message__username';
    const platformClass = String(msg.platform || '').toLowerCase();
    if (settings.usernameColorMode === 'platform' && PLATFORM_COLORS[platformClass]) {
      nameEl.classList.add(`chat-message__username--${platformClass}`);
    } else {
      nameEl.style.color = resolveUsernameColor(msg, user);
    }
    nameEl.textContent = `${user.name}:`;
    meta.appendChild(nameEl);
  }

  if (settings.showTimestamp) {
    const timeEl = document.createElement('span');
    timeEl.className = 'chat-message__time';
    timeEl.textContent = formatTime(msg.created);
    meta.appendChild(timeEl);
  }

  if (meta.childNodes.length) {
    body.appendChild(meta);
  }

  const contentEl = document.createElement('div');
  contentEl.className = 'chat-message__content';
  contentEl.appendChild(renderContentWithEmotes(msg.text, msg.emotes, msg.platform));
  body.appendChild(contentEl);

  row.appendChild(body);

  const fadeSec = Number(settings.fadeOutSeconds) || 0;
  if (fadeSec > 0) {
    window.setTimeout(() => {
      row.style.transition = 'opacity 0.4s ease';
      row.style.opacity = '0';
      window.setTimeout(() => {
        removeMessage(msg.id);
      }, 450);
    }, fadeSec * 1000);
  }

  return row;
};

const removeMessage = id => {
  const node = messageNodes.get(id);
  if (node) {
    node.remove();
    messageNodes.delete(id);
    messagePayloads.delete(id);
  }
};

const refreshMessageEmoteContent = () => {
  for (const [id, node] of messageNodes) {
    const msg = messagePayloads.get(id);
    if (!msg) {
      continue;
    }
    const contentEl = node.querySelector('.chat-message__content');
    if (!contentEl) {
      continue;
    }
    contentEl.replaceChildren(
      renderContentWithEmotes(msg.text, msg.emotes, msg.platform)
    );
  }
};

const trimMessages = () => {
  const max = Math.max(1, Number(settings.maxMessages) || 20);
  const ids = [...messageNodes.keys()];
  while (ids.length > max) {
    const removeId =
      settings.messageOrder === 'top-new' ? ids.pop() : ids.shift();
    if (!removeId) {
      break;
    }
    removeMessage(removeId);
    const idx = ids.indexOf(removeId);
    if (idx >= 0) {
      ids.splice(idx, 1);
    }
  }
};

const appendMessage = (msg, { prepend = false } = {}) => {
  if (!msg || !msg.id || messageNodes.has(msg.id)) {
    return;
  }

  const node = createMessageElement(msg);
  messageNodes.set(msg.id, node);
  messagePayloads.set(msg.id, {
    text: msg.text,
    emotes: msg.emotes,
    platform: msg.platform,
  });

  if (prepend || settings.messageOrder === 'top-new') {
    listEl.prepend(node);
  } else {
    listEl.appendChild(node);
  }

  trimMessages();
};

const applySettings = next => {
  settings = { ...settings, ...next };

  rootEl.className = 'chat-root';
  rootEl.classList.add(`chat-root--theme-${settings.theme || 'dark'}`);
  rootEl.classList.add(
    settings.layout === 'horizontal'
      ? 'chat-root--horizontal'
      : 'chat-root--vertical'
  );
  if (settings.messageOrder === 'top-new') {
    rootEl.classList.add('chat-root--order-top-new');
  }
  if (settings.fontFamily && settings.fontFamily !== 'system') {
    rootEl.classList.add(`chat-root--font-${settings.fontFamily}`);
  }
  if (settings.fontWeight && settings.fontWeight !== 'normal') {
    rootEl.classList.add(`chat-root--weight-${settings.fontWeight}`);
  }
  if (settings.textAlign && settings.textAlign !== 'left') {
    rootEl.classList.add(`chat-root--align-${settings.textAlign}`);
  }
  if (settings.textShadow) {
    rootEl.classList.add('chat-root--text-shadow');
  }

  const isHorizontal = settings.layout === 'horizontal';
  const maxWidth = Number(settings.containerMaxWidth) || 0;
  if (!isHorizontal && maxWidth > 0) {
    rootEl.classList.add('chat-root--max-width');
    rootEl.style.setProperty('--container-max-width', `${maxWidth}px`);
  } else {
    rootEl.style.removeProperty('--container-max-width');
  }

  rootEl.style.setProperty('--message-spacing', `${Number(settings.messageSpacing) || 8}px`);
  rootEl.style.setProperty('--avatar-size', `${Number(settings.avatarSize) || 28}px`);
  rootEl.style.setProperty('--badge-size', `${Number(settings.badgeSize) || 16}px`);
  rootEl.style.setProperty('--border-radius', `${Number(settings.borderRadius) || 8}px`);
  rootEl.style.setProperty('--padding', `${Number(settings.padding) || 12}px`);
  rootEl.style.setProperty('--text-color', settings.textColor || '#ffffff');

  const opacity = Math.max(0, Math.min(100, Number(settings.backgroundOpacity) || 0));
  const bg = settings.backgroundColor || '#000000';
  if (settings.theme === 'transparent') {
    rootEl.style.background = 'transparent';
  } else {
    rootEl.style.background = 'transparent';
    rootEl.style.setProperty(
      '--message-bg',
      hexToRgba(bg, opacity / 100)
    );
  }

  rootEl.style.fontSize = `${Number(settings.fontSize) || 16}px`;
  rootEl.style.lineHeight = String(Number(settings.lineHeight) || 1.35);
};

const hexToRgba = (hex, alpha) => {
  const normalized = String(hex || '#000000').replace('#', '');
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map(ch => ch + ch)
          .join('')
      : normalized.padStart(6, '0').slice(0, 6);
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const connectSocket = () => {
  if (typeof io !== 'function') {
    return;
  }

  const origin = window.location.origin;
  socket = io(`${origin}/addon/${encodeURIComponent(addonId)}/live`, {
    path: '/addon/socket.io',
    transports: ['websocket', 'polling'],
  });

  socket.on('chat:settings', data => {
    applySettings(data || {});
  });

  socket.on('chat:badges', data => {
    if (data && typeof data === 'object') {
      badgeMap = data;
    }
  });

  socket.on('chat:emotes', data => {
    if (data && typeof data === 'object') {
      registeredEmoteMap = data;
      refreshMessageEmoteContent();
    }
  });

  socket.on('chat:platforms', data => {
    if (data && typeof data === 'object') {
      platformMap = data;
    }
  });

  socket.on('chat:history', messages => {
    listEl.innerHTML = '';
    messageNodes.clear();
    messagePayloads.clear();
    const items = Array.isArray(messages) ? messages : [];
    for (const msg of items) {
      appendMessage(msg);
    }
  });

  socket.on('chat:message', msg => {
    appendMessage(msg);
  });

  socket.on('connect_error', () => {
    // Retry via polling fallback is handled by socket.io.
  });
};

const refreshParams = async () => {
  try {
    const params = new URLSearchParams({ token: pageToken });
    const response = await fetch(
      `/addon/${encodeURIComponent(addonId)}/params?${params.toString()}`
    );
    const data = await response.json();
    applySettings(data || {});
  } catch (_err) {
    // Keep current settings.
  }
};

if (listEl) {
  listEl.addEventListener('copy', event => {
    const text = getSelectionCopyText();
    if (text === null) {
      return;
    }
    event.clipboardData.setData('text/plain', text);
    event.preventDefault();
  });
}

refreshParams();
setInterval(refreshParams, 5000);
connectSocket();
