import React, { useMemo, useState } from 'react';
import {
  Box, Typography, Button, TextField, InputAdornment, Stack,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer, TableSortLabel,
  Checkbox, Tooltip,
} from '@mui/material';
import { TableCard } from '../../design-system/TableCard';
import { RowActionButton } from '../../design-system/grid/grid-shared';
import { Add, Search, DeleteOutline, Download, PictureAsPdf, OpenInNew, TipsAndUpdates, InfoOutlined } from '@mui/icons-material';
import { toast } from 'sonner';
import { useNavigate } from '../variant-context';
import { OptionsTrigger } from '../../design-system/OptionsTrigger';
import { ActionMenu, ActionItem } from '../../design-system/ActionMenu';
import { EmptyState } from '../../design-system/EmptyState';
import {
  useLabSamples, deleteLabSample, labResultsStatus, LabSampleData,
} from '../../data/lab-results-data';
import noLabResultsImg from '../../assets/empty-states/no-lab-results-v01.jpg';

// V15 replicates the live production app's "Lab results" tab: unlike this
// repo's own "hide toolbar + count bar on empty" convention, production
// keeps the full toolbar (Add lab result / Search / Options) visible even
// with zero samples — only the illustration block below it changes. See
// research/production-lab-results-flow-analysis.txt §3 for the source screenshot.
//
// UI building blocks (TableCard, `Th`, RowActionButton, EmptyState,
// OptionsTrigger/ActionMenu) match the ones v14-sample-summary-header uses,
// so the two variants read as the same design system — only the flow/logic/
// copy here is production's, not v14's.

type SortField = 'sampleName' | 'sampleCode' | 'dateOfSample' | 'commodity';
type SortOrder = 'asc' | 'desc';

function fmtDate(d: Date | null): string {
  if (!d) return '-';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(d);
}

/** Shared read-only table header cell — same component v14 uses
 *  (v14-sample-summary-header/SamplesReportsTable.tsx) — re-declared here
 *  since it isn't promoted to design-system, and imported into
 *  LabSamplePage's Report results table so both tables render identical
 *  headers. */
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

