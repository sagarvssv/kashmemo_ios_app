import { CURRENCY, LOCALE } from './config';
import { getDisplayCurrency, type DisplayCurrency } from './currency';
import type { Money, TicketStatus, UserRole } from './types';

export function toAmount(value: Money | null | undefined): number {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

// Whole amounts show no decimals (AED 5,000); others show two (AED 5,000.50).
const formatters = new Map<string, { whole: Intl.NumberFormat; decimal: Intl.NumberFormat }>();

function formattersFor(currency: string) {
  let entry = formatters.get(currency);
  if (!entry) {
    const base = { style: 'currency' as const, currency };
    entry = {
      whole: new Intl.NumberFormat(LOCALE, { ...base, minimumFractionDigits: 0, maximumFractionDigits: 0 }),
      decimal: new Intl.NumberFormat(LOCALE, { ...base, minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    };
    formatters.set(currency, entry);
  }
  return entry;
}

function format(amount: number, currency: string) {
  const { whole, decimal } = formattersFor(currency);
  return (Number.isInteger(amount) ? whole : decimal).format(amount);
}

// A stored amount (always in CURRENCY), shown in the user's display currency.
// In components use useMoney() instead, which updates when the currency changes.
export function formatMoney(value: Money | null | undefined): string {
  return formatMoneyIn(value, getDisplayCurrency());
}

// formatMoney() for an explicit display currency. Components use it through
// useMoney(), so the currency is a visible input and memoized output (the React
// Compiler caches by inputs) is recomputed when it changes.
export function formatMoneyIn(value: Money | null | undefined, { code, rate }: DisplayCurrency): string {
  const amount = toAmount(value);
  if (code === CURRENCY) return format(amount, CURRENCY);
  return format(Math.round(amount * rate * 100) / 100, code);
}

// An amount in the stored currency, unconverted: for limits next to amount inputs,
// which are always entered in CURRENCY.
export function formatBaseMoney(value: Money | null | undefined): string {
  return format(toAmount(value), CURRENCY);
}

// Amounts the server writes into activity and notification text ("₹5,000",
// "Rs. 5000", "AED 1,250.50", "5000 INR"). They are stored-currency values, so
// they're re-rendered in the display currency like every other amount.
const MONEY_IN_TEXT =
  /(?:₹|Rs\.?|INR|AED|د\.إ\.?)\s?(\d[\d,]*(?:\.\d+)?)|(\d[\d,]*(?:\.\d+)?)\s?(?:INR|AED)\b/g;

export function localizeMoneyText(text: string, display: DisplayCurrency = getDisplayCurrency()): string {
  if (!text) return text;
  return text.replace(MONEY_IN_TEXT, (match, before: string | undefined, after: string | undefined) => {
    const amount = Number((before ?? after ?? '').replace(/,/g, ''));
    return Number.isFinite(amount) ? formatMoneyIn(amount, display) : match;
  });
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' });
}

// "YYYY-MM-DD" calendar day, read as a local date so it never shifts a day.
export function formatDay(day: string): string {
  const [year, month, date] = day.split('-').map(Number);
  if (!year || !month || !date) return day;
  return new Date(year, month - 1, date).toLocaleDateString(LOCALE, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(LOCALE, {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatRelative(value: string): string {
  const diffSeconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  if (diffSeconds < 60) return 'just now';
  const minutes = Math.round(diffSeconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(value);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatMonth(month: number, year: number): string {
  return `${MONTHS[month - 1]} ${year}`;
}

export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  CEO: 'CEO',
  MANAGER: 'Manager',
  HR: 'HR',
  EMPLOYEE: 'Employee',
  FINANCE_MANAGER: 'Finance Manager',
};

export const STATUS_LABELS: Record<TicketStatus, string> = {
  PENDING: 'Pending',
  PARTIALLY_APPROVED: 'Partially approved',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  DISBURSED: 'Disbursed',
  SETTLEMENT_PENDING: 'Awaiting settlement',
  SETTLED: 'Settled',
};

export function humanize(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

// Short, human-friendly reference for any UUID (tickets, people, departments),
// e.g. "#3F9A1C2B". The full ID is shown on each detail screen.
export function shortId(id: string | null | undefined): string {
  if (!id) return '';
  return `#${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

export const ticketRef = shortId;
