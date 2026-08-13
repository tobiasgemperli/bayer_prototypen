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
import { ReminderBar } from '../../design-system/ReminderBar';
import { SecondaryTabs } from '../../design-system/PlotTabs';
import {
  useLabSamples, LABORATORY_OPTIONS, LabSampleData, LabReport, LabResidue,
  addLabReport, createLabSample, deleteLabSample, getAnalytesForPlot,
  newReportId, newResidueId, updateLabReport, updateLabSample,
} from '../../data/lab-results-data';
import noLabResultsImg from '../../assets/empty-states/no-lab-results-v01.jpg';
import {
  ReportsGrid, ReportsGridHandle, ReportRow,
} from '../v7-reports-table/ReportsGrid';
import {
  ResultsGrid, ResultsGridHandle, ResidueRow, reportLabel,
} from '../v7-reports-table/ResultsGrid';
import { isReportDraft } from '../v7-reports-table/draft-state';
import { SamplesTable } from './SamplesTable';
import { SampleFormDialog, SampleFormValues, toFormValues } from './SampleFormDialog';
import { SampleCreatedDialog } from './SampleCreatedDialog';

/**
 * V9 — Samples leave the editable-grid model
 * and live in a read-only Plots-style table. Creating / editing a sample
 * opens a centered form popup; creation triggers a confirmation popup with
 * the natural next steps. Lab reports + Results stay as the V7 editable
 * grids (unchanged).
 */
