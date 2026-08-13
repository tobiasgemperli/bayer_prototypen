import React, { useState, useMemo } from 'react';
import { useNavigate } from '../variant-context';
import {
  Autocomplete, TextField, Button, InputAdornment, Box, Typography, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TableSortLabel, Checkbox, Chip, ToggleButton, ToggleButtonGroup, Alert,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  Add, Search, Close as CloseIcon, CheckCircleOutline,
} from '@mui/icons-material';
import { toast } from 'sonner';
import { EmptyState } from '../../design-system/EmptyState';
import { TableCard } from '../../design-system/TableCard';
import {
  usePlots, getUniqueSeasons, getUniqueCrops,
  getPlotCompleteness, isPlotDraft, updatePlot, PLOT_MANDATORY,
} from '../../data/plots-data';
import type { PlotData } from '../../data/plots-data';
import noPlotImg from '../../assets/empty-states/no-plot-yet-v01.jpg';

const CREATE_SEASON_ACTION = '__create_season__';
type DraftFilter = 'all' | 'drafts' | 'complete';
type SortField = 'plotName' | 'owner' | 'variety' | 'location' | 'lastTreatment';
type SortOrder = 'asc' | 'desc';

// ── Complete dialog ───────────────────────────────────────────────────────────

interface CompleteDialogProps {
  plot: PlotData | null;
  onClose: () => void;
}

