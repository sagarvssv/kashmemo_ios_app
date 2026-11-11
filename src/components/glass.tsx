import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import React from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

// Frosted-glass surface, best available per platform:
//  - iOS 26+: native Liquid Glass
//  - older iOS: native blur material
//  - Android / web: translucent white panel (real blur there needs every
//    screen wrapped in a blur target, which isn't worth the cost here)
const LIQUID_GLASS = Platform.OS === 'ios' && isLiquidGlassAvailable();

type GlassSurfaceProps = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  // Blur strength for the iOS fallback (0-100).
  intensity?: number;
};

export function GlassSurface({ children, style, intensity = 50 }: GlassSurfaceProps) {
  if (LIQUID_GLASS) {
    return (
      <GlassView glassEffectStyle="regular" tintColor="rgba(255,255,255,0.35)" colorScheme="light" style={[styles.base, style]}>
        {children}
      </GlassView>
    );
  }
  if (Platform.OS === 'ios') {
    return (
      <BlurView intensity={intensity} tint="systemUltraThinMaterialLight" style={[styles.base, styles.blurTint, style]}>
        {children}
      </BlurView>
    );
  }
  return <View style={[styles.base, styles.translucent, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  blurTint: {
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  translucent: {
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
});
