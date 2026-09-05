import type { BotPersona, ConversationRecord, MessageRecord, UserRecord } from './types';
import { getDatabase, mutate, uid } from './store';
import { BOT_PERSONAS, AVATAR_COLORS } from './seed';
import { clearTyping, setTyping } from './typing';
import { notifyUser } from './notify';

/**
 * Family simulation engine.
 *
 * In production these events arrive over the realtime socket from other
 * devices. Here they are produced locally with realistic latencies, typing
 * indicators and read receipts so the full realtime protocol is exercised.
 */

const timers = new Set<ReturnType<typeof setTimeout>>();

function later(fn: () => void, ms: number) {
  const t = setTimeout(() => {
    timers.delete(t);
    fn();
  }, ms);
  timers.add(t);
  return t;
}

export function stopFamilySimulation() {
  timers.forEach((t) => clearTimeout(t));
  timers.clear();
}

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

function personaOf(user: UserRecord | undefined): BotPersona | null {
  if (!user || !user.botPersonaId) return null;
  return BOT_PERSONAS.find((p) => p.id === user.botPersonaId) ?? null;
}

function chooseReply(persona: BotPersona, message: MessageRecord): string {
  if (message.kind === 'image') return pick(persona.photoReplies);
  if (message.kind === 'voice') return pick(persona.voiceReplies);
  const text = (message.text ?? '').toLowerCase();
  if (text.includes('?')) return pick(persona.questionReplies);
  if (/(good )?(morning|gm\\b)/.test(text)) return pick(['Good morning! 🌤️', ...persona.replies]);
  if (/(good )?night/.test(text)) return pick(['Good night, sleep well 🌙', ...persona.replies]);
  if (/(love you|miss you)/.test(text)) return pick(['Love you more ❤️', ...persona.replies]);
  return pick(persona.replies);
}

function previewOf(message: MessageRecord): string {
  if (message.kind === 'image') return '📷 Photo';
  if (message.kind === 'voice') return '🎙️ Voice message';
  return (message.text ?? '').slice(0, 90);
}

function appendMessage(conversationId: string, message: MessageRecord) {
  mutate((db) => {
    const list = db.messages[conversationId] ?? (db.messages[conversationId] = []);
    list.push(message);
    const conv = db.conversations[conversationId];
    if (conv) conv.lastMessageAt = message.createdAt;
  });
}

function markMessageRead(conversationId: string, messageId: string) {
  mutate((db) => {
    const list = db.messages[conversationId];
    const target = list?.find((m) => m.id === messageId);
    if (target) target.status = 'read';
  });
}

export function botMessage(
  conversationId: string,
  botId: string,
  input: { kind: MessageRecord['kind']; text?: string; imageUri?: string; voiceDurationMs?: number }
): MessageRecord {
  const message: MessageRecord = {
    id: uid('m_'),
    conversationId,
    senderId: botId,
    kind: input.kind,
    text: input.text,
    imageUri: input.imageUri,
    voiceDurationMs: input.voiceDurationMs,
    voiceUri: input.kind === 'voice' ? `voice://${Date.now().toString(36)}` : undefined,
    voicePeaks: input.kind === 'voice' ? [] : undefined,
    createdAt: Date.now(),
    status: 'read',
    replyTo: null,
  };
  appendMessage(conversationId, message);
  return message;
}

/**
 * Called whenever the signed-in member sends a message: schedules typing
 * indicators, replies and read receipts from the other family members.
 */
