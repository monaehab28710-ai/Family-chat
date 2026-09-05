import React, { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';

interface FieldProps extends TextInputProps {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  error?: string | null;
  hint?: string;
  secure?: boolean;
  containerStyle?: ViewStyle;
  rightSlot?: React.ReactNode;
}

export const Field = forwardRef<TextInput, FieldProps>(function Field(
  { label, icon, error, hint, secure, containerStyle, rightSlot, style, ...rest },
  ref
) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(Boolean(secure));

  return (
    <View style={[styles.wrap, containerStyle]}>
      {label ? <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text> : null}
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: theme.inputBg,
            borderColor: error ? theme.danger : focused ? theme.primary : theme.border,
            borderWidth: focused || error ? 1.6 : StyleSheet.hairlineWidth,
          },
        ]}
      >
        {icon ? <Ionicons name={icon} size={18} color={focused ? theme.primary : theme.textFaint} /> : null}
        <TextInput
          ref={ref}
          style={[styles.input, { color: theme.text }, style]}
          placeholderTextColor={theme.textFaint}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          secureTextEntry={hidden}
          accessibilityLabel={label ?? rest.placeholder}
          {...rest}
        />
        {rightSlot}
        {secure ? (
          <Pressable onPress={() => setHidden((v) => !v)} hitSlop={10} accessibilityRole="button" accessibilityLabel={hidden ? 'Show password' : 'Hide password'}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={19} color={theme.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <View style={styles.messageRow}>
          <Ionicons name="alert-circle" size={13} color={theme.danger} />
          <Text style={[styles.message, { color: theme.danger }]}>{error}</Text>
        </View>
      ) : hint ? (
        <Text style={[styles.message, { color: theme.textFaint }]}>{hint}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 13, fontWeight: '700', marginLeft: 4 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  input: { flex: 1, fontSize: 15.5, paddingVertical: 12, fontWeight: '500' },
  messageRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 4 },
  message: { fontSize: 12.5, marginLeft: 4, fontWeight: '600' },
});
