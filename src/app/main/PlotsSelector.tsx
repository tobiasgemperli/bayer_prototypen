import React, { useMemo, useState } from 'react';
import { Box, IconButton, Stack, Typography } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { usePlots } from '../data/plots-data';
import { useSprayPlans, addPlan } from '../data/spray-plans-data';
import { EntityAutocomplete, EntityAutocompleteOption } from '../design-system/EntityAutocomplete';
import { CreateTreatmentPlanDialog } from './CreateTreatmentPlanDialog';

interface PlotsSelectorProps {
  selectedPlotIds: string[];
  onChange: (ids: string[]) => void;
  error?: boolean;
  helperText?: string;
  /** Defaults to the selector's own generic placeholder. */
  placeholder?: string;
}

const APPLIED_TREATMENT_ID = '__applied_treatment__';

function formatPlantingDate(date: Date | null | undefined): string {
  if (!date) return 'No planting date';
  return `Planted ${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)}`;
}

/** Plain dropdown (plot name only, same list style as any other picker) —
 *  the picked-so-far context (planting date, per-plot treatment plan, remove
 *  action) lives entirely in the full-width row list below it, not inside
 *  the field itself. */
export function PlotsSelector({ selectedPlotIds, onChange, error, helperText, placeholder = 'Select plots' }: PlotsSelectorProps) {
  const plots = usePlots();
  const sprayPlans = useSprayPlans();
  const plotsById = useMemo(() => new Map(plots.map((p) => [p.id, p])), [plots]);
  const options: EntityAutocompleteOption[] = useMemo(
    () => plots.map((plot) => ({ id: plot.id, label: `${plot.plotName} (${plot.crop})` })),
    [plots]
  );
  const selectedPlots = useMemo(
    () => selectedPlotIds.map((id) => plotsById.get(id)).filter((p): p is NonNullable<typeof p> => !!p),
    [selectedPlotIds, plotsById]
  );

  // Which treatment plan each selected plot will use — "Applied treatment"
  // (the treatments in this dialog's own grid) by default; a plot can be
  // switched to one of its existing simulated plans instead. Local-only:
  // this prototype doesn't yet wire the choice into Confirm.
  const [planByPlot, setPlanByPlot] = useState<Record<string, string>>({});
  const [createPlanForPlotId, setCreatePlanForPlotId] = useState<string | null>(null);

  const handleRemove = (id: string) => onChange(selectedPlotIds.filter((pid) => pid !== id));

  const handleCreatePlan = (name: string) => {
    if (!createPlanForPlotId) return;
    const plan = addPlan(createPlanForPlotId, { name, kind: 'simulated' });
    setPlanByPlot((prev) => ({ ...prev, [createPlanForPlotId]: plan.id }));
    setCreatePlanForPlotId(null);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <EntityAutocomplete
        multiple
        value={selectedPlotIds}
        onChange={onChange}
        options={options}
        placeholder={placeholder}
        error={error}
        helperText={helperText}
      />

      {selectedPlots.length > 0 && (
        <Stack spacing={1}>
          {selectedPlots.map((plot) => {
            const planOptions: EntityAutocompleteOption[] = [
              { id: APPLIED_TREATMENT_ID, label: 'Applied treatment', group: 'applied' },
              ...sprayPlans
                .filter((p) => p.plotId === plot.id && p.kind === 'simulated')
                .map((p) => ({ id: p.id, label: p.name, group: 'simulated' })),
            ];
            return (
              <Box
                key={plot.id}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 2,
                  width: '100%', px: 2, py: 1.25,
                  border: '1px solid', borderColor: 'divider', borderRadius: '8px',
                  bgcolor: 'background.paper',
                }}
              >
                <Box sx={{ minWidth: 0, flex: '1 1 auto' }}>
                  <Typography sx={{ fontSize: '0.875rem', fontWeight: 400, color: 'text.primary' }}>
                    {plot.plotName} ({plot.crop})
                  </Typography>
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 400, color: 'text.secondary', mt: 0.25 }}>
                    {formatPlantingDate(plot.plantingDate)}
                  </Typography>
                </Box>
                <Box sx={{ width: 224, flexShrink: 0 }}>
                  <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, color: 'text.secondary', mb: 0.25 }}>
                    Treatment plan
                  </Typography>
                  <EntityAutocomplete
                    value={planByPlot[plot.id] ?? APPLIED_TREATMENT_ID}
                    onChange={(id) => setPlanByPlot((prev) => ({ ...prev, [plot.id]: id }))}
                    options={planOptions}
                    trailingAction={{
                      label: 'Create new treatment plan',
                      group: 'simulated',
                      onClick: () => setCreatePlanForPlotId(plot.id),
                    }}
                  />
                </Box>
                <IconButton
                  size="small"
                  onClick={() => handleRemove(plot.id)}
                  aria-label={`Remove ${plot.plotName}`}
                  sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
                >
                  <CloseIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Box>
            );
          })}
        </Stack>
      )}

      <CreateTreatmentPlanDialog
        open={!!createPlanForPlotId}
        onClose={() => setCreatePlanForPlotId(null)}
        onConfirm={handleCreatePlan}
      />
    </Box>
  );
}
