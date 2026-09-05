import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '../components/Screen';
import { Header, HeaderButton } from '../components/Header';
import { Avatar } from '../components/Avatar';
import { MessageBubble } from '../components/MessageBubble';
import { TypingBubble } from '../components/TypingDots';
import { EmojiBar } from '../components/EmojiBar';
import { EmptyState } from '../components/EmptyState';
import { ActionSheet, type SheetOption } from '../components/ActionSheet';
import { useTheme } from '../lib/theme';
import { useApp } from '../lib/bootstrap';
import { conversationMeta } from '../lib/selectors';
import { formatDayLabel, formatDuration, previewOf } from '../lib/format';
import { useToast } from '../lib/toast';
import { useTypingUsers, setTyping as bumpTyping } from '../lib/typing';
import { setActiveConversation } from '../lib/notify';
import {
  deleteMessage,
  markConversationRead,
  reportUser,
  sendImageMessage,
  sendTextMessage,
  sendVoiceMessage,
  toggleConversationMute,
} from '../lib/api';
import { DEMO_PHOTOS, pickDeviceImage, resolveImageSource } from '../lib/media';
import { useVoiceRecorder } from '../lib/recorder';
import type { MessageRecord } from '../lib/types';
import type { RootStackParamList } from '../navigation/types';

type Navigation = NativeStackNavigationProp<RootStackParamList, 'ChatRoom'>;
type Route = RouteProp<RootStackParamList, 'ChatRoom'>;

type Row = { type: 'day' | 'message'; id: string; label?: string; message?: MessageRecord };

