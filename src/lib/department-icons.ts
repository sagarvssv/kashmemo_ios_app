import type { Ionicons } from '@expo/vector-icons';

type IconName = keyof typeof Ionicons.glyphMap;

export type DepartmentVisual = { icon: IconName; tint: string };

// Departments are free-text names, so pick an icon by matching whole words (or
// word prefixes) against common department vocabulary. Order matters: the first
// category with a matching keyword wins, so the more specific ones come first.
const CATEGORIES: { keywords: string[]; icon: IconName; tint: string }[] = [
  { keywords: ['finance', 'financial', 'account', 'accounts', 'accounting', 'treasury', 'payroll', 'audit', 'tax', 'billing'], icon: 'wallet', tint: '#0F7B4A' },
  { keywords: ['sales', 'sale', 'business development', 'bd', 'revenue', 'commercial'], icon: 'trending-up', tint: '#2563EB' },
  { keywords: ['marketing', 'brand', 'branding', 'pr', 'communication', 'communications', 'media', 'advertising', 'digital marketing'], icon: 'megaphone', tint: '#DB2777' },
  { keywords: ['hr', 'human', 'people', 'talent', 'recruitment', 'recruiting', 'hiring'], icon: 'people', tint: '#9333EA' },
  { keywords: ['training', 'learning', 'l&d', 'education'], icon: 'school', tint: '#7C3AED' },
  { keywords: ['it', 'tech', 'technology', 'engineering', 'development', 'developer', 'software', 'devops', 'infra', 'infrastructure'], icon: 'code-slash', tint: '#0891B2' },
  { keywords: ['data', 'analytics', 'bi', 'insights'], icon: 'analytics', tint: '#0369A1' },
  { keywords: ['product', 'products'], icon: 'cube', tint: '#4F46E5' },
  { keywords: ['design', 'creative', 'ux', 'ui'], icon: 'color-palette', tint: '#C026D3' },
  { keywords: ['operations', 'operation', 'ops'], icon: 'settings', tint: '#B45309' },
  { keywords: ['logistics', 'supply', 'warehouse', 'shipping', 'dispatch', 'inventory', 'store', 'stores'], icon: 'cube-outline', tint: '#C2410C' },
  { keywords: ['procurement', 'purchase', 'purchasing', 'vendor', 'vendors'], icon: 'cart', tint: '#EA580C' },
  { keywords: ['production', 'manufacturing', 'factory', 'plant'], icon: 'construct', tint: '#A16207' },
  { keywords: ['maintenance', 'facilities', 'facility', 'housekeeping'], icon: 'hammer', tint: '#78716C' },
  { keywords: ['transport', 'fleet', 'travel'], icon: 'car', tint: '#0D9488' },
  { keywords: ['support', 'service', 'services', 'customer', 'care', 'helpdesk', 'success'], icon: 'headset', tint: '#0284C7' },
  { keywords: ['legal', 'compliance', 'risk'], icon: 'shield-checkmark', tint: '#475569' },
  { keywords: ['security'], icon: 'lock-closed', tint: '#334155' },
  { keywords: ['quality', 'qa', 'qc'], icon: 'ribbon', tint: '#CA8A04' },
  { keywords: ['research', 'r&d', 'rnd', 'lab', 'labs'], icon: 'flask', tint: '#16A34A' },
  { keywords: ['medical', 'health', 'clinic', 'pharmacy'], icon: 'medkit', tint: '#DC2626' },
  { keywords: ['events', 'event'], icon: 'calendar', tint: '#E11D48' },
  { keywords: ['admin', 'administration', 'management', 'executive', 'general', 'office', 'ceo'], icon: 'briefcase', tint: '#1E3A8A' },
];

const FALLBACK: DepartmentVisual = { icon: 'business', tint: '#0e4b14' };

function normalise(name: string) {
  return ` ${name.toLowerCase().replace(/[^a-z0-9&]+/g, ' ').trim()} `;
}

// `tints`, when given, replaces the category colors with a single-hue set (the
// role palette's departmentTints), keeping each category on a stable shade.
export function departmentVisual(name: string, tints?: readonly string[]): DepartmentVisual {
  const text = normalise(name);
  const index = CATEGORIES.findIndex(({ keywords }) => keywords.some((keyword) => text.includes(` ${keyword} `)));
  const visual = index >= 0 ? { icon: CATEGORIES[index].icon, tint: CATEGORIES[index].tint } : FALLBACK;
  if (!tints?.length) return visual;
  return { icon: visual.icon, tint: tints[(index + tints.length) % tints.length] };
}

export function departmentIcon(name: string): IconName {
  return departmentVisual(name).icon;
}
