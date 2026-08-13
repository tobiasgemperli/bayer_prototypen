import React, { useMemo, useState } from 'react';
import { ColDef } from 'ag-grid-community';
import { Box, Stack, Typography } from '@mui/material';
import { PlotDetailPage as BaselinePlotDetailPage } from '../../main/PlotDetailPage';
import {
  SprayStatus, STATUS_ORDER, STATUS_LABEL, TreatmentData,
} from '../../data/plots-data';
import { TreatmentStatusCell } from './TreatmentStatusCell';
import { SprayFilter } from './SprayFilter';
import { STATUS_COLORS } from '../../design-system/status-colors';

/**
 * spray-plans-v5 — Notion-style status column on top of the baseline editable
 * Treatments grid. No separate tab, no forked grid: the baseline AG-Grid stays
 * as-is, the variant just plugs in (a) a Status column at the start, (b) a
 * Filter button in the toolbar, (c) a status-aware sort, (d) a row filter.
 */
export function PlotDetailPage() {
  const [visible, setVisible] = useState<Set<SprayStatus>>(() => new Set(STATUS_ORDER));

  const statusColumn = useMemo<ColDef<TreatmentData>>(() => ({
    field: 'status',
    headerName: 'Status',
    width: 130,
    editable: false,
    sortable: true,
    sort: 'asc',
    sortIndex: 0,
    cellRenderer: TreatmentStatusCell,
    // Status sort uses the canonical order; tiebreak by date asc (nulls last).
    comparator: (a, b, nodeA, nodeB) => {
      const sa = STATUS_ORDER.indexOf((a as SprayStatus) ?? 'draft');
      const sb = STATUS_ORDER.indexOf((b as SprayStatus) ?? 'draft');
      if (sa !== sb) return sa - sb;
      const da = nodeA?.data?.date instanceof Date ? nodeA.data.date.getTime() : null;
      const db = nodeB?.data?.date instanceof Date ? nodeB.data.date.getTime() : null;
      if (da == null && db == null) return 0;
      if (da == null) return 1;
      if (db == null) return -1;
      return da - db;
    },
  }), []);

  return (
    <BaselinePlotDetailPage
      treatmentsCustomization={{
        appendColumns: [statusColumn],
        toolbarExtras: <SprayFilter value={visible} onChange={setVisible} />,
        rowFilter: (t) => visible.has((t.status as SprayStatus) ?? 'draft'),
        sort: (a, b) => {
          const sa = STATUS_ORDER.indexOf((a.status as SprayStatus) ?? 'draft');
          const sb = STATUS_ORDER.indexOf((b.status as SprayStatus) ?? 'draft');
          if (sa !== sb) return sa - sb;
          const da = a.date instanceof Date ? a.date.getTime() : null;
          const db = b.date instanceof Date ? b.date.getTime() : null;
          if (da == null && db == null) return 0;
          if (da == null) return 1;
          if (db == null) return -1;
          return da - db;
        },
        countBarExtras: (rows) => <StatusBreakdown treatments={rows} />,
      }}
    />
  );
}

/** Inline per-status counts, separator-delimited, colored by status.
 *  Matches the existing count-bar typography (12px / 700 / uppercase). */
function StatusBreakdown({ treatments }: { treatments: TreatmentData[] }) {
  const counts: Record<SprayStatus, number> = { draft: 0, planned: 0, executed: 0, removed: 0 };
  for (const t of treatments) {
    const s = (t.status as SprayStatus) ?? 'draft';
    counts[s] += 1;
  }
  const present = STATUS_ORDER.filter((s) => counts[s] > 0);
  if (present.length === 0) return null;

  return (
    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ ml: 1 }}>
      <Box sx={{ width: '1px', height: 12, bgcolor: 'divider' }} />
      {present.map((s, i) => (
        <React.Fragment key={s}>
          {i > 0 && <Box sx={{ width: '3px', height: '3px', borderRadius: '50%', bgcolor: 'text.disabled' }} />}
          <Typography
            sx={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: STATUS_COLORS[s].fg,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              whiteSpace: 'nowrap',
            }}
          >
            {counts[s]} {STATUS_LABEL[s]}
          </Typography>
        </React.Fragment>
      ))}
    </Stack>
  );
}
