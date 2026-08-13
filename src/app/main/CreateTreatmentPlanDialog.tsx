import React, { useEffect, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';
import { FieldLabel, fieldSx } from '../design-system/FormField';

export interface CreateTreatmentPlanDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (name: string) => void;
}

/** Quick-create mini dialog for a new simulated treatment plan, opened from
 *  the "Create new treatment plan" option inside the per-plot Treatment plan
 *  selector. Same shell/behavior as AddLaboratoryDialog — type a name,
 *  confirm, the caller adds and selects it. */
export function CreateTreatmentPlanDialog({ open, onClose, onConfirm }: CreateTreatmentPlanDialogProps) {
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
      <DialogTitle sx={{ fontWeight: 700 }}>Create new treatment plan</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <FieldLabel>Plan name</FieldLabel>
        <TextField
          autoFocus fullWidth size="small" placeholder="e.g. Low-residue alternative"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm(); }}
          error={touched && nameMissing}
          helperText={touched && nameMissing ? 'Plan name is required' : undefined}
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
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}
