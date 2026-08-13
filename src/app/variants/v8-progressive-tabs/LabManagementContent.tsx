import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box, Button, InputAdornment, Stack, Tab, TextField, Typography,
} from '@mui/material';
import { Add, DeleteOutline, Search } from '@mui/icons-material';
import { toast } from 'sonner';
import { EmptyState } from '../../design-system/EmptyState';
import { OptionsTrigger } from '../../design-system/OptionsTrigger';
import { ActionMenu, ActionItem } from '../../design-system/ActionMenu';
import { SaveBar } from '../../design-system/SaveBar';
import { SecondaryTabs } from '../../design-system/PlotTabs';
import {
  useLabSamples, LABORATORY_OPTIONS, LabSampleData, LabReport, LabResidue,
  addLabReport, createLabSample, getAnalytesForPlot, getLabSamplesForPlot,
  newReportId, newResidueId, updateLabReport, updateLabSample,
} from '../../data/lab-results-data';
import noLabResultsImg from '../../assets/empty-states/no-lab-results-v01.jpg';
// V8 reuses V7's grids unchanged — only LabManagementContent diverges
// here to implement progressive tab disclosure and the new empty-state copy.
import { SamplesGrid, SamplesGridHandle } from '../v7-reports-table/SamplesGrid';
import { ReportsGrid, ReportsGridHandle, ReportRow } from '../v7-reports-table/ReportsGrid';
import { ResultsGrid, ResultsGridHandle, ResidueRow, reportLabel } from '../v7-reports-table/ResultsGrid';
import { isReportDraft } from '../v7-reports-table/draft-state';

