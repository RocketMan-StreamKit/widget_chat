const SOCKET_PATH = 'live';
const HISTORY_CAP = 200;

/** @type {Record<string, { url: string; title?: string }>} */
let badgeMap = {};

/** @type {Record<string, Record<string, string>>} */
let emoteMap = {};

/** @type {Record<string, { iconUrl?: string; name?: unknown }>} */
let platformMap = {};

/** @type {unknown[]} */
const messageBuffer = [];

const langOption = (value, en, ru, uk) => ({
  value,
  label: { en, ru, uk },
});

GenerateConfig([
  {
    key: 'theme',
    type: 'select',
    default: 'dark',
    options: [
      langOption('dark', 'Dark', 'Тёмная', 'Темна'),
      langOption('light', 'Light', 'Светлая', 'Світла'),
      langOption('transparent', 'Transparent', 'Прозрачная', 'Прозора'),
      langOption('neon', 'Neon', 'Неон', 'Неон'),
      langOption('retro', 'Retro terminal', 'Ретро-терминал', 'Ретро-термінал'),
    ],
    editor: {
      label: {
        en: 'Theme',
        ru: 'Тема оформления',
        uk: 'Тема оформлення',
      },
    },
  },
  {
    key: 'layout',
    type: 'select',
    default: 'vertical',
    options: [
      langOption('vertical', 'Vertical list', 'Вертикальный список', 'Вертикальний список'),
      langOption('horizontal', 'Horizontal ticker', 'Горизонтальная лента', 'Горизонтальна стрічка'),
    ],
    editor: {
      label: {
        en: 'Layout',
        ru: 'Формат отображения',
        uk: 'Формат відображення',
      },
    },
  },
  {
    key: 'messageOrder',
    type: 'select',
    default: 'bottom-new',
    options: [
      langOption('bottom-new', 'Newest at bottom', 'Новые снизу', 'Нові знизу'),
      langOption('top-new', 'Newest at top', 'Новые сверху', 'Нові зверху'),
    ],
    editor: {
      label: {
        en: 'Message order',
        ru: 'Порядок сообщений',
        uk: 'Порядок повідомлень',
      },
    },
  },
  {
    key: 'fontFamily',
    type: 'select',
    default: 'system',
    options: [
      langOption('system', 'System UI', 'Системный', 'Системний'),
      langOption('monospace', 'Monospace', 'Моноширинный', 'Моноширинний'),
      langOption('serif', 'Serif', 'С засечками', 'З засічками'),
      langOption('rounded', 'Rounded', 'Округлый', 'Округлий'),
      langOption('condensed', 'Condensed', 'Узкий', 'Вузький'),
    ],
    editor: {
      label: {
        en: 'Font family',
        ru: 'Шрифт',
        uk: 'Шрифт',
      },
    },
  },
  {
    key: 'fontSize',
    type: 'number',
    default: 16,
    editor: {
      label: { en: 'Font size (px)', ru: 'Размер шрифта (px)', uk: 'Розмір шрифта (px)' },
      min: 10,
      max: 48,
    },
  },
  {
    key: 'fontWeight',
    type: 'select',
    default: 'normal',
    options: [
      langOption('normal', 'Normal', 'Обычный', 'Звичайний'),
      langOption('medium', 'Medium', 'Средний', 'Середній'),
      langOption('bold', 'Bold', 'Жирный', 'Жирний'),
    ],
    editor: {
      label: { en: 'Font weight', ru: 'Начертание', uk: 'Насиченість' },
    },
  },
  {
    key: 'lineHeight',
    type: 'number',
    default: 1.35,
    editor: {
      label: { en: 'Line height', ru: 'Межстрочный интервал', uk: 'Міжрядковий інтервал' },
      min: 1,
      max: 2.5,
    },
  },
  {
    key: 'messageSpacing',
    type: 'number',
    default: 8,
    editor: {
      label: { en: 'Message spacing (px)', ru: 'Отступ между сообщениями (px)', uk: 'Відступ між повідомленнями (px)' },
      min: 0,
      max: 32,
    },
  },
  {
    key: 'maxMessages',
    type: 'number',
    default: 20,
    editor: {
      label: { en: 'Max visible messages', ru: 'Макс. сообщений на экране', uk: 'Макс. повідомлень на екрані' },
      min: 1,
      max: 50,
    },
  },
  {
    key: 'showAvatar',
    type: 'boolean',
    default: true,
    editor: {
      label: { en: 'Show avatars', ru: 'Показывать аватары', uk: 'Показувати аватари' },
    },
  },
  {
    key: 'avatarSize',
    type: 'number',
    default: 28,
    editor: {
      label: { en: 'Avatar size (px)', ru: 'Размер аватара (px)', uk: 'Розмір аватара (px)' },
      min: 16,
      max: 64,
    },
  },
  {
    key: 'showBadges',
    type: 'boolean',
    default: true,
    editor: {
      label: { en: 'Show badges', ru: 'Показывать значки', uk: 'Показувати значки' },
    },
  },
  {
    key: 'badgeSize',
    type: 'number',
    default: 16,
    editor: {
      label: { en: 'Badge size (px)', ru: 'Размер значков (px)', uk: 'Розмір значків (px)' },
      min: 12,
      max: 32,
    },
  },
  {
    key: 'showPlatform',
    type: 'boolean',
    default: false,
    editor: {
      label: {
        en: 'Show platform icon',
        ru: 'Показывать иконку платформы',
        uk: 'Показувати іконку платформи',
      },
      hint: {
        en: 'Logo of the streaming addon that sent the message.',
        ru: 'Логотип аддона платформы, приславшего сообщение.',
        uk: 'Логотип аддона платформи, що надіслав повідомлення.',
      },
    },
  },
  {
    key: 'showTimestamp',
    type: 'boolean',
    default: false,
    editor: {
      label: { en: 'Show timestamp', ru: 'Показывать время', uk: 'Показувати час' },
    },
  },
  {
    key: 'usernameColorMode',
    type: 'select',
    default: 'platform',
    options: [
      langOption('platform', 'Platform color', 'Цвет платформы', 'Колір платформи'),
      langOption('custom', 'Custom color', 'Свой цвет', 'Свій колір'),
      langOption('user', 'User color from chat', 'Цвет пользователя', 'Колір користувача'),
    ],
    editor: {
      label: { en: 'Username color', ru: 'Цвет имени', uk: 'Колір імені' },
    },
  },
  {
    key: 'customUsernameColor',
    type: 'color',
    default: '#9147ff',
    editor: {
      label: { en: 'Custom username color', ru: 'Свой цвет имени', uk: 'Свій колір імені' },
    },
  },
  {
    key: 'textColor',
    type: 'color',
    default: '#ffffff',
    editor: {
      label: { en: 'Message text color', ru: 'Цвет текста', uk: 'Колір тексту' },
    },
  },
  {
    key: 'backgroundColor',
    type: 'color',
    default: '#000000',
    editor: {
      label: { en: 'Background color', ru: 'Цвет фона', uk: 'Колір фону' },
    },
  },
  {
    key: 'backgroundOpacity',
    type: 'number',
    default: 60,
    editor: {
      label: { en: 'Background opacity (%)', ru: 'Прозрачность фона (%)', uk: 'Прозорість фону (%)' },
      min: 0,
      max: 100,
    },
  },
  {
    key: 'borderRadius',
    type: 'number',
    default: 8,
    editor: {
      label: { en: 'Corner radius (px)', ru: 'Скругление углов (px)', uk: 'Закруглення кутів (px)' },
      min: 0,
      max: 24,
    },
  },
  {
    key: 'padding',
    type: 'number',
    default: 12,
    editor: {
      label: { en: 'Inner padding (px)', ru: 'Внутренние отступы (px)', uk: 'Внутрішні відступи (px)' },
      min: 0,
      max: 32,
    },
  },
  {
    key: 'textAlign',
    type: 'select',
    default: 'left',
    options: [
      langOption('left', 'Left', 'Слева', 'Зліва'),
      langOption('center', 'Center', 'По центру', 'По центру'),
      langOption('right', 'Right', 'Справа', 'Справа'),
    ],
    editor: {
      label: { en: 'Text alignment', ru: 'Выравнивание', uk: 'Вирівнювання' },
    },
  },
  {
    key: 'messageAnimation',
    type: 'select',
    default: 'slide-up',
    options: [
      langOption('none', 'None', 'Без анимации', 'Без анімації'),
      langOption('fade', 'Fade in', 'Появление', 'Поява'),
      langOption('slide-up', 'Slide up', 'Снизу вверх', 'Знизу вгору'),
      langOption('slide-left', 'Slide from right', 'Справа', 'Справа'),
    ],
    editor: {
      label: { en: 'New message animation', ru: 'Анимация новых сообщений', uk: 'Анімація нових повідомлень' },
    },
  },
  {
    key: 'textShadow',
    type: 'boolean',
    default: true,
    editor: {
      label: { en: 'Text shadow', ru: 'Тень текста', uk: 'Тінь тексту' },
    },
  },
  {
    key: 'fadeOutSeconds',
    type: 'number',
    default: 0,
    editor: {
      label: {
        en: 'Auto-hide messages (sec, 0 = off)',
        ru: 'Автоскрытие сообщений (сек, 0 = выкл)',
        uk: 'Автоприховування (сек, 0 = вимк)',
      },
      min: 0,
      max: 300,
    },
  },
  {
    key: 'hideCommands',
    type: 'boolean',
    default: true,
    editor: {
      label: { en: 'Hide commands (!...)', ru: 'Скрывать команды (!...)', uk: 'Ховати команди (!...)' },
    },
  },
  {
    key: 'hideBotMessages',
    type: 'boolean',
    default: false,
    editor: {
      label: { en: 'Hide likely bot messages', ru: 'Скрывать сообщения ботов', uk: 'Ховати повідомлення ботів' },
      hint: {
        en: 'Heuristic: username contains "bot".',
        ru: 'Эвристика: имя содержит "bot".',
        uk: 'Евристика: ім\'я містить "bot".',
      },
    },
  },
  {
    key: 'messagePrefixFilter',
    type: 'text',
    default: '',
    editor: {
      label: {
        en: 'Only messages starting with',
        ru: 'Только сообщения, начинающиеся с',
        uk: 'Лише повідомлення, що починаються з',
      },
      placeholder: { en: '(empty = show all)', ru: '(пусто = все)', uk: '(порожньо = усі)' },
    },
  },
  {
    key: 'containerMaxWidth',
    type: 'number',
    default: 420,
    editor: {
      label: { en: 'Max width (px, 0 = full)', ru: 'Макс. ширина (px, 0 = вся)', uk: 'Макс. ширина (px, 0 = вся)' },
      hint: {
        en: 'Ignored in horizontal layout — the widget always uses full width.',
        ru: 'Не применяется в горизонтальном режиме — виджет всегда на всю ширину.',
        uk: 'Не застосовується в горизонтальному режимі — віджет завжди на всю ширину.',
      },
      min: 0,
      max: 1920,
    },
  },
]);

