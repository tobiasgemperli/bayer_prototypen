import React, { useState, useMemo } from 'react';
import { useNavigate } from '../variant-context';
import {
  Autocomplete, TextField, Button, InputAdornment, Box, Typography, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TableSortLabel, Checkbox, Chip, Drawer, Divider, List, ListItem,
  ListItemIcon, ListItemText, Alert,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  Add, Search, Close as CloseIcon, CheckCircle, RadioButtonUnchecked,
  CheckCircleOutline, OpenInNew,
} from '@mui/icons-material';
import { toast } from 'sonner';
import { EmptyState } from '../../design-system/EmptyState';
import { TableCard } from '../../design-system/TableCard';
import {
  usePlots, getUniqueSeasons, getUniqueCrops,
  getPlotCompleteness, isPlotDraft, updatePlot, PLOT_MANDATORY,
  treatmentsData, isTreatmentDraft,
} from '../../data/plots-data';
import type { PlotData } from '../../data/plots-data';
import noPlotImg from '../../assets/empty-states/no-plot-yet-v01.jpg';

const CREATE_SEASON_ACTION = '__create_season__';
type SortField = 'plotName' | 'owner' | 'variety' | 'location' | 'lastTreatment';
type SortOrder = 'asc' | 'desc';

// ── Side-panel ────────────────────────────────────────────────────────────────

interface SidePanelProps {
  plot: PlotData | null;
  onClose: () => void;
  onNavigate: (path: string, state?: unknown) => void;
}