export function LabManagementContent({ plotId }: { plotId: string }) {
  const allSamples = useLabSamples();
  // v10 has no draft state for samples — filter them out so seed draft companions are invisible.
  const samples = useMemo(() => allSamples.filter((s) => s.plotId === plotId && !s.isDraft), [allSamples, plotId]);

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

  const completeReports = useMemo<{ sample: LabSampleData; report: LabReport }[]>(() => {
    const out: { sample: LabSampleData; report: LabReport }[] = [];
    for (const s of samples) {
      for (const r of s.reports ?? []) if (!isReportDraft(r)) out.push({ sample: s, report: r });
    }
    return out;
  }, [samples]);
  const completeReportIndex = useMemo(() => {
    const m = new Map<string, { sample: LabSampleData; report: LabReport }>();
    completeReports.forEach((p) => m.set(p.report.id, p));
    return m;
  }, [completeReports]);
  const hasCompleteReport = completeReports.length > 0;

  // Auto-seed fromTreatment residues on every complete report (same as V7).
  const plotAnalytes = useMemo(() => getAnalytesForPlot(plotId), [plotId]);
  const completeReportKey = useMemo(
    () => completeReports.map((p) => p.report.id).sort().join('|'),
    [completeReports]
  );
  useEffect(() => {
    for (const { sample, report } of completeReports) {
      const present = new Set(
        sample.residues.filter((r) => r.labReportId === report.id && r.fromTreatment).map((r) => r.analyte)
      );
      const missing = plotAnalytes.filter((a) => !present.has(a));
      if (missing.length === 0) continue;
      const seeded: LabResidue[] = missing.map((a) => ({
        id: newResidueId(),
        analyte: a, residueLevel: null, residueValue: '',
        methodLoq: '0.01', methodLod: '',
        fromTreatment: true, labReportId: report.id,
        // Auto-seeded rows wait for the user to enter residue level + value.
        // Until that happens they're SAVED-AS-DRAFT — Draft chip on the
        // analyte cell, but no pending/dirty SaveBar treatment (the system
        // wrote them, not the user). The chip flips off in
        // handleSaveResultDraft / handleCreateResult once the user fills the
        // row in and saves.
        isDraft: true,
      }));
      updateLabSample(sample.id, { residues: [...sample.residues, ...seeded] });
    }
  }, [completeReportKey, plotAnalytes.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const residueRows = useMemo<ResidueRow[]>(() => {
    const out: ResidueRow[] = [];
    for (const s of samples) {
      for (const r of s.residues) {
        if (!r.labReportId) continue;
        const entry = completeReportIndex.get(r.labReportId);
        if (!entry) continue;
        out.push({ ...r, _sampleId: s.id, reportLabel: reportLabel(entry.sample, entry.report) });
      }
    }
    return out;
  }, [samples, completeReportIndex]);

  // ── Reminder bar — "Lab report completed, results still draft" ───────────
  // Completed reports whose residues are all draft / missing get nudged. A
  // single dismissal hides every active reminder for the session (kept
  // in-memory so it returns on a fresh load).
  const [dismissedReminderIds, setDismissedReminderIds] = useState<Set<string>>(new Set());
  const reportsWithPendingResults = useMemo<string[]>(() => {
    const ids: string[] = [];
    for (const { sample, report } of completeReports) {
      const ownResidues = sample.residues.filter((r) => r.labReportId === report.id);
      const allDraft = ownResidues.length === 0 || ownResidues.every((r) => r.isDraft === true);
      if (allDraft) ids.push(report.id);
    }
    return ids;
  }, [completeReports]);
  const activeReminderReportId = useMemo(
    () => reportsWithPendingResults.find((id) => !dismissedReminderIds.has(id)) ?? null,
    [reportsWithPendingResults, dismissedReminderIds]
  );

  const laboratoryOptions = useMemo(() => {
    const labs = new Set<string>(LABORATORY_OPTIONS);
    samples.forEach((s) => {
      if (s.laboratory) labs.add(s.laboratory);
      (s.reports ?? []).forEach((r) => r.laboratory && labs.add(r.laboratory));
    });
    return Array.from(labs);
  }, [samples]);

  // ── Sub-tab state ────────────────────────────────────────────────────────
  const [subTab, setSubTab] = useState(0); // 0 Samples · 1 Reports · 2 Results
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Tab redirect — consolidated with the progressive-disclosure conditions
  // computed further down (defined inside the return because they depend on
  // `samples.length` and `reportRows.length`). See the effect below.

  // Per-tab dirty + gridKey for Reports / Results (Samples doesn't dirty-track
  // since its editing flow is the popup, not the table).
  const [dirty, setDirty] = useState<[boolean, boolean]>([false, false]);
  const [gridKeys, setGridKeys] = useState<[number, number]>([0, 0]);
  const setDirtyAt = (i: 0 | 1, v: boolean) =>
    setDirty((prev) => { const next = [...prev] as [boolean, boolean]; next[i] = v; return next; });
  const bumpKeyAt = (i: 0 | 1) =>
    setGridKeys((prev) => { const next = [...prev] as [number, number]; next[i] = next[i] + 1; return next; });

  const reportsRef = useRef<ReportsGridHandle>(null);
  const resultsRef = useRef<ResultsGridHandle>(null);

  // AC-2.8 — empty-state / row-CTA provisioned rows queue here and get
  // markPending-ed once the grid mounts on the next render.
  const pendingReportIdsRef = useRef<Set<string>>(new Set());
  const pendingResidueIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (pendingReportIdsRef.current.size === 0) return;
    const grid = reportsRef.current;
    if (!grid) return;
    pendingReportIdsRef.current.forEach((id) => grid.markPending(id));
    pendingReportIdsRef.current.clear();
  });
  useEffect(() => {
    if (pendingResidueIdsRef.current.size === 0) return;
    const grid = resultsRef.current;
    if (!grid) return;
    pendingResidueIdsRef.current.forEach((id) => grid.markPending(id));
    pendingResidueIdsRef.current.clear();
  });

  // ── Sample form dialog state ─────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingSample = editingId ? samples.find((s) => s.id === editingId) ?? null : null;
  const [createdOpen, setCreatedOpen] = useState(false);
  const [createdSampleId, setCreatedSampleId] = useState<string | null>(null);

  const openCreate = () => { setEditingId(null); setFormOpen(true); };
  const openEdit = (s: LabSampleData) => { setEditingId(s.id); setFormOpen(true); };
  const closeForm = () => setFormOpen(false);

  /** Persist a sample (new or existing) with the given values + isDraft. */
  const persistSample = (values: SampleFormValues, isDraft: boolean): LabSampleData => {
    if (editingId) {
      updateLabSample(editingId, { ...values, isDraft });
      // editingSample may be stale by this point — re-read after the mutation.
      return { ...(samples.find((s) => s.id === editingId) as LabSampleData), ...values, isDraft };
    }
    const fresh = createLabSample(plotId);
    updateLabSample(fresh.id, { ...values, isDraft });
    return { ...fresh, ...values, isDraft };
  };

  /** Provisions a draft lab-report row owned by the given sample so the Lab
   *  reports tab is never empty after a sample is created. The Sample column
   *  is "preselected" implicitly via report ownership (each report lives
   *  under one sample). Only invoked on NEW sample creation, never on edit. */
  const autoProvisionDraftReport = (sampleId: string) => {
    const reportId = newReportId();
    addLabReport(sampleId, {
      id: reportId,
      laboratory: '',
      labReportId: '',
      attachments: [],
      isDraft: true,
    });
    pendingReportIdsRef.current.add(reportId);
  };

  const handleCreate = (values: SampleFormValues) => {
    const wasEditing = !!editingId;
    const s = persistSample(values, false);
    setFormOpen(false);
    if (!wasEditing) {
      autoProvisionDraftReport(s.id);
      setCreatedSampleId(s.id);
      setCreatedOpen(true);
    } else {
      toast.success('Sample updated');
    }
  };

  const handleDuplicate = (s: LabSampleData) => {
    const fresh = createLabSample(plotId);
    updateLabSample(fresh.id, {
      sampleName: s.sampleName,
      dateOfSample: s.dateOfSample,
      commodity: s.commodity,
      comments: s.comments,
      isDraft: false,
    });
    autoProvisionDraftReport(fresh.id);
    toast.success('Sample duplicated');
  };

  const handleDelete = (s: LabSampleData) => {
    deleteLabSample(s.id);
    toast.success('Sample deleted');
  };

  /** Provision a draft report for a sample and route the user to the Lab
   *  reports tab; mirrors the V7 "+ Add lab report" row CTA semantics. */
  const handleAddLabReport = (s: LabSampleData) => {
    const reportId = newReportId();
    addLabReport(s.id, { id: reportId, laboratory: '', labReportId: '', attachments: [] });
    pendingReportIdsRef.current.add(reportId);
    setDirtyAt(1, true);
    setSubTab(1);
  };

  /** Success dialog: "Add lab report" CTA → close, route to Reports tab. */
  const handleSuccessAddReport = () => {
    setCreatedOpen(false);
    const sample = createdSampleId ? samples.find((s) => s.id === createdSampleId) : null;
    if (sample) handleAddLabReport(sample);
  };

  // ── Save handlers (Reports / Results) ────────────────────────────────────
  const handleCancel = () => {
    reportsRef.current?.clearValidation();
    resultsRef.current?.clearValidation();
    if (subTab === 1) { setDirtyAt(0, false); bumpKeyAt(0); }
    if (subTab === 2) { setDirtyAt(1, false); bumpKeyAt(1); }
    toast.info('Changes discarded');
  };
  const handleCreateLabReport = () => {
    const ok = reportsRef.current?.triggerValidation('full');
    if (!ok) return;
    const dirtyIds = new Set(reportsRef.current?.getDirtyIds() ?? []);
    reportsRef.current?.save();
    samples.flatMap((s) => s.reports ?? []).filter((r) => dirtyIds.has(r.id))
      .forEach((r) => updateLabReport(r.id, { isDraft: false }));
    setDirtyAt(0, false);
    bumpKeyAt(0);
    toast.success('Changes saved');
  };
  const handleSaveLabReportDraft = () => {
    const ok = reportsRef.current?.triggerValidation('name-only');
    if (!ok) return;
    const dirtyIds = new Set(reportsRef.current?.getDirtyIds() ?? []);
    reportsRef.current?.save();
    samples.forEach((s) => {
      (s.reports ?? []).forEach((r) => {
        if (!dirtyIds.has(r.id)) return;
        const complete = !!r.laboratory.trim() && !!r.labReportId.trim() && r.attachments.length > 0;
        updateLabReport(r.id, { isDraft: !complete });
      });
    });
    setDirtyAt(0, false);
    bumpKeyAt(0);
    toast.success('Saved as draft');
  };
  const handleCreateResult = () => {
    const ok = resultsRef.current?.triggerValidation('full');
    if (!ok) return;
    const dirtyIds = new Set(resultsRef.current?.getDirtyIds() ?? []);
    resultsRef.current?.save();
    samples.forEach((s) => {
      const next = s.residues.map((r) =>
        dirtyIds.has(r.id) ? { ...r, isDraft: false } : r);
      if (next.some((r, i) => r !== s.residues[i])) updateLabSample(s.id, { residues: next });
    });
    setDirtyAt(1, false);
    bumpKeyAt(1);
    toast.success('Changes saved');
  };
  const handleSaveResultDraft = () => {
    const ok = resultsRef.current?.triggerValidation('name-only');
    if (!ok) return;
    const dirtyIds = new Set(resultsRef.current?.getDirtyIds() ?? []);
    resultsRef.current?.save();
    samples.forEach((s) => {
      const next = s.residues.map((r) => {
        if (!dirtyIds.has(r.id)) return r;
        const complete = !!r.analyte.trim() && !!r.residueLevel && !!r.methodLoq.trim() &&
          (r.residueLevel !== 'Residue' || !!r.residueValue.trim());
        return { ...r, isDraft: !complete };
      });
      if (next.some((r, i) => r !== s.residues[i])) updateLabSample(s.id, { residues: next });
    });
    setDirtyAt(1, false);
    bumpKeyAt(1);
    toast.success('Saved as draft');
  };

  // Tab plumbing.
  const switchTab = (v: number) => {
    setSubTab(v);
    setSearch('');
    setSelected([]);
    reportsRef.current?.setFilter('');
    resultsRef.current?.setFilter('');
  };
  const setSearchAndFilter = (v: string) => {
    setSearch(v);
    if (subTab === 1) reportsRef.current?.setFilter(v);
    else if (subTab === 2) resultsRef.current?.setFilter(v);
  };

  const handleBulkDelete = () => {
    if (selected.length === 0) return;
    if (subTab === 0) {
      selected.forEach((id) => deleteLabSample(id));
      toast.success(`${selected.length} sample${selected.length !== 1 ? 's' : ''} deleted`);
    } else if (subTab === 1) {
      reportsRef.current?.deleteRows(selected);
      toast.success(`${selected.length} lab report${selected.length !== 1 ? 's' : ''} deleted`);
    } else {
      resultsRef.current?.deleteRows(selected);
      toast.success(`${selected.length} report result${selected.length !== 1 ? 's' : ''} deleted`);
    }
    setSelected([]);
    setAnchorEl(null);
  };

  const menuActions: ActionItem[] = useMemo(() => ([
    {
      label: `Delete ${subTab === 0 ? 'sample' : subTab === 1 ? 'lab report' : 'report result'}${selected.length !== 1 ? 's' : ''}`,
      icon: <DeleteOutline fontSize="small" />, key: 'delete',
      onClick: handleBulkDelete,
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [subTab, selected]);

  // Render-side derived state.
  const counts = [
    `${samples.length} total sample${samples.length !== 1 ? 's' : ''}`,
    `${reportRows.length} lab report${reportRows.length !== 1 ? 's' : ''}`,
    `${residueRows.length} report result${residueRows.length !== 1 ? 's' : ''}`,
  ];
  const placeholders = ['Search samples…', 'Search lab reports…', 'Search report results…'];
  // "Create sample" mirrors the empty-state CTA copy (which is the source of
  // truth for sample-creation language). Reports + Results keep "Add" since
  // their empty-state CTAs use that verb.
  const addLabels = ['Create sample', 'Add lab report', 'Add report result'];

  const currentEmpty =
    subTab === 0 ? samples.length === 0 :
      subTab === 1 ? reportRows.length === 0 :
        residueRows.length === 0;

  const showSaveBar = subTab !== 0 && dirty[(subTab === 1 ? 0 : 1)];

  // ── Progressive disclosure (mirrors V8) ──────────────────────────────────
  //   • 0 samples            → no tabs at all, full-bleed empty state.
  //   • 1+ samples, 0 reports → Samples + Lab reports tabs.
  //   • 1+ reports           → all three tabs (Report results body still
  //                            gates the grid on a complete report).
  const showLabReportsTab = samples.length > 0;
  // Report results tab only appears once at least one lab report has been
  // SAVED (non-draft). A draft-only state means there's nothing to produce
  // a result for yet — the tab would lead to an empty grid with no way to
  // add rows. Gate on hasCompleteReport, not reportRows.length.
  const showReportResultsTab = hasCompleteReport;

  // Bounce the active tab when its visibility is revoked (deleted last sample
  // / last report). Replaces the old hasCompleteReport-only effect.
  useEffect(() => {
    if (subTab === 2 && !showReportResultsTab) setSubTab(1);
    if (subTab >= 1 && !showLabReportsTab) setSubTab(0);
  }, [subTab, showLabReportsTab, showReportResultsTab]);

  // ── Top-level empty state (no tabs, no toolbar) ──────────────────────────
  // Shown whenever the plot has zero samples. Click → open the form popup.
  if (samples.length === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <EmptyState
          illustration={noLabResultsImg}
          title="Manage samples and lab reports"
          body="Start by creating a sample record. ResiYou helps you prepare the laboratory sheet, add the report later, and keep the results organized."
          ctaLabel="Create sample"
          ctaVariant="contained"
          onCta={openCreate}
        />

        {/* Form popup is mounted even at empty state so the CTA can open it. */}
        <SampleFormDialog
          open={formOpen}
          onClose={closeForm}
          onCreate={handleCreate}
        />
        <SampleCreatedDialog
          open={createdOpen}
          onClose={() => setCreatedOpen(false)}
          onOpenSheet={() => {
            if (createdSampleId) {
              window.open(`/sample-sheet/${createdSampleId}`, '_blank', 'noopener,noreferrer');
            }
            setCreatedOpen(false);
          }}
          onAddLabReport={handleSuccessAddReport}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Sub-tab strip + toolbar */}
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
                onClick={() => {
                  if (subTab === 0) openCreate();
                  else if (subTab === 1) {
                    // Provision an empty report on the first available sample so the
                    // ReportsGrid mounts the row already in dirty mode.
                    const sampleId = samples.length > 0 ? samples[0].id : createLabSample(plotId).id;
                    const reportId = newReportId();
                    addLabReport(sampleId, { id: reportId, laboratory: '', labReportId: '', attachments: [] });
                    pendingReportIdsRef.current.add(reportId);
                    setDirtyAt(0, true);
                  } else {
                    resultsRef.current?.addRow();
                  }
                }}
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

      {/* Reminder — "Lab report completed, results still draft". Sits in the
          same area + style family as SaveBar so the user reads it as part of
          the table chrome. Only shown on the Lab reports tab (where the user
          just finalised a report) and only when there's an active, non-
          dismissed reminder. */}
      {subTab === 1 && activeReminderReportId && !showSaveBar && (
        <ReminderBar
          message="Some lab reports don't have results documented yet."
          ctaLabel="Go to report results"
          onCta={() => {
            // Switch to Report results tab. Filtering to the just-completed
            // report's residues is a future refinement; for now the user
            // lands on the full results grid where those draft rows live.
            switchTab(2);
          }}
          onDismiss={() => {
            setDismissedReminderIds((prev) => new Set(prev).add(activeReminderReportId));
          }}
        />
      )}

      {/* SaveBar — only Reports / Results tabs have dirty state (Samples
          editing happens in the popup, committed atomically). */}
      {!currentEmpty && (
        showSaveBar ? (
          subTab === 1 ? (
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
        ) : null
        // "N TOTAL …" count bar removed — it's a plots-listing-style header
        // and reads as out of place above the editable-table style grids.
      )}

      {/* Body — Samples list (read-only) or Reports/Results editable grids. */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', position: 'relative' }}>
        {subTab === 0 && (
          /* `samples.length === 0` is handled by the top-level early return
             above (progressive disclosure). Here we always have rows. */
          <Box sx={{ p: 2 }}>
            <SamplesTable
              rows={samples}
              selected={selected}
              onSelectChange={setSelected}
              onRowClick={openEdit}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
              onAddLabReport={handleAddLabReport}
            />
          </Box>
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
                const sampleId = samples.length > 0 ? samples[0].id : createLabSample(plotId).id;
                const reportId = newReportId();
                addLabReport(sampleId, { id: reportId, laboratory: '', labReportId: '', attachments: [] });
                pendingReportIdsRef.current.add(reportId);
                setDirtyAt(0, true);
              }}
              secondaryLabel="Working ahead? Add a sample"
              onSecondary={() => switchTab(0)}
            />
          ) : (
            <ReportsGrid
              key={`reports-${reportRows.length}-${gridKeys[0]}`}
              ref={reportsRef}
              rows={reportRows}
              samples={samples}
              laboratoryOptions={laboratoryOptions}
              onSelectionChange={setSelected}
              onDirtyStateChange={(d) => setDirtyAt(0, d)}
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
              onCta={() => {
                const target = completeReports[0];
                if (!target) return;
                const residueId = newResidueId();
                const next: LabResidue = {
                  id: residueId,
                  analyte: '', residueLevel: null, residueValue: '',
                  methodLoq: '', methodLod: '',
                  fromTreatment: false, labReportId: target.report.id,
                };
                updateLabSample(target.sample.id, { residues: [...target.sample.residues, next] });
                pendingResidueIdsRef.current.add(residueId);
                setDirtyAt(1, true);
              }}
              secondaryLabel="Need another lab report? Add one"
              onSecondary={() => switchTab(1)}
            />
          ) : (
            <ResultsGrid
              key={`results-${residueRows.length}-${gridKeys[1]}`}
              ref={resultsRef}
              rows={residueRows}
              samples={samples}
              completeReports={completeReports}
              onSelectionChange={setSelected}
              onDirtyStateChange={(d) => setDirtyAt(1, d)}
            />
          )
        )}
      </Box>

      {/* Sample form popup (create + edit). */}
      <SampleFormDialog
        open={formOpen}
        title={editingId ? 'Edit sample' : 'Create sample'}
        initial={editingSample ? toFormValues(editingSample) : undefined}
        onClose={closeForm}
        onCreate={handleCreate}
      />

      {/* Post-creation confirmation popup with next-step CTAs. */}
      <SampleCreatedDialog
        open={createdOpen}
        onClose={() => setCreatedOpen(false)}
        onOpenSheet={() => {
          if (createdSampleId) {
            window.open(`/sample-sheet/${createdSampleId}`, '_blank', 'noopener,noreferrer');
          }
          setCreatedOpen(false);
        }}
        onAddLabReport={handleSuccessAddReport}
      />
    </Box>
  );
}
