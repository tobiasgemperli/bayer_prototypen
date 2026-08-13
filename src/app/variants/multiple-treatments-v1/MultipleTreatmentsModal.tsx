import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, Button, Divider, IconButton, Stack,
} from '@mui/material';
import { Add, ContentCopy, DeleteOutline, Close as CloseIcon } from '@mui/icons-material';
import { toast } from 'sonner';
import { TreatmentsGrid, TreatmentsGridHandle } from '../../main/TreatmentsGrid';
import { OptionsTrigger } from '../../design-system/OptionsTrigger';
import { ActionMenu, ActionItem } from '../../design-system/ActionMenu';
import { TreatmentData, usePlots } from '../../data/plots-data';
import { PlotsSelectorWithDates } from './PlotsSelectorWithDates';

export interface MultipleTreatmentsModalProps {
  open: boolean;
  onClose: () => void;
  preSelectedPlotIds?: string[];
  preSelectedTreatments?: TreatmentData[];
  title?: string;
  hideplotsSelector?: boolean;
  confirmLabel?: string;
  confirmIcon?: React.ReactNode;
  onConfirmOverride?: () => void;
}

/** V1 of "Multiple Treatments → Plots":
 *
 *  - Sticky header + sticky footer; the treatments grid + plot selector scroll.
 *    Subtle scroll-shadow telegraphs "more content below".
 *  - Per-plot validation: chips show a warning + red border when the plot's
 *    planting date is AFTER the earliest treatment date. Tooltip explains why.
 *  - CTA reads "Apply to N plots (M incompatible)" so the user knows the
 *    consequence before they click. (M3 button-label spec.)
 *  - Submit skips incompatible plots and toasts the breakdown. (Salesforce /
 *    Linear bulk-edit pattern; user is never blocked.)
 */
function fmtDate(d: Date | null | undefined): string {
  if (!d || isNaN(d.getTime())) return 'no date';
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
}

