import React from 'react';
import { EntityAutocomplete } from '../design-system/EntityAutocomplete';
import { ApiConnectionChip, NameWithChip } from '../design-system/Chips';
import { LABS_WITH_API_CONNECTION } from '../data/lab-results-data';

export interface LabAutocompleteProps {
  value: string;
  options: string[];
  onChange: (next: string) => void;
  onAddLab: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

/** Laboratory picker — Autocomplete with a trailing "Add laboratory" action
 *  and an inline API-connection badge for the selected value. Single source
 *  for this pattern: used by the sample-creation flow and per-report rows.
 *  Built on the shared `EntityAutocomplete` (design-system) — the closed-state
 *  overlay and trailing-action mechanics live there, not here. */
export function LabAutocomplete({
  value, options, onChange, onAddLab, placeholder = 'Select a laboratory', autoFocus,
}: LabAutocompleteProps) {
  return (
    <EntityAutocomplete
      value={value}
      onChange={onChange}
      options={options.map((name) => ({ id: name, label: name }))}
      placeholder={placeholder}
      autoFocus={autoFocus}
      trailingAction={{ label: 'Add laboratory', onClick: onAddLab }}
      renderOptionContent={(option) => (
        <NameWithChip name={option.label} chip={LABS_WITH_API_CONNECTION.has(option.label) && <ApiConnectionChip condensed />} />
      )}
      renderClosedOverlay={(selected) => {
        const lab = selected[0];
        if (!lab || !LABS_WITH_API_CONNECTION.has(lab.label)) return null;
        return <NameWithChip name={lab.label} chip={<ApiConnectionChip condensed />} sx={{ fontSize: '0.875rem' }} />;
      }}
    />
  );
}