export function scheduleRepliesFor(conversationId: string, message: MessageRecord) {
  const db = getDatabase();
  const conv = db.conversations[conversationId];
  if (!conv) return;

  const blockedByOwner = new Set<string>();
  conv.memberIds.forEach((id) => {
    const member = db.users[id];
    if (member && !member.isBot) member.blockedUserIds.forEach((b) => blockedByOwner.add(b));
  });

  const candidates = conv.memberIds
    .filter((id) => id !== message.senderId)
    .map((id) => db.users[id])
    .filter((u): u is UserRecord => Boolean(u && u.isBot))
    .filter((u) => !blockedByOwner.has(u.id));

  if (candidates.length === 0) return;

  const isDm = conv.type === 'dm';
  const responders = isDm
    ? candidates.slice(0, 1)
    : candidates.sort(() => Math.random() - 0.5).slice(0, Math.random() > 0.45 ? 2 : 1);

  responders.forEach((member) => {
    const persona = personaOf(member);
    if (!persona) return;
    if (Math.random() > persona.replyChance) return;
    const [min, max] = persona.thinkMs;
    const think = min + Math.random() * (max - min);
    const typingFor = Math.max(1400, Math.min(6000, think + 1200));

    later(() => {
      const current = getDatabase();
      const stillMember = current.conversations[conversationId]?.memberIds.includes(member.id);
      if (!stillMember) return;
      setTyping(conversationId, member.id, typingFor);
    }, think * 0.45);

    later(() => {
      clearTyping(conversationId, member.id);
      const current = getDatabase();
      const activeConv = current.conversations[conversationId];
      if (!activeConv) return;
      const bot = current.users[member.id];
      const text = chooseReply(persona, message);
      const reply = botMessage(conversationId, member.id, { kind: 'text', text });
      markMessageRead(conversationId, message.id);
      const realMemberId = activeConv.memberIds.find((id) => {
        const u = current.users[id];
        return u && !u.isBot;
      });
      if (realMemberId && realMemberId !== message.senderId) {
        notifyUser({
          userId: realMemberId,
          kind: 'message',
          title: isDm ? persona.name : activeConv.name ?? 'Family',
          body: isDm ? text : `${persona.name.split(' ')[0]}: ${text}`,
          emoji: isDm ? '💬' : activeConv.emoji ?? '🏡',
          conversationId,
          familyId: activeConv.familyId,
        });
      }
      // a second responder in groups chimes in a little later
      if (!isDm && Math.random() > 0.5) {
        later(() => {
          const third = candidates.find((c) => c.id !== member.id);
          if (!third) return;
          const thirdPersona = personaOf(third);
          if (!thirdPersona) return;
          setTyping(conversationId, third.id, 1800);
          later(() => {
            clearTyping(conversationId, third.id);
            botMessage(conversationId, third.id, { kind: 'text', text: chooseReply(thirdPersona, message) });
          }, 1800);
        }, 1500);
      }
      void reply;
    }, think + typingFor * 0.6);
  });
}

/** A freshly created family receives its first members and a warm welcome. */
export function scheduleFamilyWelcome(familyId: string, firstName: string) {
  const personas = BOT_PERSONAS.slice(0, 4);
  personas.forEach((persona, index) => {
    const delay = 4200 + index * 3800;
    later(() => {
      const db = getDatabase();
      const family = db.families[familyId];
      if (!family) return;
      const generatedId = `u_${persona.id}_${familyId.slice(-4)}`;
      let resolvedBotId = generatedId;
      mutate((d) => {
        const existing = Object.values(d.users).find((u) => u.botPersonaId === persona.id && u.name === persona.name);
        const id = existing?.id ?? generatedId;
        resolvedBotId = id;
        if (!existing) {
          d.users[id] = {
            id,
            name: persona.name,
            email: `${persona.id}.${familyId.slice(-4).toLowerCase()}@family.local`,
            passwordHash: '',
            salt: 'seed',
            relationship: persona.relationship,
            bio: persona.bio,
            avatarColor: persona.avatarColor,
            avatarEmoji: null,
            online: true,
            lastSeenAt: Date.now(),
            blockedUserIds: [],
            familyIds: [familyId],
            settings: {
              theme: 'system',
              notificationsEnabled: true,
              soundEnabled: true,
              previewTextEnabled: true,
            },
            isBot: true,
            botPersonaId: persona.id,
            createdAt: Date.now(),
          };
        }
        if (!family.memberIds.includes(id)) family.memberIds.push(id);
        const room = Object.values(d.conversations).find((c) => c.familyId === familyId && c.isFamilyRoom);
        if (room && !room.memberIds.includes(id)) {
          room.memberIds.push(id);
          d.messages[room.id].push({
            id: uid('m_'),
            conversationId: room.id,
            senderId: id,
            kind: 'system',
            text: `${persona.name} joined the family`,
            systemKind: 'joined',
            createdAt: Date.now(),
            status: 'read',
          });
        }
      });
      const current = getDatabase();
      const room = Object.values(current.conversations).find((c) => c.familyId === familyId && c.isFamilyRoom);
      if (!room) return;
      later(() => {
        const greet = index === 0 ? `Hi ${firstName}! So happy we are all connected now 💛` : persona.replies[index % persona.replies.length];
        botMessage(room.id, resolvedBotId, { kind: 'text', text: greet });
        notifyUser({
          userId: current.session?.userId ?? '',
          kind: 'message',
          title: current.families[familyId]?.name ?? 'Family',
          body: `${persona.name.split(' ')[0]}: ${greet}`,
          emoji: current.families[familyId]?.emoji ?? '🏡',
          conversationId: room.id,
          familyId,
        });
      }, 1500 + Math.random() * 1500);
    }, delay);
  });
}

