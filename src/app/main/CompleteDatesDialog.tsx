import React, { useState, useMemo, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Typography, IconButton, Button, Stack, Box,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { toast } from 'sonner';
import { PlotData, updatePlot, treatmentsData } from '../data/plots-data';
import { FieldLabel, fieldSx, errorFieldSx } from '../design-system/FormField';

interface CompleteDatesDialogProps {
  open: boolean;
  plot: PlotData | undefined;
  onClose: () => void;
  /** Called after a successful save (after updatePlot has run). */
  onSaved?: (plotId: string) => void;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Small modal collecting just planting + flowering dates — the two fields V6
 *  treats as optional at save time. Triggered from the forecast tab when the
 *  user has saved a plot without these dates. */
export function CompleteDatesDialog({ open, plot, onClose, onSaved }: CompleteDatesDialogProps) {
  const [plantingDate, setPlantingDate] = useState<Date | null>(null);
  const [floweringStartDate, setFloweringStartDate] = useState<Date | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (open && plot) {
      setPlantingDate(plot.plantingDate ?? null);
      setFloweringStartDate(plot.floweringStartDate ?? null);
      setSubmitted(false);
    }
  }, [open, plot]);

  // Cross-field rule: planting date must be on or before the earliest treatment.
  const earliestTreatmentDate = useMemo(() => {
    if (!plot) return null;
    const dates = treatmentsData
      .filter(t => t.plotId === plot.id)
      .map(t => t.date)
      .filter((d): d is Date => d instanceof Date && !isNaN(d.getTime()));
    if (!dates.length) return null;
    return new Date(Math.min(...dates.map(d => d.getTime())));
  }, [plot]);

  const errors: { plantingDate?: string; floweringStartDate?: string } = {};
  if (!plantingDate) errors.plantingDate = 'Planting date is required';
  if (!floweringStartDate) errors.floweringStartDate = 'Flowering start date is required';
  if (plantingDate && earliestTreatmentDate && plantingDate > earliestTreatmentDate) {
    errors.plantingDate = `Planting must be on or before your earliest treatment (${formatDate(earliestTreatmentDate)}).`;
  }

  const handleConfirm = () => {
    setSubmitted(true);
    const count = Object.keys(errors).length;
    if (count > 0) {
      toast.error(`Please fix ${count} field${count > 1 ? 's' : ''} before continuing`);
      return;
    }
    if (!plot) return;
    updatePlot(plot.id, { plantingDate, floweringStartDate });
    toast.success(`Dates added to "${plot.plotName}"`);
    onSaved?.(plot.id);
    onClose();
  };

  const err = (k: keyof typeof errors) => submitted ? errors[k] : undefined;

  return (
    <Dialog
      open={open && !!plot}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{ sx: { borderRadius: '12px', boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.12)' } }}
    >
      <DialogTitle sx={{ m: 0, px: 3, pt: 3, pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" component="div" sx={{ fontWeight: 700, fontSize: '1.25rem', lineHeight: 1.2 }}>
          Add planting & flowering dates
        </Typography>
        <IconButton aria-label="close" onClick={onClose} sx={{ color: (t) => t.palette.grey[500], p: 0.5 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pt: 0, pb: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          We need these two dates to generate your residue forecast.
        </Typography>

        <Stack spacing={2}>
          <Box>
            <FieldLabel required>Planting date</FieldLabel>
            <DatePicker value={plantingDate} onChange={(v) => setPlantingDate(v)} format="dd/MM/yyyy"
              maxDate={earliestTreatmentDate ?? undefined}
              slotProps={{ textField: {
                size: 'small', fullWidth: true, placeholder: 'DD/MM/YYYY',
                error: !!err('plantingDate'), helperText: err('plantingDate'),
                sx: err('plantingDate') ? errorFieldSx : fieldSx,
              } }} />
          </Box>
          <Box>
            <FieldLabel required>Flowering start date</FieldLabel>
            <DatePicker value={floweringStartDate} onChange={(v) => setFloweringStartDate(v)} format="dd/MM/yyyy"
              slotProps={{ textField: {
                size: 'small', fullWidth: true, placeholder: 'DD/MM/YYYY',
                error: !!err('floweringStartDate'), helperText: err('floweringStartDate'),
                sx: err('floweringStartDate') ? errorFieldSx : fieldSx,
              } }} />
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 2, gap: 1.5 }}>
        <Button variant="text" color="inherit" onClick={onClose}
          sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'none', px: 3 }}>
          Cancel
        </Button>
        <Button variant="contained" color="primary" onClick={handleConfirm}
          sx={{ fontWeight: 600, textTransform: 'none', px: 4 }}>
          Get forecast
        </Button>
      </DialogActions>
    </Dialog>
  );
}
