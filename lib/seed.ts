import type { BotPersona, ConversationRecord, Database, FamilyRecord, MessageRecord, UserRecord } from './types';
import { peaksFor } from './store';

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export const AVATAR_COLORS = [
  '#FF6B4A',
  '#FF9F45',
  '#F45D9B',
  '#8B5CF6',
  '#3B82F6',
  '#14B8A6',
  '#22B573',
  '#E8A33D',
  '#EF5DA8',
  '#5B8DEF',
];

export const FAMILY_EMOJIS = ['🏡', '💛', '🌻', '🏕️', '☕️', '🎄', '🍕', '🐾', '🌊', '🎉', '🏡️', '🧩'];
export const GROUP_EMOJIS = ['🍽️', '✈️', '🏡', '🎉', '📸', '🎄', '🎂', '⚽️', '📚', '💰'];
export const QUICK_EMOJIS = ['❤️', '😂', '🥰', '👍', '🙏', '🎉', '😍', '🤗', '🔥', '😅', '👋', '🌸'];

export const BOT_PERSONAS: BotPersona[] = [
  {
    id: 'mom',
    name: 'Elena Rivera',
    relationship: 'Mother',
    avatarColor: '#F45D9B',
    avatarEmoji: null,
    bio: 'Mom of three. Always cooking something. 🌮',
    replies: [
      'Aww that makes my heart so happy ❤️',
      'Ill put a plate aside for you, mijo/mija!',
      'Love you all to the moon 🌙',
      'Dont forget to call your grandma later today.',
      'Im making tamales this weekend, everyone is invited!',
      'That reminds me of the trip we took to the lake 🏞️',
      'Send me a photo when you get there!',
    ],
    questionReplies: [
      'Good question! Let me think and call you in five minutes 📞',
      'Honestly? I was about to ask you the same thing 😅',
      'Ask your father, he is the expert on that one 😄',
    ],
    photoReplies: ['Oh what a beautiful picture! Look at you! 📸', 'Saving this one to the family album 📖'],
    voiceReplies: ['Heard you loud and clear, sweetie 💕', 'Ill reply with a voice note in a sec 🎙️'],
    thinkMs: [900, 2200],
    replyChance: 0.95,
    opener: 'Good morning family! Breakfast is ready whoever is awake 🥞',
  },
  {
    id: 'dad',
    name: 'Marco Rivera',
    relationship: 'Father',
    avatarColor: '#3B82F6',
    avatarEmoji: null,
    bio: 'Dad. Grill master. Fixes everything with tape.',
    replies: [
      ' 👍',
      'On my way home now, traffic is not bad today.',
      'Reminder: garbage goes out tonight!',
      'I installed that shelf you wanted. You owe me a coffee ☕️',
      'Proud of every single one of you.',
      'Sports this weekend? I am making the snacks 🏈',
    ],
    questionReplies: ['Let me check and get back to you.', 'Yep, thats doable. I will handle it.', 'Depends on the weather, looks cloudy ☁️'],
    photoReplies: ['Nice shot! Adding it to the TV slideshow 🖼️'],
    voiceReplies: ['Copy that.', 'Got it, talk in a bit.'],
    thinkMs: [1200, 2800],
    replyChance: 0.85,
    opener: 'Anyone seen my keys? 🔑',
  },
  {
    id: 'sofia',
    name: 'Sofia Rivera',
    relationship: 'Sister',
    avatarColor: '#8B5CF6',
    avatarEmoji: null,
    bio: 'art school + too much coffee ☕️',
    replies: [
      'omg yes finally 😭',
      'hahaha stop it 😂',
      'im in, what time?',
      'sending you the playlist now 🎧',
      'brb sketching this',
      'ok but can we get dessert first',
      '📸📸📸',
    ],
    questionReplies: ['ummm probably? let me check my schedule', 'yes!! 100% yes', 'hmm no idea but im curious now'],
    photoReplies: ['THIS IS SO CUTE', 'obsessed with this photo 🥹'],
    voiceReplies: ['lolll listening now', 'wait i have to tell you something back 🎙️'],
    thinkMs: [500, 1400],
    replyChance: 0.95,
    opener: 'I finished my design project!! 🎨✨',
  },
  {
    id: 'leo',
    name: 'Leo Rivera',
    relationship: 'Brother',
    avatarColor: '#22B573',
    avatarEmoji: null,
    bio: 'soccer ⚽️ + video games',
    replies: [
      'bet',
      'im there',
      'no way 😂😂',
      'game starts in 10, im bringing snacks',
      'i can drive',
      'gg 🏆',
    ],
    questionReplies: ['yep', 'nah, im at practice', 'yeah i can do that after 6'],
    photoReplies: ['🔥🔥', 'thats a sick pic'],
    voiceReplies: ['heard', 'oning, listening now'],
    thinkMs: [400, 1200],
    replyChance: 0.9,
    opener: 'We won the match 3-1 ⚽️🏆',
  },
  {
    id: 'grandma',
    name: 'Rosa Rivera',
    relationship: 'Grandmother',
    avatarColor: '#E8A33D',
    avatarEmoji: null,
    bio: 'Abuela. Baking since 1968. 🥧',
    replies: [
      'Que Dios los bendiga a todos 🙏',
      'I made empanadas, come by before they are gone 🥧',
      'You are all growing so fast, my heart!',
      'Bless you, mijo, drink some water 💧',
      'Call me when you can, I miss your voices ❤️',
    ],
    questionReplies: ['Dios mio, ask your mother she knows best 😄', 'I will pray for it, mijito 🙏'],
    photoReplies: ['Ay que lindo! 🥰', 'This is going on the refrigerator!'],
    voiceReplies: ['Listening to your voice warms my heart ❤️'],
    thinkMs: [1800, 3400],
    replyChance: 0.8,
    opener: 'Good night, my loves. Sleep well 🌙',
  },
];

