import { ComponentType } from 'react';

// Baseline component imports
import { PlotsPage as BaselinePlotsPage } from '../main/PlotsPage';
import { PlotDetailPage as BaselinePlotDetailPage } from '../main/PlotDetailPage';
import { LabSamplePage as BaselineLabSamplePage } from '../main/LabSamplePage';
import { AddPlotPage as BaselineAddPlotPage } from '../main/AddPlotPage';
import { LabReportPlaceholder } from '../main/LabReportPlaceholder';
import { SampleReportPage as BaselineSampleReportPage } from '../main/SampleReportPage';

// Lab management variants V1–V12
import { LabSamplePage as V1LabSamplePage } from './v1-reports-table/LabSamplePage';
import { PlotDetailPage as V1PlotDetailPage } from './v1-reports-table/PlotDetailPage';
import { LabSamplePage as V2LabSamplePage } from './v2-stacked-reports/LabSamplePage';
import { PlotDetailPage as V3PlotDetailPage } from './v3-laboratory-management/PlotDetailPage';
import { LabSamplePage as V3LabSamplePage } from './v3-laboratory-management/LabSamplePage';
import { PlotDetailPage as V4PlotDetailPage } from './v4-lab-management/PlotDetailPage';
import { LabReportPage as V4LabReportPage } from './v4-lab-management/LabReportPage';
import { PlotDetailPage as V5PlotDetailPage } from './v5-lab-management/PlotDetailPage';
import { LabReportPage as V5LabReportPage } from './v5-lab-management/LabReportPage';
import { PlotDetailPage as V6PlotDetailPage } from './v6-lab-master-detail/PlotDetailPage';
import { PlotDetailPage as V7PlotDetailPage } from './v7-reports-table/PlotDetailPage';
import { PlotDetailPage as V8PlotDetailPage } from './v8-progressive-tabs/PlotDetailPage';
import { PlotDetailPage as V9PlotDetailPage } from './v9-sample-form/PlotDetailPage';
import { PlotDetailPage as V10PlotDetailPage } from './v10-sample-report-page/PlotDetailPage';
import { SampleReportPage as V10SampleReportPage } from './v10-sample-report-page/SampleReportPage';
import { PlotDetailPage as V11PlotDetailPage } from './v11-sample-report-page/PlotDetailPage';
import { SampleReportPage as V11SampleReportPage } from './v11-sample-report-page/SampleReportPage';
import { PlotDetailPage as V12PlotDetailPage } from './v12-report-rows/PlotDetailPage';
import { SampleReportPage as V12SampleReportPage } from './v12-report-rows/SampleReportPage';
import { PlotDetailPage as V13PlotDetailPage } from './v13-report-rows/PlotDetailPage';
import { SampleReportPage as V13SampleReportPage } from './v13-report-rows/SampleReportPage';
import { PlotDetailPage as V14PlotDetailPage } from './v14-sample-summary-header/PlotDetailPage';
import { SampleReportPage as V14SampleReportPage } from './v14-sample-summary-header/SampleReportPage';
import { PlotDetailPage as V15PlotDetailPage } from './v15-production-replica/PlotDetailPage';
import { LabSamplePage as V15LabSamplePage } from './v15-production-replica/LabSamplePage';
import { PlotDetailPage as V16PlotDetailPage } from './v16-multi-report/PlotDetailPage';
import { LabSamplePage as V16LabSamplePage } from './v16-multi-report/LabSamplePage';
import { PlotDetailPage as ImprovedEditableTableV1PlotDetailPage } from './improved-editable-table-v1/PlotDetailPage';
import { SampleReportPage as ImprovedEditableTableV1SampleReportPage } from './improved-editable-table-v1/SampleReportPage';

// Spray plans project
import { PlotDetailPage as SprayPlansV1PlotDetailPage } from './spray-plans-v1/PlotDetailPage';
import { PlotDetailPage as SprayPlansV2PlotDetailPage } from './spray-plans-v2/PlotDetailPage';
import { PlotDetailPage as SprayPlansV3PlotDetailPage } from './spray-plans-v3/PlotDetailPage';
import { PlotDetailPage as SprayPlansV4PlotDetailPage } from './spray-plans-v4/PlotDetailPage';
import { PlotDetailPage as SprayPlansV5PlotDetailPage } from './spray-plans-v5/PlotDetailPage';

