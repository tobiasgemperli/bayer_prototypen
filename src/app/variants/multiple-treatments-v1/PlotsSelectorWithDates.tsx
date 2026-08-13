import React, { useMemo } from 'react';
import {
  Autocomplete, TextField, Checkbox, Box, Typography, Button, Tooltip,
} from '@mui/material';
import {
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon,
  Close as CloseIcon,
  WarningAmber,
} from '@mui/icons-material';
import { usePlots, PlotData } from '../../data/plots-data';

interface PlotsSelectorWithDatesProps {
  selectedPlotIds: string[];
  onChange: (ids: string[]) => void;
  /** Optional: earliest application date among the in-progress treatments. When
   *  set, any plot with `plantingDate > earliestTreatmentDate` renders as
   *  "incompatible" — red border, warning icon, tooltip with reason. */
  earliestTreatmentDate?: Date | null;
  error?: boolean;
  helperText?: string;
}

function fmtDate(d: Date | null | undefined): string {
  if (!d || isNaN(d.getTime())) return 'no date';
  // Drop the leading zero on the day for readability — M3 typography spec.
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
}

/** Returns null if compatible, otherwise a plain-language reason — two sentences:
 *  state the fact, explain the rule. NN/g error-message spec: describe + explain. */
function getIncompatibilityReason(plot: PlotData, earliestTreatmentDate: Date | null | undefined): string | null {
  if (!earliestTreatmentDate) return null;
  if (!plot.plantingDate) return null;
  if (plot.plantingDate > earliestTreatmentDate) {
    return `Planted ${fmtDate(plot.plantingDate)}. Your earliest treatment is dated ${fmtDate(earliestTreatmentDate)} — a plot can't receive a treatment before it's planted.`;
  }
  return null;
}

/** Enhanced plot selector for "Multiple Treatments → Plots".
 *  - Each option row shows the planting date as muted secondary text.
 *  - Selected-plot chip shows a warning indicator + red border when the plot's
 *    planting date is AFTER the earliest treatment date.
 *  - Tooltip on the warning chip explains the conflict.
 *  Pattern: NN/g — place errors near their source; Material 3 — supporting text + chip state. */
export function PlotsSelectorWithDates({
  selectedPlotIds, onChange, earliestTreatmentDate, error, helperText,
}: PlotsSelectorWithDatesProps) {
  const plots = usePlots();
  const selectedPlots = useMemo(
    () => plots.filter((plot) => selectedPlotIds.includes(plot.id)),
    [plots, selectedPlotIds],
  );

  const handleTogglePlot = (id: string) => {
    const next = selectedPlotIds.includes(id)
      ? selectedPlotIds.filter((pid) => pid !== id)
      : [...selectedPlotIds, id];
    onChange(next);
  };

  const handleReset = () => onChange([]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Autocomplete<PlotData, true>
        multiple
        options={plots}
        disableCloseOnSelect
        getOptionLabel={(option) => `${option.plotName} (${option.crop})`}
        value={selectedPlots}
        onChange={(_, newValue) => onChange(newValue.map((p) => p.id))}
        renderOption={(props, option, { selected }) => {
          const { key, ...optionProps } = props as any;
          const reason = getIncompatibilityReason(option, earliestTreatmentDate);
          return (
            <li key={key} {...optionProps}>
              <Checkbox
                icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                checkedIcon={<CheckBoxIcon fontSize="small" />}
                style={{ marginRight: 8 }}
                checked={selected}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: 'text.primary' }}>
                  {option.plotName} <Box component="span" sx={{ color: 'text.secondary', fontWeight: 400 }}>({option.crop})</Box>
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', color: reason ? 'error.main' : 'text.secondary', mt: 0.25 }}>
                  Planted {fmtDate(option.plantingDate)}
                  {reason && <Box component="span" sx={{ ml: 0.5 }}>· Can't receive this treatment</Box>}
                </Typography>
              </Box>
              {reason && (
                <Tooltip title={reason} placement="left" arrow>
                  <WarningAmber sx={{ fontSize: 18, color: 'error.main', ml: 1 }} />
                </Tooltip>
              )}
            </li>
          );
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder="Search plots…"
            variant="outlined"
            size="small"
            error={error}
            helperText={helperText}
          />
        )}
        renderTags={() => null} // Chips rendered below
      />

      {selectedPlotIds.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
          {selectedPlots.map((plot) => {
            const reason = getIncompatibilityReason(plot, earliestTreatmentDate);
            const chip = (
              <Box
                sx={{
                  display: 'inline-flex', alignItems: 'center', gap: 0.5,
                  pl: 1.25, pr: 0.5, height: 32, borderRadius: '6px',
                  border: '1px solid',
                  borderColor: reason ? 'error.main' : 'transparent',
                  bgcolor: reason ? 'rgba(211,47,47,0.06)' : 'action.hover',
                  fontWeight: 500, fontSize: '0.875rem',
                  color: reason ? 'error.main' : 'text.primary',
                }}
              >
                {reason && <WarningAmber sx={{ fontSize: 16, mr: 0.25 }} />}
                <Box component="span">
                  {plot.plotName}
                  <Box component="span" sx={{ ml: 0.5, fontSize: '0.75rem', color: reason ? 'error.main' : 'text.secondary', fontWeight: 400 }}>
                    · Planted {fmtDate(plot.plantingDate)}
                  </Box>
                </Box>
                <Box
                  component="button"
                  onClick={() => handleTogglePlot(plot.id)}
                  sx={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    border: 'none', bgcolor: 'transparent', cursor: 'pointer',
                    p: 0, ml: 0.25, width: 22, height: 22, borderRadius: '50%',
                    color: 'text.secondary',
                    '&:hover': { color: reason ? 'error.dark' : 'primary.main' },
                  }}
                  aria-label={`Remove ${plot.plotName}`}
                >
                  <CloseIcon sx={{ fontSize: 16 }} />
                </Box>
              </Box>
            );
            return reason
              ? <Tooltip key={plot.id} title={reason} placement="top" arrow>{chip}</Tooltip>
              : <React.Fragment key={plot.id}>{chip}</React.Fragment>;
          })}
          <Button
            size="small"
            color="primary"
            onClick={handleReset}
            sx={{ fontWeight: 600, textTransform: 'none', fontSize: '0.75rem', ml: 'auto' }}
          >
            Reset all
          </Button>
        </Box>
      )}
    </Box>
  );
}
