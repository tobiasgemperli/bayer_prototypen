import React from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import CheckIcon from '@mui/icons-material/Check';
import SearchIcon from '@mui/icons-material/Search';

export interface AnalyteImportStatusProps {
  /** Analytes detected in the plot's treatments with no matching residue row. */
  missingAnalytes: string[];
  /** Analytes detected in the plot's treatments that DO have a matching row. */
  importedAnalytes: string[];
  onUndo: () => void;
  /** Re-adds the still-missing analytes (same import used on open). */
  onRedo: () => void;
}

/**
 * One inline, always-current status for the analytes detected in this
 * plot's treatments — never a toast, never a gate. Two mutually exclusive
 * states, both derived live from residues vs. plotAnalytes (no separate
 * "just imported" flag to track):
 *  - none are missing and at least one came from the plot's treatments →
 *    a success-tinted card explaining what happened, + a one-click Undo.
 *  - some are missing → these were auto-added on open, so reaching this
 *    state means the user removed them (via Undo or a grid delete). Same
 *    layout as the success card but gray/neutral and a magnifying-glass
 *    icon instead of a check mark — it's just pointing back at analytes
 *    that are still relevant, not celebrating a completed action, so it
 *    stays low-key with a "Add them back" CTA in place of Undo.
 * Renders nothing when there is nothing to say (no analytes detected at all,
 * or the sample has no treatments).
 */
export function AnalyteImportStatus({
  missingAnalytes, importedAnalytes, onUndo, onRedo,
}: AnalyteImportStatusProps) {
  const isMissing = missingAnalytes.length > 0;
  const isImported = !isMissing && importedAnalytes.length > 0;

  if (!isMissing && !isImported) return null;

  if (isMissing) {
    const count = missingAnalytes.length;
    return (
      <Box sx={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        bgcolor: 'grey.100',
        border: '1px solid',
        borderColor: 'grey.300',
        borderRadius: 1,
        px: 2, py: 1.5,
      }}>
        <Box>
          <Stack direction="row" alignItems="center" spacing={1}>
            <SearchIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
            <Typography sx={{ fontSize: '0.9375rem', fontWeight: 700, color: 'text.primary', whiteSpace: 'nowrap' }}>
              {count} analyte{count !== 1 ? 's' : ''} detected
            </Typography>
          </Stack>
          <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', mt: 0.25 }}>
            Found in this plot’s treatments.
          </Typography>
        </Box>
        <Button
          onClick={onRedo}
          variant="text"
          size="small"
          sx={{
            height: 30, minWidth: 0, px: 1.75,
            fontSize: '0.8125rem', fontWeight: 700, textTransform: 'none',
            borderRadius: '8px',
            bgcolor: 'grey.200',
            color: 'text.primary',
            '&:hover': { bgcolor: 'grey.300' },
          }}
        >
          Add below
        </Button>
      </Box>
    );
  }

  const count = importedAnalytes.length;

  return (
    <Box sx={(theme) => ({
      display: 'inline-flex', alignItems: 'center', gap: 4,
      bgcolor: 'success.softBg',
      border: '1px solid',
      borderColor: alpha(theme.palette.success.main, 0.3),
      borderRadius: 1,
      px: 2, py: 1.5,
    })}>
      <Box>
        <Stack direction="row" alignItems="center" spacing={1}>
          <CheckIcon sx={{ fontSize: 20, color: 'success.main' }} />
          <Typography sx={{ fontSize: '0.9375rem', fontWeight: 700, color: 'success.main', whiteSpace: 'nowrap' }}>
            {count} analyte{count !== 1 ? 's' : ''} added
          </Typography>
        </Stack>
        <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', mt: 0.25 }}>
          Found in this plot’s treatments.
        </Typography>
      </Box>
      <Button
        onClick={onUndo}
        variant="soft"
        color="success"
        size="small"
        sx={{
          height: 30, minWidth: 0, px: 1.75,
          fontSize: '0.8125rem', fontWeight: 700, textTransform: 'none',
          borderRadius: '8px',
        }}
      >
        Undo
      </Button>
    </Box>
  );
}
