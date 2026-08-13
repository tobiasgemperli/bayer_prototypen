import React from 'react';
import {
  Box, Button, Dialog, DialogContent, IconButton, Typography,
} from '@mui/material';
import {
  CheckRounded, Close as CloseIcon, InfoOutlined, OpenInNew,
} from '@mui/icons-material';

export interface SampleCreatedDialogProps {
  open: boolean;
  onClose: () => void;
  /** Opens the sample sheet in a new tab. */
  onOpenSheet: () => void;
  /** Switches to the Lab reports tab and provisions a draft report for this
   *  sample. */
  onAddLabReport: () => void;
}

/**
 * Confirmation popup after a sample is successfully created.
 *
 * Centred layout — large success badge, title, body, full-width "Good to
 * know" note, then a soft (secondary) primary CTA + text-link secondary.
 *
 * Component choices come from the SSOT:
 * - The `soft` button variant (theme.ts:171-197) — the de-facto secondary in
 *   this design system, tonal 8% / 16% hover. Open sample sheet uses it so
 *   the moment stays calm.
 * - The "Good to know" note uses `primary.softBg`, the same brand-red soft
 *   surface tint the SaveBar uses.
 * - Secondary text link styled exactly like `EmptyState`'s `secondaryLabel`
 *   (design-system/EmptyState.tsx:92-97).
 */
export function SampleCreatedDialog({
  open, onClose, onOpenSheet, onAddLabReport,
}: SampleCreatedDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      // ~1.5× the previous xs (444 → 666). Set explicitly on the Paper so
      // it overrides MUI's breakpoint clamps.
      maxWidth={false}
      PaperProps={{
        sx: {
          width: '666px',
          maxWidth: '666px',
          borderRadius: '12px',
          boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.12)',
          position: 'relative',
        },
      }}
    >
      {/* Quiet top-right close. */}
      <IconButton
        aria-label="close"
        onClick={onClose}
        sx={{
          position: 'absolute', top: 8, right: 8,
          color: (t) => t.palette.grey[500], p: 0.5,
        }}
      >
        <CloseIcon />
      </IconButton>

      <DialogContent sx={{ px: 4, pt: 4, pb: 4, textAlign: 'center' }}>
        {/* Large success badge — soft green outer ring + bright green inner
            disc with a white check. Same dual-tone treatment as the original
            centred layout. Tones come from the theme (success.softBg +
            success.light) so the modal lives in the same family as every
            other "success" surface. */}
        <Box
          sx={{
            width: 64, height: 64,
            mx: 'auto', mb: 2,
            borderRadius: '50%',
            bgcolor: 'success.softBg',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Box
            sx={{
              width: 40, height: 40, borderRadius: '50%',
              bgcolor: 'success.light',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <CheckRounded sx={{ fontSize: 26, color: '#FFFFFF' }} />
          </Box>
        </Box>

        <Typography
          variant="h6" component="div"
          sx={{ fontWeight: 700, fontSize: '1.25rem', lineHeight: 1.25, mb: 1 }}
        >
          Sample created
        </Typography>

        <Typography
          sx={{
            color: 'text.secondary',
            fontSize: '0.9375rem',
            lineHeight: 1.55,
            mb: 3,
          }}
        >
          Download the sample sheet and add the analytical method before
          sending it to the laboratory. It includes the ResiYou ID, so results
          can be connected later.
        </Typography>

        {/* "Good to know" — neutral grey surface (action.hover) so the note
            doesn't compete with the brand-red CTA. The info glyph stays in
            brand red so the eye still picks it up at a glance. Label
            terminated with a colon, no dash. */}
        <Box
          sx={{
            mb: 3,
            display: 'flex', gap: 1.25,
            p: 2,
            borderRadius: '8px',
            bgcolor: 'action.hover',
            textAlign: 'left',
          }}
        >
          <InfoOutlined sx={{ color: 'primary.main', fontSize: 20, mt: '1px', flexShrink: 0 }} />
          <Typography sx={{ fontSize: '0.875rem', color: 'text.primary', lineHeight: 1.55 }}>
            <Box component="span" sx={{ fontWeight: 700 }}>Good to know:</Box>{' '}
            If your laboratory is connected with ResiYou, results are added
            automatically and we notify you by email.
          </Typography>
        </Box>

        {/* Primary action — soft (secondary) brand-red variant. Hugs content;
            centered by DialogContent's textAlign: 'center'. */}
        <Button
          onClick={onOpenSheet}
          variant="soft"
          color="primary"
          startIcon={<OpenInNew sx={{ fontSize: 18 }} />}
          sx={{
            textTransform: 'none', fontWeight: 600,
            height: 40, borderRadius: '8px', px: 2.5,
          }}
        >
          Open sample sheet
        </Button>

        {/* Secondary text link — hugs text, same styling as EmptyState's
            secondaryLabel (design-system/EmptyState.tsx:92-97). */}
        <Box sx={{ mt: 1 }}>
          <Button
            onClick={onAddLabReport}
            variant="text"
            color="primary"
            sx={{ fontWeight: 600, textTransform: 'none', fontSize: '0.8125rem' }}
          >
            Already have the report? Add lab report
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
