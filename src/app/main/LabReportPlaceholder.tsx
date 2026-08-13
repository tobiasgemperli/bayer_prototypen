import React from 'react';
import { Box, Typography } from '@mui/material';

/**
 * Baseline fallback for the `LabReportPage` overridable slot. The standalone
 * lab-report creation page only exists in the v5 variant; on the baseline (and
 * other variants) this route has no meaning, so we render a gentle notice.
 */
export function LabReportPlaceholder() {
  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Lab report</Typography>
      <Typography variant="body2" color="text.secondary">
        The standalone lab report page is only available in the “Lab management” variant (v5).
      </Typography>
    </Box>
  );
}
