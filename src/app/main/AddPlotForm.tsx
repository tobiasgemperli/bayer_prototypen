import React, {
  useState, useMemo, useCallback, forwardRef, useImperativeHandle, useEffect,
} from 'react';
import {
  Box, Typography, Button, TextField, Autocomplete, Stack, InputAdornment, Divider, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
} from '@mui/material';
import { LocationOn, Close as CloseIcon, Add as AddIcon } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { toast } from 'sonner';
import { getUniqueSeasons, getUniqueCrops } from '../data/plots-database';
import { MapSelectionModal } from '../design-system/MapSelectionModal';
import { FieldLabel, SectionLabel, fieldSx, errorFieldSx } from '../design-system/FormField';

const VARIETY_OPTIONS = [
  'Stella', 'Kordia', 'Sweetheart', 'Ambrunes', 'Duroni', 'Arcina',
  'Schattenmorelle', 'Gala', 'Fuji', 'Granny Smith', 'Honeycrisp', 'Pink Lady',
  'Williams', 'Bartlett', 'Conference', 'Bosc',
  'Chardonnay', 'Merlot', 'Cabernet', 'Pinot Noir',
];
const CULTIVATION_TYPES = ['Open field', 'Greenhouse', 'Tunnel', 'Indoor', 'Orchard'];
const DENSITY_UNITS = ['plants/ha', 'trees/ha', 'vines/ha', 'seeds/m²'];
const CREATE_SEASON_ACTION = '__create_season__';
const ROW = { xs: 'column' as const, sm: 'row' as const };

function numericKeyFilter(e: React.KeyboardEvent<HTMLInputElement>, allowNegative = false) {
  const nav = ['Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Delete', 'Home', 'End'];
  if (nav.includes(e.key) || e.metaKey || e.ctrlKey) return;
  if (e.key === '.' && !(e.target as HTMLInputElement).value.includes('.')) return;
  if (allowNegative && e.key === '-' && (e.target as HTMLInputElement).selectionStart === 0 && !(e.target as HTMLInputElement).value.includes('-')) return;
  if (e.key >= '0' && e.key <= '9') return;
  e.preventDefault();
}

// ── Public types ──────────────────────────────────────────────────────────────

export interface PlotFormValues {
  plotName: string;
  gpsLat: string;
  gpsLon: string;
  cultivationType: string | null;
  plotSize: string;
  season: string | null;
  crop: string | null;
  variety: string | null;
  plantingDensity: string;
  densityUnit: string | null;
  plotYield: string;
  plantingDate: Date | null;
  floweringStartDate: Date | null;
}

export interface AddPlotFormHandle {
  /** Full validation. Fires onSubmit with {asDraft: false} if everything passes. */
  submit: () => void;
  /** Partial validation — only plotName required. Fires onSubmit with {asDraft: true}. */
  submitAsDraft: () => void;
  /** Read the current values directly (no validation). */
  getValues: () => PlotFormValues;
}

interface ValidationErrors {
  plotName?: string;
  gpsLat?: string;
  gpsLon?: string;
  cultivationType?: string;
  season?: string;
  crop?: string;
  variety?: string;
  plantingDensity?: string;
  densityUnit?: string;
  plantingDate?: string;
  floweringStartDate?: string;
}

