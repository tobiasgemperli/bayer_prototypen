import React from 'react';
import { CustomCellRendererProps } from 'ag-grid-community';
import { toast } from 'sonner';
import {
  SprayStatus, STATUS_LABEL, TreatmentData, setTreatmentStatus, getMissingTreatmentFields,
} from '../../data/plots-data';
import { SprayStatusChip } from './SprayStatusChip';

/** AG Grid cell renderer for the Status column. Owns the executed-gate and
 *  persists the change directly to the treatments store. */
export function TreatmentStatusCell(params: CustomCellRendererProps<TreatmentData>) {
  const row = params.data;
  const status: SprayStatus = (row?.status as SprayStatus) ?? 'draft';

  const handleSelect = (next: SprayStatus) => {
    if (!row) return;
    if (next === 'executed') {
      const missing = getMissingTreatmentFields(row);
      if (missing.length > 0) {
        toast.error(
          `Can't mark as Executed — missing ${missing.length} field${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}`
        );
        return;
      }
    }
    const res = setTreatmentStatus(row.id, next);
    if (!res.ok) {
      toast.error(`Can't mark as Executed — missing: ${res.missing.join(', ')}`);
      return;
    }
    // Mirror the change into AG Grid's internal model so sorting/filtering see it.
    params.node.setData({ ...row, status: next });
    toast.success(`Status changed to ${STATUS_LABEL[next]}`);
  };

  return <SprayStatusChip status={status} onSelect={handleSelect} />;
}
