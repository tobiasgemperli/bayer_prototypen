import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  Button
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

interface BaseDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  cancelLabel?: string;
  confirmLabel?: string;
  confirmIcon?: React.ReactNode;
  onConfirm?: () => void;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** Override the default 24px inner padding applied to title, content, and footer. */
  padding?: number | string;
}

export function BaseDialog({
  open,
  onClose,
  title,
  children,
  cancelLabel = 'Cancel',
  confirmLabel = 'Confirm',
  confirmIcon,
  onConfirm,
  maxWidth = 'sm',
  padding,
}: BaseDialogProps) {
  const px = padding ?? 3;           // default 24px (MUI spacing 3)
  const pxVal = typeof px === 'number' ? px : undefined;
  const pxStr = typeof px === 'string' ? px : undefined;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={maxWidth}
      PaperProps={{
        sx: {
          borderRadius: '12px',
          boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.12)'
        }
      }}
    >
      <DialogTitle sx={{
        m: 0,
        px: pxStr ?? pxVal,
        pt: pxStr ?? pxVal,
        pb: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Typography
          variant="h6"
          component="div"
          sx={{
            fontWeight: 700,
            fontSize: '1.25rem',
            lineHeight: 1.2
          }}
        >
          {title}
        </Typography>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            color: (theme) => theme.palette.grey[500],
            p: 0.5
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: pxStr ?? pxVal, pt: 0, pb: pxStr ?? pxVal }}>
        {children}
      </DialogContent>

      <DialogActions sx={{ px: pxStr ?? pxVal, pb: pxStr ?? pxVal, pt: 1, justifyContent: 'flex-end', gap: 1.5 }}>
        <Button 
          onClick={onClose} 
          variant="text"
          color="inherit" 
          sx={{ 
            fontWeight: 600, 
            color: 'text.secondary',
            textTransform: 'none'
          }}
        >
          {cancelLabel}
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color="primary"
          endIcon={confirmIcon}
          sx={{
            fontWeight: 600,
            px: 3,
            textTransform: 'none'
          }}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
