/**
 * Prototype taxonomy for the navigator:
 *   Baseline (the main prototype) — standalone, not in a project.
 *   Projects — each is an accordion folder containing numbered versions (V1, V2, …)
 *   with a short description in brackets.
 *
 * A version either swaps a lab-management variant (`variantId`, resolved via the
 * registry) or jumps into an app flow (`flow`).
 */
export interface ProjectVersion {
  /** Sequential label within the project: "V1", "V2", … */
  label: string;
  /** Short description shown in brackets after the label. */
  description: string;
  /** Lab-management variant id (matches registry). */
  variantId?: string;
  /** App-flow version (auth/demo mode), no component override. */
  flow?: 'register' | 'onboarding';
  /** Standalone route — selecting this version simply navigates here. */
  route?: string;
}

export interface Project {
  name: string;
  versions: ProjectVersion[];
}

export const PROJECTS: Project[] = [
  {
    name: 'Lab management',
    versions: [
      { label: 'V1', description: 'Reports table', variantId: 'v1-reports-table' },
      { label: 'V2', description: 'Stacked reports', variantId: 'v2-stacked-reports' },
      { label: 'V3', description: 'Laboratory Management', variantId: 'v3-laboratory-management' },
      { label: 'V4', description: 'Treatments-style grid', variantId: 'v4-lab-management' },
      { label: 'V5', description: 'Sample-first', variantId: 'v5-lab-management' },
      { label: 'V6', description: 'Master–detail', variantId: 'v6-lab-master-detail' },
      { label: 'V7', description: 'Inline Samples/Reports/Results', variantId: 'v7-reports-table' },
      { label: 'V8', description: 'Progressive tabs', variantId: 'v8-progressive-tabs' },
      { label: 'V9', description: 'Sample form popup', variantId: 'v9-sample-form' },
      { label: 'V10', description: 'Samples & Reports page', variantId: 'v10-sample-report-page' },
      { label: 'V11', description: 'Samples & Reports page (copy)', variantId: 'v11-sample-report-page' },
      { label: 'V12', description: 'Report rows + unified results', variantId: 'v12-report-rows' },
      { label: 'V13', description: 'Two-step sample creation (lab as step 2)', variantId: 'v13-report-rows' },
      { label: 'V14', description: 'Sample summary header (name · date · commodity + edit link)', variantId: 'v14-sample-summary-header' },
      { label: 'V15', description: 'Production replica — faithful rebuild of the live app, not a proposal', variantId: 'v15-production-replica' },
      { label: 'V16', description: 'Multi-report — V15 + v14\'s multi-report/Add-report/API-distinction features grafted on', variantId: 'v16-multi-report' },
      // V17 (design-system parity checkpoint) was promoted to become the baseline — see main/.
    ],
  },
  {
    name: 'Improved editable table',
    versions: [
      { label: 'V1', description: 'Results grid parity with Treatments + Product/Application-date cross-validation', variantId: 'improved-editable-table-v1' },
    ],
  },
  {
    name: 'Spray plans',
    versions: [
      { label: 'V1', description: 'Plan list', variantId: 'spray-plans-v1' },
      { label: 'V2', description: 'Planning board', variantId: 'spray-plans-v2' },
      { label: 'V3', description: 'Lifecycle stepper', variantId: 'spray-plans-v3' },
      { label: 'V4', description: 'Calendar planner', variantId: 'spray-plans-v4' },
      { label: 'V5', description: 'Notion-style table', variantId: 'spray-plans-v5' },
    ],
  },
  {
    name: 'Draft state',
    versions: [
      { label: 'V1', description: 'Badge + filter', variantId: 'draft-state-v1' },
      { label: 'V2', description: 'Inline completion', variantId: 'draft-state-v2' },
      { label: 'V3', description: 'Drafts tray', variantId: 'draft-state-v3' },
      { label: 'V4', description: 'Status + side-panel', variantId: 'draft-state-v4' },
      { label: 'V5', description: 'Save anytime', variantId: 'draft-state-v5' },
      { label: 'V6', description: 'Dates-only optional', variantId: 'draft-state-v6' },
    ],
  },
  {
    name: 'New onboarding flow',
    versions: [
      { label: 'V1', description: 'Register flow', flow: 'register' },
      { label: 'V2', description: 'Onboarding flow', flow: 'onboarding' },
    ],
  },
  {
    name: 'Multiple treatments → plots',
    versions: [
      { label: 'V1', description: 'Inline plot validation', variantId: 'multiple-treatments-v1' },
    ],
  },
  {
    name: 'Table actions',
    versions: [
      { label: 'V1', description: 'Row action patterns', route: '/explore/table-actions' },
      { label: 'V2', description: 'Long error message', route: '/explore/table-actions-error' },
      { label: 'V3', description: 'Tags', route: '/explore/table-actions-tags' },
    ],
  },
];