export function MultipleTreatmentsModal({
  open, onClose,
  preSelectedPlotIds, preSelectedTreatments,
  title = 'Apply treatments to plots',
  hideplotsSelector,
  confirmLabel,
  confirmIcon,
  onConfirmOverride,
}: MultipleTreatmentsModalProps) {
  const [selectedPlotIds, setSelectedPlotIds] = useState<string[]>([]);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [optionsAnchor, setOptionsAnchor] = useState<null | HTMLElement>(null);
  const [mountKey, setMountKey] = useState(0);
  const [initialTreatments, setInitialTreatments] = useState<TreatmentData[]>([]);
  const gridRef = useRef<TreatmentsGridHandle>(null);
  const plots = usePlots();

  useEffect(() => {
    if (open) {
      setSelectedPlotIds(preSelectedPlotIds || []);
      setSelectedRowIds([]);
      const prefilled = preSelectedTreatments ?? [];
      setInitialTreatments(prefilled);
      setMountKey((k) => k + 1);
      if (prefilled.length === 0) {
        setTimeout(() => gridRef.current?.addRow('__draft__'), 120);
      }
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Compute the earliest application date among the treatments currently in the grid.
  // This drives plot-validation: any plot planted AFTER this date is incompatible.
  const [earliestTreatmentDate, setEarliestTreatmentDate] = useState<Date | null>(null);
  const recomputeEarliest = () => {
    const rows = gridRef.current?.getAllRows() ?? [];
    const dates = rows
      .map(r => r.date)
      .filter((d): d is Date => d instanceof Date && !isNaN(d.getTime()));
    if (!dates.length) { setEarliestTreatmentDate(null); return; }
    setEarliestTreatmentDate(new Date(Math.min(...dates.map(d => d.getTime()))));
  };

  // Re-compute when the grid mounts and on any visible mutation.
  useEffect(() => { if (open) setTimeout(recomputeEarliest, 200); }, [open, mountKey]);

  const incompatiblePlots = useMemo(() => {
    if (!earliestTreatmentDate) return [];
    return plots
      .filter(p => selectedPlotIds.includes(p.id))
      .filter(p => p.plantingDate && p.plantingDate > earliestTreatmentDate);
  }, [plots, selectedPlotIds, earliestTreatmentDate]);

  const validCount = selectedPlotIds.length - incompatiblePlots.length;

  // CTA label per plain-language audit:
  //  - All-conflict state: button is disabled; label tells the user what to fix.
  //  - Mixed state: `Apply to N plots (skip M)` — plain English, no jargon.
  //  - Default: action-oriented `Apply to N plots`.
  const isAllConflict = selectedPlotIds.length > 0 && validCount === 0;
  const computedConfirmLabel = useMemo(() => {
    if (confirmLabel) return confirmLabel;
    if (selectedPlotIds.length === 0) return 'Apply treatments';
    if (isAllConflict) return 'Resolve conflicts to apply';
    if (incompatiblePlots.length === 0) {
      return `Apply to ${selectedPlotIds.length} plot${selectedPlotIds.length !== 1 ? 's' : ''}`;
    }
    return `Apply to ${validCount} plot${validCount !== 1 ? 's' : ''} (skip ${incompatiblePlots.length})`;
  }, [confirmLabel, selectedPlotIds, isAllConflict, incompatiblePlots, validCount]);

  const handleAddRow = () => { gridRef.current?.addRow('__draft__'); setTimeout(recomputeEarliest, 50); };
  const handleBulkDuplicate = () => { selectedRowIds.forEach((id) => gridRef.current?.duplicateRow(id)); setOptionsAnchor(null); setTimeout(recomputeEarliest, 50); };
  const handleBulkDelete = () => {
    selectedRowIds.forEach((id) => gridRef.current?.deleteRow(id));
    setSelectedRowIds([]); setOptionsAnchor(null); setTimeout(recomputeEarliest, 50);
  };

  const handleConfirm = () => {
    if (onConfirmOverride) { onConfirmOverride(); return; }
    if (selectedPlotIds.length === 0) {
      toast.error('Pick at least one plot.');
      return;
    }
    // All-conflict state is unreachable here because the CTA is disabled — but
    // we keep the guard for safety in case the modal is driven programmatically.
    if (isAllConflict) return;
    if (incompatiblePlots.length === 0) {
      toast.success(`Treatments applied to ${validCount} plot${validCount !== 1 ? 's' : ''}.`);
    } else {
      const plural = incompatiblePlots.length !== 1;
      toast.success(
        `Treatments applied to ${validCount} plot${validCount !== 1 ? 's' : ''}. ${incompatiblePlots.length} plot${plural ? 's' : ''} skipped — ${plural ? 'they were' : 'it was'} planted after the treatment date.`
      );
    }
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      scroll="paper"           // Body scrolls; title + actions stay sticky.
      PaperProps={{
        sx: {
          borderRadius: '12px',
          boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.12)',
          maxHeight: 'calc(100vh - 64px)',  // Leave room above/below so the user sees the modal frame.
        },
      }}
    >
      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <DialogTitle sx={{
        m: 0, px: 6, pt: 6, pb: 2,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        borderBottom: '1px solid', borderColor: 'divider',
      }}>
        <Box>
          <Typography variant="h6" component="div" sx={{ fontWeight: 700, fontSize: '1.25rem', lineHeight: 1.2 }}>
            {title}
          </Typography>
          <Typography variant="body2" color={incompatiblePlots.length > 0 ? 'error.main' : 'text.secondary'} sx={{ mt: 0.75, fontSize: '0.9375rem' }}>
            {hideplotsSelector
              ? 'Fill in the treatment details below.'
              : incompatiblePlots.length > 0 && earliestTreatmentDate
                ? `Heads up — your earliest treatment is dated ${fmtDate(earliestTreatmentDate)}. Plots planted after that date can't receive it.`
                : 'Add treatments, then pick the plots to apply them to.'}
          </Typography>
        </Box>
        <IconButton aria-label="close" onClick={onClose} sx={{ color: (t) => t.palette.grey[500], p: 0.5, ml: 2 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* ── Scrollable body with subtle scroll-shadow ─────────────────────── */}
      <DialogContent
        sx={{
          px: 6, py: 4,
          // M3 scroll-shadow pattern: linear-gradient backgrounds that pin to
          // top/bottom and fade as the user scrolls. Pure-CSS, no JS scroll listener.
          background: `
            linear-gradient(white 30%, rgba(255,255,255,0)),
            linear-gradient(rgba(255,255,255,0), white 70%) 0 100%,
            radial-gradient(farthest-side at 50% 0, rgba(0,0,0,0.10), rgba(0,0,0,0)),
            radial-gradient(farthest-side at 50% 100%, rgba(0,0,0,0.10), rgba(0,0,0,0)) 0 100%
          `,
          backgroundRepeat: 'no-repeat',
          backgroundSize: '100% 28px, 100% 28px, 100% 10px, 100% 10px',
          backgroundAttachment: 'local, local, scroll, scroll',
        }}
      >
        <Stack spacing={3}>
          {/* Grid toolbar */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1 }}>
            <Button
              variant="soft" color="primary" startIcon={<Add />}
              onClick={handleAddRow}
              sx={{ height: 36, px: 2, fontWeight: 600, borderRadius: '8px', textTransform: 'none' }}
            >
              Add treatment
            </Button>
            <OptionsTrigger
              onClick={(e) => setOptionsAnchor(e.currentTarget)}
              disabled={selectedRowIds.length === 0}
              hasSelection={selectedRowIds.length > 0}
            />
            <ActionMenu
              anchorEl={optionsAnchor}
              open={Boolean(optionsAnchor)}
              onClose={() => setOptionsAnchor(null)}
              actions={(() => {
                const plural = selectedRowIds.length > 1;
                const items: ActionItem[] = [
                  { label: plural ? 'Copy treatments' : 'Copy treatment',
                    icon: <ContentCopy fontSize="small" />, key: 'copy', onClick: handleBulkDuplicate },
                  { divider: true, key: 'd1', onClick: () => {} },
                  { label: plural ? 'Delete treatments' : 'Delete treatment',
                    icon: <DeleteOutline fontSize="small" />, key: 'delete', color: 'error.main', onClick: handleBulkDelete },
                ];
                return items;
              })()}
            />
          </Box>

          {/* Treatments grid */}
          <Box sx={{ height: 340, border: '1px solid', borderColor: 'divider', borderRadius: '8px', overflow: 'hidden' }}>
            <TreatmentsGrid
              key={mountKey}
              ref={gridRef}
              initialData={initialTreatments}
              onDirtyStateChange={() => setTimeout(recomputeEarliest, 50)}
              onSelectionChange={setSelectedRowIds}
            />
          </Box>

          {/* Plot selector */}
          {!hideplotsSelector && (
            <>
              <Divider />
              <Box>
                <Typography sx={{ mb: 1, fontWeight: 500, fontSize: '0.8125rem', color: 'text.primary' }}>
                  Apply to these plots
                </Typography>
                <PlotsSelectorWithDates
                  selectedPlotIds={selectedPlotIds}
                  onChange={setSelectedPlotIds}
                  earliestTreatmentDate={earliestTreatmentDate}
                />
                {incompatiblePlots.length > 0 && earliestTreatmentDate && (
                  <Box sx={{ mt: 1.5, p: 1.5, borderRadius: '8px', bgcolor: 'rgba(211,47,47,0.06)', border: '1px solid', borderColor: 'rgba(211,47,47,0.25)' }}>
                    <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'error.dark', mb: 0.5 }}>
                      {incompatiblePlots.length} plot{incompatiblePlots.length !== 1 ? 's were' : ' was'} planted after your earliest treatment date ({fmtDate(earliestTreatmentDate)}) and can't receive it.
                    </Typography>
                    <Typography sx={{ fontSize: '0.8125rem', color: 'error.dark' }}>
                      To fix: either move the treatment date forward, or remove {incompatiblePlots.length !== 1 ? 'these plots' : 'this plot'} from the list.
                    </Typography>
                  </Box>
                )}
              </Box>
            </>
          )}
        </Stack>
      </DialogContent>

      {/* ── Sticky footer ─────────────────────────────────────────────────── */}
      <DialogActions sx={{ px: 6, pb: 4, pt: 2, borderTop: '1px solid', borderColor: 'divider', justifyContent: 'flex-end', gap: 1.5 }}>
        <Button onClick={onClose} variant="text" color="inherit"
          sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'none' }}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm} variant="contained" color="primary"
          endIcon={confirmIcon}
          disabled={isAllConflict}
          sx={{ fontWeight: 600, px: 3, textTransform: 'none' }}
        >
          {computedConfirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
