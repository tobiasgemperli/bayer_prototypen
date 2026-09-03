import React from 'react';
import { createBrowserRouter, Outlet, useParams } from "react-router";
import { Box } from '@mui/material';
import { Header } from './main/Header';
import { PlotsPage } from './main/PlotsPage';
import { PlotDetailPage } from './main/PlotDetailPage';
import { LabSamplePage } from './main/LabSamplePage';
import { SampleReportPage } from './main/SampleReportPage';
import { AddPlotPage } from './main/AddPlotPage';
import { SignUpPage } from './main/SignUpPage';
import { AccountCompletionModal } from './main/AccountCompletionModal';
import { useAuthPhase } from './data/auth-state';
import { OnboardingCoach } from './main/OnboardingCoach';
import { VariantPicker } from './main/VariantPicker';
import { VariantProvider } from './variants/variant-context';
import { resolveComponent, OverridableKey, getVariant } from './variants/registry';
import { SampleSheetPage } from './main/SampleSheetPage';
import { PrototypeGallery } from './main/PrototypeGallery';
import { TableActionsDemoPage } from './variants/table-actions-v1/TableActionsDemoPage';
import { TableActionsErrorDemoPage } from './variants/table-actions-v1/TableActionsErrorDemoPage';
import { TableActionsTagsDemoPage } from './variants/table-actions-v1/TableActionsTagsDemoPage';
import { LabParserDemoPage } from './lab-shared/LabParserDemoPage';
import { SampleReportsPage } from './main/SampleReportsPage';
import { AllSamplesPage } from './main/AllSamplesPage';
import { InboxPage } from './main/InboxPage';

function Root() {
  const authPhase = useAuthPhase();

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Header />
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <Outlet />
      </Box>
      <AccountCompletionModal open={authPhase === 'needs-completion'} />
      <OnboardingCoach />
      {/* VariantPicker (bottom-left "Baseline" navigator) hidden — replaced by the header Prototype switcher */}
    </Box>
  );
}

/** Wraps variant routes with the VariantContext so navigation stays in-variant. */
function VariantLayout() {
  const { variantId } = useParams<{ variantId: string }>();
  const exists = variantId && getVariant(variantId);
  if (!exists) {
    return <Box sx={{ p: 3 }}>Unknown variant: {variantId}</Box>;
  }
  return (
    <VariantProvider id={variantId!}>
      <Outlet />
    </VariantProvider>
  );
}

/** Renders the variant's override for the given component, or the baseline. */
function VariantRoute({ name }: { name: OverridableKey }) {
  const { variantId } = useParams<{ variantId: string }>();
  const Comp = resolveComponent(variantId, name);
  return <Comp />;
}

// Detects the folder the app is actually served from at runtime, so the
// same relative-base build works whether it's uploaded at the domain root
// or an arbitrary subfolder (e.g. example.com/resiyou/) without a rebuild.
// createBrowserRouter otherwise matches route paths against the full
// pathname, so "/resiyou/plot/1" wouldn't match a route defined as
// "/plot/:id" and every route 404s. Derived from the entry script's own
// resolved URL (always "<appRoot>/assets/index-*.js" in this build), not
// from Vite's build-time BASE_URL — that stays a relative "./" so index.html
// keeps working unmodified if the deployment path changes later.
function detectBasename(): string {
  if (typeof document === 'undefined') return '/';
  const script = document.querySelector('script[type="module"][src*="/assets/"]') as HTMLScriptElement | null;
  if (!script?.src) return '/'; // dev server serves /src/main.tsx directly — no assets/ script to key off
  const pathname = new URL('..', script.src).pathname;
  return pathname === '/' ? '/' : pathname.replace(/\/$/, '');
}

const BASENAME = detectBasename();

export const router = createBrowserRouter([
  {
    path: "/signup",
    Component: SignUpPage,
  },
  {
    // Standalone explore/spec pages — no app header, no nav.
    path: "/explore/table-actions",
    Component: TableActionsDemoPage,
  },
  {
    path: "/explore/table-actions-error",
    Component: TableActionsErrorDemoPage,
  },
  {
    path: "/explore/table-actions-tags",
    Component: TableActionsTagsDemoPage,
  },
  {
    // Client-side lab-report PDF parser demo (drag-and-drop, in-browser).
    path: "/explore/lab-parser",
    Component: LabParserDemoPage,
  },
  {
    // A4 sample-sheet page — "Open PDF" opens this in a new tab.
    path: "/sample-sheet/:sampleId",
    Component: SampleSheetPage,
  },
  {
    path: "/",
    Component: Root,
    children: [
      // Baseline routes
      { index: true, Component: PlotsPage },
      { path: "plot/:id", Component: PlotDetailPage },
      { path: "plot/:id/lab-results/new", Component: LabSamplePage },
      { path: "plot/:id/lab-results/:sampleId", Component: LabSamplePage },
      { path: "plot/:id/samples/:sampleId", Component: SampleReportPage },
      { path: "add-plot", Component: AddPlotPage },
      { path: "samples", Component: AllSamplesPage },
      { path: "inbox", Component: InboxPage },
      { path: "sample-reports", Component: SampleReportsPage },
      { path: "prototypes", Component: PrototypeGallery },

      // Variant routes — same paths under /v/:variantId/
      {
        path: "v/:variantId",
        Component: VariantLayout,
        children: [
          { index: true, element: <VariantRoute name="PlotsPage" /> },
          { path: "plot/:id", element: <VariantRoute name="PlotDetailPage" /> },
          { path: "plot/:id/lab-results/new", element: <VariantRoute name="LabSamplePage" /> },
          { path: "plot/:id/lab-results/:sampleId", element: <VariantRoute name="LabSamplePage" /> },
          { path: "plot/:id/lab-report/new", element: <VariantRoute name="LabReportPage" /> },
          { path: "plot/:id/lab-report/:reportId", element: <VariantRoute name="LabReportPage" /> },
          { path: "plot/:id/samples/:sampleId", element: <VariantRoute name="SampleReportPage" /> },
          { path: "add-plot", element: <VariantRoute name="AddPlotPage" /> },
        ],
      },
    ],
  },
], { basename: BASENAME });
