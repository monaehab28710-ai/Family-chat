import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useTheme } from '../lib/theme';

function Shimmer({ style }: { style: ViewStyle }) {
  const theme = useTheme();
  const progress = useSharedValue(0.4);
  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 850 }), -1, true);
  }, [progress]);
  const animated = useAnimatedStyle(() => ({ opacity: progress.value }));
  return <Animated.View style={[styles.block, { backgroundColor: theme.surfaceAlt }, style, animated]} />;
}

export function SkeletonRow({ withAvatar = true }: { withAvatar?: boolean }) {
  return (
    <View style={styles.row}>
      {withAvatar ? <Shimmer style={{ width: 52, height: 52, borderRadius: 26 }} /> : null}
      <View style={styles.lines}>
        <Shimmer style={{ width: '52%', height: 13, borderRadius: 7 }} />
        <Shimmer style={{ width: '76%', height: 11, borderRadius: 7 }} />
      </View>
      <Shimmer style={{ width: 34, height: 12, borderRadius: 6 }} />
    </View>
  );
}

export function SkeletonBubbles() {
  return (
    <View style={{ gap: 12, paddingTop: 12 }}>
      <Shimmer style={{ width: '62%', height: 54, borderRadius: 20 }} />
      <Shimmer style={{ width: '48%', height: 40, borderRadius: 20, alignSelf: 'flex-end' }} />
      <Shimmer style={{ width: '70%', height: 64, borderRadius: 20 }} />
      <Shimmer style={{ width: '44%', height: 44, borderRadius: 20, alignSelf: 'flex-end' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  block: { overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  lines: { flex: 1, gap: 8 },
});
