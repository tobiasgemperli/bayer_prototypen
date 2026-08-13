import React from 'react';
import { Button } from '@mui/material';
import { MoreVert } from '@mui/icons-material';

interface OptionsTriggerProps {
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
  disabled?: boolean;
  hasSelection?: boolean;
}

export function OptionsTrigger({ onClick, disabled = false }: OptionsTriggerProps) {
  // UX principle: never show disabled controls — hide the options menu until a row
  // is selected (callers pass disabled={selected.length === 0}). Renders nothing at
  // all, not an invisible placeholder — a right-aligned toolbar (the common case)
  // should have its remaining controls sit flush at the edge, not leave a gap.
  if (disabled) return null;
  return (
    <Button
      onClick={onClick}
      color="primary"
      sx={{
        p: 0,
        width: 36,
        height: 36,
        minWidth: 0,
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      {/* Matches the 16px icon size every adjacent toolbar CTA uses (e.g.
          "Add residue"'s startIcon), so the two buttons read as a pair —
          not just same height, but the same icon weight inside it. */}
      <MoreVert sx={{ fontSize: 16 }} />
    </Button>
  );
}