/** When someone joins via an invite code the family hears about it. */
export function announceJoin(familyId: string, userId: string) {
  const db = getDatabase();
  const room = Object.values(db.conversations).find((c) => c.familyId === familyId && c.isFamilyRoom);
  if (!room) return;
  const user = db.users[userId];
  mutate((d) => {
    d.messages[room.id].push({
      id: uid('m_'),
      conversationId: room.id,
      senderId: userId,
      kind: 'system',
      text: `${user?.name ?? 'Someone'} joined the family`,
      systemKind: 'joined',
      createdAt: Date.now(),
      status: 'read',
    });
  });
  const first = user?.name.split(' ')[0] ?? 'Someone';
  later(() => {
    const current = getDatabase();
    const bots = current.conversations[room.id]?.memberIds
      .map((id) => current.users[id])
      .filter((u): u is UserRecord => Boolean(u && u.isBot));
    if (!bots || bots.length === 0) return;
    const greeter = bots[0];
    const persona = personaOf(greeter);
    if (!persona) return;
    setTyping(room.id, greeter.id, 2400);
    later(() => {
      clearTyping(room.id, greeter.id);
      botMessage(room.id, greeter.id, {
        kind: 'text',
        text: `Everyone, ${first} is here! 🎉 Welcome to the family group 💛`,
      });
      notifyUser({
        userId,
        kind: 'family',
        title: current.families[familyId]?.name ?? 'Family',
        body: `${greeter.name.split(' ')[0]} welcomed you to the family`,
        emoji: current.families[familyId]?.emoji ?? '🏡',
        conversationId: room.id,
        familyId,
      });
    }, 2400);
  }, 1800);
}

/** Ambient life: occasional messages and presence flips while the app is open. */
export function startAmbientEngine() {
  let running = true;

  const ambientTick = () => {
    if (!running) return;
    const delay = 55000 + Math.random() * 45000;
    later(() => {
      if (!running) return;
      try {
        const db = getDatabase();
        const session = db.session;
        if (session) {
          const user = db.users[session.userId];
          const familyId = user?.familyIds[0];
          if (familyId) {
            const candidates = Object.values(db.conversations).filter(
              (c) =>
                c.familyId === familyId &&
                !c.mutedBy.includes(session.userId) &&
                Date.now() - c.lastMessageAt > 3 * 60 * 1000
            );
            const openers = BOT_PERSONAS.filter((p) => p.opener);
            if (candidates.length > 0 && openers.length > 0) {
              const conv = pick(candidates);
              const bots = conv.memberIds.map((id) => db.users[id]).filter((u): u is UserRecord => Boolean(u?.isBot));
              const persona = pick(openers);
              const bot = bots.find((b) => b.botPersonaId === persona.id) ?? bots[0];
              if (bot && persona.opener && Math.random() > 0.35) {
                setTyping(conv.id, bot.id, 2600);
                later(() => {
                  clearTyping(conv.id, bot.id);
                  botMessage(conv.id, bot.id, { kind: 'text', text: persona.opener! });
                  notifyUser({
                    userId: session.userId,
                    kind: 'message',
                    title: conv.type === 'dm' ? persona.name : conv.name ?? 'Family',
                    body: conv.type === 'dm' ? persona.opener! : `${persona.name.split(' ')[0]}: ${persona.opener!}`,
                    emoji: conv.type === 'dm' ? '💬' : conv.emoji ?? '🏡',
                    conversationId: conv.id,
                    familyId: conv.familyId,
                  });
                }, 2600);
              }
            }
          }
        }
      } catch {
        // database not ready yet
      }
      if (running) ambientTick();
    }, delay);
  };

  const presenceTick = () => {
    if (!running) return;
    later(() => {
      if (!running) return;
      mutate((db) => {
        const bots = Object.values(db.users).filter((u) => u.isBot);
        bots.forEach((bot) => {
          if (Math.random() > 0.6) {
            bot.online = !bot.online;
            bot.lastSeenAt = bot.online ? Date.now() : Date.now() - Math.floor(Math.random() * 40 * 60 * 1000);
          }
        });
      }, { persist: false });
      if (running) presenceTick();
    }, 25000 + Math.random() * 25000);
  };

  ambientTick();
  presenceTick();

  return () => {
    running = false;
    stopFamilySimulation();
  };
}

export const DEMO_AVATAR_COLORS = AVATAR_COLORS;
