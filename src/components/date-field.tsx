import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { type Palette, useBrand, useColors, useThemedStyles } from '@/constants/brand';
import { spacing, typography } from '@/constants/theme';
import { toIsoDate } from '@/lib/format';
import { LOCALE } from '@/lib/config';

type DateFieldProps = {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
};

function clamp(date: Date, min?: Date, max?: Date) {
  if (min && date < min) return min;
  if (max && date > max) return max;
  return date;
}

// A date-only field: native dialog on Android, an inline calendar sheet on iOS,
// and a typed YYYY-MM-DD input on web (the native picker has no web build).
export function DateField({ label, value, onChange, minimumDate, maximumDate }: DateFieldProps) {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const brand = useBrand();
  const [iosOpen, setIosOpen] = useState(false);
  const [draft, setDraft] = useState(value);

  if (Platform.OS === 'web') {
    return <WebDateField label={label} value={value} onChange={onChange} minimumDate={minimumDate} maximumDate={maximumDate} />;
  }

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value,
        mode: 'date',
        minimumDate,
        maximumDate,
        onChange: (event, date) => {
          if (event.type === 'set' && date) onChange(clamp(date, minimumDate, maximumDate));
        },
      });
      return;
    }
    setDraft(value);
    setIosOpen(true);
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <Pressable onPress={open} style={styles.field} accessibilityRole="button" accessibilityLabel={`${label}, ${toIsoDate(value)}`}>
        <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
        <Text style={styles.value}>
          {value.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' })}
        </Text>
      </Pressable>

      {Platform.OS === 'ios' && (
        <Modal visible={iosOpen} transparent animationType="slide" onRequestClose={() => setIosOpen(false)}>
          <View style={styles.backdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setIosOpen(false)} accessibilityLabel="Close" />
            <SafeAreaView edges={['bottom']} style={styles.sheet}>
              <Text style={styles.sheetTitle}>{label}</Text>
              <DateTimePicker
                value={draft}
                mode="date"
                display="inline"
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                accentColor={brand.primary}
                themeVariant="light"
                onChange={(_event, date) => date && setDraft(date)}
              />
              <PrimaryButton
                label="Done"
                onPress={() => {
                  onChange(clamp(draft, minimumDate, maximumDate));
                  setIosOpen(false);
                }}
              />
            </SafeAreaView>
          </View>
        </Modal>
      )}
    </View>
  );
}

function WebDateField({ label, value, onChange, minimumDate, maximumDate }: DateFieldProps) {
  const styles = useThemedStyles(makeStyles);
  const [text, setText] = useState(toIsoDate(value));
  const [error, setError] = useState<string | null>(null);

  const commit = () => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text.trim());
    const date = match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
    if (!date || Number.isNaN(date.getTime()) || toIsoDate(date) !== text.trim()) {
      setError('Use the format YYYY-MM-DD');
      return;
    }
    setError(null);
    const clamped = clamp(date, minimumDate, maximumDate);
    setText(toIsoDate(clamped));
    onChange(clamped);
  };

  return (
    <View style={styles.wrapper}>
      <TextField label={label} icon="calendar-outline" value={text} onChangeText={setText} onBlur={commit} onSubmitEditing={commit} placeholder="YYYY-MM-DD" />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  wrapper: {
    flex: 1,
    gap: 6,
  },
  label: {
    ...typography.footnoteStrong,
    color: colors.textPrimary,
  },
  field: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.two,
  },
  value: {
    ...typography.body,
    color: colors.textPrimary,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.four,
    gap: spacing.three,
  },
  sheetTitle: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
  },
});
