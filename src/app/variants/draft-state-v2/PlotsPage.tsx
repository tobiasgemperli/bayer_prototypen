import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from '../variant-context';
import {
  Autocomplete, TextField, Button, InputAdornment, Box, Typography, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TableSortLabel, Checkbox, Chip, LinearProgress, Collapse,
  Fade,
} from '@mui/material';
import {
  Add, Search, Science, ContentCopy, Download, PictureAsPdf, DeleteOutline,
  Close as CloseIcon, ExpandMore, ExpandLess, CheckCircle,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { toast } from 'sonner';
import { OptionsTrigger } from '../../design-system/OptionsTrigger';
import { ActionMenu, ActionItem } from '../../design-system/ActionMenu';
import { TreatmentModal } from '../../main/TreatmentModal';
import { EmptyState } from '../../design-system/EmptyState';
import {
  usePlots,
  getUniqueSeasons,
  getUniqueCrops,
  deletePlots,
  updatePlot,
  getPlotCompleteness,
  isPlotDraft,
  PLOT_MANDATORY,
} from '../../data/plots-data';
import type { PlotData, Completeness } from '../../data/plots-data';
import { useDemoMode } from '../../data/auth-state';
import noPlotImg from '../../assets/empty-states/no-plot-yet-v01.jpg';

const CREATE_SEASON_ACTION = '__create_season__';

type SortField = 'plotName' | 'owner' | 'variety' | 'location' | 'lastTreatment';
type SortOrder = 'asc' | 'desc';

// ── Saved hint ────────────────────────────────────────────────────────────────

function SavedHint({ show }: { show: boolean }) {
  return (
    <Fade in={show} timeout={200}>
      <Typography
        variant="caption"
        sx={{ color: 'success.main', fontWeight: 600, fontSize: '0.75rem', ml: 0.5 }}
      >
        Saved
      </Typography>
    </Fade>
  );
}

// ── Per-row inline form for missing fields ────────────────────────────────────

interface InlineFormProps {
  plot: PlotData;
  completeness: Completeness;
}

function InlineCompletionForm({ plot, completeness }: InlineFormProps) {
  const [localValues, setLocalValues] = useState<Record<string, string | Date | null>>({});
  const [savedFields, setSavedFields] = useState<Set<string>>(new Set());

  const save = useCallback(
    (key: string, value: string | Date | null) => {
      updatePlot(plot.id, { [key]: value } as Partial<PlotData>);
      setSavedFields(prev => {
        const next = new Set(prev);
        next.add(key);
        return next;
      });
      // Clear saved hint after 2 s
      setTimeout(() => {
        setSavedFields(prev => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }, 2000);
    },
    [plot.id]
  );

  const handleTextChange = (key: string, value: string) => {
    setLocalValues(prev => ({ ...prev, [key]: value }));
  };

  const handleTextBlur = (key: string) => {
    const val = localValues[key];
    if (val !== undefined && typeof val === 'string') {
      save(key, val);
    }
  };

  const handleDateChange = (key: string, date: Date | null) => {
    setLocalValues(prev => ({ ...prev, [key]: date }));
    save(key, date);
  };

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-end' }}>
      {completeness.missingKeys.map(key => {
        const field = PLOT_MANDATORY.find(f => f.key === key);
        if (!field) return null;

        const isSaved = savedFields.has(key);

        if (key === 'plantingDate') {
          return (
            <Box key={key} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  {field.label}
                </Typography>
                <SavedHint show={isSaved} />
              </Box>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  value={(localValues[key] as Date | null | undefined) ?? null}
                  onChange={(date) => handleDateChange(key, date)}
                  slotProps={{
                    textField: {
                      size: 'small',
                      sx: {
                        width: 170,
                        '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: 'white' },
                      },
                    },
                  }}
                />
              </LocalizationProvider>
            </Box>
          );
        }

        const textValue =
          typeof localValues[key] === 'string'
            ? (localValues[key] as string)
            : (plot[key as keyof PlotData] as string) ?? '';

        return (
          <Box key={key} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                {field.label}
              </Typography>
              <SavedHint show={isSaved} />
            </Box>
            <TextField
              size="small"
              value={textValue}
              onChange={(e) => handleTextChange(key, e.target.value)}
              onBlur={() => handleTextBlur(key)}
              sx={{
                width: 180,
                '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: 'white' },
              }}
            />
          </Box>
        );
      })}
    </Box>
  );
}

// ── Completeness meter chip ───────────────────────────────────────────────────

function CompletenessDisplay({ completeness }: { completeness: Completeness }) {
  if (completeness.complete) {
    return (
      <Chip
        label="Complete"
        size="small"
        icon={<CheckCircle sx={{ fontSize: '14px !important' }} />}
        sx={{
          bgcolor: 'success.50',
          color: 'success.dark',
          fontWeight: 700,
          fontSize: '0.7rem',
          height: 22,
          border: '1px solid',
          borderColor: 'success.light',
          '& .MuiChip-icon': { color: 'success.main' },
        }}
      />
    );
  }
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Chip
        label="Draft"
        size="small"
        sx={{
          bgcolor: 'warning.50',
          color: 'warning.dark',
          fontWeight: 700,
          fontSize: '0.7rem',
          height: 22,
          border: '1px solid',
          borderColor: 'warning.light',
        }}
      />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <LinearProgress
          variant="determinate"
          value={completeness.pct}
          sx={{
            width: 40,
            height: 4,
            borderRadius: 2,
            bgcolor: 'grey.200',
            '& .MuiLinearProgress-bar': { bgcolor: 'warning.main', borderRadius: 2 },
          }}
        />
        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
          {completeness.filled}/{completeness.total}
        </Typography>
      </Box>
    </Box>
  );
}