export function LabManagementContent({ plotId }: { plotId: string }) {
  const allSamples = useLabSamples();
  const samples = useMemo(() => allSamples.filter(s => s.plotId === plotId), [allSamples, plotId]);

  // Flatten reports across plot, with owning sample injected.
  const reportRows = useMemo<ReportRow[]>(() => {
    const out: ReportRow[] = [];
    for (const s of samples) {
      for (const r of s.reports ?? []) {
        out.push({ ...r, _sampleId: s.id, sampleName: s.sampleName || s.sampleCode });
      }
    }
    return out;
  }, [samples]);

  // Complete reports: every required field filled. These are the only ones
  // that can host results. Indexed by report id for quick row hydration.
  const completeReports = useMemo<{ sample: LabSampleData; report: LabReport }[]>(() => {
    const out: { sample: LabSampleData; report: LabReport }[] = [];
    for (const s of samples) {
      for (const r of s.reports ?? []) {
        if (!isReportDraft(r)) out.push({ sample: s, report: r });
      }
    }
    return out;
  }, [samples]);
  const completeReportIndex = useMemo(() => {
    const m = new Map<string, { sample: LabSampleData; report: LabReport }>();
    completeReports.forEach(p => m.set(p.report.id, p));
    return m;
  }, [completeReports]);
  const hasCompleteReport = completeReports.length > 0;

  // Auto-seed: every complete report should carry one fromTreatment residue per
  // plot-treatment analyte so the user can fill the level/value without typing
  // the analyte themselves. Runs whenever the complete-report set or the plot's
  // analyte list changes. Idempotent — only adds rows that aren't already there.
  const plotAnalytes = useMemo(() => getAnalytesForPlot(plotId), [plotId]);
  const completeReportKey = useMemo(
    () => completeReports.map(p => p.report.id).sort().join('|'),
    [completeReports]
  );
  useEffect(() => {
    for (const { sample, report } of completeReports) {
      const presentFromTreatment = new Set(
        sample.residues
          .filter(r => r.labReportId === report.id && r.fromTreatment)
          .map(r => r.analyte)
      );
      const missing = plotAnalytes.filter(a => !presentFromTreatment.has(a));
      if (missing.length === 0) continue;
      const seeded: LabResidue[] = missing.map(a => ({
        id: newResidueId(),
        analyte: a,
        residueLevel: null,
        residueValue: '',
        methodLoq: '0.01',
        methodLod: '',
        fromTreatment: true,
        labReportId: report.id,
      }));
      updateLabSample(sample.id, { residues: [...sample.residues, ...seeded] });
    }
  }, [completeReportKey, plotAnalytes.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  // Flatten residues across plot — show only those tied to a complete report.
  // Draft reports' residues remain in storage but are hidden from the grid.
  const residueRows = useMemo<ResidueRow[]>(() => {
    const out: ResidueRow[] = [];
    for (const s of samples) {
      for (const r of s.residues) {
        if (!r.labReportId) continue;
        const entry = completeReportIndex.get(r.labReportId);
        if (!entry) continue;
        out.push({
          ...r,
          _sampleId: s.id,
          reportLabel: reportLabel(entry.sample, entry.report),
        });
      }
    }
    return out;
  }, [samples, completeReportIndex]);

  // Known laboratories already used on this plot (feeds Reports dropdown).
  const laboratoryOptions = useMemo(() => {
    const labs = new Set<string>(LABORATORY_OPTIONS);
    samples.forEach(s => {
      if (s.laboratory) labs.add(s.laboratory);
      (s.reports ?? []).forEach(r => r.laboratory && labs.add(r.laboratory));
    });
    return Array.from(labs);
  }, [samples]);

  const [subTab, setSubTab] = useState(0); // 0 Samples · 1 Reports · 2 Results
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Tab-redirect effect is consolidated below the progressive-disclosure
  // checks so it also handles "0 samples → bounce to tab 0".

  // Per-tab dirty + gridKey so each grid manages its own buffered edits +
  // discard-on-cancel (gridKey bump remounts → reads fresh data from the store).
  const [dirty, setDirty] = useState<[boolean, boolean, boolean]>([false, false, false]);
  const [gridKeys, setGridKeys] = useState<[number, number, number]>([0, 0, 0]);
  const setDirtyAt = (i: number, v: boolean) =>
    setDirty(prev => { const next = [...prev] as [boolean, boolean, boolean]; next[i] = v; return next; });
  const bumpKeyAt = (i: number) =>
    setGridKeys(prev => { const next = [...prev] as [number, number, number]; next[i] = next[i] + 1; return next; });

  const samplesRef = useRef<SamplesGridHandle>(null);
  const reportsRef = useRef<ReportsGridHandle>(null);
  const resultsRef = useRef<ResultsGridHandle>(null);

  // AC-2.8: empty-state CTAs (and the "+ Add lab report" row CTA) persist a new
  // row through the data layer while the target grid is unmounted. We track the
  // new ids here so that once the grid mounts on the next render, an effect can
  // call markPending(id) — the row enters the dirty set and the SaveBar shows
  // with full validation. Without this the row would be a phantom unmarked row
  // and Save would treat the user as having no work to commit.
  const pendingSampleIdsRef = useRef<Set<string>>(new Set());
  const pendingReportIdsRef = useRef<Set<string>>(new Set());
  const pendingResidueIdsRef = useRef<Set<string>>(new Set());

  // Effect drains each pending-ids set into the active grid's dirty set on the
  // next render after the grid mounts. Keyed on the grid mount key so a remount
  // (Cancel → bumpKeyAt) drops stale ids. We pump each tick because the grid's
  // ref might not be live on the first paint after a mount.
  useEffect(() => {
    if (pendingSampleIdsRef.current.size === 0) return;
    const grid = samplesRef.current;
    if (!grid) return;
    pendingSampleIdsRef.current.forEach(id => grid.markPending(id));
    pendingSampleIdsRef.current.clear();
  });
  useEffect(() => {
    if (pendingReportIdsRef.current.size === 0) return;
    const grid = reportsRef.current;
    if (!grid) return;
    pendingReportIdsRef.current.forEach(id => grid.markPending(id));
    pendingReportIdsRef.current.clear();
  });
  useEffect(() => {
    if (pendingResidueIdsRef.current.size === 0) return;
    const grid = resultsRef.current;
    if (!grid) return;
    pendingResidueIdsRef.current.forEach(id => grid.markPending(id));
    pendingResidueIdsRef.current.clear();
  });

  /** Samples-tab primary CTA. Flushes pending edits, then requires every sample
   *  on the plot to have sample name, date and commodity filled. On success the
   *  drafts get promoted (isDraft=false). On failure the SaveBar stays so the
   *  user can fix the missing fields. */
  const handleCreateSample = () => {
    const ok = samplesRef.current?.triggerValidation('full');
    if (!ok) return;
    const dirtyIds = new Set(samplesRef.current?.getDirtyIds() ?? []);
    samplesRef.current?.save();
    const fresh = getLabSamplesForPlot(plotId);
    fresh.filter(s => dirtyIds.has(s.id)).forEach(s => updateLabSample(s.id, { isDraft: false }));
    setDirtyAt(0, false);
    bumpKeyAt(0);
    toast.success('Changes saved');
  };

  /** Samples-tab secondary CTA. Flushes, then only requires sample name on
   *  every row. Incomplete rows stay flagged as drafts; complete rows lose the
   *  draft flag silently. */
  const handleSaveSampleDraft = () => {
    const ok = samplesRef.current?.triggerValidation('name-only');
    if (!ok) return;
    const dirtyIds = new Set(samplesRef.current?.getDirtyIds() ?? []);
    samplesRef.current?.save();
    const fresh = getLabSamplesForPlot(plotId);
    fresh.filter(s => dirtyIds.has(s.id)).forEach(s => {
      const complete = !!s.sampleName.trim() && !!s.dateOfSample && !!s.commodity;
      updateLabSample(s.id, { isDraft: !complete });
    });
    setDirtyAt(0, false);
    // Remount the grid so chips reflect the new draft state without per-row mutation.
    bumpKeyAt(0);
    toast.success('Saved as draft');
  };

  /** Lab-reports primary CTA — full validation; blocks until red cells are fixed. */
  const handleCreateLabReport = () => {
    const ok = reportsRef.current?.triggerValidation('full');
    if (!ok) return;
    const dirtyIds = new Set(reportsRef.current?.getDirtyIds() ?? []);
    reportsRef.current?.save();
    samples.flatMap(s => s.reports ?? []).filter(r => dirtyIds.has(r.id))
      .forEach(r => updateLabReport(r.id, { isDraft: false }));
    setDirtyAt(1, false);
    bumpKeyAt(1);
    toast.success('Changes saved');
  };

  /** Lab-reports secondary CTA — only the name field (labReportId) is required. */
  const handleSaveLabReportDraft = () => {
    const ok = reportsRef.current?.triggerValidation('name-only');
    if (!ok) return;
    const dirtyIds = new Set(reportsRef.current?.getDirtyIds() ?? []);
    reportsRef.current?.save();
    samples.forEach(s => {
      (s.reports ?? []).forEach(r => {
        if (!dirtyIds.has(r.id)) return;
        const complete = !!r.laboratory.trim() && !!r.labReportId.trim() && r.attachments.length > 0;
        updateLabReport(r.id, { isDraft: !complete });
      });
    });
    setDirtyAt(1, false);
    bumpKeyAt(1);
    toast.success('Saved as draft');
  };

  /** Results primary CTA — full validation. */
  const handleCreateResult = () => {
    const ok = resultsRef.current?.triggerValidation('full');
    if (!ok) return;
    const dirtyIds = new Set(resultsRef.current?.getDirtyIds() ?? []);
    resultsRef.current?.save();
    samples.forEach(s => {
      const next = s.residues.map(r =>
        (!r.fromTreatment && dirtyIds.has(r.id)) ? { ...r, isDraft: false } : r);
      if (next.some((r, i) => r !== s.residues[i])) updateLabSample(s.id, { residues: next });
    });
    setDirtyAt(2, false);
    bumpKeyAt(2);
    toast.success('Changes saved');
  };

  /** Results secondary CTA — only the name field (analyte) is required. */
  const handleSaveResultDraft = () => {
    const ok = resultsRef.current?.triggerValidation('name-only');
    if (!ok) return;
    const dirtyIds = new Set(resultsRef.current?.getDirtyIds() ?? []);
    resultsRef.current?.save();
    samples.forEach(s => {
      const next = s.residues.map(r => {
        if (r.fromTreatment || !dirtyIds.has(r.id)) return r;
        const complete = !!r.analyte.trim() && !!r.residueLevel && !!r.methodLoq.trim() &&
          (r.residueLevel !== 'Residue' || !!r.residueValue.trim());
        return { ...r, isDraft: !complete };
      });
      if (next.some((r, i) => r !== s.residues[i])) updateLabSample(s.id, { residues: next });
    });
    setDirtyAt(2, false);
    bumpKeyAt(2);
    toast.success('Saved as draft');
  };

  const handleCancel = () => {
    // Clear inline validation on whatever grid is active before remounting.
    samplesRef.current?.clearValidation();
    reportsRef.current?.clearValidation();
    resultsRef.current?.clearValidation();
    bumpKeyAt(subTab);
    setDirtyAt(subTab, false);
    toast.info('Changes discarded');
  };

  const switchTab = (v: number) => {
    setSubTab(v);
    setSearch('');
    setSelected([]);
    samplesRef.current?.setFilter('');
    reportsRef.current?.setFilter('');
    resultsRef.current?.setFilter('');
  };

  const setSearchAndFilter = (v: string) => {
    setSearch(v);
    if (subTab === 0) samplesRef.current?.setFilter(v);
    else if (subTab === 1) reportsRef.current?.setFilter(v);
    else resultsRef.current?.setFilter(v);
  };

  const handleAdd = () => {
    if (subTab === 0) samplesRef.current?.addRow(plotId);
    else if (subTab === 1) reportsRef.current?.addRow();
    else resultsRef.current?.addRow();
  };

  const handleBulkDelete = () => {
    if (selected.length === 0) return;
    if (subTab === 0) samplesRef.current?.deleteRows(selected);
    else if (subTab === 1) reportsRef.current?.deleteRows(selected);
    else resultsRef.current?.deleteRows(selected);
    toast.success(`${selected.length} ${itemLabel(subTab, selected.length !== 1)} deleted`);
    setSelected([]);
    setAnchorEl(null);
  };

  const menuActions: ActionItem[] = useMemo(() => ([
    {
      label: `Delete ${itemLabel(subTab, selected.length !== 1)}`,
      icon: <DeleteOutline fontSize="small" />, key: 'delete',
      onClick: handleBulkDelete,
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [subTab, selected]);

  const counts = [
    `${samples.length} total sample${samples.length !== 1 ? 's' : ''}`,
    `${reportRows.length} lab report${reportRows.length !== 1 ? 's' : ''}`,
    `${residueRows.length} report result${residueRows.length !== 1 ? 's' : ''}`,
  ];
  const placeholders = ['Search samples…', 'Search lab reports…', 'Search report results…'];
  const addLabels = ['Add sample', 'Add lab report', 'Add report result'];

  // Empty-state CTAs route the user to the right starting point.
  const currentEmpty =
    subTab === 0 ? samples.length === 0 :
    subTab === 1 ? reportRows.length === 0 :
    residueRows.length === 0;
  const noSamples = samples.length === 0;

  // ── Progressive disclosure of tabs ───────────────────────────────────────
  //  • 0 samples              → no tabs at all, single full-bleed empty state
  //  • 1+ samples, 0 reports  → Samples + Lab reports tabs
  //  • 1+ reports             → all three tabs (Report results body still
  //                             gates its grid on a complete report)
  const showLabReportsTab = samples.length > 0;
  const showReportResultsTab = reportRows.length > 0;

  // Force-redirect away from a tab the user is no longer allowed to be on
  // (e.g. last report deleted → on tab 2 → bounce back to 1; last sample
  // deleted → on any tab → bounce back to 0).
  useEffect(() => {
    if (subTab === 2 && !showReportResultsTab) setSubTab(1);
    if (subTab >= 1 && !showLabReportsTab) setSubTab(0);
  }, [subTab, showLabReportsTab, showReportResultsTab]);

  // ── Top-level empty state (no tabs, no toolbar) ──────────────────────────
  //  Shown whenever the plot has zero samples. The CTA queues the new id
  //  through markPending so the SamplesGrid opens in dirty mode (AC-2.8).
  if (noSamples) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <EmptyState
          illustration={noLabResultsImg}
          title="Manage samples and lab reports"
          body="Start by creating a sample record. ResiYou helps you prepare the laboratory sheet, add the report later, and keep the results organized."
          ctaLabel="Create sample"
          ctaVariant="contained"
          onCta={() => {
            const s = createLabSample(plotId);
            pendingSampleIdsRef.current.add(s.id);
            setDirtyAt(0, true);
          }}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Sub-tab strip + toolbar (Treatments-style 2-row tabs) */}
      <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <SecondaryTabs value={subTab} onChange={(_, v) => switchTab(v)}>
            <Tab label="Samples" />
            {showLabReportsTab && <Tab label="Lab reports" />}
            {showReportResultsTab && <Tab label="Report results" />}
          </SecondaryTabs>

          {!currentEmpty && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Button
                variant="soft" color="primary" startIcon={<Add />}
                onClick={handleAdd}
                sx={{ px: 2, height: 36, fontWeight: 600, borderRadius: '8px', textTransform: 'none' }}
              >{addLabels[subTab]}</Button>
              <TextField
                size="small" placeholder={placeholders[subTab]} value={search}
                onChange={(e) => setSearchAndFilter(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Search sx={{ color: 'text.disabled', fontSize: 20 }} /></InputAdornment>,
                  sx: { borderRadius: '8px' },
                }}
                sx={{ width: 240, '& .MuiOutlinedInput-root': { height: 36, bgcolor: 'white' } }}
              />
              <OptionsTrigger
                onClick={(e) => setAnchorEl(e.currentTarget)}
                disabled={selected.length === 0}
                hasSelection={selected.length > 0}
              />
              <ActionMenu
                anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}
                actions={menuActions}
              />
            </Box>
          )}
        </Stack>
      </Box>

      {/* SaveBar replaces the count bar while the active sub-tab has unsaved edits.
          Same three-tier hierarchy on every tab (Cancel · Save as draft · Create X). */}
      {!currentEmpty && (dirty[subTab] ? (
        subTab === 0 ? (
          <SaveBar
            onSave={handleCreateSample}
            onCancel={handleCancel}
            onSaveDraft={handleSaveSampleDraft}
          />
        ) : subTab === 1 ? (
          <SaveBar
            onSave={handleCreateLabReport}
            onCancel={handleCancel}
            onSaveDraft={handleSaveLabReportDraft}
          />
        ) : (
          <SaveBar
            onSave={handleCreateResult}
            onCancel={handleCancel}
            onSaveDraft={handleSaveResultDraft}
          />
        )
      ) : (
        <Box sx={{ px: 2, py: 1, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>
            {counts[subTab]}
          </Typography>
        </Box>
      ))}

      {/* Grids — only the active one is mounted; EditableDataGrid captures
          initialData once. Bumping gridKeys[i] remounts the active grid to
          discard buffered edits (Cancel). Keying on row count refreshes the
          view when add/delete changes the source list. */}
      <Box sx={{
        flexGrow: 1, overflow: 'hidden', position: 'relative',
      }}>
        {subTab === 0 && (
          samples.length === 0 ? (
            <EmptyState
              illustration={noLabResultsImg}
              title="Start with a sample"
              body="Register your sample first. ResiYou turns the details into a lab ready sample sheet and helps you keep the report connected to the right sample."
              ctaLabel="Add sample"
              ctaVariant="contained"
              // Grid is unmounted in the empty state — the ref is null, so call
              // the data-layer helper directly. The new sample causes a re-render
              // that mounts SamplesGrid in the next pass.
              // AC-2.8: queue the new id so the post-mount effect calls
              // markPending(id) — that's what makes the row Modified (dirty)
              // rather than a phantom unmarked row that Save would treat as
              // already-saved.
              onCta={() => {
                const s = createLabSample(plotId);
                pendingSampleIdsRef.current.add(s.id);
                setDirtyAt(0, true);
              }}
              secondaryLabel="Already have a lab report? Add it directly"
              onSecondary={() => {
                // Silently provision a sample to host the lab report, then jump
                // into the Lab reports flow (the report will appear as draft).
                // AC-2.8: queue the report id so the ReportsGrid marks it dirty
                // on mount — the SaveBar shows with the user's new work.
                const s = createLabSample(plotId);
                const reportId = newReportId();
                addLabReport(s.id, {
                  id: reportId, laboratory: '', labReportId: '', attachments: [],
                });
                pendingReportIdsRef.current.add(reportId);
                setDirtyAt(1, true);
                switchTab(1);
              }}
            />
          ) : (
            <SamplesGrid
              key={`samples-${samples.length}-${gridKeys[0]}`}
              ref={samplesRef}
              samples={samples}
              onSelectionChange={setSelected}
              onDirtyStateChange={(d) => setDirtyAt(0, d)}
              onAddReport={(sample) => {
                // AC-2.8: the user is on the Samples tab — the ReportsGrid is
                // unmounted. Persist the new draft report through the data
                // layer, queue its id for markPending on the next ReportsGrid
                // mount, force dirty[1]=true so the SaveBar shows immediately
                // on tab 1.
                const reportId = newReportId();
                addLabReport(sample.id, {
                  id: reportId, laboratory: '', labReportId: '', attachments: [],
                });
                pendingReportIdsRef.current.add(reportId);
                setDirtyAt(1, true);
                switchTab(1);
              }}
            />
          )
        )}

        {subTab === 1 && (
          reportRows.length === 0 ? (
            <EmptyState
              illustration={noLabResultsImg}
              title="Have a lab report already?"
              body="Enhance your residue forecast with real lab reports."
              ctaLabel="Add lab report"
              ctaVariant="contained"
              onCta={() => {
                // Grid is unmounted — bypass the ref and persist directly. If
                // no samples exist, silently provision one to host the report.
                // AC-2.8: queue the new report id so ReportsGrid marks it dirty
                // on mount; the SaveBar then appears with the user's work.
                const sampleId = samples.length > 0 ? samples[0].id : createLabSample(plotId).id;
                const reportId = newReportId();
                addLabReport(sampleId, {
                  id: reportId, laboratory: '', labReportId: '', attachments: [],
                });
                pendingReportIdsRef.current.add(reportId);
                setDirtyAt(1, true);
              }}
              secondaryLabel="Working ahead? Add a sample"
              onSecondary={() => switchTab(0)}
            />
          ) : (
            <ReportsGrid
              key={`reports-${reportRows.length}-${gridKeys[1]}`}
              ref={reportsRef}
              rows={reportRows}
              samples={samples}
              laboratoryOptions={laboratoryOptions}
              onSelectionChange={setSelected}
              onDirtyStateChange={(d) => setDirtyAt(1, d)}
            />
          )
        )}

        {subTab === 2 && hasCompleteReport && (
          residueRows.length === 0 ? (
            <EmptyState
              illustration={noLabResultsImg}
              title="No report results yet"
              body="Capture the residue results from your lab report. Each result links to an analyte."
              ctaLabel="Add report result"
              ctaVariant="contained"
              // Grid is unmounted — persist directly to the first complete
              // report's sample. Re-render mounts ResultsGrid next pass.
              // AC-2.8: queue the new residue id so ResultsGrid marks it dirty
              // on mount; the SaveBar then appears with the user's work.
              onCta={() => {
                const target = completeReports[0];
                if (!target) return;
                const residueId = newResidueId();
                const newResidue: LabResidue = {
                  id: residueId,
                  analyte: '', residueLevel: null, residueValue: '',
                  methodLoq: '', methodLod: '',
                  fromTreatment: false, labReportId: target.report.id,
                };
                updateLabSample(target.sample.id, {
                  residues: [...target.sample.residues, newResidue],
                });
                pendingResidueIdsRef.current.add(residueId);
                setDirtyAt(2, true);
              }}
              secondaryLabel="Need another lab report? Add one"
              onSecondary={() => switchTab(1)}
            />
          ) : (
            <ResultsGrid
              key={`results-${residueRows.length}-${gridKeys[2]}`}
              ref={resultsRef}
              rows={residueRows}
              samples={samples}
              completeReports={completeReports}
              onSelectionChange={setSelected}
              onDirtyStateChange={(d) => setDirtyAt(2, d)}
            />
          )
        )}
      </Box>
    </Box>
  );
}

function itemLabel(tab: number, plural: boolean): string {
  if (tab === 0) return plural ? 'samples' : 'sample';
  if (tab === 1) return plural ? 'lab reports' : 'lab report';
  return plural ? 'report results' : 'report result';
}
