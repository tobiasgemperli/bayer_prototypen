import React, { useState, useMemo } from 'react';
import { useNavigate } from '../variant-context';
import {
  usePlots, treatmentsData, isTreatmentDraft, useTreatmentsVersion, isForecastReady,
} from '../../data/plots-data';
import {
  PlotDetailPage as BaselinePlotDetailPage,
  ResidueForecastContent,
} from '../../main/PlotDetailPage';
import { EmptyState } from '../../design-system/EmptyState';
import { CompleteDatesDialog } from '../../main/CompleteDatesDialog';
import { CompleteTreatmentsDialog } from '../../main/CompleteTreatmentsDialog';
import noForecastImg from '../../assets/empty-states/no-residue-forecast-yet-v01.jpg';

// Forecast tab content for V6 (Dates-only optional). Three branches depending on
// what the user still needs to complete before a forecast can render:
//
//   1. Plot missing dates       → CompleteDatesDialog (small, 2 fields)
//   2. Plot has draft trts      → CompleteTreatmentsDialog (complete treatments)
//   3. Everything complete      → render the real ResidueForecastContent
//
// V6 difference vs V5: branch 1 no longer routes through a big EditPlot modal —
// only the two optional fields (planting + flowering date) need to be filled.
function DraftForecastEmpty({ plotId }: { plotId: string }) {
  const navigate = useNavigate();
  const plots = usePlots();
  // Subscribe to treatment edits so the branch decision re-runs after the user
  // completes a treatment via the dialog.
  useTreatmentsVersion();
  const plot = plots.find(p => p.id === plotId);

  const needsDates = plot ? !isForecastReady(plot) : false;
  const draftTreatments = useMemo(
    () => treatmentsData.filter(t => t.plotId === plotId && isTreatmentDraft(t)),
    [plotId, plots],
  );
  const hasAnyTreatment = treatmentsData.some(t => t.plotId === plotId);

  const [datesOpen, setDatesOpen] = useState(false);
  const [completeTreatmentsOpen, setCompleteTreatmentsOpen] = useState(false);

  // Branch 3: everything complete → defer to the real forecast view.
  if (plot && !needsDates && hasAnyTreatment && draftTreatments.length === 0) {
    return <ResidueForecastContent plotId={plotId} />;
  }

  const handleCta = () => {
    if (needsDates) {
      setDatesOpen(true);
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

      {/* Branch 1: just the two optional dates */}
      <CompleteDatesDialog
        open={datesOpen}
        plot={plot}
        onClose={() => setDatesOpen(false)}
        onSaved={() => { /* updatePlot re-renders this component → next branch takes over */ }}
      />

      {/* Branch 2: complete the draft treatments */}
      <CompleteTreatmentsDialog
        open={completeTreatmentsOpen}
        onClose={() => setCompleteTreatmentsOpen(false)}
        draftTreatments={draftTreatments}
        onSaved={() => { /* version bump → re-render → branch 3 takes over */ }}
      />
    </>
  );
}

export function PlotDetailPage() {
  return <BaselinePlotDetailPage ForecastContent={DraftForecastEmpty} />;
}
