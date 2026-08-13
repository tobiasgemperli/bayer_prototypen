import React, { useMemo, useState } from 'react';
import {
  Box, Button, Checkbox, IconButton, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TableSortLabel, Tooltip, Typography,
} from '@mui/material';
import {
  Add, ContentCopy, DeleteOutline, InfoOutlined, OpenInNew,
} from '@mui/icons-material';
import { TableCard, EmDash } from '../../design-system/TableCard';
import { LabSampleData } from '../../data/lab-results-data';

interface SamplesTableProps {
  rows: LabSampleData[];
  selected: string[];
  onSelectChange: (ids: string[]) => void;
  /** Click anywhere on the row (outside actions) opens the edit dialog. */
  onRowClick: (s: LabSampleData) => void;
  onDuplicate: (s: LabSampleData) => void;
  onDelete: (s: LabSampleData) => void;
  onAddLabReport: (s: LabSampleData) => void;
}

type SortField = 'sampleName' | 'sampleCode' | 'dateOfSample' | 'commodity';
type SortOrder = 'asc' | 'desc';

/**
 * Read-only listing of samples in the Plots-table visual style. Mirrors the
 * editable-grid columns one-to-one — Sample name (with DRAFT chip), Sample
 * code (muted, locked), Sample date, Commodity, Sample sheet (Open PDF) and
 * inline row actions. Editing happens in the SampleFormDialog, not in-cell.
 */
export function SamplesTable({
  rows, selected, onSelectChange, onRowClick, onDuplicate, onDelete, onAddLabReport,
}: SamplesTableProps) {
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
    d ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(d) : '—';

  return (
    <TableCard>
      <TableContainer sx={{ maxHeight: 'calc(100vh - 280px)' }}>
        <Table stickyHeader aria-label="samples table">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox indeterminate={someChecked} checked={allChecked} onChange={toggleAll} />
              </TableCell>
              <Th sortable active={orderBy === 'sampleName'} dir={order} onClick={() => handleSort('sampleName')}>
                Sample name
              </Th>
              <Th
                sortable active={orderBy === 'sampleCode'} dir={order} onClick={() => handleSort('sampleCode')}
                trailingInfoTip="Generated automatically when the sample is created. Cannot be edited. It helps you identify the sample across reports and systems."
              >
                Sample code
              </Th>
              <Th sortable active={orderBy === 'dateOfSample'} dir={order} onClick={() => handleSort('dateOfSample')}>
                Sample date
              </Th>
              <Th sortable active={orderBy === 'commodity'} dir={order} onClick={() => handleSort('commodity')}>
                Commodity
              </Th>
              <Th
                trailingInfoTip="Send this sheet with the sample to the laboratory. It includes the sample details and the ResiYou ID for later."
              >
                Sample sheet
              </Th>
              <TableCell sx={{ width: 0 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No samples yet
                </TableCell>
              </TableRow>
            ) : sorted.map((s) => {
              const isSel = selected.includes(s.id);
              return (
                <TableRow
                  key={s.id}
                  hover
                  selected={isSel}
                  onClick={() => onRowClick(s)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={isSel} onChange={() => toggleOne(s.id)} />
                  </TableCell>
                  <TableCell sx={{ color: 'text.primary', fontSize: '0.875rem' }}>
                    {s.sampleName || <Box component="span" sx={{ color: 'text.disabled' }}>—</Box>}
                  </TableCell>
                  {/* Sample code — locked / muted look, mirrors lockedColumn CSS. */}
                  <TableCell sx={{ fontSize: '0.875rem', color: 'rgba(0,0,0,0.45)', cursor: 'not-allowed' }}
                    onClick={(e) => e.stopPropagation()}>
                    {s.sampleCode}
                  </TableCell>
                  <TableCell sx={{ color: s.dateOfSample ? 'text.primary' : 'text.secondary', fontSize: '0.875rem' }}>
                    {fmt(s.dateOfSample)}
                  </TableCell>
                  <TableCell sx={{ color: s.commodity ? 'text.primary' : 'text.secondary', fontSize: '0.875rem' }}>
                    {s.commodity ?? '—'}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="soft" size="small"
                      startIcon={<OpenInNew sx={{ fontSize: 16 }} />}
                      onClick={() => window.open(`/sample-sheet/${s.id}`, '_blank', 'noopener,noreferrer')}
                      sx={{
                        textTransform: 'none', borderRadius: '8px', height: 30,
                        bgcolor: 'grey.100', color: 'text.secondary',
                        '&:hover': { bgcolor: 'grey.200' },
                      }}
                    >
                      Open PDF
                    </Button>
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                    <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
                      <Tooltip title="Duplicate" arrow placement="top" enterDelay={150}>
                        <IconButton size="small" onClick={() => onDuplicate(s)}>
                          <ContentCopy fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete" arrow placement="top" enterDelay={150}>
                        <IconButton size="small" onClick={() => onDelete(s)}>
                          <DeleteOutline fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Button
                        variant="soft" size="small"
                        startIcon={<Add sx={{ fontSize: 16 }} />}
                        onClick={() => onAddLabReport(s)}
                        sx={{
                          ml: 0.5, textTransform: 'none', borderRadius: '8px', height: 30,
                          bgcolor: 'grey.100', color: 'text.secondary',
                          '&:hover': { bgcolor: 'grey.200' },
                        }}
                      >
                        Add lab report
                      </Button>
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

/* ── Sortable / info-tip header cell ──────────────────────────────────────── */
function Th({
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
  const inner = sortable && onClick ? (
    <TableSortLabel active={active} direction={active ? dir : 'asc'} onClick={onClick} sx={labelSx}>
      {children}
    </TableSortLabel>
  ) : (
    <Typography component="span" sx={labelSx}>{children}</Typography>
  );

  return (
    <TableCell>
      <Stack direction="row" alignItems="center" spacing={0.5}>
        {inner}
        {trailingInfoTip && (
          <Tooltip arrow placement="top" enterDelay={150} title={trailingInfoTip}>
            <InfoOutlined sx={{ fontSize: 14, color: 'text.disabled', cursor: 'help' }} />
          </Tooltip>
        )}
      </Stack>
    </TableCell>
  );
}
