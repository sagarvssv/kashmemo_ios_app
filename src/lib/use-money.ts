import { useCallback } from 'react';

import { useDisplayCurrency } from './currency';
import { formatMoneyIn, localizeMoneyText } from './format';
import type { Money } from './types';

// Formats stored amounts in the user's display currency. The returned function
// changes identity with the currency, so components (and React Compiler
// memoization) re-render with converted amounts as soon as it is switched.
export function useMoney() {
  const display = useDisplayCurrency();
  return useCallback((value: Money | null | undefined) => formatMoneyIn(value, display), [display]);
}

// Same, for server-written text with amounts embedded in it.
export function useMoneyText() {
  const display = useDisplayCurrency();
  return useCallback((text: string) => localizeMoneyText(text, display), [display]);
}