const HISTORY: Array<{
  sender: string;
  kind?: 'text' | 'image' | 'voice';
  text?: string;
  image?: number;
  voice?: number;
  ago: number;
}> = [
  { sender: 'mom', text: 'Good morning family! Breakfast is ready whoever is awake 🥞', ago: DAY + 6 * HOUR },
  { sender: 'sofia', text: 'morning!! saving me a plate please 🙏', ago: DAY + 5.6 * HOUR },
  { sender: 'dad', text: 'Reminder: garbage goes out tonight!', ago: DAY + 4 * HOUR },
  { sender: 'leo', text: 'we won the match 3-1 ⚽️🏆', ago: DAY + 3 * HOUR },
  { sender: 'sofia', text: 'LEOOO congrats!! 🎉🎉', ago: DAY + 2.9 * HOUR },
  { sender: 'grandma', text: 'Que Dios los bendiga a todos 🙏', ago: DAY + 2 * HOUR },
  { sender: 'mom', kind: 'image', image: 4, text: 'Table is set for everyone 🍽️', ago: 20 * HOUR },
  { sender: 'leo', kind: 'voice', voice: 9200, ago: 18 * HOUR },
  { sender: 'sofia', text: 'ok but can we do a picnic this weekend? 🧺', ago: 6 * HOUR },
  { sender: 'mom', text: 'Im making tamales this weekend, everyone is invited!', ago: 5.4 * HOUR },
  { sender: 'dad', text: 'I am in. I will handle the grill 🏈', ago: 5 * HOUR },
  { sender: 'grandma', kind: 'image', image: 3, ago: 3 * HOUR },
  { sender: 'grandma', text: 'The garden is blooming, come see it before the rain 🌸', ago: 2.9 * HOUR },
  { sender: 'sofia', text: 'ABUELA thats gorgeous, painting this tomorrow 🎨', ago: 2.8 * HOUR },
  { sender: 'mom', text: 'Sunday at noon it is then! 💛', ago: 1.4 * HOUR },
];

const PHOTOS = [require('../assets/images/photo-sunset.png'), require('../assets/images/photo-garden.png'), require('../assets/images/photo-beach.png'), require('../assets/images/photo-dinner.png'), require('../assets/images/photo-cake.png')];

export function photoSource(index: number) {
  return PHOTOS[((index % PHOTOS.length) + PHOTOS.length) % PHOTOS.length];
}

const DEFAULT_SETTINGS = {
  theme: 'system' as const,
  notificationsEnabled: true,
  soundEnabled: true,
  previewTextEnabled: true,
};

