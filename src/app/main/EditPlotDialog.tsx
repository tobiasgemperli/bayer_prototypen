import React, { useRef, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Typography, IconButton, Button,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { toast } from 'sonner';
import {
  PlotData, updatePlot, treatmentsData,
} from '../data/plots-data';
import {
  AddPlotForm, AddPlotFormHandle, PlotFormValues, parseLocation, packLocation,
} from './AddPlotForm';

type SubmitOpts = { asDraft: boolean };

interface EditPlotDialogProps {
  open: boolean;
  plot: PlotData | undefined;
  onClose: () => void;
  /** Called after a successful save (after updatePlot has run). */
  onSaved?: (plotId: string) => void;
}

/** Modal version of AddPlot for completing a draft plot. All fields are required —
 *  this dialog is used to finish a draft, so partial saves don't apply. */
export function EditPlotDialog({ open, plot, onClose, onSaved }: EditPlotDialogProps) {
  const formRef = useRef<AddPlotFormHandle>(null);

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

  const initialValues: Partial<PlotFormValues> = useMemo(() => {
    if (!plot) return {};
    const { gpsLat, gpsLon } = parseLocation(plot.location ?? '');
    return {
      plotName: plot.plotName,
      gpsLat, gpsLon,
      crop: plot.crop || null,
      season: plot.season || null,
      variety: plot.variety || null,
      plantingDate: plot.plantingDate ?? null,
    };
  }, [plot]);

  const handleSubmit = (values: PlotFormValues, _opts: SubmitOpts) => {
    if (!plot) return;
    updatePlot(plot.id, {
      plotName: values.plotName.trim(),
      variety: values.variety ?? '',
      location: packLocation(values.gpsLat, values.gpsLon),
      crop: values.crop ?? '',
      season: values.season ?? '',
      plantingDate: values.plantingDate ?? null,
    });
    toast.success(`Plot "${values.plotName.trim()}" updated`);
    onSaved?.(plot.id);
    onClose();
  };

  return (
    <Dialog
      open={open && !!plot}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{ sx: { borderRadius: '12px', boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.12)' } }}
    >
      <DialogTitle sx={{ m: 0, px: 3, pt: 3, pb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" component="div" sx={{ fontWeight: 700, fontSize: '1.25rem', lineHeight: 1.2 }}>
          Edit plot
        </Typography>
        <IconButton aria-label="close" onClick={onClose} sx={{ color: (t) => t.palette.grey[500], p: 0.5 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pt: 0, pb: 1 }}>
        {plot && (
          <AddPlotForm
            ref={formRef}
            initialValues={initialValues}
            bordered={false}
            earliestTreatmentDate={earliestTreatmentDate}
            onSubmit={handleSubmit}
          />
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 2, gap: 1.5 }}>
        <Button variant="text" color="inherit" onClick={onClose}
          sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'none', px: 3 }}>
          Cancel
        </Button>
        <Button variant="contained" color="primary" onClick={() => formRef.current?.submit()}
          sx={{ fontWeight: 600, textTransform: 'none', px: 4 }}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
