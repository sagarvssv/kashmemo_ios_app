import React, { useState } from 'react';
import { View } from 'react-native';

import { SelectField } from '@/components/select-field';
import { TextField } from '@/components/text-field';

// Common designations; anything else is typed in via "Other".
export const DESIGNATIONS = ['Manager', 'Employee', 'Finance Manager', 'General Manager'] as const;
const OTHER = '__other__';

type DesignationFieldProps = {
  // The designation text itself (what the backend stores).
  value: string;
  onChange: (designation: string) => void;
  label?: string;
};

// Dropdown of standard designations with an "Other" option that reveals a
// text box. Existing values that aren't in the list open as "Other".
export function DesignationField({ value, onChange, label = 'Designation' }: DesignationFieldProps) {
  const isStandard = (DESIGNATIONS as readonly string[]).includes(value);
  const [choice, setChoice] = useState<string | null>(() => (isStandard ? value : value ? OTHER : null));

  return (
    <View style={{ gap: 12 }}>
      <SelectField
        label={label}
        placeholder="Choose a designation"
        value={choice}
        onChange={(next) => {
          setChoice(next);
          // Picking a standard option sets it; "Other" starts from an empty box.
          onChange(next === OTHER ? '' : next);
        }}
        options={[
          ...DESIGNATIONS.map((designation) => ({ value: designation, label: designation })),
          { value: OTHER, label: 'Other', description: 'Type a different designation' },
        ]}
      />
      {choice === OTHER && (
        <TextField
          label="Designation (type)"
          icon="briefcase-outline"
          placeholder="e.g. Sales Executive"
          autoCapitalize="words"
          value={value}
          onChangeText={onChange}
          autoFocus
        />
      )}
    </View>
  );
}
