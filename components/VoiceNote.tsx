import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useTheme } from '../lib/theme';
import { formatDuration } from '../lib/format';

/**
 * Voice message player with a waveform. Real recordings play back through
 * expo-audio; simulated captures (no microphone permission) play a silent
 * progress animation so the interaction still works everywhere.
 */
export function VoiceNote({
  uri,
  durationMs,
  peaks,
  isOwn,
}: {
  uri?: string | null;
  durationMs?: number;
  peaks?: number[];
  isOwn: boolean;
}) {
  const theme = useTheme();
  const simulated = !uri || uri.startsWith('voice://');
  const player = useAudioPlayer(simulated ? null : uri ?? null);
  const status = useAudioPlayerStatus(player);
  const [simPlaying, setSimPlaying] = useState(false);
  const [simProgress, setSimProgress] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const total = Math.max(800, durationMs ?? 5000);
  const bars = peaks && peaks.length > 0 ? peaks : defaultPeaks;

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
    },
    []
  );

  useEffect(() => {
    if (!simPlaying) return;
    const started = Date.now() - simProgress * total;
    timer.current = setInterval(() => {
      const p = (Date.now() - started) / total;
      if (p >= 1) {
        setSimProgress(1);
        setSimPlaying(false);
        if (timer.current) clearInterval(timer.current);
      } else {
        setSimProgress(p);
      }
    }, 80);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simPlaying, total]);

  const realPlaying = !simulated && Boolean(status?.playing);
  const progress = simulated ? simProgress : Math.min(1, (status?.currentTime ?? 0) / Math.max(0.5, status?.duration ?? total / 1000));
  const playing = simulated ? simPlaying : realPlaying;

  const toggle = () => {
    if (simulated) {
      if (simPlaying) {
        setSimPlaying(false);
        return;
      }
      if (simProgress >= 0.999) setSimProgress(0);
      setSimPlaying(true);
      return;
    }
    if (realPlaying) {
      player.pause();
      return;
    }
    if (progress >= 0.99) player.seekTo(0);
    player.play();
  };

  const accent = isOwn ? '#FFFFFF' : theme.primary;
  const remaining = formatDuration((1 - progress) * total);

  return (
    <View style={styles.row}>
      <Pressable
        onPress={toggle}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={playing ? 'Pause voice message' : 'Play voice message'}
        style={[styles.playButton, { backgroundColor: isOwn ? 'rgba(255,255,255,0.22)' : theme.primarySoft }]}
      >
        <Ionicons name={playing ? 'pause' : 'play'} size={17} color={accent} />
      </Pressable>

      <View style={styles.waveWrap}>
        <View style={styles.wave}>
          {bars.map((value, index) => {
            const active = index / bars.length <= progress;
            return (
              <View
                key={index}
                style={{
                  width: 3,
                  borderRadius: 2,
                  height: Math.max(4, value * 26),
                  backgroundColor: active ? accent : isOwn ? 'rgba(255,255,255,0.42)' : theme.border,
                }}
              />
            );
          })}
        </View>
        <Text style={[styles.time, { color: isOwn ? 'rgba(255,255,255,0.85)' : theme.textMuted }]}>
          {playing || progress > 0 ? `-${remaining}` : formatDuration(total)}
        </Text>
      </View>
    </View>
  );
}

const defaultPeaks = [0.3, 0.5, 0.7, 0.45, 0.8, 0.6, 0.35, 0.55, 0.75, 0.5, 0.4, 0.65, 0.85, 0.6, 0.45, 0.35, 0.55, 0.7, 0.5, 0.4, 0.6, 0.8, 0.55, 0.4, 0.3, 0.5, 0.65, 0.45, 0.35, 0.55, 0.7, 0.4, 0.3, 0.45];

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 208 },
  playButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  waveWrap: { flex: 1, gap: 4 },
  wave: { flexDirection: 'row', alignItems: 'center', gap: 2.5, height: 28 },
  time: { fontSize: 11, fontWeight: '700' },
});
