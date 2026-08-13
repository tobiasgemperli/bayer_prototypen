import React, { useMemo, useState } from 'react';
import {
  Button, Checkbox, IconButton, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TableSortLabel, Tooltip, Typography,
} from '@mui/material';
import {
  Add, ContentCopy, DeleteOutline, InfoOutlined, OpenInNew,
} from '@mui/icons-material';
import { TableCard, EmDash } from '../../design-system/TableCard';
import { ApiConnectionChip, NameWithChip } from '../../design-system/Chips';
import { LabSampleData, LABS_WITH_API_CONNECTION } from '../../data/lab-results-data';

interface SamplesReportsTableProps {
  rows: LabSampleData[];
  selected: string[];
  onSelectChange: (ids: string[]) => void;
  /** Click anywhere on the row (outside actions) navigates to the sample page. */
  onRowClick: (s: LabSampleData) => void;
  onDuplicate: (s: LabSampleData) => void;
  onDelete: (s: LabSampleData) => void;
  onAddReportAndResults: (s: LabSampleData) => void;
}

type SortField = 'sampleName' | 'dateOfSample' | 'commodity' | 'laboratory';
type SortOrder = 'asc' | 'desc';

export function SamplesReportsTable({
  rows, selected, onSelectChange, onRowClick, onDuplicate, onDelete, onAddReportAndResults,
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
            <TableRow>
              <TableCell padding="checkbox">
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
              <Th sortable active={orderBy === 'laboratory'} dir={order} onClick={() => handleSort('laboratory')}>
                Laboratory
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
                    {s.sampleName || <EmDash />}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.875rem' }}>
                    {fmt(s.dateOfSample) ?? <EmDash />}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.875rem' }}>
                    {s.commodity ?? <EmDash />}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.875rem' }}>
                    {s.laboratory ? (
                      <NameWithChip
                        name={s.laboratory}
                        chip={LABS_WITH_API_CONNECTION.has(s.laboratory) && <ApiConnectionChip />}
                      />
                    ) : (
                      <EmDash />
                    )}
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
                      Sample sheet
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
                        onClick={() => onAddReportAndResults(s)}
                        sx={{
                          ml: 0.5, textTransform: 'none', borderRadius: '8px', height: 30,
                          bgcolor: 'grey.100', color: 'text.secondary',
                          '&:hover': { bgcolor: 'grey.200' },
                        }}
                      >
                        Add report & results
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
