import { generateInviteCode, getDatabase, mutate, peaksFor, uid } from './store';
import { announceJoin, botMessage, scheduleFamilyWelcome, scheduleRepliesFor } from './bots';
import { notifyUser } from './notify';
import { clearTyping, setTyping } from './typing';
import { AVATAR_COLORS, BOT_PERSONAS, DEMO_EMAIL, DEMO_PASSWORD } from './seed';
import { clearSessionToken, hashPassword, randomSalt, randomToken, saveSessionToken } from './session';
import type {
  ConversationRecord,
  FamilyRecord,
  MessageRecord,
  NewMessageInput,
  Relationship,
  ReplyRef,
  UserRecord,
  UserSettings,
} from './types';
import { normalizeCode, sanitizeText, validateBio, validateCode, validateEmail, validateName, validatePassword } from './validation';

/**
 * FamilyConnect service layer.
 *
 * Every screen talks to this module only - never to the store directly. That
 * mirrors the production architecture where the client calls a guarded API
 * (Cloud Functions + Firestore security rules, see docs/ARCHITECTURE.md):
 * each function validates the input and re-checks that the caller is allowed
 * to touch the target conversation/family before any write happens.
 */

export class FamilyConnectError extends Error {}

function fail(message: string): never {
  throw new FamilyConnectError(message);
}

export function currentUser(): UserRecord {
  const db = getDatabase();
  if (!db.session) fail('You are signed out.');
  const user = db.users[db.session.userId];
  if (!user) fail('This account no longer exists.');
  return user;
}

export function tryCurrentUser(): UserRecord | null {
  try {
    return currentUser();
  } catch {
    return null;
  }
}

function assertConversationAccess(conversationId: string, userId: string): ConversationRecord {
  const db = getDatabase();
  const conv = db.conversations[conversationId];
  if (!conv) fail('This conversation is no longer available.');
  if (!conv.memberIds.includes(userId)) fail('You do not have access to this conversation.');
  return conv;
}

function assertFamilyAdmin(familyId: string, userId: string) {
  const family = getDatabase().families[familyId];
  if (!family) fail('Family not found.');
  if (!family.adminUserIds.includes(userId)) fail('Only family admins can do that.');
}

async function startSession(userId: string) {
  const token = randomToken();
  mutate((db) => {
    db.session = { userId, token, createdAt: Date.now() };
    const user = db.users[userId];
    if (user) {
      user.online = true;
      user.lastSeenAt = Date.now();
    }
  });
  await saveSessionToken(token);
}

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

export async function restoreSession(): Promise<UserRecord | null> {
  const db = getDatabase();
  if (!db.session) return null;
  const user = db.users[db.session.userId];
  if (!user) {
    mutate((d) => {
      d.session = null;
    });
    return null;
  }
  mutate((d) => {
    const u = d.users[user.id];
    if (u) {
      u.online = true;
      u.lastSeenAt = Date.now();
    }
  });
  return getDatabase().users[user.id];
}

export async function signIn(email: string, password: string): Promise<UserRecord> {
  const cleanEmail = email.trim().toLowerCase();
  const emailCheck = validateEmail(cleanEmail);
  if (!emailCheck.ok) fail(emailCheck.message!);
  if (!password) fail('Enter your password.');

  const db = getDatabase();
  const user = Object.values(db.users).find((u) => u.email === cleanEmail);
  if (!user || user.isBot) fail('No account found with that email address.');
  if (!user.passwordHash) {
    // Seeded demo account: adopt the demo password on first sign in.
    if (cleanEmail !== DEMO_EMAIL || password !== DEMO_PASSWORD) fail('That password does not match our records.');
  } else {
    const hash = await hashPassword(password, user.salt);
    if (hash !== user.passwordHash) fail('That password does not match our records.');
  }
  if (!user.passwordHash) {
    const salt = randomSalt();
    const hash = await hashPassword(password, salt);
    mutate((d) => {
      const u = d.users[user.id];
      if (u) {
        u.salt = salt;
        u.passwordHash = hash;
      }
    });
  }
  await startSession(user.id);
  return getDatabase().users[user.id];
}

