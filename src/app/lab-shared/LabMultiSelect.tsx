import React, { useState } from 'react';
import {
  Autocomplete, Box, Button, Checkbox, Dialog, DialogActions, DialogContent,
  DialogTitle, TextField, Typography,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { fieldSx, FieldLabel } from '../design-system/FormField';
import { ApiConnectionChip, NameWithChip } from '../design-system/Chips';
import { LABORATORY_OPTIONS, LABS_WITH_API_CONNECTION } from '../data/lab-results-data';

const ADD_LAB_ACTION = '__add_lab__';

export interface LabMultiSelectProps {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  error?: boolean;
}

/**
 * Multi-select laboratory picker — "Send sample to" (a sample can now be
 * sent to more than one lab). Same trigger contract as a single-select
 * combobox:
 *   Closed → truncating summary: placeholder / lab name (+ connection chip)
 *            when exactly one is picked / "N selected" for more than one.
 *   Open   → search input + checkbox rows. Stays open across picks
 *            (disableCloseOnSelect) so checking several labs doesn't
 *            require re-opening the popup each time.
 *
 * Includes the "+ Add laboratory" row + its create mini-dialog, same as the
 * single-select field it replaces. One source here — v10 and v11's
 * SampleFormDialog + SampleReportPage all import this instead of
 * reimplementing the Autocomplete.
 */
export function LabMultiSelect({ value, onChange, placeholder = 'Choose a laboratory', error }: LabMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [customLabs, setCustomLabs] = useState<string[]>([]);
  const [addLabOpen, setAddLabOpen] = useState(false);
  const [newLabName, setNewLabName] = useState('');

  const allLabs = [...LABORATORY_OPTIONS, ...customLabs];

  const handleConfirmNewLab = () => {
    const name = newLabName.trim();
    if (!name) return;
    if (!allLabs.includes(name)) setCustomLabs((prev) => [...prev, name]);
    if (!value.includes(name)) onChange([...value, name]);
    setAddLabOpen(false);
    setNewLabName('');
  };

  return (
    <>
      <Box sx={{ position: 'relative' }}>
        <Autocomplete
          multiple
          disableCloseOnSelect
          size="small"
          open={open}
          onOpen={() => setOpen(true)}
          onClose={() => setOpen(false)}
          options={[...allLabs, ADD_LAB_ACTION]}
          value={value}
          isOptionEqualToValue={(a, b) => a === b}
          getOptionLabel={(opt) => (opt === ADD_LAB_ACTION ? 'Add laboratory' : opt)}
          filterOptions={(options, state) => {
            const filtered = options.filter(
              (o) => o !== ADD_LAB_ACTION && o.toLowerCase().includes(state.inputValue.toLowerCase())
            );
            filtered.push(ADD_LAB_ACTION);
            return filtered;
          }}
          onChange={(_, next) => {
            if (next.includes(ADD_LAB_ACTION)) {
              setNewLabName('');
              setAddLabOpen(true);
              onChange(next.filter((o) => o !== ADD_LAB_ACTION));
              return;
            }
            onChange(next);
          }}
          renderTags={() => null}
          renderOption={(props, option, { selected }) => {
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
                <Checkbox checked={selected} size="small" tabIndex={-1} sx={{ p: 0 }} />
                <NameWithChip
                  name={option}
                  chip={LABS_WITH_API_CONNECTION.has(option) && <ApiConnectionChip />}
                />
              </li>
            );
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder={value.length === 0 ? placeholder : ''}
              error={error}
              sx={fieldSx}
              inputProps={{
                ...params.inputProps,
                style: {
                  ...(params.inputProps as any)?.style,
                  ...(!open ? { color: 'transparent', caretColor: 'transparent' } : {}),
                },
              }}
            />
          )}
        />
        {/* Summary overlay — only in closed state. pointerEvents none so
            clicks pass through to the Autocomplete. */}
        {!open && (
          <Box sx={{
            position: 'absolute', top: 0, bottom: 0, left: '14px', right: '40px',
            display: 'flex', alignItems: 'center', pointerEvents: 'none',
          }}>
            <LabSelectionSummary value={value} placeholder={placeholder} />
          </Box>
        )}
      </Box>

      {/* "Add laboratory" mini dialog */}
      <Dialog
        open={addLabOpen}
        onClose={() => setAddLabOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '12px' } }}
      >
        <DialogTitle>Add laboratory</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <FieldLabel>Laboratory name</FieldLabel>
          <TextField
            autoFocus fullWidth size="small" placeholder="e.g. Eurofins AG"
            value={newLabName}
            onChange={(e) => setNewLabName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmNewLab(); }}
            sx={fieldSx}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAddLabOpen(false)} variant="text">Cancel</Button>
          <Button onClick={handleConfirmNewLab} variant="contained" disabled={!newLabName.trim()}>Add</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function LabSelectionSummary({ value, placeholder }: { value: string[]; placeholder: string }) {
  if (value.length === 0) {
    return <Box component="span" sx={{ fontSize: '0.875rem', color: 'text.disabled' }}>{placeholder}</Box>;
  }
  if (value.length === 1) {
    const lab = value[0];
    return (
      <NameWithChip
        name={lab}
        chip={LABS_WITH_API_CONNECTION.has(lab) && <ApiConnectionChip />}
        sx={{ fontSize: '0.875rem' }}
      />
    );
  }
  return (
    <Box component="span" sx={{ fontSize: '0.875rem', color: 'text.primary' }}>
      {value.length} selected
    </Box>
  );
}
