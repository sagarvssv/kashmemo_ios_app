import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeInUp,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassSurface } from '@/components/glass';
import { type Palette, useBrand, useColors, useThemedStyles } from '@/constants/brand';
import { radius, spacing, typography } from '@/constants/theme';

type ToastType = 'success' | 'error';
type ToastInput = { type?: ToastType; title: string; message?: string };
type Toast = ToastInput & { id: number; type: ToastType };

const VISIBLE_MS = 3200;

const ToastContext = createContext<{ show: (toast: ToastInput) => void } | null>(null);

// Glass banner that drops in from the top for quick action feedback, with a
// matching haptic. Success shows a popping check; errors shake.
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  const [toast, setToast] = useState<Toast | null>(null);
  const insets = useSafeAreaInsets();

  const show = useCallback((input: ToastInput) => {
    const type = input.type ?? 'success';
    setToast({ ...input, type, id: Date.now() });
    void Haptics.notificationAsync(
      type === 'success' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error,
    ).catch(() => {});
  }, []);

  const toastId = toast?.id;
  useEffect(() => {
    if (!toastId) return;
    const timer = setTimeout(() => setToast((current) => (current?.id === toastId ? null : current)), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [toastId]);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View pointerEvents="box-none" style={[styles.host, { top: insets.top + spacing.two }]}>
        {toast && <ToastView key={toast.id} toast={toast} onDismiss={() => setToast(null)} />}
      </View>
    </ToastContext.Provider>
  );
}

function ToastView({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const brand = useBrand();
  const isError = toast.type === 'error';
  const shake = useSharedValue(0);
  useEffect(() => {
    if (!isError) return;
    shake.set(
      withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 70 }),
        withTiming(-7, { duration: 60 }),
        withTiming(7, { duration: 60 }),
        withTiming(0, { duration: 50 }),
      ),
    );
  }, [isError, shake]);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.get() }] }));

  return (
    <Animated.View entering={FadeInUp.springify().damping(16)} exiting={FadeOutUp.duration(220)} style={styles.wrap}>
      <Animated.View style={shakeStyle}>
        <Pressable onPress={onDismiss} accessibilityRole="alert" accessibilityLabel={`${toast.title}. ${toast.message ?? ''}`}>
          <GlassSurface style={[styles.toast, isError && styles.toastError]} intensity={80}>
            <Animated.View
              entering={ZoomIn.delay(120).springify().damping(10)}
              style={[styles.icon, { backgroundColor: isError ? colors.danger : brand.primary }]}>
              <Ionicons name={isError ? 'alert' : 'checkmark'} size={18} color="#FFFFFF" />
            </Animated.View>
            <View style={styles.text}>
              <Text style={styles.title} numberOfLines={1}>
                {toast.title}
              </Text>
              {toast.message ? (
                <Text style={styles.message} numberOfLines={2}>
                  {toast.message}
                </Text>
              ) : null}
            </View>
          </GlassSurface>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  host: {
    position: 'absolute',
    left: spacing.four,
    right: spacing.four,
    alignItems: 'center',
    zIndex: 1000,
    elevation: 1000,
  },
  wrap: {
    width: '100%',
    maxWidth: 520,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.three,
    padding: spacing.three,
    paddingRight: spacing.four,
    borderRadius: radius.large,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  toastError: {
    borderColor: 'rgba(239,68,68,0.45)',
    borderWidth: 1,
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
  },
  message: {
    ...typography.footnote,
    color: colors.textMuted,
  },
});
