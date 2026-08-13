import React, { useEffect, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';
import { FieldLabel, fieldSx } from '../design-system/FormField';

export interface AddLaboratoryDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (name: string) => void;
}

/** Quick-create mini dialog for a custom laboratory name, opened from the
 *  "Add laboratory" option inside LabAutocomplete. Single source — used by
 *  the sample-creation flow and per-report rows. */
export function AddLaboratoryDialog({ open, onClose, onConfirm }: AddLaboratoryDialogProps) {
  const [name, setName] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) { setName(''); setTouched(false); }
  }, [open]);

  const nameMissing = !name.trim();

  const handleConfirm = () => {
    setTouched(true);
    if (nameMissing) return;
    onConfirm(name.trim());
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '12px' } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>Add laboratory</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <FieldLabel>Laboratory name</FieldLabel>
        <TextField
          autoFocus fullWidth size="small" placeholder="e.g. Eurofins AG"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm(); }}
          error={touched && nameMissing}
          helperText={touched && nameMissing ? 'Laboratory name is required' : undefined}
          sx={fieldSx}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, pt: 2, gap: 1, justifyContent: 'flex-end' }}>
        <Button onClick={onClose} variant="text" color="inherit"
          sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'none', px: 2, height: 36 }}>
          Cancel
        </Button>
        <Button onClick={handleConfirm} variant="contained" color="primary"
          sx={{ fontWeight: 600, textTransform: 'none', px: 2, height: 36, borderRadius: '8px' }}>
          Add
        </Button>
      </DialogActions>
    </Dialog>
  );
}
