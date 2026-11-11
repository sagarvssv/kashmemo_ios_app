import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, ListRow, Section } from '@/components/card';
import { OtpInput } from '@/components/otp-input';
import { PrimaryButton } from '@/components/primary-button';
import { InlineError } from '@/components/states';
import { useToast } from '@/components/toast';
import { type Palette, useColors, useThemedStyles } from '@/constants/brand';
import { spacing, typography } from '@/constants/theme';
import { useCurrentUser, useSession } from '@/context/session';
import { errorMessage } from '@/lib/api';
import { authApi } from '@/lib/endpoints';
import { can } from '@/lib/permissions';

const OTP_LENGTH = 6;

// CEO-only danger zone: deletes the whole organisation after confirming a code
// emailed to the CEO. Renders nothing for other roles.
export function DeleteOrganizationSection() {
  const user = useCurrentUser();
  const [visible, setVisible] = useState(false);

  if (!can.deleteOrganization(user.role)) return null;

  return (
    <Section title="Danger zone">
      <Card style={rowStyles.rows}>
        <ListRow
          icon="trash-outline"
          title="Delete organisation"
          subtitle="Permanently remove the organisation and all its data"
          destructive
          onPress={() => setVisible(true)}
        />
      </Card>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        {/* Mounted only while open so every opening starts at the warning step. */}
        {visible && <DeleteOrganizationSheet onClose={() => setVisible(false)} />}
      </Modal>
    </Section>
  );
}

type Step = 'warn' | 'otp';

function DeleteOrganizationSheet({ onClose }: { onClose: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const colors = useColors();
  const user = useCurrentUser();
  const { signOut } = useSession();
  const toast = useToast();
  const [step, setStep] = useState<Step>('warn');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const sendCode = async () => {
    setIsSending(true);
    setError(null);
    try {
      await authApi.requestOrganizationDeletion();
      setOtp('');
      setStep('otp');
      toast.show({ title: 'Code sent', message: `Check ${user.email} for the verification code.` });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsSending(false);
    }
  };

  const confirmDelete = async () => {
    if (otp.length !== OTP_LENGTH) return;
    setIsDeleting(true);
    setError(null);
    try {
      await authApi.confirmOrganizationDeletion(otp);
    } catch (err) {
      setError(errorMessage(err));
      setIsDeleting(false);
      return;
    }
    toast.show({ title: 'Organisation deleted', message: 'Your organisation and its data have been removed.' });
    onClose();
    // The account no longer exists on the server, so drop the local session.
    await signOut();
  };

  const busy = isSending || isDeleting;

  return (
    <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Pressable style={StyleSheet.absoluteFill} onPress={busy ? undefined : onClose} accessibilityLabel="Close" />
      <View style={styles.sheet}>
        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: colors.danger }]}>
            <Ionicons name="warning-outline" size={22} color="#FFFFFF" />
          </View>
          <Text style={styles.title}>Delete {user.companyName ?? 'organisation'}?</Text>
        </View>

        {step === 'warn' ? (
          <Text style={styles.message}>
            This permanently deletes the organisation along with every employee, department, budget, ticket and
            receipt in it. This cannot be undone. We will email a verification code to {user.email} to confirm.
          </Text>
        ) : (
          <>
            <Text style={styles.message}>
              Enter the 6-digit code sent to {user.email}. The code expires in 10 minutes.
            </Text>
            <OtpInput value={otp} onChange={setOtp} />
            <Pressable onPress={busy ? undefined : sendCode} hitSlop={8} style={styles.resend}>
              <Text style={[styles.resendText, { color: colors.primary }, busy && styles.disabled]}>
                {isSending ? 'Sending…' : 'Resend code'}
              </Text>
            </Pressable>
          </>
        )}

        <InlineError message={error} />

        <View style={styles.actions}>
          <PrimaryButton label="Cancel" variant="secondary" onPress={onClose} disabled={busy} style={styles.action} />
          {step === 'warn' ? (
            <PrimaryButton
              label="Send code"
              variant="danger"
              onPress={sendCode}
              loading={isSending}
              style={styles.action}
            />
          ) : (
            <PrimaryButton
              label="Delete forever"
              variant="danger"
              onPress={confirmDelete}
              disabled={otp.length !== OTP_LENGTH || isSending}
              loading={isDeleting}
              style={styles.action}
            />
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const rowStyles = StyleSheet.create({
  rows: {
    gap: 0,
    paddingVertical: spacing.one,
  },
});

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.35)',
    },
    sheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: spacing.six,
      paddingBottom: spacing.eight,
      gap: spacing.four,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.three,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      flex: 1,
      ...typography.headline,
      color: colors.textPrimary,
    },
    message: {
      ...typography.callout,
      color: colors.textMuted,
    },
    resend: {
      alignSelf: 'center',
    },
    resendText: {
      ...typography.callout,
      fontWeight: '600',
    },
    disabled: {
      opacity: 0.5,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.three,
    },
    action: {
      flex: 1,
    },
  });
