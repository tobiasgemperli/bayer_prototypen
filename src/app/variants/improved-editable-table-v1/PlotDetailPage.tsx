import { toast } from 'sonner';
import { PlotDetailPage as BaselinePlotDetailPage } from '../../main/PlotDetailPage';
import { TreatmentData } from '../../data/plots-data';
import { formatGridDate } from '../../design-system/grid/grid-shared';
import { LabManagementContent } from './LabManagementContent';
import { availableProductsForDate, isProductAvailableOnDate } from './productAvailability';

export function PlotDetailPage() {
  // Fallback for an invalid pair entering some other way (e.g. pasted in
  // from Excel) — the dropdown/date-picker restrictions below only guard
  // interactive edits, not paste. Checked once Save actually commits, not
  // on every intermediate cell change, so it never fires mid-edit.
  const handleAfterTreatmentsSave = (savedRows: TreatmentData[]) => {
    savedRows.forEach((row) => {
      const date = row.date instanceof Date ? row.date : null;
      if (!row.product || !date || isProductAvailableOnDate(row.product, date)) return;
      toast.error(`${row.product} can’t be used on ${formatGridDate(date)} due to product use restrictions. Change the product or application date.`);
    });
  };

  return (
    <BaselinePlotDetailPage
      samplingTabLabel="Samples & Reports"
      SamplingContent={LabManagementContent}
      treatmentsCustomization={{
        // Product dropdown only offers products available on the row's
        // already-selected application date; empty state names that date.
        productColumn: {
          cellEditorParams: (params: any) => {
            const date = params.data?.date instanceof Date ? params.data.date : null;
            return {
              values: availableProductsForDate(date),
              searchPlaceholder: 'Search product…',
              noOptionsText: date
                ? `No matching products for ${formatGridDate(date)}. Only products allowed for this application date are shown. Change the date or search again.`
                : undefined,
            };
          },
        },
        // Date picker disables dates unavailable for the row's already-
        // selected product; each disabled day gets its own tooltip naming
        // both the product and that specific date.
        dateColumnOverride: {
          cellEditorParams: (params: any) => {
            const product = params.data?.product as string | undefined;
            if (!product) return {};
            return {
              shouldDisableDate: (d: Date) => !isProductAvailableOnDate(product, d),
              disabledDateTooltip: (d: Date) =>
                `${product} can’t be used on ${formatGridDate(d)} due to product use restrictions. Choose another date or product.`,
            };
          },
        },
        onAfterSave: handleAfterTreatmentsSave,
        // Treatments' SaveBar sits inside a toolbar-driven table, edge-to-edge
        // with the sub-tabs/toolbar/count-bar above and below it — unlike
        // Results' SaveBar, which lives inside a rounded accordion/TableCard.
        // Each keeps the chrome that matches its own layout.
        saveBarVariant: 'edge',
        // No draft workflow in this project's Treatments experience.
        hideSaveDraft: true,
      }}
    />
  );
}