function makeUser(partial: Partial<UserRecord> & Pick<UserRecord, 'id' | 'name' | 'email'>): UserRecord {
  return {
    passwordHash: '',
    salt: 'seed',
    relationship: 'Other',
    bio: '',
    avatarColor: AVATAR_COLORS[0],
    avatarEmoji: null,
    online: false,
    lastSeenAt: Date.now() - HOUR,
    blockedUserIds: [],
    familyIds: [],
    settings: { ...DEFAULT_SETTINGS },
    isBot: false,
    createdAt: Date.now() - 30 * DAY,
    ...partial,
  };
}

export const DEMO_EMAIL = 'sam@family.app';
export const DEMO_PASSWORD = 'family123';
export const DEMO_FAMILY_CODE = 'FAM4LIFE';

export function buildSeedDatabase(): Database {
  const now = Date.now();
  const users: Record<string, UserRecord> = {};

  const you = makeUser({
    id: 'u_you',
    name: 'Sam Rivera',
    email: DEMO_EMAIL,
    relationship: 'Son',
    bio: 'Away from home, always texting back ❤️',
    avatarColor: '#FF6B4A',
    online: true,
    lastSeenAt: now,
    familyIds: ['f_rivera'],
    settings: { ...DEFAULT_SETTINGS },
    createdAt: now - 400 * DAY,
  });
  users[you.id] = you;

  BOT_PERSONAS.forEach((persona, index) => {
    users[`u_${persona.id}`] = makeUser({
      id: `u_${persona.id}`,
      name: persona.name,
      email: `${persona.id}@rivera.family`,
      relationship: persona.relationship,
      bio: persona.bio,
      avatarColor: persona.avatarColor,
      online: index !== 3,
      lastSeenAt: index === 3 ? now - 45 * MIN : now - 2 * MIN,
      familyIds: ['f_rivera'],
      isBot: true,
      botPersonaId: persona.id,
      createdAt: now - 400 * DAY + index * DAY,
    });
  });

  const family: FamilyRecord = {
    id: 'f_rivera',
    name: 'Rivera Family',
    emoji: '🏡',
    color: '#FF6B4A',
    inviteCode: DEMO_FAMILY_CODE,
    createdAt: now - 400 * DAY,
    createdBy: 'u_you',
    adminUserIds: ['u_you', 'u_mom'],
    memberIds: ['u_you', 'u_mom', 'u_dad', 'u_sofia', 'u_leo', 'u_grandma'],
  };

  const conversations: Record<string, ConversationRecord> = {};
  const messages: Record<string, MessageRecord[]> = {};

  const familyRoom: ConversationRecord = {
    id: 'c_family',
    type: 'group',
    familyId: family.id,
    name: 'Rivera Family',
    emoji: '🏡',
    color: '#FF6B4A',
    memberIds: [...family.memberIds],
    adminIds: [...family.adminUserIds],
    mutedBy: [],
    createdAt: family.createdAt,
    lastMessageAt: now - 1.4 * HOUR,
    isFamilyRoom: true,
  };
  conversations[familyRoom.id] = familyRoom;

  const roomMessages: MessageRecord[] = HISTORY.map((entry, index) => {
    const id = `m_hist_${index}`;
    const base: MessageRecord = {
      id,
      conversationId: familyRoom.id,
      senderId: `u_${entry.sender}`,
      kind: entry.kind ?? 'text',
      createdAt: now - entry.ago,
      status: 'read',
      replyTo: index === 12 ? { messageId: 'm_hist_11', senderId: 'u_grandma', senderName: 'Rosa Rivera', preview: 'Photo' } : null,
    };
    if (base.kind === 'image') {
      base.imageUri = `photo://${entry.image ?? 0}`;
      base.text = entry.text;
    } else if (base.kind === 'voice') {
      base.voiceUri = `voice://${id}`;
      base.voiceDurationMs = entry.voice ?? 8000;
      base.voicePeaks = peaksFor(id);
    } else {
      base.text = entry.text ?? '';
    }
    return base;
  });
  messages[familyRoom.id] = roomMessages;

  const dmScripts: Record<string, Array<{ kind?: 'text' | 'image' | 'voice'; from: 'you' | 'them'; text?: string; ago: number; voice?: number; image?: number }>> = {
    mom: [
      { from: 'them', text: 'Mijo, did you eat something today? 🍲', ago: 30 * HOUR },
      { from: 'you', text: 'Yes mom 😄 I had tacos', ago: 29.6 * HOUR },
      { from: 'them', text: 'Aww that makes my heart so happy ❤️', ago: 29.5 * HOUR },
      { from: 'them', kind: 'image', image: 4, ago: 4 * HOUR },
      { from: 'them', text: 'I made your favorite cake 🎂 Save room for it!', ago: 3.9 * HOUR },
    ],
    dad: [
      { from: 'you', text: 'Hey dad, how is the garden doing?', ago: 26 * HOUR },
      { from: 'them', text: 'Thriving. I planted those tomatoes you like 🍅', ago: 25.7 * HOUR },
      { from: 'them', kind: 'voice', voice: 6400, ago: 5.5 * HOUR },
    ],
    sofia: [
      { from: 'them', text: 'heyyyy did you see my latest sketch?? 🎨', ago: 8 * HOUR },
      { from: 'you', text: 'Not yet, send it!', ago: 7.8 * HOUR },
      { from: 'them', kind: 'image', image: 0, text: 'sunset study from the roof 🌇', ago: 7.5 * HOUR },
      { from: 'them', text: 'ok but can we get dessert first', ago: 2.2 * HOUR },
    ],
    leo: [
      { from: 'them', text: 'im at practice, phone in locker', ago: 22 * HOUR },
      { from: 'them', kind: 'voice', voice: 4200, ago: 9 * HOUR },
    ],
    grandma: [
      { from: 'them', text: 'I miss your voice, mijo ❤️ Call me when you can', ago: 50 * HOUR },
      { from: 'you', text: 'I will call tonight abuela 🥰', ago: 49 * HOUR },
      { from: 'them', text: 'Bless you, mijo, drink some water 💧', ago: 48 * HOUR },
    ],
  };

  Object.entries(dmScripts).forEach(([botId, script]) => {
    const convId = `c_dm_${botId}`;
    conversations[convId] = {
      id: convId,
      type: 'dm',
      familyId: family.id,
      name: null,
      emoji: null,
      color: BOT_PERSONAS.find((p) => p.id === botId)!.avatarColor,
      memberIds: ['u_you', `u_${botId}`],
      adminIds: [],
      mutedBy: [],
      createdAt: family.createdAt,
      lastMessageAt: now - script[script.length - 1].ago,
      isFamilyRoom: false,
    };
    messages[convId] = script.map((entry, index) => {
      const id = `m_${botId}_${index}`;
      const msg: MessageRecord = {
        id,
        conversationId: convId,
        senderId: entry.from === 'you' ? 'u_you' : `u_${botId}`,
        kind: entry.kind ?? 'text',
        createdAt: now - entry.ago,
        status: 'read',
        replyTo: null,
      };
      if (msg.kind === 'voice') {
        msg.voiceUri = `voice://${id}`;
        msg.voiceDurationMs = entry.voice ?? 5000;
        msg.voicePeaks = peaksFor(id);
      } else if (msg.kind === 'image') {
        msg.imageUri = `photo://${entry.image ?? 0}`;
        msg.text = entry.text;
      } else {
        msg.text = entry.text ?? '';
      }
      return msg;
    });
  });

  const notifications = [
    {
      id: 'n_1',
      userId: 'u_you',
      kind: 'message' as const,
      title: 'Sofia Rivera',
      body: 'ok but can we get dessert first 🍨',
      emoji: '💬',
      conversationId: 'c_dm_sofia',
      familyId: family.id,
      createdAt: now - 2.2 * HOUR,
      read: false,
    },
    {
      id: 'n_2',
      userId: 'u_you',
      kind: 'message' as const,
      title: 'Rivera Family',
      body: 'Elena: Sunday at noon it is then! 💛',
      emoji: '🏡',
      conversationId: 'c_family',
      familyId: family.id,
      createdAt: now - 1.4 * HOUR,
      read: false,
    },
    {
      id: 'n_3',
      userId: 'u_you',
      kind: 'family' as const,
      title: 'Family invitation accepted',
      body: 'Leo Rivera joined the Rivera Family',
      emoji: '✨',
      familyId: family.id,
      createdAt: now - 20 * HOUR,
      read: true,
    },
  ];

  return {
    users,
    families: { [family.id]: family },
    conversations,
    messages,
    notifications,
    reports: [],
    session: null,
    seededAt: now,
  };
}