// ── Overall progress banner ───────────────────────────────────────────────────

function OverallProgressBanner({ plots }: { plots: PlotData[] }) {
  const total = plots.length;
  const ready = plots.filter(p => !isPlotDraft(p)).length;
  const pct = total === 0 ? 100 : Math.round((ready / total) * 100);
  const drafts = total - ready;

  if (total === 0) return null;

  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: drafts > 0 ? 'warning.light' : 'success.light',
        borderRadius: '10px',
        bgcolor: drafts > 0 ? 'warning.50' : 'success.50',
        px: 2.5,
        py: 1.5,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        flexShrink: 0,
      }}
    >
      <Box sx={{ flex: 1 }}>
        <Typography
          variant="body2"
          sx={{ fontWeight: 700, color: drafts > 0 ? 'warning.dark' : 'success.dark', mb: 0.5 }}
        >
          {ready === total
            ? `All ${total} plots ready to forecast`
            : `${ready} of ${total} plot${total !== 1 ? 's' : ''} ready to forecast`}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={pct}
          sx={{
            height: 6,
            borderRadius: 3,
            bgcolor: 'rgba(0,0,0,0.08)',
            '& .MuiLinearProgress-bar': {
              bgcolor: drafts > 0 ? 'warning.main' : 'success.main',
              borderRadius: 3,
            },
          }}
        />
      </Box>
      {drafts > 0 && (
        <Typography variant="caption" sx={{ color: 'warning.dark', fontWeight: 600, whiteSpace: 'nowrap' }}>
          {drafts} draft{drafts !== 1 ? 's' : ''} to complete
        </Typography>
      )}
    </Paper>
  );
}

// ── Expandable plots table ────────────────────────────────────────────────────

interface DraftTableProps {
  data: PlotData[];
  selected: string[];
  onSelectChange: (ids: string[]) => void;
}

