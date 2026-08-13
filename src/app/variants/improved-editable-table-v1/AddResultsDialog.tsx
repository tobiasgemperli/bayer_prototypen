import React, { useRef, useState } from 'react';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, Typography,
} from '@mui/material';
import { Add, Close as CloseIcon, DeleteOutline } from '@mui/icons-material';
import { LabReport, LabResidue, LabSampleData } from '../../data/lab-results-data';
import { OptionsTrigger } from '../../design-system/OptionsTrigger';
import { ActionMenu, ActionItem } from '../../design-system/ActionMenu';
import { LabResiduesGrid, LabResiduesGridHandle } from '../../lab-shared/LabResiduesGrid';
import { TableCard } from '../../design-system/TableCard';
import { AnalyteImportStatus } from './AnalyteImportStatus';
import { ConfirmActionDialog } from './ConfirmActionDialog';

const softBtnSx = {
  fontWeight: 600, borderRadius: '8px', px: 2, height: 36, textTransform: 'none',
} as const;

function formatAnalyteList(analytes: string[]): string {
  if (analytes.length <= 1) return analytes[0] ?? '';
  if (analytes.length === 2) return `${analytes[0]} and ${analytes[1]}`;
  return `${analytes.slice(0, -1).join(', ')}, and ${analytes[analytes.length - 1]}`;
}

export interface AddResultsDialogProps {
  /** Dialog is open whenever this is non-null. Pass a fresh key from the
   *  caller so re-opening (even for the same sample) starts clean. */
  sample: LabSampleData | null;
  reports: LabReport[];
  plotAnalytes: string[];
  onClose: () => void;
  onSave: (residues: LabResidue[]) => void;
}

/**
 * Single-purpose "Add results" popup — triggered only from the Results
 * card's empty state (no residues yet). Once results exist, further
 * additions happen inline in the grid instead (ResultsCard's own SaveBar) —
 * this dialog only ever covers the very first entry. Opens with one blank
 * row already in progress, ready to fill in, instead of an empty grid.
 */