function SidePanel({ plot, onClose, onNavigate }: SidePanelProps) {
  const [values, setValues] = useState<Record<string, string | Date | null>>({});
  const [saved, setSaved] = useState(false);

  // Reset local state whenever a new plot opens
  React.useEffect(() => {
    setValues({});
    setSaved(false);
  }, [plot?.id]);

  if (!plot) return null;

  const completeness = getPlotCompleteness(plot);
  const allChecksFilled = completeness.missingKeys.every(k => {
    const v = values[k];
    if (v == null || v === '') return false;
    if (v instanceof Date) return !isNaN(v.getTime());
    return String(v).trim().length > 0;
  });
  const isNowComplete = completeness.complete || allChecksFilled || saved;

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return '—';
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
  };

  const handleSave = () => {
    const patch: Partial<PlotData> = {};
    for (const key of completeness.missingKeys) {
      if (values[key] !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (patch as any)[key] = values[key];
      }
    }
    updatePlot(plot.id, patch);
    setSaved(true);
    toast.success(`"${plot.plotName}" is now complete`);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Drawer
        anchor="right"
        open={!!plot}
        onClose={onClose}
        PaperProps={{
          sx: {
            width: 420,
            p: 0,
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        {/* Header */}
        <Box sx={{ px: 3, pt: 3, pb: 2, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
              {plot.plotName}
            </Typography>
            <Box sx={{ mt: 0.75 }}>
              {isNowComplete ? (
                <Chip
                  label="Complete"
                  size="small"
                  color="success"
                  icon={<CheckCircle sx={{ fontSize: '14px !important' }} />}
                  sx={{ fontWeight: 700, fontSize: '0.75rem', height: 24 }}
                />
              ) : (
                <Chip
                  label="Draft"
                  size="small"
                  color="warning"
                  sx={{ fontWeight: 700, fontSize: '0.75rem', height: 24 }}
                />
              )}
            </Box>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary', mt: -0.5, mr: -0.5 }}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Divider />

        {/* Scrollable body */}
        <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2.5 }}>

          {/* Success state */}
          {isNowComplete && (
            <Box sx={{
              mb: 2.5, p: 2, borderRadius: '10px',
              bgcolor: 'success.light', border: '1px solid', borderColor: 'success.main',
              display: 'flex', alignItems: 'center', gap: 1.5,
            }}>
              <CheckCircleOutline sx={{ color: 'success.dark', fontSize: 24, flexShrink: 0 }} />
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.dark' }}>
                  All fields complete
                </Typography>
                <Typography variant="body2" sx={{ color: 'success.dark', opacity: 0.85, fontSize: '0.8rem' }}>
                  This plot is forecast-ready.
                </Typography>
              </Box>
            </Box>
          )}

          {/* Record summary */}
          <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '0.08em', display: 'block', mb: 1 }}>
            Record
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 3 }}>
            {[
              { label: 'Crop', value: plot.crop },
              { label: 'Season', value: plot.season },
              { label: 'Owner', value: plot.owner },
              { label: 'Location', value: plot.location },
              { label: 'Variety', value: plot.variety || '—' },
              { label: 'Planting date', value: formatDate(plot.plantingDate) },
            ].map(({ label, value }) => (
              <Box key={label} sx={{ bgcolor: 'grey.50', borderRadius: '8px', px: 1.5, py: 1 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, display: 'block' }}>
                  {label}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500, color: value === '—' ? 'text.disabled' : 'text.primary' }}>
                  {value}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Missing-field checklist */}
          {!completeness.complete && !saved && (
            <>
              <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '0.08em', display: 'block', mb: 1 }}>
                Missing fields ({completeness.missing.length})
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.8125rem' }}>
                Fill in the items below to make this plot forecast-ready.
              </Typography>
              <List disablePadding sx={{ mb: 2 }}>
                {completeness.missingKeys.map(key => {
                  const label = PLOT_MANDATORY.find(f => f.key === key)?.label ?? key;
                  const val = values[key];
                  const isFilled = val != null && val !== '' && !(val instanceof Date && isNaN((val as Date).getTime()));
                  return (
                    <ListItem
                      key={key}
                      disableGutters
                      alignItems="flex-start"
                      sx={{ flexDirection: 'column', mb: 1.5, p: 0 }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, width: '100%' }}>
                        <ListItemIcon sx={{ minWidth: 0 }}>
                          {isFilled
                            ? <CheckCircle sx={{ color: 'success.main', fontSize: 18 }} />
                            : <RadioButtonUnchecked sx={{ color: 'text.disabled', fontSize: 18 }} />
                          }
                        </ListItemIcon>
                        <ListItemText
                          primary={label}
                          primaryTypographyProps={{ fontSize: '0.8125rem', fontWeight: isFilled ? 700 : 500, color: isFilled ? 'success.dark' : 'text.primary' }}
                          sx={{ m: 0 }}
                        />
                      </Box>
                      <Box sx={{ pl: 3.5, width: '100%' }}>
                        {key === 'plantingDate' ? (
                          <DatePicker
                            value={(val as Date | null) ?? null}
                            onChange={date => setValues(prev => ({ ...prev, [key]: date }))}
                            slotProps={{
                              textField: {
                                size: 'small',
                                fullWidth: true,
                                sx: { '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: 'white' } },
                              },
                            }}
                          />
                        ) : (
                          <TextField
                            size="small"
                            fullWidth
                            placeholder={`Enter ${label.toLowerCase()}…`}
                            value={(val as string) ?? ''}
                            onChange={e => setValues(prev => ({ ...prev, [key]: e.target.value }))}
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: 'white' } }}
                          />
                        )}
                      </Box>
                    </ListItem>
                  );
                })}
              </List>

              <Button
                variant="contained"
                color="primary"
                fullWidth
                disabled={!allChecksFilled}
                onClick={handleSave}
                startIcon={<CheckCircleOutline />}
                sx={{ fontWeight: 700, textTransform: 'none', borderRadius: '8px', height: 44 }}
              >
                Mark as complete
              </Button>
            </>
          )}
        </Box>
      </Drawer>
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
  const [selectedPlotIds, setSelectedPlotIds] = useState<string[]>([]);
  const [panelPlot, setPanelPlot] = useState<PlotData | null>(null);
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

  // Draft treatments hint — cross-record consistency
  const draftTreatments = useMemo(() => treatmentsData.filter(isTreatmentDraft), []);
  const draftTreatmentsByPlot = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of draftTreatments) {
      map.set(t.plotId, (map.get(t.plotId) ?? 0) + 1);
    }
    return map;
  }, [draftTreatments]);

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
      return matchesSeason && matchesCrop && matchesSearch;
    });
  }, [plots, selectedSeason, selectedCrop, searchQuery]);

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

  // Navigate handler that panels can call — respects variant prefix
  const handleNavigate = (path: string, state?: unknown) => {
    navigate(path, state ? { state } : undefined);
  };

  return (
    <Box
      id="draft-state-v4"
      sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', bgcolor: 'background.default', p: 3, gap: 2.5, height: '100%', overflow: 'hidden' }}
    >
      <Typography variant="h5" color="text.primary" sx={{ fontWeight: 700 }}>Plots</Typography>

      {/* Draft treatments hint chip — cross-record consistency */}
      {draftTreatments.length > 0 && (
        <Alert
          severity="info"
          icon={false}
          sx={{ borderRadius: '8px', py: 0.75, alignItems: 'center' }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {draftTreatments.length} treatment{draftTreatments.length !== 1 ? 's' : ''} need info
            </Typography>
            {Array.from(draftTreatmentsByPlot.entries()).map(([plotId, count]) => {
              const plotName = plots.find(p => p.id === plotId)?.plotName ?? `Plot ${plotId}`;
              return (
                <Chip
                  key={plotId}
                  label={`${plotName} · ${count} treatment${count !== 1 ? 's' : ''}`}
                  size="small"
                  variant="outlined"
                  color="info"
                  deleteIcon={<OpenInNew sx={{ fontSize: '14px !important' }} />}
                  onDelete={() => handleNavigate(`/plot/${plotId}`, { activeTab: 0 })}
                  onClick={() => handleNavigate(`/plot/${plotId}`, { activeTab: 0 })}
                  sx={{ fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}
                />
              );
            })}
          </Box>
        </Alert>
      )}

      {/* Filter row */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
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
            sx={{ width: 200, '& .MuiOutlinedInput-root': { bgcolor: 'white', borderRadius: '8px' } }}
            renderInput={params => <TextField {...params} placeholder="All seasons" />}
          />

          <Autocomplete
            size="small"
            options={crops}
            value={selectedCrop}
            onChange={(_, v) => setSelectedCrop(v)}
            sx={{ width: 200, '& .MuiOutlinedInput-root': { bgcolor: 'white', borderRadius: '8px' } }}
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
              body="Try adjusting the filters above."
            />
          </Paper>
        ) : (
          <TableCard>
            <TableContainer sx={{ maxHeight: 'calc(100vh - 320px)' }}>
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
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedData.map(row => {
                    const isDraft = isPlotDraft(row);
                    const isItemSelected = isSelected(row.id);
                    return (
                      <TableRow
                        hover
                        key={row.id}
                        selected={isItemSelected}
                        onClick={() => {
                          if (isDraft) {
                            setPanelPlot(row);
                          } else {
                            navigate(`/plot/${row.id}`);
                          }
                        }}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell padding="checkbox" onClick={e => e.stopPropagation()}>
                          <Checkbox checked={isItemSelected} onChange={() => handleSelect(row.id)} />
                        </TableCell>
                        <TableCell sx={{ color: 'text.primary', fontSize: '0.875rem', fontWeight: 500 }}>
                          {row.plotName}
                        </TableCell>
                        <TableCell sx={{ color: 'text.primary', fontSize: '0.875rem' }}>
                          {row.owner}
                        </TableCell>
                        <TableCell sx={{
                          color: row.variety ? 'text.primary' : 'text.disabled',
                          fontSize: '0.875rem',
                          fontStyle: row.variety ? 'normal' : 'italic',
                        }}>
                          {row.variety || 'Missing'}
                        </TableCell>
                        <TableCell sx={{ color: 'text.primary', fontSize: '0.875rem' }}>
                          {row.location}
                        </TableCell>
                        <TableCell sx={{
                          color: row.lastTreatment ? 'text.primary' : 'text.secondary',
                          fontSize: '0.875rem',
                          fontStyle: row.lastTreatment ? 'normal' : 'italic',
                        }}>
                          {row.lastTreatment ? formatDate(row.lastTreatment) : 'No treatments yet'}
                        </TableCell>
                        <TableCell
                          onClick={e => {
                            if (isDraft) {
                              e.stopPropagation();
                              setPanelPlot(row);
                            }
                          }}
                        >
                          {isDraft ? (
                            <Chip
                              label="Draft"
                              size="small"
                              color="warning"
                              sx={{
                                fontWeight: 700,
                                fontSize: '0.75rem',
                                height: 24,
                                cursor: 'pointer',
                                '&:hover': { opacity: 0.85 },
                              }}
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
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </TableCard>
        )}
      </Box>

      {/* Right side-panel */}
      <SidePanel
        plot={panelPlot}
        onClose={() => setPanelPlot(null)}
        onNavigate={handleNavigate}
      />

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