export async function signUp(input: {
  name: string;
  email: string;
  password: string;
  relationship: Relationship;
}): Promise<UserRecord> {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const nameCheck = validateName(name);
  if (!nameCheck.ok) fail(nameCheck.message!);
  const emailCheck = validateEmail(email);
  if (!emailCheck.ok) fail(emailCheck.message!);
  const passwordCheck = validatePassword(input.password);
  if (!passwordCheck.ok) fail(passwordCheck.message!);

  const db = getDatabase();
  if (Object.values(db.users).some((u) => u.email === email)) fail('An account with that email already exists.');

  const id = uid('u_');
  const salt = randomSalt();
  const passwordHash = await hashPassword(input.password, salt);
  const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

  mutate((d) => {
    d.users[id] = {
      id,
      name,
      email,
      passwordHash,
      salt,
      relationship: input.relationship,
      bio: '',
      avatarColor: color,
      avatarEmoji: null,
      online: true,
      lastSeenAt: Date.now(),
      blockedUserIds: [],
      familyIds: [],
      settings: {
        theme: 'system',
        notificationsEnabled: true,
        soundEnabled: true,
        previewTextEnabled: true,
      },
      isBot: false,
      createdAt: Date.now(),
    };
  });
  await startSession(id);
  return getDatabase().users[id];
}

export async function signInDemo(): Promise<UserRecord> {
  return signIn(DEMO_EMAIL, DEMO_PASSWORD);
}

export async function signOut(): Promise<void> {
  try {
    const user = currentUser();
    mutate((d) => {
      const u = d.users[user.id];
      if (u) {
        u.online = false;
        u.lastSeenAt = Date.now();
      }
      d.session = null;
    });
  } catch {
    mutate((d) => {
      d.session = null;
    });
  }
  await clearSessionToken();
}

/* ------------------------------------------------------------------ */
/* Families                                                            */
/* ------------------------------------------------------------------ */

export function createFamily(input: { name: string; emoji: string; color?: string }): FamilyRecord {
  const user = currentUser();
  const name = input.name.trim();
  if (name.length < 2) fail('Give your family group a name (2 characters or more).');
  if (name.length > 40) fail('Family name must be 40 characters or fewer.');

  const familyId = uid('f_');
  const roomConversationId = uid('c_');
  const family: FamilyRecord = {
    id: familyId,
    name: sanitizeText(name, 40),
    emoji: input.emoji || '🏡',
    color: input.color ?? user.avatarColor,
    inviteCode: generateInviteCode(),
    createdAt: Date.now(),
    createdBy: user.id,
    adminUserIds: [user.id],
    memberIds: [user.id],
  };

  mutate((db) => {
    db.families[familyId] = family;
    const me = db.users[user.id];
    if (me && !me.familyIds.includes(familyId)) me.familyIds.push(familyId);
    db.conversations[roomConversationId] = {
      id: roomConversationId,
      type: 'group',
      familyId,
      name: family.name,
      emoji: family.emoji,
      color: family.color,
      memberIds: [user.id],
      adminIds: [user.id],
      mutedBy: [],
      createdAt: Date.now(),
      lastMessageAt: Date.now(),
      isFamilyRoom: true,
    };
    db.messages[roomConversationId] = [
      {
        id: uid('m_'),
        conversationId: roomConversationId,
        senderId: user.id,
        kind: 'system',
        text: `${family.emoji} ${family.name} was created. Invite your family with the code below.`,
        systemKind: 'created',
        createdAt: Date.now(),
        status: 'read',
      },
    ];
  });

  scheduleFamilyWelcome(familyId, user.name.split(' ')[0]);
  return getDatabase().families[familyId];
}

