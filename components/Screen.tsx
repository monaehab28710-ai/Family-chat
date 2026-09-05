import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../lib/theme';

/**
 * Responsive content shell: full-bleed background with a centered column that
 * caps at tablet/desktop width so layouts stay comfortable on any screen.
 */
export function Screen({
  children,
  style,
  edges = ['top'],
  background,
}: {
  children?: React.ReactNode;
  style?: ViewStyle;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  background?: string;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: background ?? theme.bg }]}>
      <SafeAreaView edges={edges} style={[styles.inner, style]}>
        {children}
      </SafeAreaView>
    </View>
  );
}

export function ContentColumn({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.column, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  inner: { flex: 1, alignSelf: 'center', width: '100%', maxWidth: 760 },
  column: { width: '100%', paddingHorizontal: 20 },
});
