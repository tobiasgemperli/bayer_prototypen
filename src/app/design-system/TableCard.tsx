import React from 'react';
import { Box, Paper, PaperProps } from '@mui/material';

/** Grey em-dash for empty table cells — use instead of a raw "—" string. */
export function EmDash() {
  return <Box component="span" sx={{ color: 'text.disabled' }}>—</Box>;
}

/**
 * Card wrapper for read-only tabular data.
 * Why the last-row border override: MUI's TableRow gives every row a bottom
 * border; on the final row it stacks with the Paper's own border, creating a
 * "double line" at the bottom of the table.
 */
export function TableCard({ sx, children, ...rest }: PaperProps) {
  return (
    <Paper
      {...rest}
      sx={{
        width: '100%',
        overflow: 'hidden',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        '& .MuiTableBody-root .MuiTableRow-root:last-child .MuiTableCell-root': {
          borderBottom: 0,
        },
        ...sx,
      }}
    >
      {children}
    </Paper>
  );
}