// Draft state project
import { PlotsPage as DraftStateV1PlotsPage } from './draft-state-v1/PlotsPage';
import { PlotsPage as DraftStateV2PlotsPage } from './draft-state-v2/PlotsPage';
import { PlotsPage as DraftStateV3PlotsPage } from './draft-state-v3/PlotsPage';
import { PlotsPage as DraftStateV4PlotsPage } from './draft-state-v4/PlotsPage';
import { PlotsPage as DraftStateV5PlotsPage } from './draft-state-v5/PlotsPage';
import { AddPlotPage as DraftStateV5AddPlotPage } from './draft-state-v5/AddPlotPage';
import { PlotDetailPage as DraftStateV5PlotDetailPage } from './draft-state-v5/PlotDetailPage';
import { PlotsPage as DraftStateV6PlotsPage } from './draft-state-v6/PlotsPage';
import { AddPlotPage as DraftStateV6AddPlotPage } from './draft-state-v6/AddPlotPage';
import { PlotDetailPage as DraftStateV6PlotDetailPage } from './draft-state-v6/PlotDetailPage';

// Multiple treatments → plots project
import { PlotsPage as MultipleTreatmentsV1PlotsPage } from './multiple-treatments-v1/PlotsPage';
import { PlotDetailPage as MultipleTreatmentsV1PlotDetailPage } from './multiple-treatments-v1/PlotDetailPage';

/** Components that can be overridden by a variant. */
export type OverridableKey =
  | 'PlotsPage'
  | 'PlotDetailPage'
  | 'LabSamplePage'
  | 'AddPlotPage'
  | 'LabReportPage'
  | 'SampleReportPage';

export interface VariantConfig {
  id: string;
  name: string;
  description: string;
  /** Only the components a variant overrides — the rest fall back to baseline. */
  components: Partial<Record<OverridableKey, ComponentType<any>>>;
}

export const BASELINE: Record<OverridableKey, ComponentType<any>> = {
  PlotsPage: BaselinePlotsPage,
  PlotDetailPage: BaselinePlotDetailPage,
  LabSamplePage: BaselineLabSamplePage,
  AddPlotPage: BaselineAddPlotPage,
  LabReportPage: LabReportPlaceholder,
  SampleReportPage: BaselineSampleReportPage,
};

