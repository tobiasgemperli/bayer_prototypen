import React, { useEffect, useState } from 'react';
import {
  Autocomplete, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import { Add, Close as CloseIcon } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { FieldLabel, fieldSx } from '../../design-system/FormField';
import { ApiConnectionChip, NameWithChip } from '../../design-system/Chips';
import {
  COMMODITY_OPTIONS, LABORATORY_OPTIONS, LABS_WITH_API_CONNECTION,
  Commodity, LabSampleData,
} from '../../data/lab-results-data';

const ADD_LAB_ACTION = '__add_lab__';

export interface SampleFormValues {
  sampleName: string;
  dateOfSample: Date | null;
  commodity: Commodity | null;
  comments: string;
  laboratory: string;
}

export interface SampleFormDialogProps {
  open: boolean;
  initial?: Partial<SampleFormValues>;
  title?: string;
  onClose: () => void;
  onCreate: (values: SampleFormValues) => void;

}

export function SampleFormDialog({
  open, initial, title = 'Create sample', onClose, onCreate,
}: SampleFormDialogProps) {
  const [values, setValues] = useState<SampleFormValues>(() => blank(initial));
  const [touched, setTouched] = useState(false);

  // "Add laboratory" mini-dialog state
  const [addLabOpen, setAddLabOpen] = useState(false);
  const [newLabName, setNewLabName] = useState('');
  const [customLabs, setCustomLabs] = useState<string[]>([]);
  const [labDropdownOpen, setLabDropdownOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setValues(blank(initial));
      setTouched(false);
    }
  }, [open, initial]);

  const nameMissing = !values.sampleName.trim();
  const dateMissing = !values.dateOfSample;
  const commodityMissing = !values.commodity;
  const labMissing = !values.laboratory.trim();
  const showErrors = touched;

  const canCreate = !nameMissing && !dateMissing && !commodityMissing && !labMissing;

  const handleCreate = () => { setTouched(true); if (canCreate) onCreate(values); };

  const allLabs = [...LABORATORY_OPTIONS, ...customLabs];

  const handleConfirmNewLab = () => {
    const name = newLabName.trim();
    if (!name) return;
    if (!allLabs.includes(name)) setCustomLabs((prev) => [...prev, name]);
    setValues((v) => ({ ...v, laboratory: name }));
    setAddLabOpen(false);
    setNewLabName('');
  };

  return (
    <>
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{ sx: { borderRadius: '12px', boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.12)' } }}
    >
      <DialogTitle sx={{ m: 0, px: 3, pt: 3, pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" component="div" sx={{ fontWeight: 700, fontSize: '1.25rem', lineHeight: 1.2 }}>
          {title}
        </Typography>
        <IconButton aria-label="close" onClick={onClose} sx={{ color: (t) => t.palette.grey[500], p: 0.5 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pt: 0, pb: 3 }}>
        <Stack spacing={2.5}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <Box>
              <FieldLabel required>Sample name</FieldLabel>
              <TextField
                fullWidth size="small" placeholder="Type here"
                value={values.sampleName}
                onChange={(e) => setValues((v) => ({ ...v, sampleName: e.target.value }))}
                error={showErrors && nameMissing}
                helperText={showErrors && nameMissing ? 'Sample name is required' : undefined}
                sx={fieldSx}
              />
            </Box>
            <Box>
              <FieldLabel required>Sample date</FieldLabel>
              <DatePicker
                value={values.dateOfSample}
                onChange={(d) => setValues((v) => ({ ...v, dateOfSample: d }))}
                format="dd/MM/yyyy"
                slotProps={{
                  textField: {
                    size: 'small', fullWidth: true, placeholder: 'DD/MM/YYYY',
                    error: showErrors && dateMissing,
                    helperText: showErrors && dateMissing ? 'Sample date is required' : undefined,
                    sx: fieldSx,
                  },
                }}
              />
            </Box>
          </Box>

          <Box>
            <FieldLabel required>Commodity</FieldLabel>
            <ToggleButtonGroup
              exclusive
              value={values.commodity}
              onChange={(_, next: Commodity | null) =>
                setValues((v) => ({ ...v, commodity: next ?? v.commodity }))
              }
              aria-label="commodity"
              sx={{
                flexWrap: 'wrap', gap: 1,
                '& .MuiToggleButtonGroup-grouped': {
                  border: '1px solid rgba(0,0,0,0.23)', borderRadius: '8px !important', marginLeft: '0 !important',
                },
                '& .MuiToggleButton-root': {
                  textTransform: 'none', fontWeight: 500, px: 2, height: 36, fontSize: '0.875rem',
                  color: 'text.primary', bgcolor: 'white',
                  '&.Mui-selected': {
                    bgcolor: 'primary.softBg', color: 'primary.main', borderColor: 'primary.main',
                    '&:hover': { bgcolor: 'primary.softBg' },
                  },
                },
              }}
            >
              {COMMODITY_OPTIONS.map((opt) => (
                <ToggleButton key={opt} value={opt}>{opt}</ToggleButton>
              ))}
            </ToggleButtonGroup>
            {showErrors && commodityMissing && (
              <Typography sx={{ mt: 0.5, color: 'error.main', fontSize: '0.75rem' }}>
                Commodity is required
              </Typography>
            )}
          </Box>

          {/* Laboratory */}
          <Box>
            <FieldLabel required>Send sample to</FieldLabel>
            {/* Relative wrapper lets us overlay the name+badge without touching
                the input DOM structure (avoids height drift). */}
            <Box sx={{ position: 'relative' }}>
              <Autocomplete
                size="small"
                options={[...allLabs, ADD_LAB_ACTION]}
                value={values.laboratory || null}
                onOpen={() => setLabDropdownOpen(true)}
                onClose={() => setLabDropdownOpen(false)}
                getOptionLabel={(opt) => opt === ADD_LAB_ACTION ? 'Add laboratory' : opt}
                filterOptions={(options, state) => {
                  const filtered = options.filter(
                    (o) => o !== ADD_LAB_ACTION && o.toLowerCase().includes(state.inputValue.toLowerCase())
                  );
                  filtered.push(ADD_LAB_ACTION);
                  return filtered;
                }}
                onChange={(_, next) => {
                  if (next === ADD_LAB_ACTION) {
                    setNewLabName('');
                    setAddLabOpen(true);
                  } else {
                    setValues((v) => ({ ...v, laboratory: next ?? '' }));
                  }
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
                      <NameWithChip
                        name={option}
                        chip={LABS_WITH_API_CONNECTION.has(option) && <ApiConnectionChip />}
                      />
                    </li>
                  );
                }}
                renderInput={(params) => {
                  const showInline = !labDropdownOpen && !!values.laboratory && LABS_WITH_API_CONNECTION.has(values.laboratory);
                  return (
                    <TextField
                      {...params}
                      placeholder="Choose a laboratory"
                      sx={fieldSx}
                      inputProps={{
                        ...params.inputProps,
                        style: {
                          ...(params.inputProps as any)?.style,
                          ...(showInline ? { color: 'transparent', caretColor: 'transparent' } : {}),
                        },
                      }}
                    />
                  );
                }}
              />
              {/* Name + badge overlay — only in closed state with a connected lab.
                  pointerEvents none so clicks pass through to the Autocomplete. */}
              {!labDropdownOpen && !!values.laboratory && LABS_WITH_API_CONNECTION.has(values.laboratory) && (
                <Box
                  sx={{
                    position: 'absolute', top: 0, bottom: 0, left: '14px', right: '40px',
                    display: 'flex', alignItems: 'center',
                    pointerEvents: 'none',
                  }}
                >
                  <NameWithChip
                    name={values.laboratory}
                    chip={<ApiConnectionChip />}
                    sx={{ fontSize: '0.875rem' }}
                  />
                </Box>
              )}
            </Box>
            {showErrors && labMissing && (
              <Typography sx={{ mt: 0.5, color: 'error.main', fontSize: '0.75rem' }}>
                Laboratory is required
              </Typography>
            )}
          </Box>

          <Box>
            <FieldLabel>Comments/Notes</FieldLabel>
            <TextField
              fullWidth multiline minRows={3} size="small"
              value={values.comments}
              onChange={(e) => setValues((v) => ({ ...v, comments: e.target.value }))}
              sx={fieldSx}
            />
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 1, justifyContent: 'flex-end', gap: 1 }}>
        <Button onClick={onClose} variant="text" color="primary"
          sx={{ textTransform: 'none', fontWeight: 600, px: 2 }}>
          Cancel
        </Button>
        <Button onClick={handleCreate} variant="contained" color="primary"
          sx={{ textTransform: 'none', fontWeight: 600, px: 2, height: 36, borderRadius: '8px' }}>
          Create sample
        </Button>
      </DialogActions>
    </Dialog>

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

function blank(initial?: Partial<SampleFormValues>): SampleFormValues {
  return {
    sampleName: initial?.sampleName ?? '',
    dateOfSample: initial?.dateOfSample ?? null,
    commodity: initial?.commodity ?? null,
    comments: initial?.comments ?? '',
    laboratory: initial?.laboratory ?? '',
  };
}

export function toFormValues(s: LabSampleData): SampleFormValues {
  return {
    sampleName: s.sampleName,
    dateOfSample: s.dateOfSample,
    commodity: s.commodity,
    comments: s.comments,
    laboratory: s.laboratory ?? '',
  };
}
