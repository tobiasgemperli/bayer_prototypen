import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, TextField, Stack, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
  ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import {
  Close as CloseIcon, CheckCircle, Download,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Commodity, COMMODITY_OPTIONS } from '../../data/lab-results-data';
import { fieldSx, FieldLabel } from '../../design-system/FormField';

export interface NewSampleInput {
  name: string;
  type: Commodity | null;
  date: Date | null;
}

/** MUI ToggleButtonGroup — canonical single-select for a small fixed set. */
function SampleTypeCards({ value, onChange }: { value: Commodity | null; onChange: (c: Commodity) => void }) {
  return (
    <ToggleButtonGroup
      exclusive
      value={value}
      onChange={(_, v) => { if (v) onChange(v as Commodity); }}
      aria-label="Sample type"
      sx={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 1,
        '& .MuiToggleButtonGroup-grouped': {
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '8px !important',
          marginLeft: '0 !important',
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '0.875rem',
          color: 'text.primary',
          py: 1.25,
          '&.Mui-selected': {
            bgcolor: 'rgba(212,24,61,0.05)',
            borderColor: 'primary.main',
            color: 'primary.main',
            fontWeight: 600,
            '&:hover': { bgcolor: 'rgba(212,24,61,0.08)' },
          },
        },
      }}
    >
      {COMMODITY_OPTIONS.map((opt) => (
        <ToggleButton key={opt} value={opt} aria-label={opt}>
          {opt}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

/** Lightweight sample creation — only the traceability essentials. Shared by the
 *  Sample-reports tab (sample-first) and the lab-report page (report-first). */
export function CreateSampleDialog({
  open, onClose, onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (s: NewSampleInput) => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<Commodity | null>(null);
  const [date, setDate] = useState<Date | null>(new Date());

  useEffect(() => { if (open) { setName(''); setType(null); setDate(new Date()); } }, [open]);

  const valid = !!name.trim() && !!type && !!date;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '12px' } }}>
      <DialogTitle sx={{ px: 3, pt: 3, pb: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>New sample</Typography>
        <IconButton onClick={onClose} sx={{ color: 'text.secondary', p: 0.5 }}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ px: 3, pt: 1, pb: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Just the essentials. You can add the rest later.
        </Typography>
        <Stack spacing={2}>
          <Box>
            <FieldLabel required>Sample name</FieldLabel>
            <TextField fullWidth size="small" placeholder="Type here" value={name}
              onChange={(e) => setName(e.target.value)} sx={fieldSx} />
          </Box>
          <Box>
            <FieldLabel required>Sample type</FieldLabel>
            <SampleTypeCards value={type} onChange={setType} />
          </Box>
          <Box>
            <FieldLabel required>Sample date</FieldLabel>
            <DatePicker value={date} onChange={setDate} format="dd/MM/yyyy"
              slotProps={{ textField: { size: 'small', fullWidth: true, placeholder: 'DD/MM/YYYY', sx: fieldSx } }} />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, pt: 1, gap: 1 }}>
        <Button variant="text" color="inherit" onClick={onClose}
          sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'none' }}>Cancel</Button>
        <Button variant="contained" color="primary" disabled={!valid}
          onClick={() => onCreate({ name, type, date })}
          sx={{ fontWeight: 600, textTransform: 'none', px: 3 }}>Create sample</Button>
      </DialogActions>
    </Dialog>
  );
}

/** Create-new-laboratory popup — for the Laboratory select-or-create field. */
export function CreateLaboratoryDialog({
  open, name, onNameChange, onCancel, onSave,
}: {
  open: boolean;
  name: string;
  onNameChange: (n: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '12px' } }}>
      <DialogTitle sx={{ px: 3, pt: 3, pb: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>New laboratory</Typography>
        <IconButton onClick={onCancel} sx={{ color: 'text.secondary', p: 0.5 }}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent sx={{ px: 3, pt: 1, pb: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Enter the laboratory name as it appears on their reports.
        </Typography>
        <TextField fullWidth size="small" placeholder="e.g. Wessling Laboratories" autoFocus value={name}
          onChange={(e) => onNameChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) onSave(); }} sx={fieldSx} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, pt: 1, gap: 1 }}>
        <Button variant="text" color="inherit" onClick={onCancel}
          sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'none' }}>Cancel</Button>
        <Button variant="contained" color="primary" disabled={!name.trim()} onClick={onSave}
          sx={{ fontWeight: 600, textTransform: 'none', px: 3 }}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}

/** Shown only on the sample-first path: prompt to print the sheet and send it. */
export function SampleSuccessModal({
  open, onClose, onDownload, sampleCode,
}: {
  open: boolean;
  onClose: () => void;
  onDownload: () => void;
  sampleCode?: string;
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '12px' } }}>
      <DialogContent sx={{ px: 3, pt: 3, pb: 1, textAlign: 'center' }}>
        <CheckCircle sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>Sample registered</Typography>
        <Typography variant="body2" color="text.secondary">
          Print the sample sheet and send it with your sample. When results arrive, add a lab report. It links back automatically.
        </Typography>
        {sampleCode && (
          <Box sx={{ mt: 2, py: 1, px: 2, borderRadius: '8px', bgcolor: 'action.hover', display: 'inline-block' }}>
            <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>Sample code</Typography>
            <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1rem' }}>{sampleCode}</Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, pt: 1, justifyContent: 'center', gap: 1 }}>
        <Button variant="text" color="inherit" onClick={onClose}
          sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'none' }}>Close</Button>
        <Button variant="contained" color="primary" startIcon={<Download />} onClick={onDownload}
          sx={{ fontWeight: 600, textTransform: 'none', px: 3 }}>Download sample sheet</Button>
      </DialogActions>
    </Dialog>
  );
}