export function joinFamilyByCode(rawCode: string): FamilyRecord {
  const user = currentUser();
  const codeCheck = validateCode(rawCode);
  if (!codeCheck.ok) fail(codeCheck.message!);
  const code = normalizeCode(rawCode);

  const db = getDatabase();
  const family = Object.values(db.families).find((f) => f.inviteCode === code);
  if (!family) fail('No family matches that invitation code. Ask a relative to share a new one.');
  if (family.memberIds.includes(user.id)) return family;

  mutate((d) => {
    const target = d.families[family.id];
    if (!target.memberIds.includes(user.id)) target.memberIds.push(user.id);
    const me = d.users[user.id];
    if (me && !me.familyIds.includes(family.id)) me.familyIds.push(family.id);
    const room = Object.values(d.conversations).find((c) => c.familyId === family.id && c.isFamilyRoom);
    if (room) {
      if (!room.memberIds.includes(user.id)) room.memberIds.push(user.id);
      d.messages[room.id].push({
        id: uid('m_'),
        conversationId: room.id,
        senderId: user.id,
        kind: 'system',
        text: `${user.name} joined the family`,
        systemKind: 'joined',
        createdAt: Date.now(),
        status: 'read',
      });
      room.lastMessageAt = Date.now();
    }
  });

  const current = getDatabase();
  family.adminUserIds.forEach((adminId) => {
    if (adminId === user.id) return;
    notifyUser({
      userId: adminId,
      kind: 'family',
      title: current.families[family.id].name,
      body: `${user.name} accepted your family invitation`,
      emoji: '✨',
      familyId: family.id,
      push: false,
    });
  });
  announceJoin(family.id, user.id);
  return getDatabase().families[family.id];
}

export function regenerateInviteCode(familyId: string): string {
  const user = currentUser();
  assertFamilyAdmin(familyId, user.id);
  const code = generateInviteCode();
  mutate((db) => {
    const family = db.families[familyId];
    if (family) family.inviteCode = code;
  });
  return code;
}

export function updateFamilySettings(familyId: string, patch: { name?: string; emoji?: string; color?: string }) {
  const user = currentUser();
  assertFamilyAdmin(familyId, user.id);
  mutate((db) => {
    const family = db.families[familyId];
    if (!family) return;
    if (patch.name !== undefined) {
      const name = patch.name.trim();
      if (name.length < 2) fail('Family name is too short.');
      family.name = sanitizeText(name, 40);
    }
    if (patch.emoji) family.emoji = patch.emoji;
    if (patch.color) family.color = patch.color;
    const room = Object.values(db.conversations).find((c) => c.familyId === familyId && c.isFamilyRoom);
    if (room) {
      room.name = family.name;
      room.emoji = family.emoji;
      room.color = family.color;
    }
  });
}

export function removeFamilyMember(familyId: string, memberId: string) {
  const user = currentUser();
  assertFamilyAdmin(familyId, user.id);
  if (memberId === user.id) fail('Use “Leave family” to remove yourself.');
  mutate((db) => {
    const family = db.families[familyId];
    if (!family) return;
    family.memberIds = family.memberIds.filter((id) => id !== memberId);
    family.adminUserIds = family.adminUserIds.filter((id) => id !== memberId);
    const removed = db.users[memberId];
    if (removed) removed.familyIds = removed.familyIds.filter((id) => id !== familyId);
    Object.values(db.conversations)
      .filter((c) => c.familyId === familyId)
      .forEach((c) => {
        c.memberIds = c.memberIds.filter((id) => id !== memberId);
      });
  });
  const db = getDatabase();
  const family = db.families[familyId];
  const room = Object.values(db.conversations).find((c) => c.familyId === familyId && c.isFamilyRoom);
  const removedName = db.users[memberId]?.name ?? 'A member';
  if (room) {
    mutate((d) => {
      d.messages[room.id].push({
        id: uid('m_'),
        conversationId: room.id,
        senderId: user.id,
        kind: 'system',
        text: `${removedName} was removed from the family by ${user.name.split(' ')[0]}`,
        systemKind: 'removed',
        createdAt: Date.now(),
        status: 'read',
      });
    });
  }
  notifyUser({
    userId: memberId,
    kind: 'family',
    title: family?.name ?? 'Family',
    body: 'You were removed from this family group',
    emoji: '🔒',
    familyId,
    push: false,
  });
}

