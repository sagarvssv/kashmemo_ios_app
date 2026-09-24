import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';
import { useSession } from '@/context/session';

const MIN_SPLASH_MS = 1200;

export default function SplashScreen() {
  const { user, isReady } = useSession();
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), MIN_SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isReady || !minTimeElapsed) return;
    router.replace(user ? '/home' : '/login');
  }, [isReady, minTimeElapsed, user]);

  return (
    <View style={styles.container}>
      <View style={styles.logoMark}>
        <Ionicons name="leaf" size={40} color="#FFFFFF" />
      </View>
      <Text style={styles.title}>KashMemo</Text>
      <Text style={styles.tagline}>Raise. Track. Get Paid.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoMark: {
    width: 84,
    height: 84,
    borderRadius: 20,
    backgroundColor: colors.accentTeal,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tagline: {
    marginTop: 6,
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
  },
});
