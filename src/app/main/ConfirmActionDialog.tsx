import React from 'react';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Typography,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

export interface ConfirmActionDialogProps {
  open: boolean;
  title: string;
  body: React.ReactNode;
  /** Closes with no side effect — always wired to the X icon and to the
   *  secondary button when `onSecondary` is not provided. */
  onClose: () => void;
  secondaryLabel?: string;
  /** Optional side effect for the secondary button (e.g. "Save without
   *  them"). Omit for a plain dismiss — the secondary button then behaves
   *  like a Cancel. Always followed by onClose. */
  onSecondary?: () => void;
  primaryLabel?: string;
  /** 'error' for a destructive action (e.g. delete), 'primary' for a
   *  constructive one (e.g. fixing a gap before saving). */
  primaryColor?: 'error' | 'primary';
  onPrimary: () => void;
}

/** Generic two-path confirmation dialog — same shell as this folder's other
 *  popups (AddLaboratoryDialog, AddReportDialog). Covers both a plain
 *  destructive confirm (secondary defaults to Cancel, primary color="error";
 *  see the delete-sample flow in LabManagementContent) and a plain
 *  constructive confirm (secondary stays Cancel, primary color="primary",
 *  e.g. "Add results" — see the missing-analytes confirm in
 *  AddResultsDialog/AddReportAndResultsDialog). `onSecondary` remains
 *  available for a genuine dual-path choice where the secondary button also
 *  performs a real action instead of a plain dismiss. */
export function ConfirmActionDialog({
  open, title, body, onClose,
  secondaryLabel = 'Cancel', onSecondary,
  primaryLabel = 'Confirm', primaryColor = 'primary', onPrimary,
}: ConfirmActionDialogProps) {
  const handleSecondary = () => {
    onSecondary?.();
    onClose();
  };
  const handlePrimary = () => {
    onPrimary();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: '12px', boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.12)' } }}>
      <DialogTitle sx={{ m: 0, px: 3, pt: 3, pb: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.125rem' }}>
          {title}
        </Typography>
        <IconButton onClick={onClose} sx={{ color: 'text.secondary', p: 0.5 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ px: 3, pt: 1, pb: 1 }}>
        <Typography variant="body2" color="text.secondary">
          {body}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, pt: 2, gap: 1, justifyContent: 'flex-end' }}>
        <Button onClick={handleSecondary} variant="text" color="inherit"
          sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'none', px: 2, height: 36 }}>
          {secondaryLabel}
        </Button>
        <Button onClick={handlePrimary} variant="contained" color={primaryColor}
          sx={{ fontWeight: 600, textTransform: 'none', px: 2, height: 36, borderRadius: '8px' }}>
          {primaryLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
