import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { FlatList, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { TextField } from '@/components/text-field';
import { type Palette, useBrand, useColors, useThemedStyles } from '@/constants/brand';
import { spacing, typography, withAlpha } from '@/constants/theme';

// `keywords` are extra search terms (e.g. a country code) that aren't shown.
type Option = { value: string; label: string; description?: string; keywords?: string };

const ROW_HEIGHT = 56;

type SelectFieldProps = {
  label: string;
  placeholder?: string;
  value: string | null;
  options: Option[];
  onChange: (value: string) => void;
  disabled?: boolean;
  // Adds a search box to the picker; use for long lists.
  searchable?: boolean;
  searchPlaceholder?: string;
};

export function SelectField({
  label,
  placeholder = 'Select',
  value,
  options,
  onChange,
  disabled,
  searchable,
  searchPlaceholder = 'Search',
}: SelectFieldProps) {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const brand = useBrand();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find((option) => option.value === value);

  const needle = query.trim().toLowerCase();
  const visibleOptions = needle
    ? options.filter((option) =>
        `${option.label} ${option.description ?? ''} ${option.keywords ?? ''}`.toLowerCase().includes(needle),
      )
    : options;

  // Rows without descriptions share one height, which lets the list open at the selection.
  const fixedRows = options.every((option) => !option.description);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const getItemLayout = (_data: unknown, index: number) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index });

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        disabled={disabled}
        style={[styles.field, disabled && styles.disabled]}
        accessibilityRole="button">
        <Text style={[styles.value, !selected && styles.placeholder]} numberOfLines={1}>
          {selected?.label ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
      </Pressable>

      <Modal
        visible={open}
        animationType="slide"
        // iOS: a native page sheet that sits below the status bar and can be swiped down.
        presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : undefined}
        statusBarTranslucent={Platform.OS === 'android'}
        onRequestClose={close}>
        {/* A modal is its own native window: give it its own safe-area measurements
            so the header never slides under the status bar or notch. */}
        <SafeAreaProvider>
          <SafeAreaView style={[styles.modal, { backgroundColor: brand.background }]} edges={Platform.OS === 'ios' ? ['bottom'] : ['top', 'bottom']}>
            <View style={styles.sheet}>
              {Platform.OS === 'ios' && <View style={styles.grabber} />}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  {label}
                </Text>
                <Pressable
                  onPress={close}
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}>
                  <Ionicons name="close" size={22} color={colors.textPrimary} />
                </Pressable>
              </View>
              {searchable && (
                <View style={styles.search}>
                  <TextField
                    icon="search-outline"
                    placeholder={searchPlaceholder}
                    value={query}
                    onChangeText={setQuery}
                    autoCorrect={false}
                    autoCapitalize="none"
                    returnKeyType="search"
                    clearButtonMode="while-editing"
                  />
                </View>
              )}
              <FlatList
                data={visibleOptions}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                // Open scrolled to the current choice (rows are fixed height unless they have descriptions).
                {...(fixedRows && !needle && selectedIndex > 0
                  ? { initialScrollIndex: Math.max(selectedIndex - 3, 0), getItemLayout }
                  : {})}
                ListEmptyComponent={<Text style={styles.empty}>No matches for “{query.trim()}”</Text>}
                keyExtractor={(option) => option.value}
                contentContainerStyle={styles.list}
                renderItem={({ item }) => {
                  const isSelected = item.value === value;
                  return (
                    <Pressable
                      style={({ pressed }) => [
                        styles.option,
                        fixedRows && styles.optionFixed,
                        isSelected && styles.optionSelected,
                        pressed && styles.optionPressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      onPress={() => {
                        onChange(item.value);
                        close();
                      }}>
                      <View style={styles.optionText}>
                        <Text style={[styles.optionLabel, isSelected && [styles.optionLabelSelected, { color: brand.primary }]]} numberOfLines={1}>
                          {item.label}
                        </Text>
                        {item.description ? <Text style={styles.optionDescription}>{item.description}</Text> : null}
                      </View>
                      {isSelected && <Ionicons name="checkmark-circle" size={22} color={brand.primary} />}
                    </Pressable>
                  );
                }}
              />
            </View>
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  label: {
    ...typography.footnoteStrong,
    color: colors.textPrimary,
  },
  field: {
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.two,
  },
  disabled: {
    opacity: 0.5,
  },
  value: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
  },
  placeholder: {
    color: colors.textMuted,
  },
  modal: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // Keeps the list a readable width on tablets.
  sheet: {
    flex: 1,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: withAlpha(colors.border, 0.2),
    marginTop: spacing.two,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.three,
    paddingHorizontal: spacing.four,
    paddingTop: spacing.three,
    paddingBottom: spacing.three,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withAlpha(colors.border, 0.08),
  },
  closeButtonPressed: {
    backgroundColor: withAlpha(colors.border, 0.16),
  },
  modalTitle: {
    ...typography.title,
    flex: 1,
    color: colors.textPrimary,
  },
  search: {
    paddingHorizontal: spacing.four,
    paddingBottom: spacing.two,
  },
  empty: {
    ...typography.callout,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.eight,
  },
  list: {
    paddingHorizontal: spacing.two,
    paddingBottom: spacing.eight,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.three,
    paddingHorizontal: spacing.three,
    gap: spacing.three,
    borderRadius: 12,
  },
  optionFixed: {
    height: ROW_HEIGHT,
    paddingVertical: 0,
  },
  optionSelected: {
    backgroundColor: withAlpha(colors.primary, 0.08),
  },
  optionPressed: {
    backgroundColor: withAlpha(colors.border, 0.06),
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  optionLabel: {
    ...typography.body,
    color: colors.textPrimary,
  },
  optionLabelSelected: {
    fontWeight: '600',
    color: colors.primary,
  },
  optionDescription: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
