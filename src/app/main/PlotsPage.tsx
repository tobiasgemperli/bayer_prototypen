import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from '../variants/variant-context';
import {
  Autocomplete, TextField, Button, InputAdornment, Box, Typography, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton
} from '@mui/material';
import {
  Add, Search, Science, ContentCopy, Download, PictureAsPdf, DeleteOutline,
  Close as CloseIcon
} from '@mui/icons-material';
import { toast } from 'sonner';
import { OptionsTrigger } from '../design-system/OptionsTrigger';
import { ActionMenu, ActionItem } from '../design-system/ActionMenu';
import { PlotsTable } from './PlotsTable';
import { TreatmentModal } from './TreatmentModal';
import { EmptyState } from '../design-system/EmptyState';
import { usePlots, getUniqueSeasons, getUniqueCrops, deletePlots } from '../data/plots-data';
import { useDemoMode } from '../data/auth-state';
import noPlotImg from '../assets/empty-states/no-plot-yet-v01.jpg';

const CREATE_SEASON_ACTION = '__create_season__';

interface PlotsPageProps {
  /** When true, draft plots render a red "Draft" Chip next to the plot name. */
  showDraftBadge?: boolean;
  /** Replaces the default `TreatmentModal` triggered from the row-action menu.
   *  Variants use this to inject a custom dialog (e.g. with planting-date
   *  validation, sticky scroll, etc.). The component receives the same props
   *  as the baseline `TreatmentModal`. */
  TreatmentModalComponent?: React.ComponentType<{
    open: boolean;
    onClose: () => void;
    preSelectedPlotIds?: string[];
  }>;
  /** When true, the Season filter is required: the "All seasons" placeholder
   *  is replaced by the most recent season, clearing reverts to that default,
   *  and the underlying `plots` list is always pre-filtered by it. */
  requireSeasonFilter?: boolean;
  /** When true, the plots table shows a "Planting date" column. */
  showPlantingDate?: boolean;
}

