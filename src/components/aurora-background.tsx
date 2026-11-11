import React, { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { useBrand } from '@/constants/brand';

// Soft, slowly drifting colour blobs behind screen content. They give the glass
// surfaces something to frost over; kept low-opacity so text stays readable.
// Blob colors come from the active brand, in this order.
const BLOBS = [
  { id: 'a', size: 340, x: -0.25, y: -0.12, drift: 26, duration: 9000 },
  { id: 'b', size: 300, x: 0.55, y: -0.05, drift: 34, duration: 11000 },
  { id: 'c', size: 280, x: 0.2, y: 0.28, drift: 22, duration: 13000 },
];

export function AuroraBackground() {
  const { width } = useWindowDimensions();
  const brand = useBrand();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: brand.background }]} />
      {BLOBS.map((blob, index) => (
        <Blob key={blob.id} {...blob} color={brand.blobs[index]} left={blob.x * width} top={blob.y * width} />
      ))}
    </View>
  );
}

function Blob({
  id,
  color,
  size,
  left,
  top,
  drift,
  duration,
}: {
  id: string;
  color: string;
  size: number;
  left: number;
  top: number;
  drift: number;
  duration: number;
}) {
  const reduceMotion = useReducedMotion();
  const phase = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    phase.set(withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [duration, phase, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: (phase.get() - 0.5) * drift * 2 },
      { translateY: (0.5 - phase.get()) * drift },
      { scale: 1 + phase.get() * 0.08 },
    ],
  }));

  return (
    <Animated.View style={[{ position: 'absolute', left, top, width: size, height: size }, animatedStyle]}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={`aurora-${id}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={color} stopOpacity={0.32} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#aurora-${id})`} />
      </Svg>
    </Animated.View>
  );
}
