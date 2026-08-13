import React from 'react';
import { Box, Button, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

/**
 * Contextual reminder bar — visually identical to `SaveBar`: same red
 * soft-tinted chrome, same single-line layout, message on the left and the
 * action on the right. Difference is intent: a helpful nudge ("hey, here's a
 * next step") rather than a destructive blocker ("you have unsaved work").
 *
 * Layout (matches SaveBar exactly):
 *   [ message text ──────────────────────────  CTA  × ]
 */
export function ReminderBar({
  message,
  ctaLabel,
  onCta,
  onDismiss,
  dismissTooltip = 'Dismiss reminder',
}: {
  message: string;
  ctaLabel: string;
  onCta: () => void;
  onDismiss: () => void;
  dismissTooltip?: string;
}) {
  return (
    <Box sx={{
      px: 2, py: 1.25, mb: 2,
      bgcolor: 'primary.softBg',
      borderRadius: 2,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2,
    }}>
      {/* Left — single line, identical type treatment to SaveBar's
          "You have unsaved changes". */}
      <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'primary.main' }}>
        {message}
      </Typography>

      {/* Right — soft CTA + dismiss icon. Soft (not contained) keeps the bar
          calmer than the dirty-state SaveBar. */}
      <Stack direction="row" spacing={1} alignItems="center" sx={{ flexShrink: 0 }}>
        <Button
          variant="soft" color="primary"
          onClick={onCta}
          sx={{ textTransform: 'none', fontWeight: 600, px: 2, height: 36, borderRadius: '8px' }}
        >
          {ctaLabel}
        </Button>
        <Tooltip arrow placement="top" enterDelay={150} title={dismissTooltip}>
          <IconButton
            size="small"
            onClick={onDismiss}
            aria-label={dismissTooltip}
            sx={{ color: 'primary.main', p: 0.5 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  );
}
