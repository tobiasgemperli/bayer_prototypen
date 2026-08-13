import React from 'react';
import {
  Box, Button, Dialog, DialogContent, IconButton, Typography,
} from '@mui/material';
import { Add, CheckRounded, Close as CloseIcon, OpenInNew } from '@mui/icons-material';

export interface SampleCreatedDialogProps {
  open: boolean;
  onClose: () => void;
  onOpenSheet: () => void;
  onAddReportAndResults: () => void;
  labHasApiConnection?: boolean;
  labName?: string;
}

export function SampleCreatedDialog({
  open, onClose, onOpenSheet, onAddReportAndResults, labHasApiConnection = false, labName,
}: SampleCreatedDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={false}
      PaperProps={{
        sx: {
          width: '666px', maxWidth: '666px',
          borderRadius: '12px',
          boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.12)',
          position: 'relative',
        },
      }}
    >
      <IconButton
        aria-label="close"
        onClick={onClose}
        sx={{ position: 'absolute', top: 8, right: 8, color: (t) => t.palette.grey[500], p: 0.5 }}
      >
        <CloseIcon />
      </IconButton>

      <DialogContent sx={{ px: 4, pt: 4, pb: 4, textAlign: 'center' }}>
        {/* Icon circle — API connection uses the same brand-red (primary) palette as
            ApiConnectionChip everywhere else; the plain "created" checkmark stays success green. */}
        <Box
          sx={{
            width: 64, height: 64, mx: 'auto', mb: 2, borderRadius: '50%',
            bgcolor: labHasApiConnection ? 'primary.softBg' : 'success.softBg',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Box
            sx={{
              width: 40, height: 40, borderRadius: '50%',
              bgcolor: labHasApiConnection ? 'primary.main' : 'success.light',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {labHasApiConnection ? (
              <Box
                component="span"
                className="material-symbols-outlined"
                sx={{
                  fontSize: 22, color: '#FFFFFF', lineHeight: 1,
                  fontVariationSettings: '"FILL" 1, "wght" 500, "GRAD" 0, "opsz" 24',
                }}
              >
                cloud
              </Box>
            ) : (
              <CheckRounded sx={{ fontSize: 26, color: '#FFFFFF' }} />
            )}
          </Box>
        </Box>

        {labHasApiConnection ? (
          <>
            {/* ── API flow ── */}
            <Typography variant="h6" component="div"
              sx={{ fontWeight: 700, fontSize: '1.25rem', lineHeight: 1.25, mb: 1 }}>
              We will take care from here
            </Typography>

            {/* Paragraph 1 — API connection */}
            <Typography sx={{ color: 'text.secondary', fontSize: '0.9375rem', lineHeight: 1.55, mb: 2.5 }}>
              {labName ? (
                <>
                  Your selected laboratory{' '}
                  <Box component="span" sx={{ fontWeight: 700, color: 'primary.main' }}>{labName}</Box>
                  {' '}is directly connected to ResiYou.{' '}
                </>
              ) : 'Your selected laboratory is directly connected to ResiYou. '}
              Results are imported automatically once submitted. You'll be notified by email.
            </Typography>

            {/* Paragraph 2 — sample sheet */}
            <Typography sx={{ color: 'text.secondary', fontSize: '0.9375rem', lineHeight: 1.55, mb: 3 }}>
              Download the sample sheet and send it to the laboratory so they can trace the sample back to this record.
            </Typography>

            <Button
              onClick={onOpenSheet}
              variant="soft"
              color="primary"
              startIcon={<OpenInNew sx={{ fontSize: 18 }} />}
              sx={{ textTransform: 'none', fontWeight: 600, height: 40, borderRadius: '8px', px: 2.5 }}
            >
              Open sample sheet
            </Button>

            <Box sx={{ mt: 1 }}>
              <Button
                onClick={onClose}
                variant="text"
                color="primary"
                sx={{ fontWeight: 600, textTransform: 'none', fontSize: '0.8125rem' }}
              >
                Close
              </Button>
            </Box>
          </>
        ) : (
          <>
            {/* ── Standard flow ── */}
            <Typography variant="h6" component="div"
              sx={{ fontWeight: 700, fontSize: '1.25rem', lineHeight: 1.25, mb: 1 }}>
              Sample created
            </Typography>

            <Typography sx={{ color: 'text.secondary', fontSize: '0.9375rem', lineHeight: 1.55, mb: 3 }}>
              Download the sample sheet and send it to the laboratory. Once you have
              the report back, add the results directly on the sample page.
            </Typography>

            <Button
              onClick={onOpenSheet}
              variant="soft"
              color="primary"
              startIcon={<OpenInNew sx={{ fontSize: 18 }} />}
              sx={{ textTransform: 'none', fontWeight: 600, height: 40, borderRadius: '8px', px: 2.5 }}
            >
              Open sample sheet
            </Button>

            <Box sx={{ mt: 1 }}>
              <Button
                onClick={onAddReportAndResults}
                variant="text"
                color="primary"
                startIcon={<Add sx={{ fontSize: 16 }} />}
                sx={{ fontWeight: 600, textTransform: 'none', fontSize: '0.8125rem' }}
              >
                Add report &amp; results
              </Button>
            </Box>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