network.endpoints.create('params', 'GET', 'onGetParams');
events.On('onGetParams', ({ query }) => {
  if (query?.token !== data.token) {
    return { success: false, message: 'Unauthorized' };
  }
  return api.config.getParams();
});

network.endpoints.create('badges', 'GET', 'onGetBadges');
events.On('onGetBadges', async ({ query }) => {
  if (query?.token !== data.token) {
    return { success: false, message: 'Unauthorized' };
  }
  await refreshBadgeMap();
  return badgeMap;
});

network.socketEndpoints.create(SOCKET_PATH, 'onSocket');
events.On('onSocket', async payload => {
  if (payload.type === 'connect') {
    const params = await api.config.getParams();
    await refreshBadgeMap();
    await refreshEmoteMap();
    await refreshPlatformMap();
    void network.socketEndpoints.emit(
      SOCKET_PATH,
      'chat:settings',
      buildClientSettings(params),
      payload.socketId
    );
    void network.socketEndpoints.emit(
      SOCKET_PATH,
      'chat:badges',
      badgeMap,
      payload.socketId
    );
    void network.socketEndpoints.emit(
      SOCKET_PATH,
      'chat:emotes',
      emoteMap,
      payload.socketId
    );
    void network.socketEndpoints.emit(
      SOCKET_PATH,
      'chat:platforms',
      platformMap,
      payload.socketId
    );
    const limit = Math.max(1, Number(params.maxMessages) || 20);
    void network.socketEndpoints.emit(
      SOCKET_PATH,
      'chat:history',
      messageBuffer.slice(-limit),
      payload.socketId
    );
  }
});

