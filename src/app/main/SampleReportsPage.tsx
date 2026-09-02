import React from 'react';
import { Box } from '@mui/material';
import { LabParserDemoPage } from '../lab-shared/LabParserDemoPage';

// "Sample Reports" — app-shell page that hosts the in-browser lab-report
// PDF parser. Wraps the parser panel in a scroll container since the app
// Root keeps its outlet overflow hidden.
export function SampleReportsPage() {
  return (
    <Box sx={{ height: '100%', overflowY: 'auto' }}>
      <LabParserDemoPage />
    </Box>
  );
}