export function leaveFamily(familyId: string) {
  const user = currentUser();
  mutate((db) => {
    const family = db.families[familyId];
    if (!family) return;
    family.memberIds = family.memberIds.filter((id) => id !== user.id);
    family.adminUserIds = family.adminUserIds.filter((id) => id !== user.id);
    const me = db.users[user.id];
    if (me) me.familyIds = me.familyIds.filter((id) => id !== familyId);
    Object.values(db.conversations)
      .filter((c) => c.familyId === familyId)
      .forEach((c) => {
        c.memberIds = c.memberIds.filter((id) => id !== user.id);
      });
  });
  const db = getDatabase();
  const room = Object.values(db.conversations).find((c) => c.familyId === familyId && c.isFamilyRoom);
  if (room) {
    mutate((d) => {
      d.messages[room.id].push({
        id: uid('m_'),
        conversationId: room.id,
        senderId: user.id,
        kind: 'system',
        text: `${user.name} left the family`,
        systemKind: 'left',
        createdAt: Date.now(),
        status: 'read',
      });
    });
  }
}

export function setFamilyAdmin(familyId: string, memberId: string, admin: boolean) {
  const user = currentUser();
  assertFamilyAdmin(familyId, user.id);
  mutate((db) => {
    const family = db.families[familyId];
    if (!family) return;
    const has = family.adminUserIds.includes(memberId);
    if (admin && !has) family.adminUserIds.push(memberId);
    if (!admin && has) family.adminUserIds = family.adminUserIds.filter((id) => id !== memberId);
  });
}

/* ------------------------------------------------------------------ */
/* Conversations & messages                                            */
/* ------------------------------------------------------------------ */

export function getOrCreateDm(otherUserId: string): ConversationRecord {
  const user = currentUser();
  const db = getDatabase();
  const existing = Object.values(db.conversations).find(
    (c) => c.type === 'dm' && c.memberIds.length === 2 && c.memberIds.includes(user.id) && c.memberIds.includes(otherUserId)
  );
  if (existing) return existing;

  const other = db.users[otherUserId];
  if (!other) fail('That family member no longer exists.');
  const sharedFamily = user.familyIds.find((fid) => other.familyIds.includes(fid));
  if (!sharedFamily) fail('You can only message members of your family.');

  const conversationId = uid('c_');
  mutate((d) => {
    d.conversations[conversationId] = {
      id: conversationId,
      type: 'dm',
      familyId: sharedFamily,
      name: null,
      emoji: null,
      color: other.avatarColor,
      memberIds: [user.id, otherUserId],
      adminIds: [],
      mutedBy: [],
      createdAt: Date.now(),
      lastMessageAt: Date.now(),
      isFamilyRoom: false,
    };
    d.messages[conversationId] = [];
  });

  const persona = BOT_PERSONAS.find((p) => p.id === other.botPersonaId);
  if (persona) {
    setTimeout(() => {
      setTyping(conversationId, other.id, 2400);
      setTimeout(() => {
        clearTyping(conversationId, other.id);
        const text = persona.replies[0];
        botMessage(conversationId, other.id, { kind: 'text', text });
        notifyUser({
          userId: user.id,
          kind: 'message',
          title: persona.name,
          body: text,
          emoji: '💬',
          conversationId,
          familyId: sharedFamily,
        });
      }, 2400);
    }, 1000);
  }
  return getDatabase().conversations[conversationId];
}