const EMPTY_VALUES: PlotFormValues = {
  plotName: '', gpsLat: '', gpsLon: '', cultivationType: null, plotSize: '',
  season: null, crop: null, variety: null, plantingDensity: '', densityUnit: null,
  plotYield: '', plantingDate: null, floweringStartDate: null,
};

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function validate(
  fields: PlotFormValues,
  earliestTreatmentDate?: Date | null,
  softRequiredDates = false,
): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!fields.plotName.trim()) errors.plotName = 'Plot name is required';
  if (!fields.gpsLat.trim()) errors.gpsLat = 'Latitude is required';
  else if (isNaN(parseFloat(fields.gpsLat))) errors.gpsLat = 'Must be a valid number';
  if (!fields.gpsLon.trim()) errors.gpsLon = 'Longitude is required';
  else if (isNaN(parseFloat(fields.gpsLon))) errors.gpsLon = 'Must be a valid number';
  if (!fields.cultivationType) errors.cultivationType = 'Cultivation type is required';
  if (!fields.season) errors.season = 'Season is required';
  if (!fields.crop) errors.crop = 'Crop is required';
  if (!fields.variety) errors.variety = 'Variety is required';
  if (!fields.plantingDensity.trim()) errors.plantingDensity = 'Planting density is required';
  if (!fields.densityUnit) errors.densityUnit = 'Density unit is required';
  // V6: planting + flowering dates are optional at save time. They become
  // required later, at forecast time (handled by a separate dialog).
  if (!softRequiredDates) {
    if (!fields.plantingDate) errors.plantingDate = 'Planting date is required';
    if (!fields.floweringStartDate) errors.floweringStartDate = 'Flowering start date is required';
  }

  // Cross-field: planting must be on or before the earliest treatment date.
  if (fields.plantingDate && earliestTreatmentDate && fields.plantingDate > earliestTreatmentDate) {
    errors.plantingDate = `Planting must be on or before your earliest treatment (${formatDate(earliestTreatmentDate)}).`;
  }

  return errors;
}

// ── Form props ────────────────────────────────────────────────────────────────

export interface AddPlotFormProps {
  /** Initial values (edit mode). Missing keys default to empty. */
  initialValues?: Partial<PlotFormValues>;
  /** Earliest treatment date for the plot being edited. Adds a cross-field validation rule. */
  earliestTreatmentDate?: Date | null;
  /** Fires after either submit() or submitAsDraft() passes its validation.
   *  opts.asDraft is true when triggered from submitAsDraft(). */
  onSubmit: (values: PlotFormValues, opts: { asDraft: boolean }) => void;
  /** Onboarding progress reporter (optional). */
  onProgress?: (filled: number, total: number) => void;
  /** Disable empty-state seeded options (e.g. onboarding flow has no seasons yet). */
  hideSeededSeasons?: boolean;
  /** Render with the bordered Paper chrome. Default true. Set false when the
   *  parent already provides a container (e.g. inside a Dialog). */
  bordered?: boolean;
  /** V6: render planting + flowering dates as optional (no asterisk, no error).
   *  Save passes with these fields empty; forecast prompts for them inline. */
  softRequiredDates?: boolean;
}

// ── Form ──────────────────────────────────────────────────────────────────────

