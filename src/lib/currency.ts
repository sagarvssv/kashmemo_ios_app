import { useSyncExternalStore } from 'react';

import { CURRENCY } from './config';
import { fetchExchangeRates } from './exchange-rates';
import { readDisplayCurrency, writeDisplayCurrency } from './storage';

// The currency amounts are shown in. The server stores everything in CURRENCY;
// `rate` converts one unit of CURRENCY into `code` (1 when they're the same).
export type DisplayCurrency = { code: string; rate: number };

const BASE: DisplayCurrency = { code: CURRENCY, rate: 1 };

let current: DisplayCurrency = BASE;
const listeners = new Set<() => void>();

function publish(next: DisplayCurrency) {
  current = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getDisplayCurrency(): DisplayCurrency {
  return current;
}

// Re-renders the calling component when the display currency changes. Call it in
// every component that formats money with formatMoney().
export function useDisplayCurrency(): DisplayCurrency {
  return useSyncExternalStore(subscribe, getDisplayCurrency, getDisplayCurrency);
}

export async function setDisplayCurrency(code: string): Promise<void> {
  if (code === CURRENCY) {
    publish(BASE);
    await writeDisplayCurrency(BASE);
    return;
  }
  const rates = await fetchExchangeRates({ force: true });
  const rate = rates.rates[code];
  if (!rate) throw new Error(`No exchange rate available for ${code}.`);
  const next = { code, rate };
  publish(next);
  await writeDisplayCurrency(next);
}

// On app start: apply the saved choice straight away (with its saved rate, so it
// works offline), then refresh the rate in the background.
export async function restoreDisplayCurrency(): Promise<void> {
  const saved = await readDisplayCurrency().catch(() => null);
  if (!saved || saved.code === CURRENCY) return;
  publish(saved);
  try {
    const rates = await fetchExchangeRates();
    const rate = rates.rates[saved.code];
    if (rate && current.code === saved.code) {
      const next = { code: saved.code, rate };
      publish(next);
      await writeDisplayCurrency(next);
    }
  } catch {
    // Keep the saved rate until the next successful refresh.
  }
}
