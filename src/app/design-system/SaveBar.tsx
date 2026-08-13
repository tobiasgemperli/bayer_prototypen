import React from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';

/**
 * Contextual save bar — shown only while a table has unsaved edits. Makes the
 * "you're editing, save or discard" state unmistakable: a tinted box with the
 * primary Save changes action + a neutral (non-brand) Cancel beside it.
 */
export function SaveBar({
  onSave, onCancel, message = 'You have unsaved changes',
  saveLabel = 'Save changes',
  onSaveDraft,
  saveDraftLabel = 'Save as draft',
  variant = 'rounded',
}: {
  onSave: () => void;
  onCancel: () => void;
  message?: string;
  /** Optional override for the primary CTA label (e.g. "Create sample"). */
  saveLabel?: string;
  /** When provided, a soft "Save as draft" sits between Cancel and the primary. */
  onSaveDraft?: () => void;
  saveDraftLabel?: string;
  /** 'rounded' (default) — tinted, rounded corners, margin below; for card/
   *  accordion contexts (e.g. the Results grid). 'edge' — edge-to-edge with
   *  square corners and a bottom border, matching a toolbar-driven table's
   *  own chrome (e.g. Treatments). */
  variant?: 'rounded' | 'edge';
}) {
  // All three reds derive from primary.main (#d4183d): the bg/border are tinted
  // versions of it and the text/button use it directly. Previously the message
  // used primary.dark (#94102a, burgundy), which clashed against the main-red
  // button — they now read as one tone.
  return (
    <Box sx={{
      px: 2, py: 1.25,
      bgcolor: 'primary.softBg',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2,
      ...(variant === 'edge'
        ? { borderBottom: '1px solid', borderColor: 'divider' }
        : { mb: 2, borderRadius: 2 }),
    }}>
      <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'primary.main' }}>
        {message}
      </Typography>
      <Stack direction="row" spacing={1} alignItems="center">
        <Button variant="text" color="primary" onClick={onCancel}
          sx={{ textTransform: 'none', fontWeight: 600, px: 2 }}>
          Cancel
        </Button>
        {onSaveDraft && (
          <Button variant="soft" color="primary" onClick={onSaveDraft}
            sx={{ textTransform: 'none', fontWeight: 600, px: 2, height: 36, borderRadius: '8px' }}>
            {saveDraftLabel}
          </Button>
        )}
        <Button variant="contained" color="primary" onClick={onSave}
          sx={{ textTransform: 'none', fontWeight: 600, px: 2, height: 36, borderRadius: '8px' }}>
          {saveLabel}
        </Button>
      </Stack>
    </Box>
  );
}
