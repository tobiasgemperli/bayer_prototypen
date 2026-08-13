import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
} from '@mui/material';
import { Add, ContentCopy, DeleteOutline } from '@mui/icons-material';
import { BaseDialog } from '../design-system/BaseDialog';
import { FieldLabel } from '../design-system/FormField';
import { PlotsSelector } from './PlotsSelector';
import { TreatmentsGrid, TreatmentsGridHandle } from './TreatmentsGrid';
import { OptionsTrigger } from '../design-system/OptionsTrigger';
import { ActionMenu, ActionItem } from '../design-system/ActionMenu';
import { TreatmentData } from '../data/plots-data';
import { toast } from 'sonner';

interface TreatmentModalProps {
  open: boolean;
  onClose: () => void;
  preSelectedPlotIds?: string[];
  preSelectedTreatments?: TreatmentData[];
  title?: string;
  /** Subtitle under the title. Defaults to the standard copy for the
   *  bulk-action entry point (varies with hideplotsSelector). Callers with a
   *  different entry point (e.g. a standalone "Add treatments" CTA) can pass
   *  their own without changing any behavior below it. */
  description?: string;
  onConfirmOverride?: () => void;
  hideplotsSelector?: boolean;
  confirmLabel?: string;
  confirmIcon?: React.ReactNode;
  /** Heading above the plots selector — the only copy there (no separate
   *  caption line). Always rendered as a required field label (red
   *  asterisk) since Confirm blocks on an empty selection. Defaults to the
   *  bulk-action copy. ReactNode (not just string) so a caller can style
   *  part of it differently — e.g. a grey/regular "(Season: …)" suffix next
   *  to the bold label text. */
  plotsSelectorTitle?: React.ReactNode;
}

export function TreatmentModal({
  open,
  onClose,
  preSelectedPlotIds,
  preSelectedTreatments,
  title = 'Add applied treatments to selected plots',
  description,
  onConfirmOverride,
  hideplotsSelector,
  confirmLabel,
  confirmIcon,
  plotsSelectorTitle = 'Plots receiving these treatments',
}: TreatmentModalProps) {
  const [selectedPlotIds, setSelectedPlotIds] = useState<string[]>([]);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [optionsAnchor, setOptionsAnchor] = useState<null | HTMLElement>(null);
  // Increment on each open so the grid unmounts and remounts with a clean state
  const [mountKey, setMountKey] = useState(0);
  const [initialTreatments, setInitialTreatments] = useState<TreatmentData[]>([]);
  const gridRef = useRef<TreatmentsGridHandle>(null);

  useEffect(() => {
    if (open) {
      setSelectedPlotIds(preSelectedPlotIds || []);
      setSelectedRowIds([]);
      const prefilled = preSelectedTreatments ?? [];
      setInitialTreatments(prefilled);
      setMountKey((k) => k + 1);
      // Auto-add one empty row when no treatments are prefilled
      if (prefilled.length === 0) {
        setTimeout(() => gridRef.current?.addRow('__draft__'), 120);
      }
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddRow = () => {
    gridRef.current?.addRow('__draft__');
  };

  const handleBulkDuplicate = () => {
    selectedRowIds.forEach((id) => gridRef.current?.duplicateRow(id));
    setOptionsAnchor(null);
  };

  const handleBulkDelete = () => {
    selectedRowIds.forEach((id) => gridRef.current?.deleteRow(id));
    setSelectedRowIds([]);
    setOptionsAnchor(null);
  };

  const handleConfirm = () => {
    if (onConfirmOverride) {
      onConfirmOverride();
      return;
    }
    if (selectedPlotIds.length === 0) {
      toast.error('Select at least one plot to add treatments to');
      return;
    }
    toast.success(
      `Applied treatments added to ${selectedPlotIds.length} plot${selectedPlotIds.length !== 1 ? 's' : ''}`
    );
    onClose();
  };

  return (
    <BaseDialog
      open={open}
      onClose={onClose}
      title={title}
      confirmLabel={confirmLabel || "Add applied treatments to plots"}
      confirmIcon={confirmIcon}
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
          {description ?? (hideplotsSelector
            ? 'Fill in the treatment details below.'
            : 'Add one or more treatments below and select which plots they apply to.')}
        </Typography>

        {/* Grid toolbar */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1 }}>
          <Button
            variant="soft"
            color="primary"
            startIcon={<Add />}
            onClick={handleAddRow}
            sx={{
              height: 36,
              px: 2,
              fontWeight: 600,
              borderRadius: '8px',
              textTransform: 'none',
            }}
          >
            Add treatment
          </Button>
          <OptionsTrigger
            onClick={(e) => setOptionsAnchor(e.currentTarget)}
            disabled={selectedRowIds.length === 0}
            hasSelection={selectedRowIds.length > 0}
          />
          <ActionMenu
            anchorEl={optionsAnchor}
            open={Boolean(optionsAnchor)}
            onClose={() => setOptionsAnchor(null)}
            actions={(() => {
              const plural = selectedRowIds.length > 1;
              const items: ActionItem[] = [
                {
                  label: plural ? 'Copy treatments' : 'Copy treatment',
                  icon: <ContentCopy fontSize="small" />,
                  key: 'copy',
                  onClick: handleBulkDuplicate,
                },
                { divider: true, key: 'd1', onClick: () => {} },
                {
                  label: plural ? 'Delete treatments' : 'Delete treatment',
                  icon: <DeleteOutline fontSize="small" />,
                  key: 'delete',
                  color: 'error.main',
                  onClick: handleBulkDelete,
                },
              ];
              return items;
            })()}
          />
        </Box>

        {/* Treatments grid */}
        <Box
          sx={{
            height: 340,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          <TreatmentsGrid
            key={mountKey}
            ref={gridRef}
            initialData={initialTreatments}
            onDirtyStateChange={() => {}}
            onSelectionChange={setSelectedRowIds}
          />
        </Box>

        {!hideplotsSelector && (
          <Box>
            <FieldLabel required sx={{ fontSize: '0.8125rem' }}>{plotsSelectorTitle}</FieldLabel>
            <PlotsSelector
              selectedPlotIds={selectedPlotIds}
              onChange={setSelectedPlotIds}
            />
          </Box>
        )}
      </Box>
    </BaseDialog>
  );
}