dashboard.onChatMessage(async payload => {
  const params = await api.config.getParams();
  const serialized = serializeMessage(payload, params);
  if (!serialized) {
    return;
  }

  messageBuffer.push(serialized);
  while (messageBuffer.length > HISTORY_CAP) {
    messageBuffer.shift();
  }

  void network.socketEndpoints.emit(SOCKET_PATH, 'chat:message', serialized);
});

setInterval(() => {
  void refreshBadgeMap();
  void refreshEmoteMap({ broadcast: true });
  void refreshPlatformMap();
}, 30_000);

async function refreshPlatformMap() {
  try {
    const result = await dashboard.listPlatforms();
    if (!result || result.success === false || !Array.isArray(result.platforms)) {
      return;
    }
    const next = {};
    for (const platform of result.platforms) {
      if (platform && typeof platform.id === 'string') {
        next[platform.id] = {
          iconUrl: platform.iconUrl || '',
          name: platform.name,
        };
      }
    }
    platformMap = next;
  } catch (_err) {
    // Keep previous platform map.
  }
}

async function refreshBadgeMap() {
  try {
    const result = await dashboard.listChatBadges();
    if (!result || result.success === false || !Array.isArray(result.badges)) {
      return;
    }
    const next = {};
    for (const badge of result.badges) {
      if (badge && typeof badge.id === 'string' && typeof badge.url === 'string') {
        next[badge.id] = { url: badge.url, title: badge.title };
      }
    }
    badgeMap = next;
  } catch (_err) {
    // Keep previous badge map.
  }
}