function CompleteDialog({ plot, onClose }: CompleteDialogProps) {
  const [values, setValues] = useState<Record<string, string | Date | null>>({});

  if (!plot) return null;
  const completeness = getPlotCompleteness(plot);

  const handleSave = () => {
    const patch: Partial<PlotData> = {};
    for (const key of completeness.missingKeys) {
      if (values[key] !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (patch as any)[key] = values[key];
      }
    }
    updatePlot(plot.id, patch);
    toast.success(`"${plot.plotName}" updated`);
    onClose();
  };

  const allFilled = completeness.missingKeys.every(k => {
    const v = values[k];
    if (v == null || v === '') return false;
    if (v instanceof Date) return !isNaN(v.getTime());
    return String(v).trim().length > 0;
  });

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog
        open={!!plot}
        onClose={onClose}
        fullWidth
        maxWidth="xs"
        PaperProps={{ sx: { borderRadius: '12px', boxShadow: '0px 8px 32px rgba(0,0,0,0.12)' } }}
      >
        <DialogTitle sx={{ m: 0, px: 3, pt: 3, pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.125rem' }}>
            Complete "{plot.plotName}"
          </Typography>
          <IconButton onClick={onClose} sx={{ color: 'text.secondary', p: 0.5 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ px: 3, pt: 0, pb: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            Fill in the missing fields to make this plot forecast-ready.
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {completeness.missingKeys.map(key => {
              const label = PLOT_MANDATORY.find(f => f.key === key)?.label ?? key;
              if (key === 'plantingDate') {
                return (
                  <DatePicker
                    key={key}
                    label={label}
                    value={(values[key] as Date | null) ?? null}
                    onChange={date => setValues(prev => ({ ...prev, [key]: date }))}
                    slotProps={{
                      textField: {
                        size: 'small',
                        fullWidth: true,
                        sx: { '& .MuiOutlinedInput-root': { borderRadius: '8px' } },
                      },
                    }}
                  />
                );
              }
              return (
                <TextField
                  key={key}
                  label={label}
                  size="small"
                  fullWidth
                  value={(values[key] as string) ?? ''}
                  onChange={e => setValues(prev => ({ ...prev, [key]: e.target.value }))}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                />
              );
            })}
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3, pt: 1, gap: 1.5 }}>
          <Button onClick={onClose} variant="text" color="inherit"
            sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            color="primary"
            disabled={!allFilled}
            startIcon={<CheckCircleOutline />}
            sx={{ fontWeight: 600, px: 3, textTransform: 'none' }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function PlotsPage() {
  const navigate = useNavigate();
  const plots = usePlots();

  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
  const [selectedCrop, setSelectedCrop] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [draftFilter, setDraftFilter] = useState<DraftFilter>('all');
  const [selectedPlotIds, setSelectedPlotIds] = useState<string[]>([]);
  const [completingPlot, setCompletingPlot] = useState<PlotData | null>(null);
  const [customSeasons, setCustomSeasons] = useState<string[]>([]);
  const [seasonModalOpen, setSeasonModalOpen] = useState(false);
  const [newSeasonName, setNewSeasonName] = useState('');
  const [orderBy, setOrderBy] = useState<SortField | null>(null);
  const [order, setOrder] = useState<SortOrder>('asc');

  const seasons = useMemo(
    () => Array.from(new Set([...getUniqueSeasons(plots), ...customSeasons])).sort(),
    [plots, customSeasons],
  );
  const crops = useMemo(() => getUniqueCrops(plots), [plots]);

  const draftCount = useMemo(() => plots.filter(isPlotDraft).length, [plots]);

  const handleCreateSeason = () => {
    const name = newSeasonName.trim();
    if (!name) return;
    setCustomSeasons(prev => prev.includes(name) ? prev : [...prev, name]);
    setSelectedSeason(name);
    setSeasonModalOpen(false);
    setNewSeasonName('');
  };

  const filteredData = useMemo(() => {
    return plots.filter(plot => {
      const matchesSeason = !selectedSeason || plot.season === selectedSeason;
      const matchesCrop = !selectedCrop || plot.crop === selectedCrop;
      const matchesSearch =
        searchQuery === '' ||
        plot.plotName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plot.owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plot.variety.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plot.location.toLowerCase().includes(searchQuery.toLowerCase());
      const draft = isPlotDraft(plot);
      const matchesDraftFilter =
        draftFilter === 'all' ||
        (draftFilter === 'drafts' && draft) ||
        (draftFilter === 'complete' && !draft);
      return matchesSeason && matchesCrop && matchesSearch && matchesDraftFilter;
    });
  }, [plots, selectedSeason, selectedCrop, searchQuery, draftFilter]);

  const sortedData = useMemo(() => {
    if (!orderBy) return filteredData;
    return [...filteredData].sort((a, b) => {
      if (orderBy === 'lastTreatment') {
        const at = a.lastTreatment ? a.lastTreatment.getTime() : 0;
        const bt = b.lastTreatment ? b.lastTreatment.getTime() : 0;
        return order === 'asc' ? at - bt : bt - at;
      }
      const aStr = String(a[orderBy] ?? '').toLowerCase();
      const bStr = String(b[orderBy] ?? '').toLowerCase();
      if (aStr < bStr) return order === 'asc' ? -1 : 1;
      if (aStr > bStr) return order === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, orderBy, order]);

  const handleSort = (field: SortField) => {
    const isAsc = orderBy === field && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(field);
  };

  const isSelected = (id: string) => selectedPlotIds.includes(id);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedPlotIds(filteredData.map(p => p.id));
    else setSelectedPlotIds([]);
  };

  const handleSelect = (id: string) => {
    setSelectedPlotIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );
  };

  const handleResetFilters = () => { setSelectedSeason(null); setSelectedCrop(null); };
  const isAnyFilterActive = selectedSeason !== null || selectedCrop !== null;

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);

  const isEmpty = plots.length === 0;

  return (
    <Box
      id="draft-state-v1"
      sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', bgcolor: 'background.default', p: 3, gap: 2.5, height: '100%', overflow: 'hidden' }}
    >
      <Typography variant="h5" color="text.primary" sx={{ fontWeight: 700 }}>Plots</Typography>

      {/* Draft banner */}
      {draftCount > 0 && (
        <Alert
          severity="warning"
          action={
            <Button
              color="inherit"
              size="small"
              sx={{ fontWeight: 700, textTransform: 'none', whiteSpace: 'nowrap' }}
              onClick={() => setDraftFilter('drafts')}
            >
              Show drafts
            </Button>
          }
          sx={{ borderRadius: '8px', alignItems: 'center' }}
        >
          <strong>{draftCount} plot{draftCount !== 1 ? 's' : ''}</strong> need info to forecast
        </Alert>
      )}

      {/* Filter row */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          {/* Draft / Complete / All segmented control */}
          <ToggleButtonGroup
            exclusive
            value={draftFilter}
            onChange={(_, v) => { if (v) setDraftFilter(v); }}
            size="small"
            sx={{ '& .MuiToggleButton-root': { textTransform: 'none', fontWeight: 600, px: 2, height: 40, borderRadius: '8px', fontSize: '0.875rem' } }}
          >
            <ToggleButton value="all">All</ToggleButton>
            <ToggleButton value="drafts">Drafts</ToggleButton>
            <ToggleButton value="complete">Complete</ToggleButton>
          </ToggleButtonGroup>

          <Autocomplete
            size="small"
            value={selectedSeason}
            options={[...seasons, CREATE_SEASON_ACTION]}
            getOptionLabel={opt => opt === CREATE_SEASON_ACTION ? 'Create new season' : opt}
            filterOptions={(options, state) => {
              const filtered = options.filter(o => o !== CREATE_SEASON_ACTION && o.toLowerCase().includes(state.inputValue.toLowerCase()));
              filtered.push(CREATE_SEASON_ACTION);
              return filtered;
            }}
            onChange={(_, v) => {
              if (v === CREATE_SEASON_ACTION) { setNewSeasonName(''); setSeasonModalOpen(true); }
              else setSelectedSeason(v);
            }}
            renderOption={(props, option) => {
              const { key, ...rest } = props;
              if (option === CREATE_SEASON_ACTION) {
                return (
                  <li key={key} {...rest} style={{ ...rest.style, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Add sx={{ fontSize: 20, color: 'primary.main' }} />
                    <Typography sx={{ color: 'primary.main', fontWeight: 600, fontSize: '0.875rem' }}>Create new season</Typography>
                  </li>
                );
              }
              return <li key={key} {...rest}>{option}</li>;
            }}
            sx={{ width: 180, '& .MuiOutlinedInput-root': { bgcolor: 'white', borderRadius: '8px' } }}
            renderInput={params => <TextField {...params} placeholder="All seasons" />}
          />

          <Autocomplete
            size="small"
            options={crops}
            value={selectedCrop}
            onChange={(_, v) => setSelectedCrop(v)}
            sx={{ width: 180, '& .MuiOutlinedInput-root': { bgcolor: 'white', borderRadius: '8px' } }}
            renderInput={params => <TextField {...params} placeholder="All crops" />}
          />

          {isAnyFilterActive && (
            <Button onClick={handleResetFilters} color="inherit"
              sx={{ fontSize: '0.875rem', opacity: 0.7, textTransform: 'none', fontWeight: 600, '&:hover': { bgcolor: 'action.hover', opacity: 1 } }}>
              Reset filters
            </Button>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Button
            variant="soft"
            color="primary"
            startIcon={<Add />}
            onClick={() => navigate('/add-plot')}
            sx={{ px: 2, height: 40, borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
          >
            Add plot
          </Button>
          <TextField
            size="small"
            placeholder="Search plots..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search sx={{ color: 'text.disabled', fontSize: 20 }} /></InputAdornment>,
              sx: { borderRadius: '8px' },
            }}
            sx={{ width: 240, bgcolor: 'white', '& .MuiOutlinedInput-root': { height: 40 } }}
          />
        </Box>
      </Box>

      {/* Table area */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {isEmpty ? (
          <Paper elevation={0} sx={{ flex: 1, borderRadius: '12px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', display: 'flex' }}>
            <EmptyState
              illustration={noPlotImg}
              title="See your residue levels in minutes"
              body="Start by creating your first plot."
              ctaLabel="Add plot"
              ctaVariant="contained"
              onCta={() => navigate('/add-plot')}
            />
          </Paper>
        ) : filteredData.length === 0 ? (
          <Paper elevation={0} sx={{ flex: 1, borderRadius: '12px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', display: 'flex' }}>
            <EmptyState
              title="No plots match your filters"
              body="Try adjusting the filter above."
            />
          </Paper>
        ) : (
          <TableCard>
            <TableContainer sx={{ maxHeight: 'calc(100vh - 360px)' }}>
              <Table stickyHeader aria-label="plots table">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        indeterminate={selectedPlotIds.length > 0 && selectedPlotIds.length < filteredData.length}
                        checked={filteredData.length > 0 && selectedPlotIds.length === filteredData.length}
                        onChange={handleSelectAll}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem' }}>
                      <TableSortLabel active={orderBy === 'plotName'} direction={orderBy === 'plotName' ? order : 'asc'} onClick={() => handleSort('plotName')}>Plot</TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem' }}>
                      <TableSortLabel active={orderBy === 'owner'} direction={orderBy === 'owner' ? order : 'asc'} onClick={() => handleSort('owner')}>Owner</TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem' }}>
                      <TableSortLabel active={orderBy === 'variety'} direction={orderBy === 'variety' ? order : 'asc'} onClick={() => handleSort('variety')}>Variety</TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem' }}>
                      <TableSortLabel active={orderBy === 'location'} direction={orderBy === 'location' ? order : 'asc'} onClick={() => handleSort('location')}>Location</TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem' }}>
                      <TableSortLabel active={orderBy === 'lastTreatment'} direction={orderBy === 'lastTreatment' ? order : 'asc'} onClick={() => handleSort('lastTreatment')}>Last real treatment</TableSortLabel>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem' }}>Completeness</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem' }}></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedData.map(row => {
                    const completeness = getPlotCompleteness(row);
                    const draft = !completeness.complete;
                    const isItemSelected = isSelected(row.id);
                    return (
                      <TableRow
                        hover
                        key={row.id}
                        selected={isItemSelected}
                        onClick={() => navigate(`/plot/${row.id}`)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell padding="checkbox" onClick={e => e.stopPropagation()}>
                          <Checkbox checked={isItemSelected} onChange={() => handleSelect(row.id)} />
                        </TableCell>
                        <TableCell sx={{ color: 'text.primary', fontSize: '0.875rem' }}>
                          {row.plotName}
                        </TableCell>
                        <TableCell sx={{ color: 'text.primary', fontSize: '0.875rem' }}>
                          {row.owner}
                        </TableCell>
                        <TableCell sx={{ color: row.variety ? 'text.primary' : 'text.disabled', fontSize: '0.875rem', fontStyle: row.variety ? 'normal' : 'italic' }}>
                          {row.variety || 'Missing'}
                        </TableCell>
                        <TableCell sx={{ color: 'text.primary', fontSize: '0.875rem' }}>
                          {row.location}
                        </TableCell>
                        <TableCell sx={{ color: row.lastTreatment ? 'text.primary' : 'text.secondary', fontSize: '0.875rem', fontStyle: row.lastTreatment ? 'normal' : 'italic' }}>
                          {row.lastTreatment ? formatDate(row.lastTreatment) : 'No treatments yet'}
                        </TableCell>
                        <TableCell>
                          {draft ? (
                            <Chip
                              label="Draft"
                              size="small"
                              color="warning"
                              sx={{ fontWeight: 700, fontSize: '0.75rem', height: 24 }}
                            />
                          ) : (
                            <Chip
                              label="Complete"
                              size="small"
                              color="success"
                              variant="outlined"
                              sx={{ fontWeight: 600, fontSize: '0.75rem', height: 24 }}
                            />
                          )}
                        </TableCell>
                        <TableCell sx={{ color: draft ? 'warning.main' : 'text.secondary', fontSize: '0.875rem', fontWeight: draft ? 600 : 400 }}>
                          {completeness.filled}/{completeness.total}
                        </TableCell>
                        <TableCell onClick={e => e.stopPropagation()}>
                          {draft && (
                            <Button
                              size="small"
                              variant="soft"
                              color="primary"
                              onClick={() => setCompletingPlot(row)}
                              sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.8125rem', whiteSpace: 'nowrap', borderRadius: '6px' }}
                            >
                              Complete
                            </Button>
                          )}
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

      {/* Complete dialog */}
      <CompleteDialog plot={completingPlot} onClose={() => setCompletingPlot(null)} />

      {/* Create new season modal */}
      <Dialog open={seasonModalOpen} onClose={() => setSeasonModalOpen(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: '12px' } }}>
        <DialogTitle sx={{ px: 3, pt: 3, pb: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Create new season</Typography>
          <IconButton onClick={() => setSeasonModalOpen(false)} sx={{ color: 'text.secondary', p: 0.5 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ px: 3, pt: 1, pb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter a name for the new season.
          </Typography>
          <TextField fullWidth size="small" placeholder="e.g. Spring 2025" autoFocus
            value={newSeasonName} onChange={e => setNewSeasonName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreateSeason(); }}
            sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'white', borderRadius: '8px' } }} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 1, gap: 1 }}>
          <Button variant="text" color="inherit" onClick={() => setSeasonModalOpen(false)}
            sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'none' }}>
            Cancel
          </Button>
          <Button variant="contained" color="primary" disabled={!newSeasonName.trim()} onClick={handleCreateSeason}
            sx={{ fontWeight: 600, textTransform: 'none', px: 3 }}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
