import React from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import CheckIcon from '@mui/icons-material/Check';
import { WarningAmber } from '@mui/icons-material';

export interface AnalyteImportStatusProps {
  /** Analytes detected in the plot's treatments with no matching residue row. */
  missingAnalytes: string[];
  /** Analytes detected in the plot's treatments that DO have a matching row. */
  importedAnalytes: string[];
  onUndo: () => void;
}

/**
 * One inline, always-current status for the analytes detected in this
 * plot's treatments — never a toast, never a gate. Two mutually exclusive
 * states, both derived live from residues vs. plotAnalytes (no separate
 * "just imported" flag to track):
 *  - some are missing → a warning-tinted card, informational only (no
 *    action here — Save is what surfaces the confirm-and-add-results flow)
 *  - none are missing and at least one came from the plot's treatments →
 *    a success-tinted card + a one-click Undo
 * Renders nothing when there is nothing to say (no analytes detected at all,
 * or the sample has no treatments). Two-column layout: title+caption stacked
 * on the left, the one action button on the right, vertically centered
 * against that whole left block — not against the title alone. The `soft`
 * variant button is the same treatment as "Create sample"/"Add residue"
 * elsewhere, just tone-colored. Caption is muted `text.secondary`, not a
 * tone-tinted color — keeps it legible against the tinted background instead
 * of repeating the same low-contrast mistake as the pale-on-pale reference.
 */
export function AnalyteImportStatus({
  missingAnalytes, importedAnalytes, onUndo,
}: AnalyteImportStatusProps) {
  const isMissing = missingAnalytes.length > 0;
  const isImported = !isMissing && importedAnalytes.length > 0;

  if (!isMissing && !isImported) return null;

  const tone: 'warning' | 'success' = isMissing ? 'warning' : 'success';
  const count = isMissing ? missingAnalytes.length : importedAnalytes.length;
  const label = `${count} analyte${count !== 1 ? 's' : ''} ${isMissing ? 'missing' : 'prefilled'}`;
  // "Prefilled"/"missing" both describe the analyte's origin as this plot's
  // logged treatments — never "applied" (that describes the treatment
  // itself, not the analyte row), so the user isn't left wondering what
  // these rows have to do with a treatment they entered elsewhere.
  const caption = isMissing
    ? "Expected from this plot's treatments. No result recorded yet."
    : "Prefilled from this plot's treatments. Add the results below.";

  return (
    <Box sx={(theme) => ({
      display: 'inline-flex', alignItems: 'center', gap: 4,
      bgcolor: `${tone}.softBg`,
      border: '1px solid',
      borderColor: alpha(theme.palette[tone].main, 0.3),
      borderRadius: 1,
      px: 2, py: 1.5,
    })}>
      <Box>
        <Stack direction="row" alignItems="center" spacing={1}>
          {isMissing
            ? <WarningAmber sx={{ fontSize: 20, color: 'warning.main' }} />
            : <CheckIcon sx={{ fontSize: 20, color: 'success.main' }} />}
          <Typography sx={{ fontSize: '0.9375rem', fontWeight: 700, color: `${tone}.main`, whiteSpace: 'nowrap' }}>
            {label}
          </Typography>
        </Stack>
        <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', mt: 0.25 }}>
          {caption}
        </Typography>
      </Box>
      {isImported && (
        <Button
          onClick={onUndo}
          variant="soft"
          color={tone}
          size="small"
          sx={{
            height: 30, minWidth: 0, px: 1.75,
            fontSize: '0.8125rem', fontWeight: 700, textTransform: 'none',
            borderRadius: '8px',
          }}
        >
          Undo
        </Button>
      )}
    </Box>
  );
}
