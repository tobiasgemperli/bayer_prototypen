import React, { useEffect, useState } from 'react';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { FieldLabel, fieldSx } from '../../design-system/FormField';
import { LabMultiSelect } from '../../lab-shared/LabMultiSelect';
import { COMMODITY_OPTIONS, Commodity, LabSampleData } from '../../data/lab-results-data';

export interface SampleFormValues {
  sampleName: string;
  dateOfSample: Date | null;
  commodity: Commodity | null;
  comments: string;
  laboratories: string[];
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

  useEffect(() => {
    if (open) {
      setValues(blank(initial));
      setTouched(false);
    }
  }, [open, initial]);

  const nameMissing = !values.sampleName.trim();
  const dateMissing = !values.dateOfSample;
  const commodityMissing = !values.commodity;
  const labMissing = values.laboratories.length === 0;
  const showErrors = touched;

  const canCreate = !nameMissing && !dateMissing && !commodityMissing && !labMissing;

  const handleCreate = () => { setTouched(true); if (canCreate) onCreate(values); };

  return (
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
            <LabMultiSelect
              value={values.laboratories}
              onChange={(labs) => setValues((v) => ({ ...v, laboratories: labs }))}
              error={showErrors && labMissing}
            />
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
  );
}

function blank(initial?: Partial<SampleFormValues>): SampleFormValues {
  return {
    sampleName: initial?.sampleName ?? '',
    dateOfSample: initial?.dateOfSample ?? null,
    commodity: initial?.commodity ?? null,
    comments: initial?.comments ?? '',
    laboratories: initial?.laboratories ?? [],
  };
}

export function toFormValues(s: LabSampleData): SampleFormValues {
  return {
    sampleName: s.sampleName,
    dateOfSample: s.dateOfSample,
    commodity: s.commodity,
    comments: s.comments,
    laboratories: s.laboratories ?? (s.laboratory ? [s.laboratory] : []),
  };
}
