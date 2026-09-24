import Constants from 'expo-constants';
import { Platform } from 'react-native';

const BACKEND_PORT = 3000;

// EXPO_PUBLIC_API_URL wins when set. Otherwise, in development, reuse the host
// the Metro bundler is served from so a physical device or emulator reaches the
// backend on the developer's machine instead of its own localhost.
function resolveApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, '');

  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(':')[0];
  if (host) return `http://${host}:${BACKEND_PORT}`;

  if (Platform.OS === 'android') return `http://10.0.2.2:${BACKEND_PORT}`;
  return `http://localhost:${BACKEND_PORT}`;
}

export const API_BASE_URL = resolveApiBaseUrl();

export const CURRENCY = 'INR';
export const LOCALE = 'en-IN';