export const VARIANTS: VariantConfig[] = [
  // ── Lab management V1–V12 ────────────────────────────────────────────────────
  {
    id: 'v1-reports-table',
    name: 'V1 — Reports table',
    description: 'Lab Report tab becomes a table of N reports (plots-style pattern).',
    components: { PlotDetailPage: V1PlotDetailPage, LabSamplePage: V1LabSamplePage },
  },
  {
    id: 'v2-stacked-reports',
    name: 'V2 — Stacked reports',
    description: 'Multiple reports as stacked inline cards with one Save All.',
    components: { LabSamplePage: V2LabSamplePage },
  },
  {
    id: 'v3-laboratory-management',
    name: 'V3 — Laboratory Management',
    description: 'Renamed tab, AddPlot-style layout, editable tables, working DatePicker, progressive flow Sample → Reports → Results.',
    components: { PlotDetailPage: V3PlotDetailPage, LabSamplePage: V3LabSamplePage },
  },
  {
    id: 'v4-lab-management',
    name: 'V4 — Treatments-style grid',
    description: 'Treatments-style: sub-tabs (Sample reports | Lab reports) with a directly-editable grid; lab reports created per sample on a full creation page.',
    components: { PlotDetailPage: V4PlotDetailPage, LabReportPage: V4LabReportPage },
  },
  {
    id: 'v5-lab-management',
    name: 'V5 — Sample-first',
    description: 'Like V4, but steers toward sample-first: empty state pushes "Add sample report and send to lab" (print sheet + code), with a report-first path (Add lab report → choose/create sample inline).',
    components: { PlotDetailPage: V5PlotDetailPage, LabReportPage: V5LabReportPage },
  },
  {
    id: 'v6-lab-master-detail',
    name: 'V6 — Master–detail',
    description: 'Two-pane: sample list left, its lab reports + results right; add a report inline — the full 1→N chain without page-swaps.',
    components: { PlotDetailPage: V6PlotDetailPage, LabReportPage: V5LabReportPage },
  },
  {
    id: 'v7-reports-table',
    name: 'V7 — Inline Samples/Reports/Results',
    description: 'Samples · Reports · Results as a Treatments-style sub-tab strip under Lab management — no per-sample new page.',
    components: { PlotDetailPage: V7PlotDetailPage },
  },
  {
    id: 'v8-progressive-tabs',
    name: 'V8 — Progressive tabs',
    description: 'Same inline sub-tab strip as V7, but tabs appear progressively — only the empty state shows until the first sample is created; Lab reports appears with the first sample; Report results appears with the first lab report.',
    components: { PlotDetailPage: V8PlotDetailPage },
  },
  {
    id: 'v9-sample-form',
    name: 'V9 — Sample form popup',
    description: 'Samples become a read-only Plots-style table; creating/editing a sample uses a centered form popup; on create, a confirmation popup nudges the user to download the sheet or add the lab report. Lab reports + Results reuse V7 editable grids.',
    components: { PlotDetailPage: V9PlotDetailPage },
  },
  {
    id: 'v10-sample-report-page',
    name: 'V10 — Samples & Reports page',
    description: 'Popup creation with lab selection (API-connected labs tagged). Samples & Reports tab shows a table with an "Add report & results" row action. Clicking it opens a dedicated per-sample page with 3 stacked sections: Sample info, Report upload, and an editable Results grid — everything in one place.',
    components: { PlotDetailPage: V10PlotDetailPage, SampleReportPage: V10SampleReportPage },
  },
  {
    id: 'v11-sample-report-page',
    name: 'V11 — Samples & Reports page (copy)',
    description: 'Copy of V10 — starting point for further iteration.',
    components: { PlotDetailPage: V11PlotDetailPage, SampleReportPage: V11SampleReportPage },
  },
  {
    id: 'v12-report-rows',
    name: 'V12 — Report rows + unified results',
    description: 'Reports become a single auto-growing list of ID + PDF rows (one container, no per-report cards). Results become one shared grid for the whole sample with a "Lab report" column to say which report each analyte came from — a real cross-report summary. Recommended analyte chips stay clickable after use (duplicates allowed). The table\'s "Add report & results" quick action now opens a 3-step popup (report → results → success) instead of navigating away.',
    components: { PlotDetailPage: V12PlotDetailPage, SampleReportPage: V12SampleReportPage },
  },
  {
    id: 'v13-report-rows',
    name: 'V13 — Two-step sample creation',
    description: '"Create sample" popup becomes a 2-step stepper: Sample details, then Laboratory ("where do you plan to send this sample?"). Reuses V12\'s existing success-screen branching (API-connected lab → automatic import + email notice; non-API lab → send sheet, add results once back).',
    components: { PlotDetailPage: V13PlotDetailPage, SampleReportPage: V13SampleReportPage },
  },
  {
    id: 'v14-sample-summary-header',
    name: 'V14 — Sample summary header',
    description: 'The per-sample page drops its inline Sample card entirely — the title becomes "Sample name · Sample date · Commodity" with a "View or edit" link that opens the same Create/Edit sample popup used everywhere else. Reports also stop being inline-editable rows: each is a static Laboratory · ID · PDF summary line with Edit/Delete, both reusing the same report popup (Edit pre-fills it). Reports now come before Results. Results card has an "All / Detected only" segmented filter toggle.',
    components: { PlotDetailPage: V14PlotDetailPage, SampleReportPage: V14SampleReportPage },
  },
  {
    id: 'v15-production-replica',
    name: 'V15 — Production replica',
    description: 'Not a design proposal — a faithful rebuild of the live production app\'s Lab results tab and New/Edit Sample wizard (Sample Code panel + analytical-method reference table, and the required "Analytes as a result of the treatments reported" completion modal + below-LOQ confirm warning before Report results), built from screenshots of resiyou.com. Ground truth for comparing the other variants against.',
    components: { PlotDetailPage: V15PlotDetailPage, LabSamplePage: V15LabSamplePage },
  },
  {
    id: 'v16-multi-report',
    name: 'V16 — Multi-report',
    description: 'Built on V15, not from scratch: grafts three v14 features onto the production-faithful flow — multiple lab reports per sample, an "Add report" popup to create more, and the API/non-API (locked, auto-imported) distinction — by importing v14\'s ReportsCard and AddReportDialog directly instead of rebuilding them. Sample tab and Report results tab are reused byte-for-byte from V15.',
    components: { PlotDetailPage: V16PlotDetailPage, LabSamplePage: V16LabSamplePage },
  },

  // ── Improved editable table V1 ───────────────────────────────────────────────
  {
    id: 'improved-editable-table-v1',
    name: 'Improved editable table V1',
    description: 'Forked from V17 (since promoted to baseline). Results grid brought to interaction-design parity with Treatments (validation, search, count bar); Treatments gets Product/Application-date cross-validation (filtered dropdown, disabled dates, paste-fallback toast).',
    components: { PlotDetailPage: ImprovedEditableTableV1PlotDetailPage, SampleReportPage: ImprovedEditableTableV1SampleReportPage },
  },

  // ── Spray plans V1–V5 ────────────────────────────────────────────────────────
  { id: 'spray-plans-v1', name: 'Spray plans V1 — Plan list', description: 'Treatments tab becomes a list of spray plans with Pending/Completed status; per-plan editable spray grid.', components: { PlotDetailPage: SprayPlansV1PlotDetailPage } },
  { id: 'spray-plans-v2', name: 'Spray plans V2 — Planning board', description: 'Treatments tab becomes a kanban (Simulations / Pending / Completed); move a card to set status in one action.', components: { PlotDetailPage: SprayPlansV2PlotDetailPage } },
  { id: 'spray-plans-v3', name: 'Spray plans V3 — Lifecycle stepper', description: 'Treatments tab becomes a stepper Simulated → Planned → In progress → Completed with per-spray execution.', components: { PlotDetailPage: SprayPlansV3PlotDetailPage } },
  { id: 'spray-plans-v4', name: 'Spray plans V4 — Calendar planner', description: 'Treatments tab becomes a month calendar; overdue sprays flagged; mark executed; plan auto-completes.', components: { PlotDetailPage: SprayPlansV4PlotDetailPage } },
  { id: 'spray-plans-v5', name: 'Spray plans V5 — Notion-style table', description: 'Treatments tab gets a Status column (Draft/Planned/Executed/Removed). Soft Notion-flavored chips, inline status edit via popover, checkbox filter.', components: { PlotDetailPage: SprayPlansV5PlotDetailPage } },

  // ── Draft state V1–V6 ────────────────────────────────────────────────────────
  { id: 'draft-state-v1', name: 'Draft state V1 — Badge + filter', description: 'Draft chip + completeness score + All/Drafts/Complete filter + a missing-fields dialog.', components: { PlotsPage: DraftStateV1PlotsPage } },
  { id: 'draft-state-v2', name: 'Draft state V2 — Inline completion', description: 'Expand a draft row to fill only the missing fields with autosave — never leave the list.', components: { PlotsPage: DraftStateV2PlotsPage } },
  { id: 'draft-state-v3', name: 'Draft state V3 — Drafts tray', description: 'A pinned Drafts tray with guided completion; the main list shows only ready records.', components: { PlotsPage: DraftStateV3PlotsPage } },
  { id: 'draft-state-v4', name: 'Draft state V4 — Status + side-panel', description: 'Status pills (Draft/Complete) + a right side-panel checklist; extends the Draft signal to treatments.', components: { PlotsPage: DraftStateV4PlotsPage } },
  { id: 'draft-state-v5', name: 'Draft state V5 — Save anytime', description: 'Only Plot name is required to save; everything else is optional.', components: { PlotsPage: DraftStateV5PlotsPage, AddPlotPage: DraftStateV5AddPlotPage, PlotDetailPage: DraftStateV5PlotDetailPage } },
  { id: 'draft-state-v6', name: 'Draft state V6 — Dates-only optional', description: 'Only planting date and flowering date are optional at save time; every other field stays required.', components: { PlotsPage: DraftStateV6PlotsPage, AddPlotPage: DraftStateV6AddPlotPage, PlotDetailPage: DraftStateV6PlotDetailPage } },

  // ── Multiple treatments → plots V1 ───────────────────────────────────────────
  { id: 'multiple-treatments-v1', name: 'Multiple treatments → plots V1 — Inline plot validation', description: 'Plot list adds a Planting-date column and required season filter. Bulk-treatments modal with per-plot validation chip.', components: { PlotsPage: MultipleTreatmentsV1PlotsPage, PlotDetailPage: MultipleTreatmentsV1PlotDetailPage } },
];

export function getVariant(id: string): VariantConfig | undefined {
  return VARIANTS.find(v => v.id === id);
}

export function resolveComponent(
  variantId: string | undefined,
  key: OverridableKey
): ComponentType<any> {
  if (!variantId) return BASELINE[key];
  const variant = getVariant(variantId);
  return variant?.components[key] ?? BASELINE[key];
}
