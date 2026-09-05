import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useTheme } from '../lib/theme';
import { formatClock } from '../lib/format';
import { resolveImageSource } from '../lib/media';
import type { MessageRecord, UserRecord } from '../lib/types';
import { Avatar } from './Avatar';
import { VoiceNote } from './VoiceNote';

export function MessageBubble({
  message,
  sender,
  isOwn,
  isGroup,
  showSender,
  onLongPress,
  onImagePress,
  onReplyPress,
}: {
  message: MessageRecord;
  sender: UserRecord | null;
  isOwn: boolean;
  isGroup: boolean;
  showSender: boolean;
  onLongPress?: () => void;
  onImagePress?: (uri: string) => void;
  onReplyPress?: (messageId: string) => void;
}) {
  const theme = useTheme();

  if (message.kind === 'system') {
    return (
      <Animated.View entering={FadeInUp.duration(220)} style={styles.systemRow}>
        <View style={[styles.systemPill, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
          <Ionicons
            name={message.systemKind === 'joined' ? 'person-add' : message.systemKind === 'left' || message.systemKind === 'removed' ? 'exit' : 'sparkles'}
            size={12}
            color={theme.textMuted}
          />
          <Text style={[styles.systemText, { color: theme.textMuted }]}>{message.text}</Text>
        </View>
      </Animated.View>
    );
  }

  const radius = isOwn ? { borderTopRightRadius: 7 } : { borderTopLeftRadius: 7 };
  const bubbleColors = isOwn ? theme.gradient : [theme.bubbleOther, theme.bubbleOther];

  return (
    <Animated.View entering={FadeInUp.duration(200).delay(20)} style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther]}>
      {isGroup && !isOwn ? <View style={styles.avatarSlot}>{showSender ? <Avatar name={sender?.name ?? '?'} color={sender?.avatarColor ?? theme.primary} size={30} /> : null}</View> : null}

      <View style={[styles.stack, isOwn ? styles.stackOwn : null]}>
        {showSender && !isOwn && sender ? (
          <Text style={[styles.senderName, { color: sender.avatarColor }]}>
            {sender.name}
            {sender.relationship ? `  ·  ${sender.relationship}` : ''}
          </Text>
        ) : null}

        <Pressable
          onLongPress={onLongPress}
          delayLongPress={280}
          accessibilityRole="button"
          accessibilityLabel="Message actions"
          style={({ pressed }) => [
            styles.bubble,
            radius,
            {
              backgroundColor: bubbleColors[0],
              borderColor: isOwn ? 'transparent' : theme.bubbleOtherBorder,
              borderWidth: StyleSheet.hairlineWidth,
              opacity: pressed ? 0.92 : 1,
            },
          ]}
        >
          {message.replyTo ? (
            <Pressable
              onPress={() => onReplyPress?.(message.replyTo!.messageId)}
              style={[styles.quote, { backgroundColor: isOwn ? 'rgba(255,255,255,0.18)' : theme.quote, borderLeftColor: isOwn ? '#FFFFFF' : theme.primary }]}
            >
              <Text numberOfLines={1} style={[styles.quoteName, { color: isOwn ? '#FFFFFF' : theme.primary }]}>
                {message.replyTo.senderName}
              </Text>
              <Text numberOfLines={1} style={[styles.quoteText, { color: isOwn ? 'rgba(255,255,255,0.9)' : theme.textMuted }]}>
                {message.replyTo.preview}
              </Text>
            </Pressable>
          ) : null}

          {message.kind === 'image' ? (
            <Pressable onPress={() => onImagePress?.(message.imageUri ?? '')} accessibilityRole="button" accessibilityLabel="Open photo">
              <Image
                source={resolveImageSource(message.imageUri)}
                style={styles.image}
                contentFit="cover"
                transition={220}
                priority="high"
              />
              {message.text ? (
                <Text style={[styles.caption, { color: isOwn ? theme.bubbleOwnText : theme.bubbleOtherText }]}>{message.text}</Text>
              ) : null}
            </Pressable>
          ) : null}

          {message.kind === 'voice' ? (
            <VoiceNote uri={message.voiceUri} durationMs={message.voiceDurationMs} peaks={message.voicePeaks} isOwn={isOwn} />
          ) : null}

          {message.kind === 'text' && message.text ? (
            <Text selectable style={[styles.text, { color: isOwn ? theme.bubbleOwnText : theme.bubbleOtherText }]}>
              {message.text}
            </Text>
          ) : null}

          <View style={styles.metaRow}>
            <Text style={[styles.time, { color: isOwn ? 'rgba(255,255,255,0.82)' : theme.textFaint }]}>{formatClock(message.createdAt)}</Text>
            {isOwn ? <Ticks status={message.status} /> : null}
          </View>
        </Pressable>
      </View>
    </Animated.View>
  );
}

function Ticks({ status }: { status: MessageRecord['status'] }) {
  const color = status === 'read' ? '#9BE8FF' : 'rgba(255,255,255,0.85)';
  if (status === 'sending') return <Ionicons name="time-outline" size={13} color={color} />;
  if (status === 'sent') return <Ionicons name="check" size={14} color={color} />;
  return <Ionicons name="checkmark-done" size={14} color={color} />;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginBottom: 8, paddingHorizontal: 14 },
  rowOwn: { justifyContent: 'flex-end' },
  rowOther: { justifyContent: 'flex-start' },
  avatarSlot: { width: 34, marginRight: 6, paddingTop: 18 },
  stack: { maxWidth: '80%', gap: 3 },
  stackOwn: { alignItems: 'flex-end' },
  senderName: { fontSize: 11.5, fontWeight: '800', marginLeft: 12, marginBottom: 1 },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, minWidth: 76 },
  quote: { borderLeftWidth: 3, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 8, gap: 1 },
  quoteName: { fontSize: 12, fontWeight: '800' },
  quoteText: { fontSize: 12.5, fontWeight: '500' },
  text: { fontSize: 15.5, lineHeight: 21.5, fontWeight: '500' },
  image: { width: 230, height: 190, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.06)' },
  caption: { fontSize: 14.5, marginTop: 8, fontWeight: '500', lineHeight: 20 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5, alignSelf: 'flex-end' },
  time: { fontSize: 10.5, fontWeight: '600' },
  systemRow: { alignItems: 'center', marginVertical: 10, paddingHorizontal: 20 },
  systemPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: '92%',
  },
  systemText: { fontSize: 12, fontWeight: '600', flexShrink: 1 },
});
