import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';

import { Card } from '@/components/card';
import { DesignationField } from '@/components/designation-field';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { ErrorState, InlineError, LoadingState } from '@/components/states';
import { TextField } from '@/components/text-field';
import { useToast } from '@/components/toast';
import { useApi } from '@/hooks/use-api';
import { errorMessage } from '@/lib/api';
import { employeeApi } from '@/lib/endpoints';
import type { EmployeeDetails } from '@/lib/types';

// Managers edit people in their own department. The backend requires name and
// designation to be at least 3 characters.
export default function EditEmployeeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const employee = useApi(() => employeeApi.details(id).then((r) => r.data), [id]);

  if (employee.isLoading && !employee.data) {
    return (
      <Screen title="Edit details" backFallback="/people">
        <LoadingState variant="detail" />
      </Screen>
    );
  }
  if (!employee.data) {
    return (
      <Screen title="Edit details" backFallback="/people">
        <ErrorState message={employee.error ?? 'Employee not found.'} onRetry={employee.reload} />
      </Screen>
    );
  }
  // Mounted once the data is in, so the form starts from the saved values.
  return <EditForm employee={employee.data} />;
}

function EditForm({ employee }: { employee: EmployeeDetails }) {
  const toast = useToast();
  const [name, setName] = useState(employee.name);
  const [designation, setDesignation] = useState(employee.designation ?? '');
  const [phoneNumber, setPhoneNumber] = useState(employee.phoneNumber ?? '');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const changed =
    name.trim() !== employee.name ||
    designation.trim() !== (employee.designation ?? '') ||
    phoneNumber.trim() !== (employee.phoneNumber ?? '');
  const canSave = name.trim().length >= 3 && designation.trim().length >= 3 && changed && !isSaving;

  const save = async () => {
    if (!canSave) return;
    setIsSaving(true);
    setError(null);
    try {
      await employeeApi.editAsManager(employee.id, {
        name: name.trim(),
        designation: designation.trim(),
        phoneNumber: phoneNumber.trim(),
      });
      toast.show({ title: 'Details saved', message: `${name.trim()}'s profile is up to date.` });
      router.back();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Screen
      title="Edit details"
      subtitle={employee.name}
      backFallback="/people"
      footer={<PrimaryButton label="Save changes" icon="checkmark" onPress={save} disabled={!canSave} loading={isSaving} />}>
      <Card>
        <TextField label="Full name" icon="person-outline" value={name} onChangeText={setName} autoCapitalize="words" />
        <DesignationField value={designation} onChange={setDesignation} />
        <TextField
          label="Phone number (optional)"
          icon="call-outline"
          keyboardType="phone-pad"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
        />
      </Card>
      <InlineError message={error} />
    </Screen>
  );
}