function DraftAwarePlotsTable({ data, selected, onSelectChange }: DraftTableProps) {
  const [orderBy, setOrderBy] = useState<SortField | null>(null);
  const [order, setOrder] = useState<SortOrder>('asc');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Keep completeness in sync with live plot data
  const completenessMap = useMemo(() => {
    const m = new Map<string, Completeness>();
    for (const p of data) m.set(p.id, getPlotCompleteness(p));
    return m;
  }, [data]);

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

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSelectChange(e.target.checked ? data.map(r => r.id) : []);
  };

  const handleSelect = (id: string) => {
    const idx = selected.indexOf(id);
    onSelectChange(idx === -1 ? [...selected, id] : selected.filter(s => s !== id));
  };

  const toggleExpand = (id: string, isDraft: boolean) => {
    if (!isDraft) return; // complete rows don't expand
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);

  const numCols = 7; // checkbox + plot + owner + variety + location + last treatment + status

  return (
    <Paper
      sx={{
        width: '100%',
        overflow: 'hidden',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <TableContainer sx={{ maxHeight: 'calc(100vh - 340px)' }}>
        <Table stickyHeader aria-label="plots table" size="medium">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selected.length > 0 && selected.length < data.length}
                  checked={data.length > 0 && selected.length === data.length}
                  onChange={handleSelectAll}
                />
              </TableCell>
              {(['plotName', 'owner', 'variety', 'location', 'lastTreatment'] as SortField[]).map(
                (field, i) => (
                  <TableCell
                    key={field}
                    sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem' }}
                  >
                    <TableSortLabel
                      active={orderBy === field}
                      direction={orderBy === field ? order : 'asc'}
                      onClick={() => handleSort(field)}
                    >
                      {['Plot', 'Owner', 'Variety', 'Location', 'Last real treatment'][i]}
                    </TableSortLabel>
                  </TableCell>
                )
              )}
              <TableCell
                sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem', minWidth: 160 }}
              >
                Status
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={numCols} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No plots found
                </TableCell>
              </TableRow>
            ) : (
              sortedData.map(row => {
                const completeness = completenessMap.get(row.id) ?? getPlotCompleteness(row);
                const isDraft = !completeness.complete;
                const isExpanded = expandedIds.has(row.id);
                const isSelected = selected.includes(row.id);

                return (
                  <React.Fragment key={row.id}>
                    <TableRow
                      hover={!isDraft}
                      selected={isSelected}
                      onClick={() => {
                        if (isDraft) toggleExpand(row.id, true);
                      }}
                      sx={{
                        cursor: isDraft ? 'pointer' : 'default',
                        bgcolor: isDraft
                          ? isExpanded
                            ? 'warning.50'
                            : 'transparent'
                          : 'transparent',
                        '&:hover': isDraft
                          ? { bgcolor: 'warning.50' }
                          : {},
                        transition: 'background-color 0.15s',
                      }}
                    >
                      <TableCell
                        padding="checkbox"
                        onClick={e => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleSelect(row.id)}
                        />
                      </TableCell>
                      <TableCell sx={{ color: 'text.primary', fontSize: '0.875rem', fontWeight: isDraft ? 500 : 400 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {row.plotName || <Typography component="span" sx={{ color: 'text.disabled', fontStyle: 'italic', fontSize: '0.875rem' }}>Unnamed</Typography>}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ color: 'text.primary', fontSize: '0.875rem' }}>{row.owner}</TableCell>
                      <TableCell sx={{ color: row.variety ? 'text.primary' : 'text.disabled', fontSize: '0.875rem', fontStyle: row.variety ? 'normal' : 'italic' }}>
                        {row.variety || 'Missing'}
                      </TableCell>
                      <TableCell sx={{ color: 'text.primary', fontSize: '0.875rem' }}>{row.location}</TableCell>
                      <TableCell
                        sx={{
                          color: row.lastTreatment ? 'text.primary' : 'text.secondary',
                          fontSize: '0.875rem',
                          fontStyle: row.lastTreatment ? 'normal' : 'italic',
                        }}
                      >
                        {row.lastTreatment ? formatDate(row.lastTreatment) : 'No treatments yet'}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CompletenessDisplay completeness={completeness} />
                          {isDraft && (
                            <IconButton
                              size="small"
                              onClick={e => {
                                e.stopPropagation();
                                toggleExpand(row.id, true);
                              }}
                              sx={{ color: 'text.secondary', p: 0.25 }}
                              aria-label={isExpanded ? 'Collapse' : 'Expand to complete'}
                            >
                              {isExpanded ? (
                                <ExpandLess sx={{ fontSize: 18 }} />
                              ) : (
                                <ExpandMore sx={{ fontSize: 18 }} />
                              )}
                            </IconButton>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>

                    {/* Inline expansion row — shown only for draft rows */}
                    {isDraft && (
                      <TableRow sx={{ bgcolor: 'warning.50' }}>
                        <TableCell
                          colSpan={numCols}
                          sx={{ p: 0, border: isExpanded ? undefined : 'none' }}
                        >
                          <Collapse in={isExpanded} timeout={200} unmountOnExit>
                            <Box
                              sx={{
                                px: 3,
                                py: 2,
                                borderTop: '1px dashed',
                                borderColor: 'warning.light',
                                bgcolor: 'warning.50',
                              }}
                            >
                              <Typography
                                variant="caption"
                                sx={{
                                  color: 'warning.dark',
                                  fontWeight: 700,
                                  display: 'block',
                                  mb: 1.5,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.04em',
                                }}
                              >
                                Complete missing fields to enable forecasting
                              </Typography>
                              <InlineCompletionForm plot={row} completeness={completeness} />
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function PlotsPage() {
  const navigate = useNavigate();
  const plots = usePlots();
  const demoMode = useDemoMode();
  const isOnboarding = demoMode === 'onboarding';

  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
  const [selectedCrop, setSelectedCrop] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlotIds, setSelectedPlotIds] = useState<string[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const isMenuOpen = Boolean(anchorEl);
  const [isModalOpen, setIsModalOpen] = useState(false);
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
    setCustomSeasons(prev => (prev.includes(name) ? prev : [...prev, name]));
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

  const handleResetFilters = () => {
    setSelectedSeason(null);
    setSelectedCrop(null);
  };
  const isAnyFilterActive = selectedSeason !== null || selectedCrop !== null;
  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleAction = (actionKey: string, actionLabel: string) => {
    if (actionKey === 'add-treatment') {
      setIsModalOpen(true);
      handleMenuClose();
      return;
    }
    toast.success(`${actionLabel} for ${selectedPlotIds.length} plots prepared`);
  };

  const menuActions: ActionItem[] = useMemo(() => {
    const count = selectedPlotIds.length;
    return [
      { label: 'Add applied treatments to plots', icon: <Add fontSize="small" />, key: 'add-treatment', onClick: k => handleAction(k, 'Add applied treatments to plots') },
      { label: count === 1 ? 'Get residue forecast' : 'Get residue forecasts', icon: <Science fontSize="small" />, key: 'predictions', onClick: k => handleAction(k, count === 1 ? 'Get residue forecast' : 'Get residue forecasts') },
      { label: 'Copy treatments', icon: <ContentCopy fontSize="small" />, key: 'copy-treatments', onClick: k => handleAction(k, 'Copy treatments') },
      { label: count === 1 ? 'Copy plot to another season' : 'Copy plots to another season', icon: <ContentCopy fontSize="small" />, key: 'copy-plots', onClick: k => handleAction(k, count === 1 ? 'Copy plot to another season' : 'Copy plots to another season') },
      { divider: true, key: 'div1', onClick: () => {} },
      { label: 'Export as Excel', icon: <Download fontSize="small" />, key: 'export-excel', onClick: k => handleAction(k, 'Export as Excel') },
      { label: 'Export as PDF', icon: <PictureAsPdf fontSize="small" />, key: 'export-pdf', onClick: k => handleAction(k, 'Export as PDF') },
      { divider: true, key: 'div2', onClick: () => {} },
      {
        label: count === 1 ? 'Delete plot' : 'Delete plots',
        icon: <DeleteOutline fontSize="small" />,
        key: 'delete',
        color: 'error.main',
        onClick: () => {
          deletePlots(selectedPlotIds);
          toast.success(`${count} plot${count !== 1 ? 's' : ''} deleted`);
          setSelectedPlotIds([]);
          handleMenuClose();
        },
      },
    ];
  }, [selectedPlotIds]);

  // Onboarding empty state
  if (isOnboarding && plots.length === 0) {
    return (
      <Box
        id="draft-state-v2"
        sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', bgcolor: 'background.default', p: 3, height: '100%', overflow: 'hidden' }}
      >
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
    <Box
      id="draft-state-v2"
      sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', bgcolor: 'background.default', p: 3, gap: 2.5, height: '100%', overflow: 'hidden' }}
    >
      <Typography variant="h5" color="text.primary" sx={{ fontWeight: 700 }}>
        Plots
      </Typography>

      {/* Overall readiness progress */}
      <OverallProgressBanner plots={plots} />

      {/* Filters + search + actions */}
      <Box
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Autocomplete
            size="small"
            value={selectedSeason}
            options={[...seasons, CREATE_SEASON_ACTION]}
            getOptionLabel={opt => (opt === CREATE_SEASON_ACTION ? 'Create new season' : opt)}
            filterOptions={(options, state) => {
              const filtered = options.filter(
                o => o !== CREATE_SEASON_ACTION && o.toLowerCase().includes(state.inputValue.toLowerCase())
              );
              filtered.push(CREATE_SEASON_ACTION);
              return filtered;
            }}
            onChange={(_, newValue) => {
              if (newValue === CREATE_SEASON_ACTION) {
                setNewSeasonName('');
                setSeasonModalOpen(true);
              } else {
                setSelectedSeason(newValue);
              }
            }}
            renderOption={(props, option) => {
              const { key, ...rest } = props as { key: React.Key } & React.HTMLAttributes<HTMLLIElement>;
              if (option === CREATE_SEASON_ACTION) {
                return (
                  <li key={key} {...rest} style={{ ...rest.style, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Add sx={{ fontSize: 20, color: 'primary.main' }} />
                    <Typography sx={{ color: 'primary.main', fontWeight: 600, fontSize: '0.875rem' }}>
                      Create new season
                    </Typography>
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
            onChange={(_, newValue) => setSelectedCrop(newValue)}
            sx={{ width: 200, '& .MuiOutlinedInput-root': { bgcolor: 'white', borderRadius: '8px' } }}
            renderInput={params => <TextField {...params} placeholder="All crops" />}
          />
          {isAnyFilterActive && (
            <Button
              onClick={handleResetFilters}
              color="inherit"
              sx={{ fontSize: '0.875rem', opacity: 0.7, textTransform: 'none', fontWeight: 600, '&:hover': { bgcolor: 'action.hover', opacity: 1 } }}
            >
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
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: 'text.disabled', fontSize: 20 }} />
                </InputAdornment>
              ),
              sx: { borderRadius: '8px' },
            }}
            sx={{ width: 240, bgcolor: 'white', '& .MuiOutlinedInput-root': { height: 40 } }}
          />
          <OptionsTrigger onClick={handleMenuOpen} disabled={selectedPlotIds.length === 0} hasSelection={selectedPlotIds.length > 0} />
          <ActionMenu anchorEl={anchorEl} open={isMenuOpen} onClose={handleMenuClose} actions={menuActions} />
        </Box>
      </Box>

      {/* Table or empty state */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {filteredData.length === 0 ? (
          <Paper
            elevation={0}
            sx={{ flex: 1, borderRadius: '12px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', display: 'flex' }}
          >
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
          <DraftAwarePlotsTable
            data={filteredData}
            selected={selectedPlotIds}
            onSelectChange={setSelectedPlotIds}
          />
        )}
      </Box>

      <TreatmentModal open={isModalOpen} onClose={() => setIsModalOpen(false)} preSelectedPlotIds={selectedPlotIds} />

      {/* Create new season modal */}
      <Dialog
        open={seasonModalOpen}
        onClose={() => setSeasonModalOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '12px' } }}
      >
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
          <TextField
            fullWidth
            size="small"
            placeholder="e.g. Spring 2025"
            autoFocus
            value={newSeasonName}
            onChange={e => setNewSeasonName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreateSeason(); }}
            sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'white', borderRadius: '8px' } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 1, gap: 1 }}>
          <Button
            variant="text"
            color="inherit"
            onClick={() => setSeasonModalOpen(false)}
            sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            disabled={!newSeasonName.trim()}
            onClick={handleCreateSeason}
            sx={{ fontWeight: 600, textTransform: 'none', px: 3 }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
