import React, { useMemo, useState } from 'react';
import {
  Box, Typography, Button, TextField, InputAdornment, Stack,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer, TableSortLabel,
  Checkbox, Link, IconButton,
} from '@mui/material';
import { TableCard } from '../../design-system/TableCard';
import { Add, Search, DeleteOutline, Download, PictureAsPdf } from '@mui/icons-material';
import { toast } from 'sonner';
import { useNavigate } from '../variant-context';
import { OptionsTrigger } from '../../design-system/OptionsTrigger';
import { ActionMenu, ActionItem } from '../../design-system/ActionMenu';
import { EmptyState } from '../../design-system/EmptyState';
import {
  useLabSamples, deleteLabSample, analytesReportedSummary, LabSampleData,
} from '../../data/lab-results-data';
import noLabResultsImg from '../../assets/empty-states/no-lab-results-v01.jpg';

type SortField = 'sampleName' | 'sampleCode' | 'dateOfSample' | 'commodity';
type SortOrder = 'asc' | 'desc';

function fmtDate(d: Date | null): string {
  if (!d) return '-';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(d);
}

/** v4: Same table as baseline, but with "laboratory report" terminology. */
export function LabResultsContent({ plotId }: { plotId: string }) {
  const navigate = useNavigate();
  const allSamples = useLabSamples();
  const samples = useMemo(() => allSamples.filter(s => s.plotId === plotId), [allSamples, plotId]);

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
      const av = a[orderBy], bv = b[orderBy];
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
    toast.success(`${selected.length} laboratory report${selected.length !== 1 ? 's' : ''} deleted`);
    setSelected([]);
    setAnchorEl(null);
  };

  const menuActions: ActionItem[] = useMemo(() => ([
    { label: 'Export as Excel', icon: <Download fontSize="small" />, key: 'excel',
      onClick: () => { toast.success('Export as Excel prepared'); setAnchorEl(null); } },
    { label: 'Export as PDF', icon: <PictureAsPdf fontSize="small" />, key: 'pdf',
      onClick: () => { toast.success('Export as PDF prepared'); setAnchorEl(null); } },
    { divider: true, key: 'd1', onClick: () => {} },
    { label: selected.length === 1 ? 'Delete laboratory report' : 'Delete laboratory reports',
      icon: <DeleteOutline fontSize="small" />, key: 'delete',
      color: 'error.main', onClick: handleBulkDelete },
  ]), [selected.length]);

  if (samples.length === 0) {
    return (
      <EmptyState
        illustration={noLabResultsImg}
        title="Complete your residue forecast with lab results"
        body="Add lab results to keep residue forecasts and lab data aligned in one place."
        ctaLabel="Add laboratory report"
        ctaVariant="contained"
        onCta={handleAdd}
      />
    );
  }

  const isSelected = (id: string) => selected.indexOf(id) !== -1;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 2, p: 3 }}>
      <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={1.5}>
        <Button
          variant="soft" color="primary" startIcon={<Add />} onClick={handleAdd}
          sx={{ px: 2, height: 40, fontWeight: 600, borderRadius: '8px', textTransform: 'none' }}
        >Add laboratory report</Button>
        <TextField
          size="small" placeholder="Search laboratory reports..." value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search sx={{ color: 'text.disabled', fontSize: 20 }} /></InputAdornment>,
            sx: { borderRadius: '8px' },
          }}
          sx={{ width: 280, bgcolor: 'white', '& .MuiOutlinedInput-root': { height: 40 } }}
        />
        <OptionsTrigger
          onClick={(e) => setAnchorEl(e.currentTarget)}
          disabled={selected.length === 0}
          hasSelection={selected.length > 0}
        />
        <ActionMenu
          anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}
          actions={menuActions}
        />
      </Stack>

      <TableCard>
        <TableContainer sx={{ maxHeight: 'calc(100vh - 360px)' }}>
          <Table stickyHeader aria-label="laboratory reports table">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selected.length > 0 && selected.length < filtered.length}
                    checked={filtered.length > 0 && selected.length === filtered.length}
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem' }}>
                  <TableSortLabel active={orderBy === 'sampleName'}
                    direction={orderBy === 'sampleName' ? order : 'asc'}
                    onClick={() => handleSort('sampleName')}>Sample name</TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem' }}>
                  <TableSortLabel active={orderBy === 'sampleCode'}
                    direction={orderBy === 'sampleCode' ? order : 'asc'}
                    onClick={() => handleSort('sampleCode')}>Sample Code</TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem' }}>
                  <TableSortLabel active={orderBy === 'dateOfSample'}
                    direction={orderBy === 'dateOfSample' ? order : 'asc'}
                    onClick={() => handleSort('dateOfSample')}>Date of sample</TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem' }}>
                  <TableSortLabel active={orderBy === 'commodity'}
                    direction={orderBy === 'commodity' ? order : 'asc'}
                    onClick={() => handleSort('commodity')}>Sample type</TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem' }}>Analytes reported</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem' }}>Sample label</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sorted.map((s: LabSampleData) => {
                const sel = isSelected(s.id);
                return (
                  <TableRow key={s.id} hover selected={sel}
                    onClick={() => handleRowClick(s.id)}
                    sx={{ cursor: 'pointer' }}>
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
                    <TableCell sx={{ color: 'text.primary', fontSize: '0.875rem' }}>{analytesReportedSummary(s)}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Link component="button"
                        sx={{ fontWeight: 600, color: 'primary.main', fontSize: '0.875rem', textDecorationColor: 'currentColor' }}
                        onClick={() => toast.info(`Sample label for ${s.sampleCode}`)}>
                        Sample label
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </TableCard>
    </Box>
  );
}
