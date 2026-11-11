import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { SelectField } from '@/components/select-field';
import { useToast } from '@/components/toast';
import { type Palette, useBrand, useColors, useThemedStyles } from '@/constants/brand';
import { iconBadge, spacing, typography } from '@/constants/theme';
import { CURRENCY } from '@/lib/config';
import { setDisplayCurrency, useDisplayCurrency } from '@/lib/currency';
import { CURRENCIES, currencyInfo } from '@/lib/exchange-rates';

const OPTIONS = CURRENCIES.map((currency) => ({
  value: currency.code,
  label: `${currency.flag}  ${currency.code} · ${currency.name}`,
  keywords: currency.code,
}));

// Lets the user pick the currency every amount in the app is shown in.
export function DisplayCurrencyPicker() {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const accents = colors.accents;
  const display = useDisplayCurrency();
  const brand = useBrand();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const base = currencyInfo(CURRENCY);
  const selected = currencyInfo(display.code);

  const change = async (code: string) => {
    if (code === display.code) return;
    setSaving(true);
    try {
      await setDisplayCurrency(code);
      const info = currencyInfo(code);
      toast.show({ title: 'Currency updated', message: `Amounts now show in ${info.flag} ${info.name}.` });
    } catch (err) {
      toast.show({
        type: 'error',
        title: 'Could not change currency',
        message: err instanceof Error ? err.message : 'Exchange rates are unavailable right now.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.icon}>
          <Ionicons name="cash-outline" size={16} color={accents.green} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Display currency</Text>
          <Text style={styles.subtitle}>
            {display.code === CURRENCY
              ? `${selected.flag} ${selected.name} (stored currency)`
              : `${selected.flag} 1 ${base.code} = ${display.rate.toFixed(4)} ${display.code}`}
          </Text>
        </View>
        {saving ? <ActivityIndicator color={brand.primary} /> : null}
      </View>
      <SelectField
        label="Show amounts in"
        value={display.code}
        options={OPTIONS}
        onChange={(code) => void change(code)}
        disabled={saving}
        searchable
        searchPlaceholder="Search currency"
      />
      <Text style={styles.note}>
        Amounts are stored in {base.flag} {base.code} and converted at today&apos;s rate. New tickets and budgets are
        still entered in {base.code}.
      </Text>
    </View>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  container: {
    gap: spacing.three,
    paddingVertical: spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.three,
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: iconBadge(colors.accents.green),
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.footnote,
    color: colors.textMuted,
  },
  note: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