function setMessageStatus(conversationId: string, messageId: string, status: MessageRecord['status']) {
  mutate((db) => {
    const list = db.messages[conversationId];
    const target = list?.find((m) => m.id === messageId);
    if (target) target.status = status;
  });
}

interface MessageDraft {
  kind: MessageRecord['kind'];
  text?: string;
  imageUri?: string;
  voiceUri?: string | null;
  voiceDurationMs?: number;
  voicePeaks?: number[];
  replyTo?: ReplyRef | null;
}

function postMessage(conversationId: string, draft: MessageDraft): MessageRecord {
  const user = currentUser();
  assertConversationAccess(conversationId, user.id);
  if (draft.kind === 'text' && !draft.text?.trim()) fail('Type a message first.');

  const message: MessageRecord = {
    id: uid('m_'),
    conversationId,
    senderId: user.id,
    kind: draft.kind,
    text: draft.text,
    imageUri: draft.imageUri,
    voiceUri: draft.voiceUri ?? null,
    voiceDurationMs: draft.voiceDurationMs,
    voicePeaks: draft.voicePeaks,
    replyTo: draft.replyTo ?? null,
    createdAt: Date.now(),
    status: 'sending',
  };

  mutate((db) => {
    const list = db.messages[conversationId] ?? (db.messages[conversationId] = []);
    list.push(message);
    const conv = db.conversations[conversationId];
    if (conv) conv.lastMessageAt = message.createdAt;
  });

  setTimeout(() => setMessageStatus(conversationId, message.id, 'sent'), 260);
  setTimeout(() => setMessageStatus(conversationId, message.id, 'delivered'), 1200);
  scheduleRepliesFor(conversationId, message);
  return message;
}

export function sendTextMessage(conversationId: string, rawText: string, replyTo?: ReplyRef | null): MessageRecord {
  const text = sanitizeText(rawText.trim(), 2000);
  if (!text) fail('Type a message first.');
  return postMessage(conversationId, { kind: 'text', text, replyTo });
}

export function sendImageMessage(conversationId: string, imageUri: string, caption?: string, replyTo?: ReplyRef | null): MessageRecord {
  if (!imageUri) fail('Could not read that photo.');
  const text = caption ? sanitizeText(caption.trim(), 400) : undefined;
  return postMessage(conversationId, { kind: 'image', imageUri, text, replyTo });
}

export function sendVoiceMessage(conversationId: string, voiceUri: string | null, durationMs: number, replyTo?: ReplyRef | null): MessageRecord {
  if (durationMs < 400) fail('Hold the button to record.');
  return postMessage(conversationId, {
    kind: 'voice',
    voiceUri,
    voiceDurationMs: Math.min(durationMs, 5 * 60 * 1000),
    voicePeaks: peaksFor(`${conversationId}${Date.now()}`),
    replyTo,
  });
}

export function deleteMessage(conversationId: string, messageId: string) {
  const user = currentUser();
  assertConversationAccess(conversationId, user.id);
  mutate((db) => {
    const list = db.messages[conversationId];
    if (!list) return;
    const target = list.find((m) => m.id === messageId);
    if (!target || target.senderId !== user.id) fail('You can only delete your own messages.');
    db.messages[conversationId] = list.filter((m) => m.id !== messageId);
  });
}

export function markConversationRead(conversationId: string) {
  let userId: string;
  try {
    userId = currentUser().id;
  } catch {
    return;
  }
  mutate((db) => {
    const list = db.messages[conversationId];
    if (!list) return;
    list.forEach((m) => {
      if (m.senderId !== userId) m.status = 'read';
    });
  });
  setTimeout(() => {
    mutate((db) => {
      const list = db.messages[conversationId];
      if (!list) return;
      list.forEach((m) => {
        if (m.senderId === userId && m.status !== 'sending') m.status = 'read';
      });
    });
  }, 1600);
}

