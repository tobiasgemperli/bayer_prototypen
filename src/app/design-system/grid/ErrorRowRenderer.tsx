import React, { useEffect, useState } from 'react';
import { Box, Tooltip } from '@mui/material';
import { Column } from 'ag-grid-community';
import {
  ValidationContext,
  ERROR_ROW_PREFIX as VALIDATION_ERROR_ROW_PREFIX,
  ERROR_ROW_H_PAD,
  ERROR_ROW_AVG_CHAR,
  ERROR_ROW_MAX_LINES,
} from './validation';

/** Re-exported for back-compat with existing imports. The single source of
 *  truth lives in `validation.tsx` (AC‑11.1 / AC‑11.3). */
export const ERROR_ROW_PREFIX = VALIDATION_ERROR_ROW_PREFIX;

interface ErrorRowProps {
  /** AG-Grid passes the API on the params. */
  api: any;
  /** The synthetic error row's data — carries the original row id. */
  data: { _errorOwnerId: string };
  /** AG-Grid context (we pull `validation` out of here). */
  context: { validation?: ValidationContext };
}

/**
 * Full-width "error row" that sits directly under an errored data row.
 * Each column's error message is rendered in a slot sized to that column's
 * current width so messages line up under the cell they describe. Subscribes
 * to column-resize events so widths stay aligned if the user drags columns.
 */
export function ErrorRowRenderer({ api, data, context }: ErrorRowProps) {
  const ownerId = data._errorOwnerId;
  // errorsRef is the only source of truth. If a synthetic row exists, there's
  // at least one error for `ownerId` — render messages per column.
  const errors = context.validation?.errors.get(ownerId);

  // Track displayed columns so we always render the same column order as the
  // data row above us. Re-fetched on column resize / visibility changes.
  const [cols, setCols] = useState<Column[]>(() => api.getAllDisplayedColumns?.() ?? []);
  useEffect(() => {
    const refresh = () => setCols(api.getAllDisplayedColumns?.() ?? []);
    api.addEventListener('columnResized', refresh);
    api.addEventListener('displayedColumnsChanged', refresh);
    return () => {
      api.removeEventListener('columnResized', refresh);
      api.removeEventListener('displayedColumnsChanged', refresh);
    };
  }, [api]);

  // Top + left aligned: error text starts at the top-left of each column slot
  // and wraps inside that slot's width. The row caps at ERROR_ROW_MAX_LINES —
  // anything longer truncates with "…" and the full message shows on hover in
  // a default MUI tooltip with only `maxWidth: 400` overridden (AC‑3.4 / 3.5).
  // No own bottom border — AG-Grid's data row below already draws the
  // separator.
  return (
    <Box sx={{
      display: 'flex', width: '100%', height: '100%',
      bgcolor: 'background.paper',
      alignItems: 'flex-start',
    }}>
      {cols.map((col) => {
        const field = col.getColDef().field ?? col.getColId();
        const msg = errors?.get(field);
        const width = col.getActualWidth();

        // Estimate whether the message will exceed MAX_LINES at this width.
        // Single source for padding + avg-char-width: validation.tsx (AC‑11.3).
        const usable = Math.max(40, width - ERROR_ROW_H_PAD);
        const charsPerLine = Math.max(6, Math.floor(usable / ERROR_ROW_AVG_CHAR));
        const truncates = !!msg && msg.length > charsPerLine * ERROR_ROW_MAX_LINES;

        const text = (
          <Box
            sx={{
              pl: 0, pr: '8px', py: '8px',
              fontSize: '0.75rem', color: 'error.main', fontWeight: 500,
              lineHeight: 1.3, wordBreak: 'break-word', textAlign: 'left',
              display: '-webkit-box',
              WebkitLineClamp: ERROR_ROW_MAX_LINES,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              cursor: truncates ? 'help' : 'default',
            }}
          >
            {msg ?? ''}
          </Box>
        );

        return (
          <Box key={col.getColId()} sx={{ flex: `0 0 ${width}px`, width }}>
            {truncates ? (
              <Tooltip
                title={msg}
                arrow
                placement="bottom-start"
                enterDelay={150}
                slotProps={{ tooltip: { sx: { maxWidth: 400 } } }}
              >
                {text}
              </Tooltip>
            ) : text}
          </Box>
        );
      })}
    </Box>
  );
}
