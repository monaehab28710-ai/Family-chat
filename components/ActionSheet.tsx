import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../lib/theme';

export interface SheetOption {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: 'default' | 'danger';
  hint?: string;
  onPress: () => void;
}

/** Bottom sheet with a list of actions - used for message and member menus. */
export function ActionSheet({
  visible,
  title,
  message,
  options,
  onClose,
}: {
  visible: boolean;
  title?: string;
  message?: string;
  options: SheetOption[];
  onClose: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(140)} style={styles.fill}>
        <Pressable style={[styles.backdrop, { backgroundColor: theme.overlay }]} onPress={onClose} accessibilityLabel="Close" />
        <Animated.View
          entering={FadeInDown.springify().damping(20)}
          style={[
            styles.sheet,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              paddingBottom: insets.bottom + 14,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: theme.border }]} />
          {title ? <Text style={[styles.title, { color: theme.text }]}>{title}</Text> : null}
          {message ? <Text style={[styles.message, { color: theme.textMuted }]}>{message}</Text> : null}

          <View style={{ marginTop: title || message ? 12 : 4 }}>
            {options.map((option, index) => {
              const danger = option.tone === 'danger';
              return (
                <Pressable
                  key={`${option.label}-${index}`}
                  onPress={() => {
                    onClose();
                    setTimeout(() => option.onPress(), 120);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={option.label}
                  style={({ pressed }) => [
                    styles.option,
                    {
                      backgroundColor: pressed ? theme.surfaceAlt : 'transparent',
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <View style={[styles.optionIcon, { backgroundColor: danger ? (theme.name === 'dark' ? '#3A1E20' : '#FDECEC') : theme.surfaceAlt }]}>
                    <Ionicons name={option.icon ?? 'ellipse'} size={17} color={danger ? theme.danger : theme.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.optionLabel, { color: danger ? theme.danger : theme.text }]}>{option.label}</Text>
                    {option.hint ? <Text style={[styles.optionHint, { color: theme.textFaint }]}>{option.hint}</Text> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            style={({ pressed }) => [styles.cancel, { backgroundColor: theme.surfaceAlt, opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={[styles.cancelText, { color: theme.text }]}>Cancel</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  sheet: {
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  title: { fontSize: 16.5, fontWeight: '800', textAlign: 'center' },
  message: { fontSize: 13.5, textAlign: 'center', marginTop: 4, lineHeight: 19 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 6,
  },
  optionIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  optionLabel: { fontSize: 15, fontWeight: '700' },
  optionHint: { fontSize: 12, marginTop: 1, fontWeight: '600' },
  cancel: { marginTop: 8, paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '800' },
});