export function toggleConversationMute(conversationId: string): boolean {
  const user = currentUser();
  assertConversationAccess(conversationId, user.id);
  let muted = false;
  mutate((db) => {
    const conv = db.conversations[conversationId];
    if (!conv) return;
    const has = conv.mutedBy.includes(user.id);
    if (has) conv.mutedBy = conv.mutedBy.filter((id) => id !== user.id);
    else conv.mutedBy.push(user.id);
    muted = !has;
  });
  return muted;
}

/* ------------------------------------------------------------------ */
/* Private family groups                                               */
/* ------------------------------------------------------------------ */

export function createGroup(input: { familyId: string; name: string; emoji: string; memberIds: string[] }): ConversationRecord {
  const user = currentUser();
  const db = getDatabase();
  const family = db.families[input.familyId];
  if (!family || !family.memberIds.includes(user.id)) fail('You are not a member of this family.');
  const name = input.name.trim();
  if (name.length < 2) fail('Give the group a name (2 characters or more).');
  if (name.length > 40) fail('Group name must be 40 characters or fewer.');

  const memberIds = Array.from(new Set([user.id, ...input.memberIds])).filter((id) => family.memberIds.includes(id));
  const conversationId = uid('c_');

  mutate((d) => {
    d.conversations[conversationId] = {
      id: conversationId,
      type: 'group',
      familyId: family.id,
      name: sanitizeText(name, 40),
      emoji: input.emoji || '🎉',
      color: user.avatarColor,
      memberIds,
      adminIds: [user.id],
      mutedBy: [],
      createdAt: Date.now(),
      lastMessageAt: Date.now(),
      isFamilyRoom: false,
    };
    d.messages[conversationId] = [
      {
        id: uid('m_'),
        conversationId,
        senderId: user.id,
        kind: 'system',
        text: `${user.name.split(' ')[0]} created “${sanitizeText(name, 40)}”`,
        systemKind: 'created',
        createdAt: Date.now(),
        status: 'read',
      },
    ];
  });

  memberIds
    .filter((id) => id !== user.id)
    .forEach((id) => {
      notifyUser({
        userId: id,
        kind: 'family',
        title: `${input.emoji} ${name}`,
        body: `${user.name.split(' ')[0]} added you to a new family group`,
        emoji: '🎉',
        conversationId,
        familyId: family.id,
        push: false,
      });
    });
  return getDatabase().conversations[conversationId];
}

export function addGroupMembers(conversationId: string, userIds: string[]) {
  const user = currentUser();
  const conv = assertConversationAccess(conversationId, user.id);
  if (conv.type !== 'group') fail('This is a direct message.');
  const db = getDatabase();
  if (!conv.adminIds.includes(user.id)) fail('Only group admins can add members.');
  const family = db.families[conv.familyId];
  const added: string[] = [];
  mutate((d) => {
    const target = d.conversations[conversationId];
    userIds.forEach((id) => {
      if (target.memberIds.includes(id)) return;
      if (!family?.memberIds.includes(id)) return;
      target.memberIds.push(id);
      added.push(d.users[id]?.name ?? 'A member');
    });
    if (added.length > 0) {
      d.messages[conversationId].push({
        id: uid('m_'),
        conversationId,
        senderId: user.id,
        kind: 'system',
        text: `${user.name.split(' ')[0]} added ${added.join(', ')}`,
        systemKind: 'joined',
        createdAt: Date.now(),
        status: 'read',
      });
    }
  });
}

