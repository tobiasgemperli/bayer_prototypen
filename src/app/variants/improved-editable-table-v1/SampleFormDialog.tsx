import React, { useEffect, useState } from 'react';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  IconButton, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { FieldLabel, fieldSx } from '../../design-system/FormField';
import {
  COMMODITY_OPTIONS, LABORATORY_OPTIONS,
  Commodity, LabSampleData,
} from '../../data/lab-results-data';
import { LabAutocomplete } from './LabAutocomplete';
import { AddLaboratoryDialog } from './AddLaboratoryDialog';

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
  open, initial, title = 'Add a sample', onClose, onCreate,
}: SampleFormDialogProps) {
  const isEdit = title.toLowerCase().includes('edit');

  const [values, setValues] = useState<SampleFormValues>(() => blank(initial));
  const [touched, setTouched] = useState(false);
  const [activeStep, setActiveStep] = useState(0); // create mode only: 0=Sample details, 1=Laboratory

  // "Add laboratory" mini-dialog state
  const [addLabOpen, setAddLabOpen] = useState(false);
  const [customLabs, setCustomLabs] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setValues(blank(initial));
      setTouched(false);
      setActiveStep(0);
    }
  }, [open, initial]);

  const nameMissing = !values.sampleName.trim();
  const dateMissing = !values.dateOfSample;
  const commodityMissing = !values.commodity;
  const labMissing = !values.laboratory.trim();
  const showErrors = touched;

  const canContinueStep0 = !nameMissing && !dateMissing && !commodityMissing;
  // Edit mode never shows the Laboratory field (that's owned by reports, not
  // sample details), so it never gates the edit Save button — only the
  // create flow's Laboratory step requires it.
  const canSave = canContinueStep0 && !labMissing;

  const handleContinue = () => {
    setTouched(true);
    if (canContinueStep0) { setActiveStep(1); setTouched(false); }
  };
  const handleSave = () => { setTouched(true); if (canSave) onCreate(values); };
  const handleSaveEdit = () => { setTouched(true); if (canContinueStep0) onCreate(values); };

  const allLabs = [...LABORATORY_OPTIONS, ...customLabs];

  const handleConfirmNewLab = (name: string) => {
    if (!allLabs.includes(name)) setCustomLabs((prev) => [...prev, name]);
    setValues((v) => ({ ...v, laboratory: name }));
    setAddLabOpen(false);
  };

  const detailsFields = (
    <>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
        <Box>
          <FieldLabel required>Sample name</FieldLabel>
          <TextField
            fullWidth size="small" placeholder="Sample name"
            value={values.sampleName}
            onChange={(e) => setValues((v) => ({ ...v, sampleName: e.target.value }))}
            error={showErrors && nameMissing}
            helperText={showErrors && nameMissing ? 'Sample name is required' : undefined}
            sx={fieldSx}
          />
        </Box>
        <Box>
          <FieldLabel required>{isEdit ? 'Collection date' : 'Sample date'}</FieldLabel>
          <DatePicker
            value={values.dateOfSample}
            onChange={(d) => setValues((v) => ({ ...v, dateOfSample: d }))}
            format="dd/MM/yyyy"
            slotProps={{
              textField: {
                size: 'small', fullWidth: true, placeholder: 'DD/MM/YYYY',
                error: showErrors && dateMissing,
                helperText: showErrors && dateMissing ? `${isEdit ? 'Collection date' : 'Sample date'} is required` : undefined,
                sx: fieldSx,
              },
            }}
          />
        </Box>
      </Box>

      <Box>
        <FieldLabel required>{isEdit ? 'Sample type' : 'Commodity'}</FieldLabel>
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
            {isEdit ? 'Sample type' : 'Commodity'} is required
          </Typography>
        )}
      </Box>

      <Box>
        <FieldLabel optional>Notes</FieldLabel>
        <TextField
          fullWidth multiline minRows={3} size="small"
          placeholder="Add anything else about this sample"
          value={values.comments}
          onChange={(e) => setValues((v) => ({ ...v, comments: e.target.value }))}
          sx={fieldSx}
        />
      </Box>
    </>
  );

  const laboratoryField = (
    <Box>
      <FieldLabel required>Laboratory</FieldLabel>
      <LabAutocomplete
        autoFocus={!isEdit}
        value={values.laboratory}
        options={allLabs}
        onChange={(next) => setValues((v) => ({ ...v, laboratory: next }))}
        onAddLab={() => setAddLabOpen(true)}
      />
      {showErrors && labMissing && (
        <Typography sx={{ mt: 0.5, color: 'error.main', fontSize: '0.75rem' }}>
          Laboratory is required
        </Typography>
      )}
    </Box>
  );

  return (
    <>
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{ sx: { borderRadius: '12px', boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.12)' } }}
    >
      <DialogTitle sx={{ m: 0, px: 3, pt: 3, pb: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" component="div" sx={{ fontWeight: 700, fontSize: '1.25rem', lineHeight: 1.2 }}>
          {isEdit || activeStep === 0 ? title : 'Choose a laboratory'}
        </Typography>
        <IconButton aria-label="close" onClick={onClose} sx={{ color: (t) => t.palette.grey[500], p: 0.5 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {isEdit ? (
        <>
          <DialogContent sx={{ px: 3, pt: 1, pb: 3 }}>
            <Stack spacing={2.5}>
              <Typography variant="body2" color="text.secondary">
                Update the sample details.
              </Typography>
              {detailsFields}
            </Stack>
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 3, pt: 1, justifyContent: 'flex-end', gap: 1 }}>
            <Button onClick={onClose} variant="text" color="primary"
              sx={{ textTransform: 'none', fontWeight: 600, px: 2, height: 36 }}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} variant="contained" color="primary"
              sx={{ textTransform: 'none', fontWeight: 600, px: 2, height: 36, borderRadius: '8px' }}>
              Save
            </Button>
          </DialogActions>
        </>
      ) : (
        <>
          {activeStep === 0 && (
            <>
              <DialogContent sx={{ px: 3, pt: 1, pb: 3 }}>
                <Stack spacing={2.5}>
                  <Typography variant="body2" color="text.secondary">
                    Enter the sample details. If you need to send the sample to a lab, ResiYou prepares a sample sheet with these details.
                  </Typography>
                  {detailsFields}
                </Stack>
              </DialogContent>

              <DialogActions sx={{ px: 3, pb: 3, pt: 1, justifyContent: 'flex-end', gap: 1 }}>
                <Button onClick={onClose} variant="text" color="primary"
                  sx={{ textTransform: 'none', fontWeight: 600, px: 2, height: 36 }}>
                  Cancel
                </Button>
                <Button onClick={handleContinue} variant="contained" color="primary"
                  sx={{ textTransform: 'none', fontWeight: 600, px: 2, height: 36, borderRadius: '8px' }}>
                  Continue
                </Button>
              </DialogActions>
            </>
          )}

          {activeStep === 1 && (
            <>
              <DialogContent sx={{ px: 3, pt: 1, pb: 3 }}>
                <Stack spacing={2.5}>
                  <Typography variant="body2" color="text.secondary">
                    Choose where you are sending the sample so ResiYou can prepare the sample sheet. If you already have a report, select the laboratory that analyzed the sample.
                  </Typography>
                  {laboratoryField}
                </Stack>
              </DialogContent>

              <DialogActions sx={{ px: 3, pb: 3, pt: 1, justifyContent: 'flex-end', gap: 1 }}>
                <Button onClick={onClose} variant="text" color="primary"
                  sx={{ textTransform: 'none', fontWeight: 600, px: 2, height: 36 }}>
                  Cancel
                </Button>
                <Button onClick={handleSave} variant="contained" color="primary"
                  sx={{ textTransform: 'none', fontWeight: 600, px: 2, height: 36, borderRadius: '8px' }}>
                  Add sample
                </Button>
              </DialogActions>
            </>
          )}
        </>
      )}
    </Dialog>

    <AddLaboratoryDialog
      open={addLabOpen}
      onClose={() => setAddLabOpen(false)}
      onConfirm={handleConfirmNewLab}
    />
    </>
  );
}

function blank(initial?: Partial<SampleFormValues>): SampleFormValues {
  return {
    sampleName: initial?.sampleName ?? '',
    dateOfSample: initial?.dateOfSample ?? new Date(),
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
