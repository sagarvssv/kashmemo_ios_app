import { CURRENCY } from './config';

// Free, keyless daily reference rates, relative to the app's stored currency.
const RATES_URL = `https://open.er-api.com/v6/latest/${CURRENCY}`;
const CACHE_TTL_MS = 60 * 60 * 1000;
const TIMEOUT_MS = 10_000;

export type ExchangeRates = {
  base: string;
  rates: Record<string, number>;
  // When the provider last published these rates.
  updatedAt: Date | null;
};

export type CurrencyInfo = { code: string; name: string; flag: string };

// Country (or EU) code → flag emoji, built from regional indicator symbols.
function flag(region: string) {
  return String.fromCodePoint(...[...region.toUpperCase()].map((char) => 0x1f1e6 + char.charCodeAt(0) - 65));
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: 'AED', name: 'UAE Dirham', flag: flag('AE') },
  { code: 'INR', name: 'Indian Rupee', flag: flag('IN') },
  { code: 'USD', name: 'US Dollar', flag: flag('US') },
  { code: 'EUR', name: 'Euro', flag: flag('EU') },
  { code: 'GBP', name: 'British Pound', flag: flag('GB') },
  { code: 'SAR', name: 'Saudi Riyal', flag: flag('SA') },
  { code: 'QAR', name: 'Qatari Riyal', flag: flag('QA') },
  { code: 'KWD', name: 'Kuwaiti Dinar', flag: flag('KW') },
  { code: 'OMR', name: 'Omani Rial', flag: flag('OM') },
  { code: 'BHD', name: 'Bahraini Dinar', flag: flag('BH') },
  { code: 'SGD', name: 'Singapore Dollar', flag: flag('SG') },
  { code: 'MYR', name: 'Malaysian Ringgit', flag: flag('MY') },
  { code: 'THB', name: 'Thai Baht', flag: flag('TH') },
  { code: 'JPY', name: 'Japanese Yen', flag: flag('JP') },
  { code: 'CNY', name: 'Chinese Yuan', flag: flag('CN') },
  { code: 'HKD', name: 'Hong Kong Dollar', flag: flag('HK') },
  { code: 'AUD', name: 'Australian Dollar', flag: flag('AU') },
  { code: 'NZD', name: 'New Zealand Dollar', flag: flag('NZ') },
  { code: 'CAD', name: 'Canadian Dollar', flag: flag('CA') },
  { code: 'CHF', name: 'Swiss Franc', flag: flag('CH') },
  { code: 'ZAR', name: 'South African Rand', flag: flag('ZA') },
  { code: 'LKR', name: 'Sri Lankan Rupee', flag: flag('LK') },
  { code: 'NPR', name: 'Nepalese Rupee', flag: flag('NP') },
  { code: 'BDT', name: 'Bangladeshi Taka', flag: flag('BD') },
];

export function currencyInfo(code: string): CurrencyInfo {
  return CURRENCIES.find((currency) => currency.code === code) ?? { code, name: code, flag: '🏳️' };
}

let cache: { at: number; value: ExchangeRates } | null = null;

export async function fetchExchangeRates({ force = false } = {}): Promise<ExchangeRates> {
  if (!force && cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.value;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(RATES_URL, { signal: controller.signal });
    const body = (await response.json()) as {
      result?: string;
      rates?: Record<string, number>;
      time_last_update_unix?: number;
    };
    if (!response.ok || body.result !== 'success' || !body.rates) {
      throw new Error('Exchange rates are unavailable right now.');
    }
    const value: ExchangeRates = {
      base: CURRENCY,
      rates: body.rates,
      updatedAt: body.time_last_update_unix ? new Date(body.time_last_update_unix * 1000) : null,
    };
    cache = { at: Date.now(), value };
    return value;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Exchange rates took too long to load.');
    }
    throw err instanceof Error ? err : new Error('Exchange rates are unavailable right now.');
  } finally {
    clearTimeout(timer);
  }
}
