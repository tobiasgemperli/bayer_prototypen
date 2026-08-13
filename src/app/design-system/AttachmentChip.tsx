import React from 'react';
import { Box, Typography } from '@mui/material';
import { Eye, X } from 'lucide-react';

interface AttachmentChipProps {
  /** File name shown as the chip label. */
  name: string;
  /** Called when the user clicks the chip body — typically opens the file. */
  onClick?: () => void;
  /** Called when the user clicks the delete icon. */
  onRemove?: () => void;
  /** Called when the user clicks the view (eye) icon — for read-only
   *  contexts that want an explicit "view" affordance instead of (or as
   *  well as) a delete one. Mutually exclusive with `onRemove` in practice
   *  (both can render if both are passed, but no current caller does that). */
  onView?: () => void;
  /** Dims the name text and view icon — for locked/system-managed reports. */
  muted?: boolean;
  /** Chip height in px. Defaults to 28; pass 40 to line up with an adjacent size="small" TextField. */
  height?: number;
}

/** Compact attachment chip — filename + remove/view button. Hugs its content
 *  width (`display: inline-flex`, no forced full-width) so several fit on
 *  one row and wrap naturally rather than stacking as full-width bars.
 *  Single source of truth for file-attachment display in lab reports. */
export function AttachmentChip({ name, onClick, onRemove, onView, muted = false, height = 28 }: AttachmentChipProps) {
  const clickable = !!onClick;
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        height,
        maxWidth: 280,
        pl: 1.25,
        pr: 0.5,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '8px',
        bgcolor: 'background.paper',
        userSelect: 'none',
        '&:hover': clickable ? { borderColor: 'text.secondary' } : undefined,
      }}
    >
      <Typography
        component="span"
        onClick={clickable ? (e) => { e.stopPropagation(); onClick!(); } : undefined}
        sx={{
          flex: 1, minWidth: 0,
          fontSize: '0.875rem', color: muted ? 'text.disabled' : 'text.primary',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          cursor: clickable ? 'pointer' : 'default',
          '&:hover': clickable ? { textDecoration: 'underline' } : undefined,
        }}
      >
        {name}
      </Typography>
      {onRemove && (
        <Box
          component="button"
          type="button"
          aria-label="Remove attachment"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          sx={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 20, height: 20, ml: 0.75,
            p: 0, border: 'none', bgcolor: 'transparent', cursor: 'pointer',
            borderRadius: '4px', color: 'text.secondary',
            '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
          }}
        >
          <X size={16} strokeWidth={1.5} />
        </Box>
      )}
      {onView && (
        <Box
          component="button"
          type="button"
          aria-label="View attachment"
          onClick={(e) => { e.stopPropagation(); onView(); }}
          sx={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 20, height: 20, ml: 0.75,
            p: 0, border: 'none', bgcolor: 'transparent', cursor: 'pointer',
            borderRadius: '4px', color: muted ? 'text.disabled' : 'text.secondary',
            '&:hover': { bgcolor: 'action.hover', color: muted ? 'text.disabled' : 'text.primary' },
          }}
        >
          <Eye size={16} strokeWidth={1.5} />
        </Box>
      )}
    </Box>
  );
}