async function refreshEmoteMap({ broadcast = false } = {}) {
  try {
    const result = await dashboard.listChatEmotes();
    if (!result || result.success === false || !Array.isArray(result.emotes)) {
      return;
    }
    const next = {};
    for (const emote of result.emotes) {
      if (
        emote &&
        typeof emote.platform === 'string' &&
        typeof emote.word === 'string' &&
        typeof emote.url === 'string'
      ) {
        next[emote.platform] ??= {};
        next[emote.platform][emote.word] = emote.url;
      }
    }
    const changed = JSON.stringify(next) !== JSON.stringify(emoteMap);
    emoteMap = next;
    if (broadcast && changed) {
      void network.socketEndpoints.emit(SOCKET_PATH, 'chat:emotes', emoteMap);
    }
  } catch (_err) {
    // Keep previous emote map.
  }
}

function resolveLocalizedText(content) {
  if (typeof content === 'string') {
    return content;
  }
  if (
    content &&
    typeof content === 'object' &&
    !Array.isArray(content) &&
    typeof content.en === 'string'
  ) {
    return content.en;
  }
  if (Array.isArray(content) && content.length > 0) {
    return String(content[0]);
  }
  return '';
}

function isLikelyBot(name) {
  if (!name) {
    return false;
  }
  return /bot/i.test(name);
}

function shouldIncludeMessage(text, userName, params) {
  const trimmed = String(text || '').trim();
  if (!trimmed) {
    return false;
  }
  if (params.hideCommands && trimmed.startsWith('!')) {
    return false;
  }
  if (params.hideBotMessages && isLikelyBot(userName)) {
    return false;
  }
  const prefix = String(params.messagePrefixFilter || '').trim();
  if (prefix && !trimmed.startsWith(prefix)) {
    return false;
  }
  return true;
}

function serializeMessage(payload, params) {
  const text = resolveLocalizedText(payload.message?.content);
  const userName = payload.user?.name || payload.message?.from || '';

  if (!shouldIncludeMessage(text, userName, params)) {
    return null;
  }

  const platformId = payload.message?.platform || payload.user?.platform || '';
  const platformIcon = platformMap[platformId]?.iconUrl || '';

  const icons = Array.isArray(payload.user?.icons) ? payload.user.icons : [];
  const badges = icons
    .map(id => {
      const entry = badgeMap[id];
      return entry ? { id, url: entry.url, title: entry.title } : null;
    })
    .filter(Boolean);

  return {
    id: payload.id,
    created: payload.created,
    text,
    platform: platformId,
    platformIcon,
    user: payload.user
      ? {
          name: payload.user.name,
          avatar: payload.user.avatar || '',
          color: payload.user.color || '',
          badges,
        }
      : userName
        ? { name: userName, avatar: '', color: '', badges: [] }
        : null,
    emotes: Array.isArray(payload.message?.emotes) ? payload.message.emotes : [],
  };
}

function buildClientSettings(params) {
  return {
    theme: params.theme,
    layout: params.layout,
    messageOrder: params.messageOrder,
    fontFamily: params.fontFamily,
    fontSize: params.fontSize,
    fontWeight: params.fontWeight,
    lineHeight: params.lineHeight,
    messageSpacing: params.messageSpacing,
    maxMessages: params.maxMessages,
    showAvatar: params.showAvatar,
    avatarSize: params.avatarSize,
    showBadges: params.showBadges,
    badgeSize: params.badgeSize,
    showPlatform: params.showPlatform,
    showTimestamp: params.showTimestamp,
    usernameColorMode: params.usernameColorMode,
    customUsernameColor: params.customUsernameColor,
    textColor: params.textColor,
    backgroundColor: params.backgroundColor,
    backgroundOpacity: params.backgroundOpacity,
    borderRadius: params.borderRadius,
    padding: params.padding,
    textAlign: params.textAlign,
    messageAnimation: params.messageAnimation,
    textShadow: params.textShadow,
    fadeOutSeconds: params.fadeOutSeconds,
    containerMaxWidth: params.containerMaxWidth,
  };
}