export function ChatRoomScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const { db, user } = useApp();
  const { show } = useToast();
  const { conversationId } = route.params;

  const conversation = db?.conversations[conversationId];
  const messages = useMemo(() => db?.messages[conversationId] ?? [], [db, conversationId]);
  const typingIds = useTypingUsers(conversationId);

  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<MessageRecord | null>(null);
  const [showEmojis, setShowEmojis] = useState(false);
  const [menuMessage, setMenuMessage] = useState<MessageRecord | null>(null);
  const [headerMenu, setHeaderMenu] = useState(false);
  const [photoMenu, setPhotoMenu] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [recordingJustNow, setRecordingJustNow] = useState(false);

  const listRef = useRef<FlatList<Row>>(null);
  const recorder = useVoiceRecorder();

  const meta = useMemo(
    () => (conversation && db && user ? conversationMeta(db, conversation, user.id) : null),
    [conversation, db, user]
  );

  /* Presence + read receipts ------------------------------------------------ */
  useEffect(() => {
    setActiveConversation(conversationId);
    const unsubFocus = navigation.addListener('focus', () => setActiveConversation(conversationId));
    const unsubBlur = navigation.addListener('blur', () => setActiveConversation(null));
    return () => {
      unsubFocus();
      unsubBlur();
      setActiveConversation(null);
    };
  }, [conversationId, navigation]);

  useEffect(() => {
    markConversationRead(conversationId);
  }, [conversationId, messages.length]);

  /* Message list with day separators --------------------------------------- */
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    let lastDay = '';
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      const day = formatDayLabel(message.createdAt);
      if (day !== lastDay) {
        out.push({ type: 'day', id: `day-${message.id}`, label: day });
        lastDay = day;
      }
      out.push({ type: 'message', id: message.id, message });
    }
    return out;
  }, [messages]);

  const typingNames = typingIds
    .map((id) => db?.users[id]?.name.split(' ')[0] ?? '')
    .filter(Boolean);

  /* Sending ------------------------------------------------------------------ */
  const handleSendText = () => {
    const value = draft.trim();
    if (!value) return;
    try {
      sendTextMessage(conversationId, value, replyTo ? buildReplyRef(replyTo) : null);
      setDraft('');
      setReplyTo(null);
      setShowEmojis(false);
      bumpTyping(conversationId, user?.id ?? '', 1500);
      requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }));
    } catch (error) {
      show((error as Error).message, { tone: 'error' });
    }
  };

  const handleSendImage = async (uri: string | null) => {
    if (!uri) return;
    try {
      sendImageMessage(conversationId, uri, undefined, replyTo ? buildReplyRef(replyTo) : null);
      setReplyTo(null);
      show('Photo sent 📷', { tone: 'success', icon: 'image' });
    } catch (error) {
      show((error as Error).message, { tone: 'error' });
    }
  };

  const handleDevicePhoto = async () => {
    const uri = await pickDeviceImage();
    if (!uri) {
      show('Could not open the photo library - try a sample photo.', { tone: 'error' });
      return;
    }
    handleSendImage(uri);
  };

  const handleVoiceSend = async () => {
    const result = await recorder.stop();
    if (result.durationMs < 700) {
      show('Hold the mic a little longer to record a voice note.', { tone: 'error' });
      return;
    }
    try {
      sendVoiceMessage(conversationId, result.uri, result.durationMs, replyTo ? buildReplyRef(replyTo) : null);
      setReplyTo(null);
      setRecordingJustNow(false);
      show('Voice message sent 🎙️', { tone: 'success', icon: 'mic' });
    } catch (error) {
      show((error as Error).message, { tone: 'error' });
    }
  };

  const buildReplyRef = (message: MessageRecord) => ({
    messageId: message.id,
    senderId: message.senderId,
    senderName: message.senderId === user?.id ? 'You' : db?.users[message.senderId]?.name ?? 'Family member',
    preview: previewOf(message),
  });

  if (!conversation || !db || !user || !meta) {
    return (
      <Screen>
        <Header title="Conversation" onBack={() => navigation.goBack()} />
        <EmptyState emoji="🧩" title="Conversation unavailable" message="This conversation was removed or you no longer have access to it." actionLabel="Go back" onAction={() => navigation.goBack()} />
      </Screen>
    );
  }

  const muted = conversation.mutedBy.includes(user.id);
  const isDm = conversation.type === 'dm';
  const other = meta.other;
  const isBlocked = other ? user.blockedUserIds.includes(other.id) : false;

  const headerOptions: SheetOption[] = [
    ...(other
      ? [
          {
            label: 'View profile',
            icon: 'person-outline' as const,
            onPress: () => navigation.navigate('MemberDetail', { userId: other.id }),
          },
        ]
      : []),
    {
      label: muted ? 'Unmute notifications' : 'Mute notifications',
      icon: muted ? 'notifications-outline' : 'notifications-off-outline',
      onPress: () => {
        const nowMuted = toggleConversationMute(conversationId);
        show(nowMuted ? 'Notifications muted for this chat' : 'Notifications on for this chat', { icon: nowMuted ? 'notifications-off' : 'notifications' });
      },
    },
    {
      label: isBlocked ? 'Unblock member' : 'Block member',
      icon: 'ban-outline',
      tone: isBlocked ? 'default' : 'danger',
      hint: isBlocked ? undefined : 'They will not be able to message you',
      onPress: () => {
        show(isBlocked ? 'Member unblocked' : 'Member blocked - manage this in Profile → Blocked', { icon: 'shield-checkmark' });
        navigation.navigate('MemberDetail', { userId: other?.id ?? user.id });
      },
    },
    {
      label: 'Report a concern',
      icon: 'flag-outline',
      tone: 'danger',
      onPress: () => {
        if (!other) return;
        reportUser(other.id, 'Inappropriate behaviour', 'Reported from conversation');
        show('Thanks - our family safety team will review this.', { icon: 'shield-checkmark' });
      },
    },
  ];

  const menuOptions: SheetOption[] = menuMessage
    ? [
        {
          label: 'Reply',
          icon: 'arrow-undo-outline',
          onPress: () => {
            setReplyTo(menuMessage);
            setShowEmojis(false);
          },
        },
        {
          label: 'Copy text',
          icon: 'copy-outline',
          onPress: () => {
            const text = previewOf(menuMessage);
            if (text) show('Copied to clipboard', { icon: 'copy' });
          },
        },
        ...(menuMessage.imageUri
          ? [
              {
                label: 'Open photo',
                icon: 'expand-outline' as const,
                onPress: () => setPreviewImage(menuMessage.imageUri!),
              },
            ]
          : []),
        ...(menuMessage.senderId === user.id
          ? [
              {
                label: 'Delete for me',
                icon: 'trash-outline',
                tone: 'danger' as const,
                onPress: () => {
                  try {
                    deleteMessage(conversationId, menuMessage.id);
                    show('Message deleted', { icon: 'trash' });
                  } catch (error) {
                    show((error as Error).message, { tone: 'error' });
                  }
                },
              },
            ]
          : [
              {
                label: 'Report message',
                icon: 'flag-outline',
                tone: 'danger' as const,
                onPress: () => {
                  reportUser(menuMessage.senderId, 'Reported message', previewOf(menuMessage));
                  show('Report sent to family safety', { icon: 'shield-checkmark' });
                },
              },
            ]),
      ]
    : [];

  return (
    <Screen edges={['top']} background={theme.bg}>
      <Header
        title={meta.title}
        emoji={isDm ? null : meta.emoji}
        color={meta.color}
        onBack={() => navigation.goBack()}
        subtitle={
          <View style={styles.subtitleRow}>
            {isDm && other ? (
              <>
                <View style={[styles.presenceDot, { backgroundColor: other.online ? theme.online : theme.textFaint }]} />
                <Text style={[styles.subtitleText, { color: other.online ? theme.success : theme.textMuted }]}>
                  {other.online ? 'Online now' : other.relationship}
                </Text>
              </>
            ) : (
              <Text style={[styles.subtitleText, { color: theme.textMuted }]}>
                {conversation.memberIds.length} members · private group
              </Text>
            )}
          </View>
        }
        right={
          <>
            <HeaderButton
              icon={muted ? 'notifications-off' : 'notifications'}
              label={muted ? 'Unmute notifications' : 'Mute notifications'}
              onPress={() => {
                const nowMuted = toggleConversationMute(conversationId);
                show(nowMuted ? 'Notifications muted' : 'Notifications on', { icon: nowMuted ? 'notifications-off' : 'notifications' });
              }}
              active={muted}
            />
            <HeaderButton icon="ellipsis-horizontal" label="Conversation options" onPress={() => setHeaderMenu(true)} />
          </>
        }
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <FlatList
          ref={listRef}
          data={rows}
          inverted
          keyExtractor={(item) => item.id}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            if (item.type === 'day') {
              return (
                <View style={styles.dayRow}>
                  <View style={[styles.dayPill, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
                    <Text style={[styles.dayText, { color: theme.textMuted }]}>{item.label}</Text>
                  </View>
                </View>
              );
            }
            const message = item.message!;
            const isOwn = message.senderId === user.id;
            const sender = db.users[message.senderId] ?? null;
            const previous = messages[messages.indexOf(message) - 1];
            const showSender = !isOwn && message.kind !== 'system' && (!previous || previous.senderId !== message.senderId);
            return (
              <MessageBubble
                message={message}
                sender={sender}
                isOwn={isOwn}
                isGroup={!isDm}
                showSender={showSender}
                onLongPress={() => setMenuMessage(message)}
                onImagePress={(uri) => setPreviewImage(uri)}
                onReplyPress={() => {
                  const index = messages.findIndex((m) => m.id === message.replyTo?.messageId);
                  if (index >= 0) {
                    const flatIndex = rows.findIndex((r) => r.message?.id === message.replyTo?.messageId);
                    if (flatIndex >= 0) listRef.current?.scrollToIndex({ index: flatIndex, animated: true, viewPosition: 0.35 });
                  }
                }}
              />
            );
          }}
          ListHeaderComponent={
            typingNames.length > 0 ? (
              <Animated.View entering={FadeIn.duration(180)} style={styles.typingRow}>
                <Avatar name={typingNames[0]} color={meta.color} size={28} />
                <TypingBubble color={theme.textMuted} />
              </Animated.View>
            ) : null
          }
          ListFooterComponent={<View style={{ height: 8 }} />}
          onScrollBeginDrag={() => setShowEmojis(false)}
        />

        {showEmojis ? <EmojiBar onPick={(emoji) => setDraft((value) => value + emoji)} /> : null}

        {replyTo ? (
          <Animated.View entering={FadeInUp.duration(160)} style={[styles.replyBar, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
            <View style={[styles.replyStripe, { backgroundColor: theme.primary }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.replyName, { color: theme.primary }]}>
                Replying to {replyTo.senderId === user.id ? 'yourself' : db.users[replyTo.senderId]?.name ?? 'family member'}
              </Text>
              <Text numberOfLines={1} style={[styles.replyPreview, { color: theme.textMuted }]}>{previewOf(replyTo)}</Text>
            </View>
            <Pressable onPress={() => setReplyTo(null)} hitSlop={10} accessibilityLabel="Cancel reply">
              <Ionicons name="close" size={19} color={theme.textMuted} />
            </Pressable>
          </Animated.View>
        ) : null}

        {recorder.recording ? (
          <Animated.View entering={FadeInDown.duration(180)} style={[styles.recordingBar, { backgroundColor: theme.surface, borderColor: theme.danger, paddingBottom: insets.bottom + 10 }]}>
            <Pressable
              onPress={async () => {
                await recorder.stop();
                setRecordingJustNow(false);
                show('Recording discarded', { icon: 'trash' });
              }}
              style={[styles.recordBtn, { backgroundColor: theme.surfaceAlt }]}
              accessibilityRole="button"
              accessibilityLabel="Discard recording"
            >
              <Ionicons name="trash" size={19} color={theme.danger} />
            </Pressable>
            <View style={styles.recordInfo}>
              <View style={[styles.recordDot, { backgroundColor: theme.danger }]} />
              <Text style={[styles.recordText, { color: theme.text }]}>Recording… {formatDuration(recorder.durationMs)}</Text>
            </View>
            <Pressable
              onPress={handleVoiceSend}
              style={[styles.recordBtn, styles.recordSend, { backgroundColor: theme.primary }]}
              accessibilityRole="button"
              accessibilityLabel="Send voice message"
            >
              <Ionicons name="send" size={18} color="#FFFFFF" />
            </Pressable>
          </Animated.View>
        ) : (
          <View style={[styles.composer, { backgroundColor: theme.surface, borderColor: theme.border, paddingBottom: insets.bottom + 10 }]}>
            <Pressable
              onPress={() => setPhotoMenu(true)}
              style={[styles.composerBtn, { backgroundColor: theme.surfaceAlt }]}
              accessibilityRole="button"
              accessibilityLabel="Send a photo"
            >
              <Ionicons name="image" size={20} color={theme.primary} />
            </Pressable>

            <View style={[styles.inputWrap, { backgroundColor: theme.inputBg, borderColor: draft ? theme.primary : theme.border }]}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder={isBlocked ? 'You blocked this member' : 'Message…'}
                placeholderTextColor={theme.textFaint}
                style={[styles.input, { color: theme.text }]}
                multiline
                maxLength={1200}
                editable={!isBlocked}
                onFocus={() => setShowEmojis(false)}
                accessibilityLabel="Message input"
              />
              <Pressable
                onPress={() => setShowEmojis((value) => !value)}
                hitSlop={8}
                style={styles.emojiBtn}
                accessibilityRole="button"
                accessibilityLabel="Toggle emoji bar"
              >
                <Ionicons name={showEmojis ? 'keyboard-outline' : 'happy-outline'} size={21} color={showEmojis ? theme.primary : theme.textMuted} />
              </Pressable>
            </View>

            {draft.trim().length > 0 ? (
              <Pressable
                onPress={handleSendText}
                style={[styles.composerBtn, styles.sendBtn]}
                accessibilityRole="button"
                accessibilityLabel="Send message"
              >
                <Ionicons name="arrow-up" size={21} color="#FFFFFF" />
              </Pressable>
            ) : (
              <Pressable
                onPress={async () => {
                  if (isBlocked) {
                    show('Unblock this member to send messages.', { tone: 'error' });
                    return;
                  }
                  await recorder.start();
                  setRecordingJustNow(true);
                }}
                style={[
                  styles.composerBtn,
                  { backgroundColor: recorder.recording ? theme.danger : theme.surfaceAlt },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Record a voice message"
              >
                <Ionicons name="mic" size={20} color={recorder.recording ? '#FFFFFF' : theme.primary} />
              </Pressable>
            )}
          </View>
        )}
      </KeyboardAvoidingView>

      <ActionSheet
        visible={headerMenu}
        title={meta.title}
        message={isDm ? 'Direct message · end-to-end private to your family' : 'Private family group'}
        options={headerOptions}
        onClose={() => setHeaderMenu(false)}
      />

      <ActionSheet
        visible={Boolean(menuMessage)}
        title="Message actions"
        options={menuOptions}
        onClose={() => setMenuMessage(null)}
      />

      <ActionSheet
        visible={photoMenu}
        title="Send a photo"
        options={[
          { label: 'Choose from library', icon: 'photos-outline', onPress: handleDevicePhoto },
          ...DEMO_PHOTOS.slice(0, 3).map((photo) => ({
            label: `Sample photo: ${photo.label}`,
            icon: 'image-outline' as const,
            onPress: () => handleSendImage(photo.uri),
          })),
        ]}
        onClose={() => setPhotoMenu(false)}
      />

      <Modal visible={Boolean(previewImage)} transparent animationType="fade" onRequestClose={() => setPreviewImage(null)}>
        <Pressable style={[styles.previewOverlay, { backgroundColor: '#0E0A08' }]} onPress={() => setPreviewImage(null)}>
          <View style={[styles.previewHeader, { paddingTop: insets.top + 12 }]}>
            <Pressable onPress={() => setPreviewImage(null)} hitSlop={12} style={styles.previewClose} accessibilityLabel="Close photo">
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </Pressable>
          </View>
          <Image source={resolveImageSource(previewImage ?? undefined)} style={styles.previewImage} contentFit="contain" transition={200} />
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  subtitleText: { fontSize: 12.5, fontWeight: '700' },
  presenceDot: { width: 7, height: 7, borderRadius: 4 },
  listContent: { paddingTop: 12, paddingBottom: 10 },
  dayRow: { alignItems: 'center', marginVertical: 12 },
  dayPill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  dayText: { fontSize: 11.5, fontWeight: '800', letterSpacing: 0.4 },
  typingRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 14, paddingBottom: 6 },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  replyStripe: { width: 3, height: 32, borderRadius: 2 },
  replyName: { fontSize: 12.5, fontWeight: '800' },
  replyPreview: { fontSize: 12.5, marginTop: 2, fontWeight: '500' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  composerBtn: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  sendBtn: { backgroundColor: '#FF6B4A' },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 4,
    maxHeight: 130,
  },
  input: { flex: 1, fontSize: 15.5, paddingTop: 10, paddingBottom: 10, maxHeight: 110, fontWeight: '500' },
  emojiBtn: { padding: 6 },
  recordingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  recordBtn: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  recordSend: { backgroundColor: '#FF6B4A' },
  recordInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  recordDot: { width: 10, height: 10, borderRadius: 5 },
  recordText: { fontSize: 14.5, fontWeight: '700' },
  previewOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  previewHeader: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'flex-start', paddingHorizontal: 18, zIndex: 2 },
  previewClose: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  previewImage: { width: '100%', height: '70%' },
});
