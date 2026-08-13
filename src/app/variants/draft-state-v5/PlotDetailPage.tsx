import React, { useState, useMemo } from 'react';
import { useNavigate } from '../variant-context';
import {
  usePlots, isPlotDraft, treatmentsData, isTreatmentDraft, useTreatmentsVersion,
} from '../../data/plots-data';
import {
  PlotDetailPage as BaselinePlotDetailPage,
  ResidueForecastContent,
} from '../../main/PlotDetailPage';
import { EmptyState } from '../../design-system/EmptyState';
import { BaseDialog } from '../../design-system/BaseDialog';
import { EditPlotDialog } from '../../main/EditPlotDialog';
import { CompleteTreatmentsDialog } from '../../main/CompleteTreatmentsDialog';
import { Typography } from '@mui/material';
import noForecastImg from '../../assets/empty-states/no-residue-forecast-yet-v01.jpg';

// Forecast tab content for V5 (Save anytime). Three branches depending on what
// the user still needs to complete before a forecast can render:
//
//   1. Plot is a draft        → gate dialog → EditPlotDialog (complete plot)
//   2. Plot has draft trts    → CompleteTreatmentsDialog (complete treatments)
//   3. Everything complete    → render the real ResidueForecastContent
//
// Copy keys: plotPredictionDetail.noData.l1 / l2, plotDetails.getPredictions
function DraftForecastEmpty({ plotId }: { plotId: string }) {
  const navigate = useNavigate();
  const plots = usePlots();
  // Subscribe to treatment edits so the branch decision re-runs after the
  // user completes a treatment via the dialog.
  useTreatmentsVersion();
  const plot = plots.find(p => p.id === plotId);

  const plotDraft = plot ? isPlotDraft(plot) : false;
  const draftTreatments = useMemo(
    () => treatmentsData.filter(t => t.plotId === plotId && isTreatmentDraft(t)),
    [plotId, plots], // re-runs on plot changes; treatment edits trigger via useTreatmentsVersion above
  );
  const hasAnyTreatment = treatmentsData.some(t => t.plotId === plotId);

  const [gateOpen, setGateOpen] = useState(false);
  const [editPlotOpen, setEditPlotOpen] = useState(false);
  const [completeTreatmentsOpen, setCompleteTreatmentsOpen] = useState(false);

  // Branch 3: everything complete → defer to the real forecast view.
  if (plot && !plotDraft && hasAnyTreatment && draftTreatments.length === 0) {
    return <ResidueForecastContent plotId={plotId} />;
  }

  const handleCta = () => {
    if (plotDraft) {
      setGateOpen(true);
      return;
    }
    if (draftTreatments.length > 0) {
      setCompleteTreatmentsOpen(true);
      return;
    }
    // No treatments yet → straight to the Treatments tab to add the first one.
    navigate(`/plot/${plotId}`, { state: { activeTab: 0 }, replace: true });
  };

  return (
    <>
      <EmptyState
        illustration={noForecastImg}
        title="Get your residue forecast"
        body="Generate a forecast for this plot."
        ctaLabel="Get forecast"
        ctaVariant="contained"
        onCta={handleCta}
      />

      {/* Branch 1: complete plot info first */}
      <BaseDialog
        open={gateOpen}
        onClose={() => setGateOpen(false)}
        title="Complete your plot first"
        cancelLabel="Cancel"
        confirmLabel="Next"
        onConfirm={() => { setGateOpen(false); setEditPlotOpen(true); }}
        maxWidth="xs"
      >
        <Typography variant="body2" color="text.secondary">
          Before you can add a treatment, please complete your plot information.
        </Typography>
      </BaseDialog>

      <EditPlotDialog
        open={editPlotOpen}
        plot={plot}
        onClose={() => setEditPlotOpen(false)}
        onSaved={() => navigate(`/plot/${plotId}`, { state: { activeTab: 0 }, replace: true })}
      />

      {/* Branch 2: complete the draft treatments */}
      <CompleteTreatmentsDialog
        open={completeTreatmentsOpen}
        onClose={() => setCompleteTreatmentsOpen(false)}
        draftTreatments={draftTreatments}
        onSaved={() => { /* version bump from updateTreatments re-renders this component → branch 3 takes over */ }}
      />
    </>
  );
}

export function PlotDetailPage() {
  return <BaselinePlotDetailPage ForecastContent={DraftForecastEmpty} />;
}