export function AddResultsDialog({ sample, reports, plotAnalytes, onClose, onSave }: AddResultsDialogProps) {
  const [residues, setResidues] = useState<LabResidue[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [confirmMissingOpen, setConfirmMissingOpen] = useState(false);
  const gridRef = useRef<LabResiduesGridHandle>(null);

  const open = !!sample;
  const missingAnalytes = plotAnalytes.filter((a) => !residues.some((r) => r.analyte === a));
  const importedAnalytes = plotAnalytes.filter((a) => residues.some((r) => r.analyte === a));
  const hasAnalyteStatus = missingAnalytes.length > 0 || importedAnalytes.length > 0;

  const handleAddResidue = (analyte?: string) => {
    gridRef.current?.addRow(analyte);
  };

  // Adds a row per still-missing analyte, staying on the grid to fill in
  // values — does not save. Used both for the auto-import on open (all
  // detected analytes) and the missing-analytes confirm dialog's "Add
  // results" action (only the ones still missing). focus=false: adding
  // several rows at once should never fight over which one gets the cell
  // editor.
  const handleImportAnalytes = (analytes: string[]) => {
    analytes.forEach((a) => gridRef.current?.addRow(a, false));
  };

  // Removes exactly the rows that came from the plot's treatments and are
  // still present — recomputed live from `residues`, so this stays correct
  // even if the user has since added/edited rows manually.
  const handleUndoImport = () => {
    const ids = residues.filter((r) => importedAnalytes.includes(r.analyte)).map((r) => r.id);
    gridRef.current?.deleteRows(ids);
  };

  // Fires once AG-Grid's own internal api is genuinely ready (not a guessed
  // delay) — the grid's DOM/ref exists a tick before its api does, so
  // addRow() would silently no-op if called any earlier. The dialog remounts
  // fresh on every open (parent keys it), so this fires exactly once per
  // open. When treatments surfaced no analytes to offer, there is nothing to
  // import — start with one blank row. Otherwise every detected analyte is
  // imported straight away (the recommended, reversible default) — the
  // status row above the grid reflects this immediately, no toast needed.
  const handleGridReady = () => {
    if (plotAnalytes.length === 0) {
      gridRef.current?.addRow();
      return;
    }
    handleImportAnalytes(plotAnalytes);
  };

  const bulkActions: ActionItem[] = [
    {
      label: `Delete result${selected.length !== 1 ? 's' : ''}`,
      icon: <DeleteOutline fontSize="small" />,
      key: 'delete',
      color: 'error.main',
      onClick: () => {
        gridRef.current?.deleteRows(selected);
        setSelected([]);
        setMenuAnchor(null);
      },
    },
  ];

  const gridHeight = Math.min(500, Math.max(160, residues.length * 52 + 52));

  const handleSave = () => {
    onSave(residues);
    onClose();
  };

  // Missing analytes is a data-completeness nudge, not a hard block — more
  // recorded results make for better predictions (and better training
  // data), so Save surfaces one reminder rather than silently letting a gap
  // through. Shares the delete-sample dialog's shell, but both paths here
  // perform a real action (import vs. save-as-is) rather than a Cancel.
  const handleSaveClick = () => {
    if (missingAnalytes.length > 0) {
      setConfirmMissingOpen(true);
      return;
    }
    handleSave();
  };

  if (!sample) {
    return <Dialog open={false} onClose={onClose} />;
  }

  return (
    <>
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md"
      PaperProps={{ sx: { borderRadius: '12px', boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.12)' } }}>
      <DialogTitle sx={{ m: 0, px: 3, pt: 3, pb: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.125rem' }}>
          Add analytes
        </Typography>
        <IconButton onClick={onClose} sx={{ color: 'text.secondary', p: 0.5 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* pt on DialogContent itself is a no-op here: MUI's own DialogContent
          styleOverrides force `padding-top: 0` whenever it directly follows
          a DialogTitle (`.MuiDialogTitle-root + .MuiDialogContent-root`),
          at higher specificity than any sx override on this element. The
          top/bottom spacing around the status row is set on the Stack's own
          margin instead, so it isn't silently cancelled by that rule. */}
      <DialogContent sx={{ px: 3, pt: 0, pb: 1 }}>
        <Stack direction="row" justifyContent={hasAnalyteStatus ? 'space-between' : 'flex-end'} alignItems="flex-start" sx={{ mt: 2.5, mb: 2.5 }}>
          <AnalyteImportStatus
            missingAnalytes={missingAnalytes}
            importedAnalytes={importedAnalytes}
            onUndo={handleUndoImport}
          />
          <Stack direction="row" spacing={1} alignItems="center">
            <Button variant="soft" color="primary"
              startIcon={<Add sx={{ fontSize: 16 }} />}
              onClick={() => handleAddResidue()}
              sx={softBtnSx}>
              Add residue
            </Button>
            {selected.length > 0 && (
              <>
                <OptionsTrigger onClick={(e) => setMenuAnchor(e.currentTarget)} hasSelection />
                <ActionMenu anchorEl={menuAnchor} open={Boolean(menuAnchor)}
                  onClose={() => setMenuAnchor(null)} actions={bulkActions} />
              </>
            )}
          </Stack>
        </Stack>
        <TableCard>
          <Box sx={{ height: gridHeight }}>
            <LabResiduesGrid
              ref={gridRef}
              residues={residues}
              reports={reports}
              hideSource
              recommendedAnalytes={plotAnalytes}
              onAdd={(r) => setResidues((prev) => [...prev, r])}
              onUpdate={(id, patch) => setResidues((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))}
              onDelete={(id) => setResidues((prev) => prev.filter((r) => r.id !== id))}
              onSelectionChange={setSelected}
              onGridReady={handleGridReady}
              noRowsMessage="No residues added yet."
            />
          </Box>
        </TableCard>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, pt: 2, gap: 1, justifyContent: 'flex-end' }}>
        <Button onClick={onClose} variant="text" color="inherit"
          sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'none', px: 2, height: 36 }}>
          Cancel
        </Button>
        <Button onClick={handleSaveClick} variant="contained" color="primary"
          sx={{ fontWeight: 600, textTransform: 'none', px: 2, height: 36, borderRadius: '8px' }}>
          Save
        </Button>
      </DialogActions>
    </Dialog>

    <ConfirmActionDialog
      open={confirmMissingOpen}
      title="Missing analytes"
      body={
        <>
          Based on this plot&apos;s treatments,{' '}
          <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
            {formatAnalyteList(missingAnalytes)}
          </Box>{' '}
          should likely be tested too. {missingAnalytes.length === 1 ? "It isn't" : "They aren't"} listed here yet. Adding {missingAnalytes.length === 1 ? 'it' : 'them'} gives us more complete data for your residue predictions.
        </>
      }
      onClose={() => setConfirmMissingOpen(false)}
      secondaryLabel="Save without them"
      onSecondary={handleSave}
      primaryLabel="Add results"
      onPrimary={() => handleImportAnalytes(missingAnalytes)}
    />
    </>
  );
}
