import React, { useRef, useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { TrendingUp } from '@mui/icons-material';
import { BaseDialog } from '../design-system/BaseDialog';
import { TreatmentsGrid, TreatmentsGridHandle } from './TreatmentsGrid';
import { TreatmentData, updateTreatments, isTreatmentDraft } from '../data/plots-data';
import { toast } from 'sonner';

interface CompleteTreatmentsDialogProps {
  open: boolean;
  onClose: () => void;
  /** Treatments that still need fields filled in. The grid renders these. */
  draftTreatments: TreatmentData[];
  /** Fires after the rows are persisted via updateTreatments. */
  onSaved?: () => void;
}

/** Variant of TreatmentModal for the "complete data to generate the forecast"
 *  case. Pre-loads the plot's draft treatments; no "Add treatment" button and
 *  no plot selector — the user is here to finish what's already there. */
export function CompleteTreatmentsDialog({
  open, onClose, draftTreatments, onSaved,
}: CompleteTreatmentsDialogProps) {
  const gridRef = useRef<TreatmentsGridHandle>(null);
  // Remount the grid every time the dialog opens so it starts from a fresh
  // copy of the draft treatments.
  const [mountKey, setMountKey] = useState(0);
  useEffect(() => { if (open) setMountKey(k => k + 1); }, [open]);

  const handleConfirm = () => {
    const rows = gridRef.current?.getAllRows() ?? [];
    // Persist whatever the user entered — even if still partial. A row that's
    // still a draft will keep being a draft; one that's now complete won't.
    updateTreatments(rows);

    const stillIncomplete = rows.filter(isTreatmentDraft).length;
    if (stillIncomplete > 0) {
      toast.error(
        `${stillIncomplete} treatment${stillIncomplete !== 1 ? 's' : ''} still missing required fields`
      );
      return;
    }
    toast.success('Treatments completed — generating forecast');
    onSaved?.();
    onClose();
  };

  return (
    <BaseDialog
      open={open}
      onClose={onClose}
      title="Complete your treatments to get the forecast"
      cancelLabel="Cancel"
      confirmLabel="Get forecast"
      confirmIcon={<TrendingUp />}
      onConfirm={handleConfirm}
      maxWidth="xl"
      padding="48px"
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontSize: '0.9375rem', lineHeight: 1.6 }}
        >
          Fill in the missing details for the treatments below so we can generate your residue forecast.
        </Typography>

        <Box sx={{ height: 340, border: '1px solid', borderColor: 'divider', borderRadius: '8px', overflow: 'hidden' }}>
          <TreatmentsGrid
            key={mountKey}
            ref={gridRef}
            initialData={draftTreatments}
            onDirtyStateChange={() => {}}
            onSelectionChange={() => {}}
          />
        </Box>
      </Box>
    </BaseDialog>
  );
}
