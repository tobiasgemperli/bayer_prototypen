import React, { useEffect, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';
import { FieldLabel, fieldSx } from '../../design-system/FormField';

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

  useEffect(() => {
    if (open) setName('');
  }, [open]);

  const handleConfirm = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
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
          sx={fieldSx}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="text">Cancel</Button>
        <Button onClick={handleConfirm} variant="contained" disabled={!name.trim()}>Add</Button>
      </DialogActions>
    </Dialog>
  );
}