export function removeGroupMember(conversationId: string, memberId: string) {
  const user = currentUser();
  const conv = assertConversationAccess(conversationId, user.id);
  if (conv.type !== 'group' || conv.isFamilyRoom) fail('The family room cannot be changed.');
  if (!conv.adminIds.includes(user.id) && memberId !== user.id) fail('Only group admins can remove members.');
  const db = getDatabase();
  const name = db.users[memberId]?.name ?? 'A member';
  mutate((d) => {
    const target = d.conversations[conversationId];
    target.memberIds = target.memberIds.filter((id) => id !== memberId);
    d.messages[conversationId].push({
      id: uid('m_'),
      conversationId,
      senderId: user.id,
      kind: 'system',
      text: memberId === user.id ? `${user.name.split(' ')[0]} left the group` : `${name} was removed from the group`,
      systemKind: 'left',
      createdAt: Date.now(),
      status: 'read',
    });
  });
}

export function deleteGroup(conversationId: string) {
  const user = currentUser();
  const conv = assertConversationAccess(conversationId, user.id);
  if (conv.type !== 'group' || conv.isFamilyRoom) fail('The family room cannot be deleted.');
  if (!conv.adminIds.includes(user.id)) fail('Only group admins can delete a group.');
  mutate((d) => {
    delete d.conversations[conversationId];
    delete d.messages[conversationId];
  });
}

/* ------------------------------------------------------------------ */
/* Members, privacy, settings                                          */
/* ------------------------------------------------------------------ */

export function updateProfile(patch: {
  name?: string;
  relationship?: Relationship;
  bio?: string;
  avatarColor?: string;
  avatarEmoji?: string | null;
}): UserRecord {
  const user = currentUser();
  if (patch.name !== undefined) {
    const check = validateName(patch.name);
    if (!check.ok) fail(check.message!);
  }
  if (patch.bio !== undefined) {
    const check = validateBio(patch.bio);
    if (!check.ok) fail(check.message!);
  }
  mutate((db) => {
    const me = db.users[user.id];
    if (!me) return;
    if (patch.name !== undefined) me.name = patch.name.trim().slice(0, 40);
    if (patch.relationship !== undefined) me.relationship = patch.relationship;
    if (patch.bio !== undefined) me.bio = patch.bio.trim().slice(0, 140);
    if (patch.avatarColor !== undefined) me.avatarColor = patch.avatarColor;
    if (patch.avatarEmoji !== undefined) me.avatarEmoji = patch.avatarEmoji;
  });
  return getDatabase().users[user.id];
}

export function updateSettings(patch: Partial<UserSettings>): UserSettings {
  const user = currentUser();
  mutate((db) => {
    const me = db.users[user.id];
    if (!me) return;
    me.settings = { ...me.settings, ...patch };
  });
  return getDatabase().users[user.id].settings;
}

export function blockUser(targetId: string) {
  const user = currentUser();
  if (targetId === user.id) fail('You cannot block yourself.');
  mutate((db) => {
    const me = db.users[user.id];
    if (me && !me.blockedUserIds.includes(targetId)) me.blockedUserIds.push(targetId);
  });
}

export function unblockUser(targetId: string) {
  const user = currentUser();
  mutate((db) => {
    const me = db.users[user.id];
    if (me) me.blockedUserIds = me.blockedUserIds.filter((id) => id !== targetId);
  });
}

export function reportUser(targetId: string, reason: string, detail: string) {
  const user = currentUser();
  mutate((db) => {
    db.reports.push({
      id: uid('r_'),
      reporterId: user.id,
      reportedId: targetId,
      reason,
      detail: sanitizeText(detail, 400),
      createdAt: Date.now(),
    });
  });
}

export function markAllNotificationsRead() {
  const user = currentUser();
  mutate((db) => {
    db.notifications.forEach((n) => {
      if (n.userId === user.id) n.read = true;
    });
  });
}

export function markNotificationRead(notificationId: string) {
  mutate((db) => {
    const target = db.notifications.find((n) => n.id === notificationId);
    if (target) target.read = true;
  });
}

export function clearNotifications() {
  const user = currentUser();
  mutate((db) => {
    db.notifications = db.notifications.filter((n) => n.userId !== user.id);
  });
}
