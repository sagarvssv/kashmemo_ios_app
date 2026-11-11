import { useIsFocused } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

// Entrance animation for list items and cards: fade + rise, staggered by
// index. Reanimated follows the system "Reduce motion" setting by default.
//
// It only plays if the screen is visible when the item mounts. Content that
// arrives while its tab is in the background skips the animation - an entering
// animation started off-screen can stall on its first (invisible) frame, which
// showed up as a blank screen after switching tabs.
export function FadeInItem({
  index = 0,
  children,
  style,
}: {
  index?: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const isFocused = useIsFocused();
  // Decided once, at mount; later focus changes don't replay it.
  const [animate] = useState(isFocused);
  return (
    <Animated.View
      entering={
        animate
          ? FadeInDown.delay(Math.min(index, 8) * 55)
              .duration(420)
              .springify()
              .damping(18)
          : undefined
      }
      style={style}>
      {children}
    </Animated.View>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type PressableScaleProps = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  // How far it shrinks while pressed.
  scaleTo?: number;
};

// A Pressable that springs down slightly while held - tactile press feedback.
export function PressableScale({ style, scaleTo = 0.97, onPressIn, onPressOut, disabled, ...rest }: PressableScaleProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(event) => {
        if (!disabled) scale.set(withSpring(scaleTo, { damping: 20, stiffness: 400 }));
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.set(withSpring(1, { damping: 14, stiffness: 300 }));
        onPressOut?.(event);
      }}
      style={[style, animatedStyle]}
    />
  );
}
