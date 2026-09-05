import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';

export function SwitchRow({
  icon,
  label,
  description,
  value,
  onValueChange,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border, opacity: disabled ? 0.5 : 1 }]}>
      <View style={[styles.icon, { backgroundColor: theme.surfaceAlt }]}>
        <Ionicons name={icon} size={18} color={theme.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
        {description ? <Text style={[styles.description, { color: theme.textMuted }]}>{description}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ true: theme.primary, false: theme.border }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={theme.border}
      />
    </View>
  );
}

export function LinkRow({
  icon,
  label,
  description,
  value,
  onPress,
  tone = 'default',
  right,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description?: string;
  value?: string;
  onPress?: () => void;
  tone?: 'default' | 'danger';
  right?: React.ReactNode;
}) {
  const theme = useTheme();
  const color = tone === 'danger' ? theme.danger : theme.text;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.75 : 1 },
      ]}
    >
      <View style={[styles.icon, { backgroundColor: tone === 'danger' ? (theme.name === 'dark' ? '#3A1E20' : '#FDECEC') : theme.surfaceAlt }]}>
        <Ionicons name={icon} size={18} color={tone === 'danger' ? theme.danger : theme.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.label, { color }]}>{label}</Text>
        {description ? <Text style={[styles.description, { color: theme.textMuted }]}>{description}</Text> : null}
      </View>
      {value ? <Text style={[styles.value, { color: theme.textMuted }]}>{value}</Text> : null}
      {right ?? <Ionicons name="chevron-forward" size={16} color={theme.textFaint} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
  icon: { width: 36, height: 36, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 15, fontWeight: '700' },
  description: { fontSize: 12.5, marginTop: 2, fontWeight: '500' },
  value: { fontSize: 13.5, fontWeight: '600', marginRight: 4 },
});