export function PlotsPage({
  showDraftBadge = false,
  TreatmentModalComponent,
  requireSeasonFilter = false,
  showPlantingDate = false,
}: PlotsPageProps = {}) {
  const navigate = useNavigate();
  const plots = usePlots();
  const demoMode = useDemoMode();
  const isOnboarding = demoMode === 'onboarding';

  // The season of the plot with the latest planting date (falls back to the
  // alphabetically-last season) — used both to default the required season
  // filter below, and to name the season in the standalone "Add treatments"
  // CTA's plot-selector copy when no season filter is active.
  const defaultSeason = useMemo(() => {
    const dated = plots.filter(p => p.plantingDate).sort(
      (a, b) => (b.plantingDate!.getTime() - a.plantingDate!.getTime())
    );
    return dated[0]?.season ?? getUniqueSeasons(plots).slice(-1)[0] ?? null;
  }, [plots]);
  const [selectedSeason, setSelectedSeason] = useState<string | null>(defaultSeason);
  // Adopt the default once it resolves (plots load) when required mode is on.
  useEffect(() => {
    if (requireSeasonFilter && !selectedSeason && defaultSeason) setSelectedSeason(defaultSeason);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultSeason]);
  const [selectedCrop, setSelectedCrop] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlotIds, setSelectedPlotIds] = useState<string[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const isMenuOpen = Boolean(anchorEl);
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Standalone "Add treatments" CTA — independent of the bulk-action modal
  // above (no pre-selected plots; the user picks plots inside the dialog).
  const [isAddTreatmentsOpen, setIsAddTreatmentsOpen] = useState(false);
  const addTreatmentsSeasonName = selectedSeason ?? defaultSeason ?? '';

  const [customSeasons, setCustomSeasons] = useState<string[]>([]);
  const [seasonModalOpen, setSeasonModalOpen] = useState(false);
  const [newSeasonName, setNewSeasonName] = useState('');

  const seasons = useMemo(
    () => Array.from(new Set([...getUniqueSeasons(plots), ...customSeasons])).sort(),
    [plots, customSeasons]
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

  const filteredData = useMemo(() => {
    return plots.filter(plot => {
      const matchesSeason = !selectedSeason || plot.season === selectedSeason;
      const matchesCrop = !selectedCrop || plot.crop === selectedCrop;
      const matchesSearch = searchQuery === '' ||
        plot.plotName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plot.owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plot.variety.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plot.location.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSeason && matchesCrop && matchesSearch;
    });
  }, [plots, selectedSeason, selectedCrop, searchQuery]);

  const handleResetFilters = () => { setSelectedSeason(null); setSelectedCrop(null); };
  const isAnyFilterActive = selectedSeason !== null || selectedCrop !== null;
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleAction = (actionKey: string, actionLabel: string) => {
    if (actionKey === 'add-treatment') { setIsModalOpen(true); handleMenuClose(); return; }
    toast.success(`${actionLabel} for ${selectedPlotIds.length} plots prepared`);
  };

  const menuActions: ActionItem[] = useMemo(() => {
    const count = selectedPlotIds.length;
    return [
      { label: 'Add applied treatments to plots', icon: <Add fontSize="small" />, key: 'add-treatment', onClick: (k) => handleAction(k, 'Add applied treatments to plots') },
      { label: count === 1 ? 'Get residue forecast' : 'Get residue forecasts', icon: <Science fontSize="small" />, key: 'predictions', onClick: (k) => handleAction(k, count === 1 ? 'Get residue forecast' : 'Get residue forecasts') },
      { label: 'Copy treatments', icon: <ContentCopy fontSize="small" />, key: 'copy-treatments', onClick: (k) => handleAction(k, 'Copy treatments') },
      { label: count === 1 ? 'Copy plot to another season' : 'Copy plots to another season', icon: <ContentCopy fontSize="small" />, key: 'copy-plots', onClick: (k) => handleAction(k, count === 1 ? 'Copy plot to another season' : 'Copy plots to another season') },
      { divider: true, key: 'div1', onClick: () => {} },
      { label: 'Export as Excel', icon: <Download fontSize="small" />, key: 'export-excel', onClick: (k) => handleAction(k, 'Export as Excel') },
      { label: 'Export as PDF', icon: <PictureAsPdf fontSize="small" />, key: 'export-pdf', onClick: (k) => handleAction(k, 'Export as PDF') },
      { divider: true, key: 'div2', onClick: () => {} },
      { label: count === 1 ? 'Delete plot' : 'Delete plots', icon: <DeleteOutline fontSize="small" />, key: 'delete', color: 'error.main', onClick: () => {
        deletePlots(selectedPlotIds);
        toast.success(`${count} plot${count !== 1 ? 's' : ''} deleted`);
        setSelectedPlotIds([]);
        handleMenuClose();
      } },
    ];
  }, [selectedPlotIds]);

  // Onboarding empty state — no filters, no search, just the guided CTA
  if (isOnboarding && plots.length === 0) {
    return (
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', bgcolor: 'background.default', p: 3, height: '100%', overflow: 'hidden' }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 3, flexShrink: 0 }}>Plots</Typography>
        <Paper elevation={0} sx={{ flex: 1, borderRadius: '12px', border: '1px solid', borderColor: 'divider', display: 'flex' }}>
          <EmptyState
            illustration={noPlotImg}
            title="See your residue levels in minutes"
            body="Start by creating your first plot."
            ctaLabel="Add plot"
            ctaVariant="contained"
            onCta={() => navigate('/add-plot')}
          />
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', bgcolor: 'background.default', p: 3, gap: 3, height: '100%', overflow: 'hidden' }}>
      <Typography variant="h5" color="text.primary" sx={{ fontWeight: 700 }}>Plots</Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Autocomplete size="small" value={selectedSeason}
            options={[...seasons, CREATE_SEASON_ACTION]}
            // When the season filter is required, clearing snaps back to the
            // default season instead of going to "all seasons" (null).
            disableClearable={requireSeasonFilter}
            getOptionLabel={(opt) => opt === CREATE_SEASON_ACTION ? 'Create new season' : opt}
            filterOptions={(options, state) => {
              const filtered = options.filter(o => o !== CREATE_SEASON_ACTION && o.toLowerCase().includes(state.inputValue.toLowerCase()));
              filtered.push(CREATE_SEASON_ACTION);
              return filtered;
            }}
            onChange={(_, newValue) => {
              if (newValue === CREATE_SEASON_ACTION) { setNewSeasonName(''); setSeasonModalOpen(true); }
              else if (requireSeasonFilter && !newValue) setSelectedSeason(defaultSeason);
              else setSelectedSeason(newValue);
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
            renderInput={(params) => <TextField {...params} placeholder={requireSeasonFilter ? 'Season' : 'All seasons'} />} />
          <Autocomplete size="small" options={crops} value={selectedCrop}
            onChange={(_, newValue) => setSelectedCrop(newValue)}
            sx={{ width: 200, '& .MuiOutlinedInput-root': { bgcolor: 'white', borderRadius: '8px' } }}
            renderInput={(params) => <TextField {...params} placeholder="All crops" />} />
          {isAnyFilterActive && (
            <Button onClick={handleResetFilters} color="inherit"
              sx={{ fontSize: '0.875rem', opacity: 0.7, textTransform: 'none', fontWeight: 600, '&:hover': { bgcolor: 'action.hover', opacity: 1 } }}>
              Reset filters
            </Button>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Button variant="soft" color="primary" startIcon={<Add />}
            onClick={() => setIsAddTreatmentsOpen(true)}
            sx={{ px: 2, height: 40, borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}>
            Add treatments
          </Button>
          <Button variant="soft" color="primary" startIcon={<Add />}
            onClick={() => navigate('/add-plot')}
            sx={{ px: 2, height: 40, borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}>
            Add plot
          </Button>
          <TextField size="small" placeholder="Search plots..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ color: 'text.disabled', fontSize: 20 }} /></InputAdornment>, sx: { borderRadius: '8px' } }}
            sx={{ width: 240, bgcolor: 'white', '& .MuiOutlinedInput-root': { height: 40 } }} />
          <OptionsTrigger onClick={handleMenuOpen} disabled={selectedPlotIds.length === 0} hasSelection={selectedPlotIds.length > 0} />
          <ActionMenu anchorEl={anchorEl} open={isMenuOpen} onClose={handleMenuClose} actions={menuActions} />
        </Box>
      </Box>

      <Box sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {filteredData.length === 0 ? (
          <Paper elevation={0} sx={{ flex: 1, borderRadius: '12px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', display: 'flex' }}>
            {plots.length === 0 ? (
              // True onboarding empty — no plots exist yet.
              <EmptyState
                illustration={noPlotImg}
                title="See your residue levels in minutes"
                body="Start by creating your first plot."
                ctaLabel="Add plot"
                ctaVariant="contained"
                onCta={() => navigate('/add-plot')}
              />
            ) : (
              // Filter-empty — plots exist but were narrowed away. No illustration,
              // no CTA: this is not onboarding, it is a filter narrowing event.
              <EmptyState
                tone="filtered"
                title="No plots match your filters"
                body="Try adjusting the filters above."
              />
            )}
          </Paper>
        ) : (
          <PlotsTable data={filteredData} selected={selectedPlotIds} onSelectChange={setSelectedPlotIds} showDraftBadge={showDraftBadge} showPlantingDate={showPlantingDate} />
        )}
      </Box>

      {TreatmentModalComponent ? (
        <TreatmentModalComponent open={isModalOpen} onClose={() => setIsModalOpen(false)} preSelectedPlotIds={selectedPlotIds} />
      ) : (
        <TreatmentModal open={isModalOpen} onClose={() => setIsModalOpen(false)} preSelectedPlotIds={selectedPlotIds} />
      )}

      {/* Standalone "Add treatments" CTA — same TreatmentModal, renamed copy */}
      <TreatmentModal
        open={isAddTreatmentsOpen}
        onClose={() => setIsAddTreatmentsOpen(false)}
        title="Add treatments to plots"
        description="Create new treatments and assign them to one or more plots at once."
        plotsSelectorTitle={(
          <>
            Select plots{' '}
            <Box component="span" sx={{ fontWeight: 400, color: 'text.secondary' }}>
              (Season: {addTreatmentsSeasonName})
            </Box>
          </>
        )}
        confirmLabel="Add treatments"
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
            value={newSeasonName} onChange={(e) => setNewSeasonName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreateSeason(); }}
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
