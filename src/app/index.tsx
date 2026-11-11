import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { typography } from '@/constants/theme';
import { useSession } from '@/context/session';

const MIN_SPLASH_MS = 1600;

// Brand greens, darkest at the top-left.
const GRADIENT = ['#051f09', '#0e4b14', '#1c5b4c'];

export default function SplashScreen() {
  const { user, isReady } = useSession();
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), MIN_SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isReady || !minTimeElapsed) return;
    router.replace(user ? '/home' : '/login');
  }, [isReady, minTimeElapsed, user]);

  // Loading bar fills over the minimum splash time.
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(withTiming(1, { duration: MIN_SPLASH_MS - 150, easing: Easing.inOut(Easing.cubic) }));
  }, [progress]);
  const barStyle = useAnimatedStyle(() => ({ width: `${progress.get() * 100}%` }));

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Deep green gradient with two soft glows */}
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="splash-bg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={GRADIENT[0]} />
            <Stop offset="0.55" stopColor={GRADIENT[1]} />
            <Stop offset="1" stopColor={GRADIENT[2]} />
          </LinearGradient>
        </Defs>
        <Rect width={width} height={height} fill="url(#splash-bg)" />
      </Svg>
      <Glow color="#1baf7a" size={width * 1.1} left={-width * 0.45} top={-width * 0.35} reduceMotion={reduceMotion} />
      <Glow color="#6fd3a5" size={width * 0.9} left={width * 0.35} top={height * 0.62} reduceMotion={reduceMotion} delay={600} />

      <View style={styles.center}>
        <View style={styles.logoWrap}>
          {!reduceMotion && <PulseRing delay={0} />}
          {!reduceMotion && <PulseRing delay={900} />}
          <Animated.View entering={ZoomIn.springify().damping(11).stiffness(140)} style={styles.logoGlass}>
            <View style={styles.logoMark}>
              <Ionicons name="leaf" size={42} color="#FFFFFF" />
            </View>
          </Animated.View>
        </View>

        <Animated.Text entering={FadeInDown.delay(250).duration(600)} style={styles.title}>
          KashMemo
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(420).duration(600)} style={styles.tagline}>
          Raise. Track. Get Paid.
        </Animated.Text>
      </View>

      <Animated.View entering={FadeIn.delay(500).duration(500)} style={styles.footer}>
        <View style={styles.barTrack}>
          <Animated.View style={[styles.barFill, barStyle]} />
        </View>
        <Animated.Text style={styles.footerText}>Preparing your workspace</Animated.Text>
      </Animated.View>
    </View>
  );
}

// A ring that grows out from behind the logo and fades, on repeat.
function PulseRing({ delay }: { delay: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withDelay(delay, withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1, false)));
  }, [delay, t]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.45 * (1 - t.get()),
    transform: [{ scale: 1 + t.get() * 0.9 }],
  }));
  return <Animated.View style={[styles.ring, style]} />;
}

// A large, soft radial glow that slowly breathes.
function Glow({
  color,
  size,
  left,
  top,
  reduceMotion,
  delay = 0,
}: {
  color: string;
  size: number;
  left: number;
  top: number;
  reduceMotion: boolean;
  delay?: number;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    t.set(withDelay(delay, withRepeat(withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.sin) }), -1, true)));
  }, [delay, reduceMotion, t]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.55 + t.get() * 0.35,
    transform: [{ scale: 1 + t.get() * 0.08 }],
  }));
  const id = `glow-${color.slice(1)}`;
  return (
    <Animated.View style={[{ position: 'absolute', left, top, width: size, height: size }, style]} pointerEvents="none">
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity={0.45} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

const LOGO = 112;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GRADIENT[1],
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  logoWrap: {
    width: LOGO,
    height: LOGO,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  ring: {
    position: 'absolute',
    width: LOGO,
    height: LOGO,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: 'rgba(160,240,200,0.8)',
  },
  // Frosted glass frame around the logo mark.
  logoGlass: {
    width: LOGO,
    height: LOGO,
    borderRadius: 34,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 12,
  },
  logoMark: {
    flex: 1,
    borderRadius: 26,
    backgroundColor: '#1baf7a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.display,
    fontSize: 38,
    lineHeight: 44,
    color: '#FFFFFF',
  },
  tagline: {
    ...typography.bodyStrong,
    color: 'rgba(255,255,255,0.78)',
    letterSpacing: 0.6,
  },
  footer: {
    alignItems: 'center',
    gap: 10,
    paddingBottom: 56,
    paddingHorizontal: 64,
  },
  barTrack: {
    alignSelf: 'stretch',
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#a0f0c8',
  },
  footerText: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.65)',
  },
});