export function LabResultsContent({ plotId }: { plotId: string }) {
  const navigate = useNavigate();
  const allSamples = useLabSamples();
  const samples = useMemo(
    () => allSamples.filter(s => s.plotId === plotId),
    [allSamples, plotId]
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [orderBy, setOrderBy] = useState<SortField | null>(null);
  const [order, setOrder] = useState<SortOrder>('asc');

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return samples;
    return samples.filter(s =>
      s.sampleName.toLowerCase().includes(q) ||
      s.sampleCode.toLowerCase().includes(q) ||
      (s.commodity ?? '').toLowerCase().includes(q)
    );
  }, [samples, searchQuery]);

  const sorted = useMemo(() => {
    if (!orderBy) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[orderBy];
      const bv = b[orderBy];
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
  }, [filtered, orderBy, order]);

  const handleSort = (field: SortField) => {
    const isAsc = orderBy === field && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(field);
  };

  const handleAdd = () => navigate(`/plot/${plotId}/lab-results/new`);
  const handleRowClick = (id: string) => navigate(`/plot/${plotId}/lab-results/${id}`);
  const handleSelect = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelected(event.target.checked ? filtered.map(s => s.id) : []);
  };
  const handleBulkDelete = () => {
    selected.forEach(id => deleteLabSample(id));
    toast.success(`${selected.length} lab result${selected.length !== 1 ? 's' : ''} deleted`);
    setSelected([]);
    setAnchorEl(null);
  };

  const menuActions: ActionItem[] = useMemo(() => ([
    { label: 'Export as Excel', icon: <Download fontSize="small" />, key: 'excel',
      onClick: () => { toast.success('Export as Excel prepared'); setAnchorEl(null); } },
    { label: 'Export as PDF', icon: <PictureAsPdf fontSize="small" />, key: 'pdf',
      onClick: () => { toast.success('Export as PDF prepared'); setAnchorEl(null); } },
    { divider: true, key: 'd1', onClick: () => {} },
    { label: selected.length === 1 ? 'Delete lab result' : 'Delete lab results',
      icon: <DeleteOutline fontSize="small" />, key: 'delete',
      color: 'error.main', onClick: handleBulkDelete },
  ]), [selected.length]);

  const isSelected = (id: string) => selected.indexOf(id) !== -1;
  const isEmpty = samples.length === 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: isEmpty ? 0 : 2, p: 3 }}>
      <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={1.5}>
        <Button
          variant="soft" color="primary" startIcon={<Add />} onClick={handleAdd}
          sx={{ px: 2, height: 40, fontWeight: 600, borderRadius: '8px', textTransform: 'none' }}
        >Add lab result</Button>
        <TextField
          size="small" placeholder="Search" value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={isEmpty}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search sx={{ color: 'text.disabled', fontSize: 20 }} /></InputAdornment>,
            sx: { borderRadius: '8px' },
          }}
          sx={{ width: 240, bgcolor: 'white', '& .MuiOutlinedInput-root': { height: 40 } }}
        />
        <OptionsTrigger
          onClick={(e) => setAnchorEl(e.currentTarget)}
          disabled={isEmpty || selected.length === 0}
          hasSelection={selected.length > 0}
        />
        <ActionMenu
          anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}
          actions={menuActions}
        />
      </Stack>

      {isEmpty ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <EmptyState
            illustration={noLabResultsImg}
            title="Complete your residue predictions with lab results"
            body="Add lab results to keep residue predictions and lab data aligned in one place."
            ctaLabel="Add lab result"
            ctaVariant="outlined"
            onCta={handleAdd}
          />
          <Box sx={{
            display: 'flex', alignItems: 'flex-start', gap: 1.5, maxWidth: 420, width: '100%',
            border: '1px solid', borderColor: 'divider', borderRadius: '8px', p: 2, mt: -2, mb: 3,
          }}>
            <TipsAndUpdates sx={{ color: 'warning.main', fontSize: 20, mt: 0.25 }} />
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: '0.8125rem', mb: 0.25 }}>Tips &amp; Tricks</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
                Lab details and attachments can be added later
              </Typography>
            </Box>
          </Box>
        </Box>
      ) : (
        <TableCard>
          <TableContainer sx={{ maxHeight: 'calc(100vh - 360px)' }}>
            <Table stickyHeader aria-label="lab results table">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selected.length > 0 && selected.length < filtered.length}
                      checked={filtered.length > 0 && selected.length === filtered.length}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <Th sortable active={orderBy === 'sampleName'} dir={order} onClick={() => handleSort('sampleName')}>
                    Sample name
                  </Th>
                  <Th sortable active={orderBy === 'sampleCode'} dir={order} onClick={() => handleSort('sampleCode')}>
                    Sample code
                  </Th>
                  <Th sortable active={orderBy === 'dateOfSample'} dir={order} onClick={() => handleSort('dateOfSample')}>
                    Sample date
                  </Th>
                  <Th sortable active={orderBy === 'commodity'} dir={order} onClick={() => handleSort('commodity')}>
                    Commodity
                  </Th>
                  <Th>Lab results</Th>
                  <Th
                    trailingInfoTip="Send this sheet with the sample to the laboratory. It includes the sample details and the ResiYou ID for later."
                  >
                    Sample sheet
                  </Th>
                </TableRow>
              </TableHead>
              <TableBody>
                {sorted.map((s: LabSampleData) => {
                  const sel = isSelected(s.id);
                  const status = labResultsStatus(s);
                  const statusColor =
                    status.tone === 'positive' ? 'success.main' :
                    status.tone === 'negative' ? 'error.main' :
                    'text.secondary';
                  return (
                    <TableRow
                      key={s.id} hover selected={sel}
                      onClick={() => handleRowClick(s.id)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={sel} onChange={() => handleSelect(s.id)} />
                      </TableCell>
                      <TableCell sx={{ color: 'text.primary', fontSize: '0.875rem' }}>
                        {s.sampleName || <Box component="span" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>—</Box>}
                      </TableCell>
                      <TableCell sx={{ color: 'text.primary', fontSize: '0.875rem' }}>{s.sampleCode}</TableCell>
                      <TableCell sx={{ color: 'text.primary', fontSize: '0.875rem' }}>{fmtDate(s.dateOfSample)}</TableCell>
                      <TableCell sx={{ color: 'text.primary', fontSize: '0.875rem' }}>
                        {s.commodity ?? <Box component="span" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>—</Box>}
                      </TableCell>
                      <TableCell sx={{ color: statusColor, fontSize: '0.875rem', fontWeight: status.tone === 'neutral' ? 400 : 600 }}>
                        {status.text}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <RowActionButton
                          startIcon={<OpenInNew sx={{ fontSize: 16 }} />}
                          onClick={() => window.open(`/sample-sheet/${s.id}`, '_blank', 'noopener,noreferrer')}
                        >
                          Sample sheet
                        </RowActionButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </TableCard>
      )}
    </Box>
  );
}
