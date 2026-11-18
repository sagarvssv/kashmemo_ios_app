import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { type Palette, useThemedStyles } from '@/constants/brand';
import { spacing, typography } from '@/constants/theme';
import {
  PRIVACY_COMPANY,
  PRIVACY_CONTACT,
  PRIVACY_LAST_UPDATED,
  PRIVACY_POLICY,
  type PolicyParagraph,
} from '@/lib/privacy-policy';

// Public route: opened from signup (signed out) and from the Menu tab (signed in).
export default function PrivacyPolicyScreen() {
  const styles = useThemedStyles(makeStyles);

  const renderParagraph = (paragraph: PolicyParagraph, key: number) => (
    <Text key={key} style={styles.body}>
      {typeof paragraph === 'string' ? (
        paragraph
      ) : (
        <>
          <Text style={styles.lead}>{paragraph.lead}</Text> {paragraph.text}
        </>
      )}
    </Text>
  );

  return (
    <Screen title="Privacy policy" subtitle={`Last updated: ${PRIVACY_LAST_UPDATED}`} backFallback="/">
      {PRIVACY_POLICY.map((section, index) => (
        <View key={index} style={styles.section}>
          {section.heading ? <Text style={styles.heading}>{section.heading}</Text> : null}
          {section.paragraphs.map(renderParagraph)}
        </View>
      ))}

      <View style={styles.section}>
        <Text style={styles.heading}>Contact</Text>
        <Text style={styles.body}>
          <Text style={styles.lead}>Grievance Officer:</Text> {PRIVACY_CONTACT.name}, {PRIVACY_COMPANY},{' '}
          <Text style={styles.link} onPress={() => void Linking.openURL(`mailto:${PRIVACY_CONTACT.email}`)}>
            {PRIVACY_CONTACT.email}
          </Text>
        </Text>
      </View>
    </Screen>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    section: {
      gap: spacing.two,
    },
    heading: {
      ...typography.headline,
      color: colors.textPrimary,
    },
    body: {
      ...typography.body,
      color: colors.textSecondary,
    },
    lead: {
      fontWeight: '600',
      color: colors.textPrimary,
    },
    link: {
      color: colors.primary,
      fontWeight: '600',
    },
  });