export const AddPlotForm = forwardRef<AddPlotFormHandle, AddPlotFormProps>(function AddPlotForm(
  { initialValues, earliestTreatmentDate, onSubmit,
    onProgress, hideSeededSeasons = false, bordered = true, softRequiredDates = false }, ref,
) {
  const init = { ...EMPTY_VALUES, ...initialValues };

  const baseSeasons = useMemo(() => hideSeededSeasons ? [] : getUniqueSeasons(), [hideSeededSeasons]);
  const crops = useMemo(() => getUniqueCrops(), []);

  const [customSeasons, setCustomSeasons] = useState<string[]>([]);
  const [seasonModalOpen, setSeasonModalOpen] = useState(false);
  const [newSeasonName, setNewSeasonName] = useState('');

  const seasons = useMemo(() => {
    const all = [...baseSeasons, ...customSeasons];
    if (init.season && !all.includes(init.season)) all.push(init.season);
    return [...new Set(all)].sort();
  }, [baseSeasons, customSeasons, init.season]);

  const [plotName, setPlotName] = useState(init.plotName);
  const [season, setSeason] = useState<string | null>(init.season);
  const [crop, setCrop] = useState<string | null>(init.crop);
  const [variety, setVariety] = useState<string | null>(init.variety);
  const [gpsLat, setGpsLat] = useState(init.gpsLat);
  const [gpsLon, setGpsLon] = useState(init.gpsLon);
  const [cultivationType, setCultivationType] = useState<string | null>(init.cultivationType);
  const [plotSize, setPlotSize] = useState(init.plotSize);
  const [plotYield, setPlotYield] = useState(init.plotYield);
  const [plantingDensity, setPlantingDensity] = useState(init.plantingDensity);
  const [densityUnit, setDensityUnit] = useState<string | null>(init.densityUnit);
  const [plantingDate, setPlantingDate] = useState<Date | null>(init.plantingDate);
  const [floweringStartDate, setFloweringStartDate] = useState<Date | null>(init.floweringStartDate);

  const [mapOpen, setMapOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const values: PlotFormValues = {
    plotName, gpsLat, gpsLon, cultivationType, plotSize, season, crop, variety,
    plantingDensity, densityUnit, plotYield, plantingDate, floweringStartDate,
  };

  const errors = useMemo(
    () => validate(values, earliestTreatmentDate, softRequiredDates),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plotName, gpsLat, gpsLon, cultivationType, season, crop, variety, plantingDensity,
     densityUnit, plantingDate, floweringStartDate, earliestTreatmentDate, softRequiredDates],
  );

  const TOTAL_REQUIRED = 11;
  const filledCount = [
    plotName.trim(), gpsLat.trim(), gpsLon.trim(), cultivationType,
    season, crop, variety, plantingDensity.trim(), densityUnit,
    plantingDate, floweringStartDate,
  ].filter(Boolean).length;

  useEffect(() => {
    onProgress?.(filledCount, TOTAL_REQUIRED);
  }, [filledCount, onProgress]);

  const handleMapConfirm = useCallback((lat: string, lon: string) => {
    setGpsLat(lat);
    setGpsLon(lon);
    setMapOpen(false);
  }, []);

  useImperativeHandle(ref, () => ({
    submit: () => {
      setSubmitted(true);
      const count = Object.keys(errors).length;
      if (count > 0) {
        toast.error(`Please fix ${count} required field${count > 1 ? 's' : ''} before saving`);
        return;
      }
      onSubmit(values, { asDraft: false });
    },
    submitAsDraft: () => {
      setSubmitted(true);
      if (!plotName.trim()) {
        toast.error('Plot name is required to save as draft');
        return;
      }
      onSubmit(values, { asDraft: true });
    },
    getValues: () => values,
  }));

  // Helper: show error only after first submit attempt
  const err = (field: keyof ValidationErrors) => submitted ? errors[field] : undefined;

  const containerSx = bordered
    ? { borderRadius: '12px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', px: { xs: 3, sm: 4 }, pt: 3, pb: 3 }
    : { px: 0, pt: 0, pb: 0 };
  const Container: React.ElementType = bordered ? Paper : Box;
  const containerProps = bordered ? { elevation: 0 } : {};

  return (
    <Container {...containerProps} sx={containerSx}>

      {/* ══ SECTION 1 — Plot details ══════════════════════════ */}
      <SectionLabel>Plot details</SectionLabel>

      <Stack spacing={2}>
        {/* Plot name */}
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <FieldLabel required>Plot name</FieldLabel>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{plotName.length}/40</Typography>
          </Box>
          <TextField fullWidth size="small" placeholder="Type here"
            value={plotName}
            onChange={(e) => { if (e.target.value.length <= 40) setPlotName(e.target.value); }}
            error={!!err('plotName')} helperText={err('plotName')}
            sx={err('plotName') ? errorFieldSx : fieldSx} />
        </Box>

        {/* Location: lat + lon + map CTA */}
        <Box>
          <FieldLabel required>Location</FieldLabel>
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <Box sx={{ flex: 1 }}>
              <TextField fullWidth size="small" placeholder="Latitude" inputMode="decimal"
                value={gpsLat} onChange={(e) => setGpsLat(e.target.value)}
                onKeyDown={(e) => numericKeyFilter(e as React.KeyboardEvent<HTMLInputElement>, true)}
                error={!!err('gpsLat')} helperText={err('gpsLat')}
                sx={err('gpsLat') ? errorFieldSx : fieldSx} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <TextField fullWidth size="small" placeholder="Longitude" inputMode="decimal"
                value={gpsLon} onChange={(e) => setGpsLon(e.target.value)}
                onKeyDown={(e) => numericKeyFilter(e as React.KeyboardEvent<HTMLInputElement>, true)}
                error={!!err('gpsLon')} helperText={err('gpsLon')}
                sx={err('gpsLon') ? errorFieldSx : fieldSx} />
            </Box>
            <Button variant="soft" color="primary"
              startIcon={<LocationOn sx={{ fontSize: 18 }} />}
              onClick={() => setMapOpen(true)}
              sx={{ fontWeight: 600, borderRadius: '8px', textTransform: 'none', whiteSpace: 'nowrap', px: 2, minWidth: 0, height: 40 }}>
              Select on map
            </Button>
          </Stack>
        </Box>

        {/* Plot size + Cultivation type */}
        <Stack direction={ROW} spacing={2.5}>
          <Box sx={{ flex: 1 }}>
            <FieldLabel>Plot size</FieldLabel>
            <TextField fullWidth size="small" placeholder="0" inputMode="decimal"
              value={plotSize} onChange={(e) => setPlotSize(e.target.value)}
              onKeyDown={(e) => numericKeyFilter(e as React.KeyboardEvent<HTMLInputElement>)}
              InputProps={{ endAdornment: <InputAdornment position="end">ha</InputAdornment> }}
              sx={fieldSx} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <FieldLabel required>Cultivation type</FieldLabel>
            <Autocomplete size="small" options={CULTIVATION_TYPES} value={cultivationType} onChange={(_, v) => setCultivationType(v)}
              renderInput={(params) => (
                <TextField {...params} placeholder="Choose an option"
                  error={!!err('cultivationType')} helperText={err('cultivationType')} />
              )} sx={err('cultivationType') ? errorFieldSx : fieldSx} />
          </Box>
        </Stack>
      </Stack>

      {/* ══ SECTION 2 — Growth cycle details ══════════════════ */}
      <Divider sx={{ my: 3 }} />
      <SectionLabel>Growth cycle details</SectionLabel>

      <Stack spacing={2}>
        {/* Season */}
        <Box>
          <FieldLabel required>Season</FieldLabel>
          <Autocomplete size="small" options={[...seasons, CREATE_SEASON_ACTION]} value={season}
            getOptionLabel={(opt) => opt === CREATE_SEASON_ACTION ? 'Create season' : opt}
            filterOptions={(options, state) => {
              const filtered = options.filter(o => o !== CREATE_SEASON_ACTION && o.toLowerCase().includes(state.inputValue.toLowerCase()));
              filtered.push(CREATE_SEASON_ACTION);
              return filtered;
            }}
            onChange={(_, v) => {
              if (v === CREATE_SEASON_ACTION) {
                setNewSeasonName('');
                setSeasonModalOpen(true);
              } else {
                setSeason(v);
              }
            }}
            renderOption={(props, option) => {
              const { key, ...rest } = props;
              if (option === CREATE_SEASON_ACTION) {
                return (
                  <li key={key} {...rest} style={{ ...rest.style, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AddIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                    <Typography sx={{ color: 'primary.main', fontWeight: 600, fontSize: '0.875rem' }}>Create season</Typography>
                  </li>
                );
              }
              return <li key={key} {...rest}>{option}</li>;
            }}
            renderInput={(params) => (
              <TextField {...params} placeholder="Choose a season"
                error={!!err('season')} helperText={err('season')} />
            )} sx={err('season') ? errorFieldSx : fieldSx} />
        </Box>

        {/* Crop + Variety */}
        <Stack direction={ROW} spacing={2.5}>
          <Box sx={{ flex: 1 }}>
            <FieldLabel required>Crop</FieldLabel>
            <Autocomplete size="small" options={crops} value={crop} onChange={(_, v) => setCrop(v)}
              renderInput={(params) => (
                <TextField {...params} placeholder="Choose a crop"
                  error={!!err('crop')} helperText={err('crop')} />
              )} sx={err('crop') ? errorFieldSx : fieldSx} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <FieldLabel required>Variety</FieldLabel>
            <Autocomplete size="small" options={VARIETY_OPTIONS} value={variety} onChange={(_, v) => setVariety(v)}
              renderInput={(params) => (
                <TextField {...params} placeholder="Choose a variety"
                  error={!!err('variety')} helperText={err('variety')} />
              )} sx={err('variety') ? errorFieldSx : fieldSx} />
          </Box>
        </Stack>

        {/* Planting density (value + unit) + Plot yield */}
        <Stack direction={ROW} spacing={2.5}>
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" spacing={1}>
              <Box sx={{ flex: 1 }}>
                <FieldLabel required>Planting density</FieldLabel>
                <TextField fullWidth size="small" placeholder="0" inputMode="decimal"
                  value={plantingDensity} onChange={(e) => setPlantingDensity(e.target.value)}
                  onKeyDown={(e) => numericKeyFilter(e as React.KeyboardEvent<HTMLInputElement>)}
                  error={!!err('plantingDensity')} helperText={err('plantingDensity')}
                  sx={err('plantingDensity') ? errorFieldSx : fieldSx} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <FieldLabel required>Unit</FieldLabel>
                <Autocomplete size="small" options={DENSITY_UNITS} value={densityUnit} onChange={(_, v) => setDensityUnit(v)}
                  disableClearable
                  renderInput={(params) => (
                    <TextField {...params} placeholder="Choose a unit"
                      error={!!err('densityUnit')} helperText={err('densityUnit')} />
                  )}
                  sx={err('densityUnit') ? errorFieldSx : fieldSx} />
              </Box>
            </Stack>
          </Box>
          <Box sx={{ flex: 1 }}>
            <FieldLabel>Plot yield</FieldLabel>
            <TextField fullWidth size="small" placeholder="0" inputMode="decimal"
              value={plotYield} onChange={(e) => setPlotYield(e.target.value)}
              onKeyDown={(e) => numericKeyFilter(e as React.KeyboardEvent<HTMLInputElement>)}
              InputProps={{ endAdornment: <InputAdornment position="end">kg</InputAdornment> }}
              sx={fieldSx} />
          </Box>
        </Stack>

        {/* Planting date + Flowering start date */}
        <Stack direction={ROW} spacing={2.5}>
          <Box sx={{ flex: 1 }}>
            <FieldLabel required={!softRequiredDates}>Planting date</FieldLabel>
            <DatePicker value={plantingDate} onChange={(v) => setPlantingDate(v)} format="dd/MM/yyyy"
              maxDate={earliestTreatmentDate ?? undefined}
              slotProps={{ textField: {
                size: 'small', fullWidth: true, placeholder: 'DD/MM/YYYY',
                error: !!err('plantingDate'), helperText: err('plantingDate'),
                sx: err('plantingDate') ? errorFieldSx : fieldSx,
              } }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <FieldLabel required={!softRequiredDates}>Flowering start date</FieldLabel>
            <DatePicker value={floweringStartDate} onChange={(v) => setFloweringStartDate(v)} format="dd/MM/yyyy"
              slotProps={{ textField: {
                size: 'small', fullWidth: true, placeholder: 'DD/MM/YYYY',
                error: !!err('floweringStartDate'), helperText: err('floweringStartDate'),
                sx: err('floweringStartDate') ? errorFieldSx : fieldSx,
              } }} />
          </Box>
        </Stack>
      </Stack>

      <MapSelectionModal open={mapOpen} onClose={() => setMapOpen(false)}
        onConfirm={handleMapConfirm} initialLat={gpsLat} initialLon={gpsLon} />

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
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newSeasonName.trim()) {
                setCustomSeasons(prev => [...prev, newSeasonName.trim()]);
                setSeason(newSeasonName.trim());
                setSeasonModalOpen(false);
              }
            }}
            sx={fieldSx} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 1, gap: 1 }}>
          <Button variant="text" color="inherit" onClick={() => setSeasonModalOpen(false)}
            sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'none' }}>
            Cancel
          </Button>
          <Button variant="contained" color="primary" disabled={!newSeasonName.trim()}
            onClick={() => {
              setCustomSeasons(prev => [...prev, newSeasonName.trim()]);
              setSeason(newSeasonName.trim());
              setSeasonModalOpen(false);
            }}
            sx={{ fontWeight: 600, textTransform: 'none', px: 3 }}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
});

// ── Helpers for callers ───────────────────────────────────────────────────────

/** Parse the location string "lat, lon" produced by addPlot back into separate fields. */
export function parseLocation(loc: string): { gpsLat: string; gpsLon: string } {
  const match = loc.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (!match) return { gpsLat: '', gpsLon: '' };
  return { gpsLat: match[1], gpsLon: match[2] };
}

/** Pack lat/lon back into the string format expected by PlotData.location. */
export function packLocation(gpsLat: string, gpsLon: string): string {
  const hasGps = gpsLat.trim() && gpsLon.trim();
  return hasGps ? `${parseFloat(gpsLat).toFixed(4)}, ${parseFloat(gpsLon).toFixed(4)}` : '';
}

