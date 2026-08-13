import React from 'react';
import { Box, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';

export const fieldSx = {
  '& .MuiOutlinedInput-root': { bgcolor: 'white', borderRadius: '8px' },
};

export const errorFieldSx = {
  '& .MuiOutlinedInput-root': { bgcolor: 'white', borderRadius: '8px' },
  '& .MuiOutlinedInput-root.Mui-error': { bgcolor: '#fff5f5' },
};

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1.5 }}>
      {children}
    </Typography>
  );
}

export function FieldLabel({ children, required, optional, sx }: {
  children: React.ReactNode; required?: boolean; optional?: boolean; sx?: SxProps<Theme>;
}) {
  return (
    <Typography component="label" sx={[
      { fontSize: '0.8125rem', fontWeight: 600, color: 'text.primary', mb: 0.5, display: 'block' },
      ...(Array.isArray(sx) ? sx : [sx]),
    ]}>
      {children}
      {required && <Box component="span" sx={{ color: 'primary.main', ml: 0.25 }}>*</Box>}
      {/* Matches MUI's own input placeholder rendering exactly: text.primary at
          the same 0.42 opacity InputBase applies to its ::placeholder, so
          "(optional)" reads as the same grey as the field's placeholder text. */}
      {optional && <Box component="span" sx={{ color: 'text.primary', opacity: 0.42, ml: 0.5, fontWeight: 400 }}>(optional)</Box>}
    </Typography>
  );
}
