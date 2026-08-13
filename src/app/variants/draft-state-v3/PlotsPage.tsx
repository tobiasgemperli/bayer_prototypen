import React, { useState, useMemo } from 'react';
import { useNavigate } from '../variant-context';
import {
  Autocomplete, TextField, Button, InputAdornment, Box, Typography, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TableSortLabel, Checkbox, Chip,
  Stepper, Step, StepLabel,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  Add, Search, Close as CloseIcon, CheckCircleOutline,
  ArrowForward, ArrowBack,
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
type SortField = 'plotName' | 'owner' | 'variety' | 'location' | 'lastTreatment';
type SortOrder = 'asc' | 'desc';

// ── Guided stepper dialog ─────────────────────────────────────────────────────

interface StepperDialogProps {
  plot: PlotData | null;
  onClose: () => void;
}

function StepperDialog({ plot, onClose }: StepperDialogProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [values, setValues] = useState<Record<string, string | Date | null>>({});

  if (!plot) return null;

  const completeness = getPlotCompleteness(plot);
  const missingKeys = completeness.missingKeys;
  const steps = missingKeys.map(key => PLOT_MANDATORY.find(f => f.key === key)?.label ?? key);
  const currentKey = missingKeys[activeStep];
  const currentLabel = steps[activeStep];
  const currentValue = values[currentKey] ?? null;

  const isCurrentFilled = (() => {
    const v = currentValue;
    if (v == null || v === '') return false;
    if (v instanceof Date) return !isNaN(v.getTime());
    return String(v).trim().length > 0;
  })();

  const isLastStep = activeStep === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      const patch: Partial<PlotData> = {};
      for (const key of missingKeys) {
        if (values[key] !== undefined) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (patch as any)[key] = values[key];
        }
      }
      updatePlot(plot.id, patch);
      toast.success(`"${plot.plotName}" is now complete`);
      onClose();
    } else {
      setActiveStep(s => s + 1);
    }
  };

  const handleBack = () => setActiveStep(s => s - 1);

  const handleClose = () => {
    setActiveStep(0);
    setValues({});
    onClose();
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog
        open={!!plot}
        onClose={handleClose}
        fullWidth
        maxWidth="xs"
        PaperProps={{ sx: { borderRadius: '12px', boxShadow: '0px 8px 32px rgba(0,0,0,0.12)' } }}
      >
        <DialogTitle sx={{ m: 0, px: 3, pt: 3, pb: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.125rem', lineHeight: 1.3 }}>
              Complete "{plot.plotName}"
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {steps.length} missing field{steps.length !== 1 ? 's' : ''} — fill each to make this plot forecast-ready
            </Typography>
          </Box>
          <IconButton onClick={handleClose} sx={{ color: 'text.secondary', p: 0.5, alignSelf: 'flex-start' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        {/* Stepper indicator */}
        <Box sx={{ px: 3, pb: 1 }}>
          <Stepper activeStep={activeStep} alternativeLabel sx={{ '& .MuiStepLabel-label': { fontSize: '0.75rem' } }}>
            {steps.map(label => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        <DialogContent sx={{ px: 3, pt: 2, pb: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Step {activeStep + 1} of {steps.length}: <strong>{currentLabel}</strong>
          </Typography>

          {currentKey === 'plantingDate' ? (
            <DatePicker
              label={currentLabel}
              value={(currentValue as Date | null)}
              onChange={date => setValues(prev => ({ ...prev, [currentKey]: date }))}
              slotProps={{
                textField: {
                  size: 'small',
                  fullWidth: true,
                  autoFocus: true,
                  sx: { '& .MuiOutlinedInput-root': { borderRadius: '8px' } },
                },
              }}
            />
          ) : (
            <TextField
              label={currentLabel}
              size="small"
              fullWidth
              autoFocus
              value={(currentValue as string) ?? ''}
              onChange={e => setValues(prev => ({ ...prev, [currentKey]: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter' && isCurrentFilled) handleNext(); }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
            />
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3, pt: 0, gap: 1.5 }}>
          <Button
            onClick={handleClose}
            variant="text"
            color="inherit"
            sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'none', mr: 'auto' }}
          >
            Cancel
          </Button>
          {activeStep > 0 && (
            <Button
              onClick={handleBack}
              variant="text"
              color="primary"
              startIcon={<ArrowBack />}
              sx={{ fontWeight: 600, textTransform: 'none' }}
            >
              Back
            </Button>
          )}
          <Button
            onClick={handleNext}
            variant="contained"
            color="primary"
            disabled={!isCurrentFilled}
            endIcon={isLastStep ? <CheckCircleOutline /> : <ArrowForward />}
            sx={{ fontWeight: 600, px: 3, textTransform: 'none' }}
          >
            {isLastStep ? 'Complete' : 'Next'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
}

// ── Drafts tray ───────────────────────────────────────────────────────────────

interface DraftsTrayProps {
  drafts: PlotData[];
  onComplete: (plot: PlotData) => void;
}

function DraftsTray({ drafts, onComplete }: DraftsTrayProps) {
  if (drafts.length === 0) return null;

  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'warning.light',
        borderRadius: '12px',
        bgcolor: 'warning.50',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {/* Tray header */}
      <Box
        sx={{
          px: 2.5, py: 1.5,
          display: 'flex', alignItems: 'center', gap: 1,
          borderBottom: '1px solid', borderColor: 'warning.light',
          bgcolor: 'rgba(255, 167, 38, 0.08)',
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 700, color: 'warning.dark' }}>
          Drafts ({drafts.length})
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
          — incomplete mandatory data, not yet forecast-ready
        </Typography>
      </Box>

      {/* Draft rows */}
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        {drafts.map((plot, idx) => {
          const completeness = getPlotCompleteness(plot);
          return (
            <Box
              key={plot.id}
              sx={{
                px: 2.5, py: 1.25,
                display: 'flex', alignItems: 'center', gap: 2,
                borderBottom: idx < drafts.length - 1 ? '1px solid' : 'none',
                borderColor: 'warning.light',
                '&:hover': { bgcolor: 'rgba(255, 167, 38, 0.06)' },
              }}
            >
              {/* Plot name */}
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, color: 'text.primary', minWidth: 160, flexShrink: 0 }}
              >
                {plot.plotName}
              </Typography>

              {/* Missing field chips */}
              <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', flexGrow: 1 }}>
                {completeness.missing.map(label => (
                  <Chip
                    key={label}
                    label={`Missing: ${label}`}
                    size="small"
                    sx={{
                      fontSize: '0.75rem',
                      height: 22,
                      fontWeight: 500,
                      bgcolor: 'warning.100',
                      color: 'warning.dark',
                      border: '1px solid',
                      borderColor: 'warning.light',
                      '& .MuiChip-label': { px: 1 },
                    }}
                  />
                ))}
              </Box>

              {/* Complete CTA */}
              <Button
                size="small"
                variant="contained"
                color="primary"
                onClick={() => onComplete(plot)}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  borderRadius: '6px',
                  px: 2,
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                }}
              >
                Complete
              </Button>
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
}

// ── Main complete-plots table ─────────────────────────────────────────────────

interface CompletePlotsTableProps {
  data: PlotData[];
  selected: string[];
  onSelectChange: (ids: string[]) => void;
}

function CompletePlotsTable({ data, selected, onSelectChange }: CompletePlotsTableProps) {
  const navigate = useNavigate();
  const [orderBy, setOrderBy] = useState<SortField | null>(null);
  const [order, setOrder] = useState<SortOrder>('asc');

  const handleSort = (field: SortField) => {
    const isAsc = orderBy === field && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(field);
  };

  const sortedData = useMemo(() => {
    if (!orderBy) return data;
    return [...data].sort((a, b) => {
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
  }, [data, orderBy, order]);

  const isSelected = (id: string) => selected.includes(id);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) onSelectChange(data.map(p => p.id));
    else onSelectChange([]);
  };

  const handleSelect = (id: string) => {
    onSelectChange(
      selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id],
    );
  };

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);

  return (
    <TableCard>
      <TableContainer sx={{ maxHeight: 'calc(100vh - 340px)' }}>
        <Table stickyHeader aria-label="complete plots table">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selected.length > 0 && selected.length < data.length}
                  checked={data.length > 0 && selected.length === data.length}
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
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary', fontStyle: 'italic' }}>
                  No complete plots match your filters
                </TableCell>
              </TableRow>
            ) : (
              sortedData.map(row => {
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
                    <TableCell sx={{ color: 'text.primary', fontSize: '0.875rem' }}>{row.plotName}</TableCell>
                    <TableCell sx={{ color: 'text.primary', fontSize: '0.875rem' }}>{row.owner}</TableCell>
                    <TableCell sx={{ color: 'text.primary', fontSize: '0.875rem' }}>{row.variety}</TableCell>
                    <TableCell sx={{ color: 'text.primary', fontSize: '0.875rem' }}>{row.location}</TableCell>
                    <TableCell sx={{ color: row.lastTreatment ? 'text.primary' : 'text.secondary', fontSize: '0.875rem', fontStyle: row.lastTreatment ? 'normal' : 'italic' }}>
                      {row.lastTreatment ? formatDate(row.lastTreatment) : 'No treatments yet'}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </TableCard>
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
  const [completingPlot, setCompletingPlot] = useState<PlotData | null>(null);
  const [customSeasons, setCustomSeasons] = useState<string[]>([]);
  const [seasonModalOpen, setSeasonModalOpen] = useState(false);
  const [newSeasonName, setNewSeasonName] = useState('');

  const seasons = useMemo(
    () => Array.from(new Set([...getUniqueSeasons(plots), ...customSeasons])).sort(),
    [plots, customSeasons],
  );
  const crops = useMemo(() => getUniqueCrops(plots), [plots]);

  const handleCreateSeason = () => {
    const name = newSeasonName.trim();
    if (!name) return;
    setCustomSeasons(prev => prev.includes(name) ? prev : [...prev, name]);
    setSelectedSeason(name);
    setSeasonModalOpen(false);
    setNewSeasonName('');
  };

  // Apply season/crop/search filters to ALL plots, then split into draft vs complete
  const filteredPlots = useMemo(() => {
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

  const draftPlots = useMemo(() => filteredPlots.filter(isPlotDraft), [filteredPlots]);
  const completePlots = useMemo(() => filteredPlots.filter(p => !isPlotDraft(p)), [filteredPlots]);

  const handleResetFilters = () => { setSelectedSeason(null); setSelectedCrop(null); };
  const isAnyFilterActive = selectedSeason !== null || selectedCrop !== null;

  const isEmpty = plots.length === 0;

  return (
    <Box
      id="draft-state-v3"
      sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', bgcolor: 'background.default', p: 3, gap: 2.5, height: '100%', overflow: 'auto' }}
    >
      <Typography variant="h5" color="text.primary" sx={{ fontWeight: 700 }}>Plots</Typography>

      {/* Filter / toolbar row */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, flexShrink: 0 }}>
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

      {/* Content area */}
      {isEmpty ? (
        <Paper elevation={0} sx={{ flex: 1, borderRadius: '12px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', display: 'flex', minHeight: 320 }}>
          <EmptyState
            illustration={noPlotImg}
            title="See your residue levels in minutes"
            body="Start by creating your first plot."
            ctaLabel="Add plot"
            ctaVariant="contained"
            onCta={() => navigate('/add-plot')}
          />
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, flexGrow: 1 }}>
          {/* Drafts tray — only shown when there are drafts */}
          <DraftsTray drafts={draftPlots} onComplete={setCompletingPlot} />

          {/* Complete plots section */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {draftPlots.length > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Ready plots
                </Typography>
                {completePlots.length > 0 && (
                  <Chip
                    label={completePlots.length}
                    size="small"
                    color="success"
                    variant="outlined"
                    sx={{ height: 18, fontSize: '0.75rem', fontWeight: 700, '& .MuiChip-label': { px: 0.75 } }}
                  />
                )}
              </Box>
            )}

            {completePlots.length === 0 && filteredPlots.length > 0 ? (
              // Drafts exist but no complete plots match filters
              <Paper elevation={0} sx={{ borderRadius: '12px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', display: 'flex', minHeight: 200 }}>
                <EmptyState
                  title="No complete plots yet"
                  body="Complete the drafts above to see forecast-ready plots here."
                />
              </Paper>
            ) : completePlots.length === 0 ? (
              // Nothing at all matches filters
              <Paper elevation={0} sx={{ borderRadius: '12px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', display: 'flex', minHeight: 200 }}>
                <EmptyState
                  title="No plots match your filters"
                  body="Try adjusting the filters above."
                />
              </Paper>
            ) : (
              <CompletePlotsTable
                data={completePlots}
                selected={selectedPlotIds}
                onSelectChange={setSelectedPlotIds}
              />
            )}
          </Box>
        </Box>
      )}

      {/* Guided stepper dialog */}
      <StepperDialog
        plot={completingPlot}
        onClose={() => setCompletingPlot(null)}
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
