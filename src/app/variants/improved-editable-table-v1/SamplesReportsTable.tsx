import React, { useMemo, useState } from 'react';
import {
  Checkbox, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TableSortLabel, Tooltip, Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Add, DeleteOutline, InfoOutlined, OpenInNew,
} from '@mui/icons-material';
import { TableCard, EmDash } from '../../design-system/TableCard';
import { RowActionButton, RowIconButton } from '../../design-system/grid/grid-shared';
import { LabSampleData, isDetected } from '../../data/lab-results-data';

interface SamplesReportsTableProps {
  rows: LabSampleData[];
  selected: string[];
  onSelectChange: (ids: string[]) => void;
  /** Click anywhere on the row (outside actions) navigates to the sample page. */
  onRowClick: (s: LabSampleData) => void;
  onDelete: (s: LabSampleData) => void;
  onAddReportAndResults: (s: LabSampleData) => void;
}

type SortField = 'sampleName' | 'dateOfSample' | 'commodity';
type SortOrder = 'asc' | 'desc';

// Row-height parity with the AG-Grid (ROW_HEIGHT = 52px, design-system/grid/validation.tsx).
// MUI's default TableCell padding (16px top+bottom) plus this app's 0.875rem body text
// renders taller than 52px once `stickyHeader`'s border-collapse:separate is in play —
// measured empirically at 54.5px actual vs the grid's 52px. Trimmed here so every
// read-only table row (this file and SampleReportPage's Reports table, which imports this)
// matches the editable grid's row height exactly instead of drifting apart per file.
export const readOnlyRowSx = {
  '& .MuiTableCell-root:not(.MuiTableCell-paddingCheckbox)': { py: '14.75px' },
} as const;

// Same idea for the header row — measured empirically at 51px actual vs the grid's 52px
// (theme's `head` override doesn't touch padding, so it's still MUI's default 16px/16px).
export const readOnlyHeaderRowSx = {
  '& .MuiTableCell-root:not(.MuiTableCell-paddingCheckbox)': { py: '16.5px' },
} as const;

// MUI's `padding="checkbox"` cell defaults to 48px wide; the AG-Grid's checkbox
// column (`selectColumn`, design-system/grid/grid-shared.tsx) is 52px. Matches it.
export const checkboxCellSx = { width: 52 } as const;

