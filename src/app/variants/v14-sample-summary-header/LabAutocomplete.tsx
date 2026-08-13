import React, { useState } from 'react';
import { Autocomplete, Box, TextField, Typography } from '@mui/material';
import { Add } from '@mui/icons-material';
import { fieldSx } from '../../design-system/FormField';
import { ApiConnectionChip, NameWithChip } from '../../design-system/Chips';
import { LABS_WITH_API_CONNECTION } from '../../data/lab-results-data';

const ADD_LAB_ACTION = '__add_lab__';

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
 *  for this pattern: used by the sample-creation flow and per-report rows. */
export function LabAutocomplete({
  value, options, onChange, onAddLab, placeholder = 'Choose a laboratory', autoFocus,
}: LabAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const showInline = !open && !!value && LABS_WITH_API_CONNECTION.has(value);

  return (
    <Box sx={{ position: 'relative' }}>
      <Autocomplete
        size="small"
        options={[...options, ADD_LAB_ACTION]}
        value={value || null}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        getOptionLabel={(opt) => (opt === ADD_LAB_ACTION ? 'Add laboratory' : opt)}
        filterOptions={(opts, state) => {
          const filtered = opts.filter(
            (o) => o !== ADD_LAB_ACTION && o.toLowerCase().includes(state.inputValue.toLowerCase())
          );
          filtered.push(ADD_LAB_ACTION);
          return filtered;
        }}
        onChange={(_, next) => {
          if (next === ADD_LAB_ACTION) onAddLab();
          else onChange(next ?? '');
        }}
        renderOption={(props, option) => {
          const { key, ...rest } = props as any;
          if (option === ADD_LAB_ACTION) {
            return (
              <li key={key} {...rest} style={{ ...rest.style, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Add sx={{ fontSize: 20, color: 'primary.main' }} />
                <Typography sx={{ color: 'primary.main', fontWeight: 600, fontSize: '0.875rem' }}>Add laboratory</Typography>
              </li>
            );
          }
          return (
            <li key={key} {...rest} style={{ ...rest.style, display: 'flex', alignItems: 'center', gap: 8 }}>
              <NameWithChip name={option} chip={LABS_WITH_API_CONNECTION.has(option) && <ApiConnectionChip condensed />} />
            </li>
          );
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            autoFocus={autoFocus}
            placeholder={placeholder}
            sx={fieldSx}
            inputProps={{
              ...params.inputProps,
              style: {
                ...(params.inputProps as any)?.style,
                ...(showInline ? { color: 'transparent', caretColor: 'transparent' } : {}),
              },
            }}
          />
        )}
      />
      {/* Name + badge overlay — only in closed state with a connected lab.
          pointerEvents none so clicks pass through to the Autocomplete. */}
      {showInline && (
        <Box
          sx={{
            position: 'absolute', top: 0, bottom: 0, left: '14px', right: '40px',
            display: 'flex', alignItems: 'center',
            pointerEvents: 'none',
          }}
        >
          <NameWithChip name={value} chip={<ApiConnectionChip condensed />} sx={{ fontSize: '0.875rem' }} />
        </Box>
      )}
    </Box>
  );
}
