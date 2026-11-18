import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Main API. Endpoint paths include the /api prefix (e.g. /api/org/login).
const MAIN_API_URL = 'https://api.kashmemo.com';

// Set to true to test against the local backend on port 3000 (dev builds only).
const USE_LOCAL_API = false;
const BACKEND_PORT = 3000;

// EXPO_PUBLIC_API_URL wins when set. Otherwise the main API is used, unless
// USE_LOCAL_API is on in a dev build: then the local backend is reached through
// the host Metro is served from, so a physical device or emulator hits the
// developer's machine instead of its own localhost.
function resolveApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, '');

  if (!__DEV__ || !USE_LOCAL_API) return MAIN_API_URL;

  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (host) return `http://${host}:${BACKEND_PORT}`;

  if (Platform.OS === 'android') return `http://10.0.2.2:${BACKEND_PORT}`;
  return `http://localhost:${BACKEND_PORT}`;
}

export const API_BASE_URL = resolveApiBaseUrl();

export const CURRENCY = 'AED';
export const LOCALE = 'en-AE';

// Petty-cash invoice service (OCR + AI categorization). The production URL will
// differ, so it comes from EXPO_PUBLIC_INVOICE_API_URL; the dev URL is a fallback.
// This API has no auth of its own - route it through our backend before release.
export const INVOICE_API_URL = (
  process.env.EXPO_PUBLIC_INVOICE_API_URL || 'https://pphuyyt3lb.execute-api.us-east-1.amazonaws.com/dev'
).replace(/\/+$/, '');