export function SamplesReportsTable({
  rows, selected, onSelectChange, onRowClick, onDelete, onAddReportAndResults,
}: SamplesReportsTableProps) {
  const [orderBy, setOrderBy] = useState<SortField | null>(null);
  const [order, setOrder] = useState<SortOrder>('asc');

  const sorted = useMemo(() => {
    if (!orderBy) return rows;
    return [...rows].sort((a, b) => {
      const av = a[orderBy] as unknown;
      const bv = b[orderBy] as unknown;
      if (orderBy === 'dateOfSample') {
        const at = av instanceof Date ? av.getTime() : 0;
        const bt = bv instanceof Date ? bv.getTime() : 0;
        return order === 'asc' ? at - bt : bt - at;
      }
      const as = String(av ?? '').toLowerCase();
      const bs = String(bv ?? '').toLowerCase();
      if (as < bs) return order === 'asc' ? -1 : 1;
      if (as > bs) return order === 'asc' ? 1 : -1;
      return 0;
    });
  }, [rows, orderBy, order]);

  const handleSort = (f: SortField) => {
    const isAsc = orderBy === f && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(f);
  };

  const allChecked = rows.length > 0 && selected.length === rows.length;
  const someChecked = selected.length > 0 && !allChecked;
  const toggleAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSelectChange(e.target.checked ? rows.map((r) => r.id) : []);
  };
  const toggleOne = (id: string) => {
    onSelectChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  const fmt = (d: Date | null) =>
    d ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(d) : null;

  return (
    <TableCard>
      <TableContainer sx={{ maxHeight: 'calc(100vh - 280px)' }}>
        <Table stickyHeader aria-label="samples table">
          <TableHead>
            <TableRow sx={readOnlyHeaderRowSx}>
              <TableCell padding="checkbox" sx={checkboxCellSx}>
                <Checkbox indeterminate={someChecked} checked={allChecked} onChange={toggleAll} />
              </TableCell>
              <Th sortable active={orderBy === 'sampleName'} dir={order} onClick={() => handleSort('sampleName')}>
                Sample name
              </Th>
              <Th sortable active={orderBy === 'dateOfSample'} dir={order} onClick={() => handleSort('dateOfSample')}>
                Sample date
              </Th>
              <Th sortable active={orderBy === 'commodity'} dir={order} onClick={() => handleSort('commodity')}>
                Commodity
              </Th>
              <Th>Reports uploaded</Th>
              <Th>Residues detected</Th>
              <Th
                trailingInfoTip="Print the sample sheet and send it together with your physical sample to the laboratory."
              >
                Sample sheet
              </Th>
              <TableCell sx={{ width: 0 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No samples yet
                </TableCell>
              </TableRow>
            ) : sorted.map((s) => {
              const detectedCount = (s.residues ?? []).filter(isDetected).length;
              const isSel = selected.includes(s.id);
              return (
                <TableRow
                  key={s.id}
                  hover
                  selected={isSel}
                  onClick={() => onRowClick(s)}
                  sx={{ cursor: 'pointer', ...readOnlyRowSx }}
                >
                  <TableCell padding="checkbox" sx={checkboxCellSx} onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={isSel} onChange={() => toggleOne(s.id)} />
                  </TableCell>
                  <TableCell sx={{ color: 'text.primary', fontSize: '0.875rem' }}>
                    {s.sampleName || <EmDash />}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.875rem' }}>
                    {fmt(s.dateOfSample) ?? <EmDash />}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.875rem' }}>
                    {s.commodity ?? <EmDash />}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.875rem' }}>
                    {(s.reports?.length ?? 0) > 0 ? s.reports!.length : <EmDash />}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.875rem', color: detectedCount > 0 ? 'text.primary' : 'text.secondary' }}>
                    {detectedCount}
                  </TableCell>
                  {/* No stopPropagation on the cell itself — clicking
                      anywhere in this cell OUTSIDE the button should still
                      navigate to the sample detail page, same as the row
                      click. Only the button's own click is stopped, so it
                      opens the sheet instead of also navigating. */}
                  <TableCell>
                    <RowActionButton
                      startIcon={<OpenInNew sx={{ fontSize: 16 }} />}
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`/sample-sheet/${s.id}`, '_blank', 'noopener,noreferrer');
                      }}
                    >
                      Sample sheet
                    </RowActionButton>
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                    <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
                      <RowIconButton label="Delete" onClick={() => onDelete(s)}>
                        <DeleteOutline fontSize="small" />
                      </RowIconButton>
                      <RowActionButton
                        startIcon={<Add sx={{ fontSize: 16 }} />}
                        onClick={() => onAddReportAndResults(s)}
                        sx={{
                          ml: 0.5,
                          bgcolor: 'primary.softBg',
                          color: 'primary.main',
                          '&:hover': { bgcolor: alpha('#d4183d', 0.16) },
                        }}
                      >
                        Add report &amp; results
                      </RowActionButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </TableCard>
  );
}

/** Shared read-only table header cell — also used by SampleReportPage's
 *  Reports table, so both tables render identical headers. */
export function Th({
  children, sortable, active, dir, onClick, trailingInfoTip,
}: {
  children: React.ReactNode;
  sortable?: boolean;
  active?: boolean;
  dir?: SortOrder;
  onClick?: () => void;
  trailingInfoTip?: string;
}) {
  const labelSx = { fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary', lineHeight: 1.5 } as const;

  const infoIcon = trailingInfoTip ? (
    <Tooltip arrow placement="top" enterDelay={150} title={trailingInfoTip}>
      <InfoOutlined sx={{ fontSize: 14, color: 'text.disabled', cursor: 'help' }} />
    </Tooltip>
  ) : null;

  if (sortable && onClick) {
    return (
      <TableCell>
        <TableSortLabel active={active} direction={active ? dir : 'asc'} onClick={onClick} sx={labelSx}>
          {children}
          {/* info icon sits between the label text and the sort arrow */}
          {infoIcon}
        </TableSortLabel>
      </TableCell>
    );
  }

  return (
    <TableCell>
      <Stack direction="row" alignItems="center" spacing={0.5}>
        <Typography component="span" sx={labelSx}>{children}</Typography>
        {infoIcon}
      </Stack>
    </TableCell>
  );
}
