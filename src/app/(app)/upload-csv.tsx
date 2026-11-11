import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';

import { Card, ListRow } from '@/components/card';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { InlineError } from '@/components/states';
import { SuccessCelebration } from '@/components/success-celebration';
import { type Palette, useThemedStyles } from '@/constants/brand';
import { spacing, typography } from '@/constants/theme';
import { ApiError, errorMessage } from '@/lib/api';
import { employeeApi } from '@/lib/endpoints';

type PickedFile = { uri: string; name: string; mimeType?: string; file?: File };
type RowError = { row: number; email?: string; reason: string };

export default function UploadCsvScreen() {
  const styles = useThemedStyles(makeStyles);
  const [file, setFile] = useState<PickedFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<RowError[]>([]);
  const [insertedCount, setInsertedCount] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel', 'text/plain'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType, file: asset.file });
    setError(null);
    setRowErrors([]);
    setInsertedCount(null);
  };

  const shareTemplate = async () => {
    setIsSharing(true);
    try {
      const csv = await employeeApi.csvTemplate();
      await Share.share({ title: 'employee-upload-template.csv', message: csv });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsSharing(false);
    }
  };

  const upload = async () => {
    if (!file) return;
    setIsUploading(true);
    setError(null);
    setRowErrors([]);
    try {
      const { data } = await employeeApi.uploadCsv(file);
      setInsertedCount(data.insertedCount);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setFile(null);
    } catch (err) {
      setError(errorMessage(err));
      // Per-row problems arrive as details.errors on a 400.
      const details = err instanceof ApiError ? (err.body as { details?: { errors?: RowError[] } })?.details : undefined;
      setRowErrors(details?.errors ?? []);
    } finally {
      setIsUploading(false);
    }
  };

  if (insertedCount !== null) {
    return (
      <SuccessCelebration
        title={`${insertedCount} employee${insertedCount === 1 ? '' : 's'} added`}
        message="Everyone has been emailed a temporary password and can log in right away."
        actions={
          <>
            <PrimaryButton label="Done" icon="checkmark" onPress={() => router.back()} />
            <PrimaryButton
              label="Upload another file"
              variant="secondary"
              icon="cloud-upload-outline"
              onPress={() => setInsertedCount(null)}
            />
          </>
        }
      />
    );
  }

  return (
    <Screen
      title="Upload employees"
      backFallback="/people"
      footer={
        insertedCount !== null ? (
          <PrimaryButton label="Done" onPress={() => router.back()} />
        ) : (
          <PrimaryButton label="Upload" icon="cloud-upload-outline" onPress={upload} disabled={!file} loading={isUploading} />
        )
      }>
      <Text style={styles.hint}>
        Upload a CSV with the columns name, department, email, phoneNumber and designation. Missing departments are created
        automatically, and every new employee is emailed a temporary password.
      </Text>

      <PrimaryButton
        label="Get the CSV template"
        variant="secondary"
        icon="document-text-outline"
        onPress={shareTemplate}
        loading={isSharing}
      />

      <Card>
        <ListRow
          icon="document-attach-outline"
          title={file ? file.name : 'Choose a CSV file'}
          subtitle={file ? 'Tap to choose a different file' : undefined}
          onPress={pickFile}
        />
      </Card>

      {insertedCount !== null && (
        <View style={styles.success}>
          <Text style={styles.successText}>
            {insertedCount} employee{insertedCount === 1 ? '' : 's'} added successfully.
          </Text>
        </View>
      )}

      <InlineError message={error} />
      {rowErrors.length > 0 && (
        <Card>
          {rowErrors.map((rowError, index) => (
            <Text key={index} style={styles.rowError}>
              {rowError.row > 0 ? `Row ${rowError.row}: ` : ''}
              {rowError.reason}
              {rowError.email ? ` (${rowError.email})` : ''}
            </Text>
          ))}
        </Card>
      )}
    </Screen>
  );
}

const makeStyles = (colors: Palette) =>
  StyleSheet.create({
  hint: {
    ...typography.callout,
    color: colors.textMuted,
  },
  success: {
    backgroundColor: '#DCFCE7',
    borderRadius: 10,
    padding: spacing.three,
  },
  successText: {
    color: '#166534',
    fontWeight: '600',
  },
  rowError: {
    ...typography.footnote,
    color: colors.danger,
  },
});
