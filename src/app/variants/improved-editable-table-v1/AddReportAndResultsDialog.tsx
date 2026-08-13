import React, { useRef, useState } from 'react';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton,
  Stack, Typography,
} from '@mui/material';
import { Add, Close as CloseIcon, DeleteOutline } from '@mui/icons-material';
import { toast } from 'sonner';
import {
  getAnalytesForPlot, newReportId, updateLabSample, LABORATORY_OPTIONS,
  LabAttachment, LabReport, LabResidue, LabSampleData,
} from '../../data/lab-results-data';
import { OptionsTrigger } from '../../design-system/OptionsTrigger';
import { ActionMenu, ActionItem } from '../../design-system/ActionMenu';
import { LabResiduesGrid, LabResiduesGridHandle } from '../../lab-shared/LabResiduesGrid';
import { TableCard } from '../../design-system/TableCard';
import { ReportFields } from './ReportFields';
import { AddLaboratoryDialog } from './AddLaboratoryDialog';
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

export interface AddReportAndResultsDialogProps {
  /** The sample this report/results are being added to. Dialog is open
   *  whenever this is non-null. Pass a fresh key from the caller so
   *  re-opening the dialog (even for the same sample) starts clean. */
  sample: LabSampleData | null;
  onClose: () => void;
}

/**
 * Quick-add popup: Report (lab + ID + attachments) → Results grid, two real
 * steps of ONE dialog. This is the samples LIST's convenience action — a
 * fast one-shot way to add both without opening the sample page. It's a
 * different entry point from the sample page's own Reports/Results cards,
 * which are two fully independent actions (see AddReportDialog for the
 * report-only popup used there); this combined wizard is intentional here.
 * Triggered from the samples table's "Add report & results" row action and
 * from SampleCreatedDialog's same-named link.
 */
export function AddReportAndResultsDialog({ sample, onClose }: AddReportAndResultsDialogProps) {
  // Computed once per mount (this dialog is remounted fresh on every open —
  // see the `key` prop at its call sites), so it is safe to read before the
  // hooks below and use as their initial values.
  const plotAnalytes = sample ? getAnalytesForPlot(sample.plotId) : [];

  const [activeStep, setActiveStep] = useState<0 | 1>(0); // 0=Report, 1=Results
  const [laboratory, setLaboratory] = useState(sample?.laboratory ?? '');
  const [customLabs, setCustomLabs] = useState<string[]>([]);
  const [addLabOpen, setAddLabOpen] = useState(false);
  const [labReportId, setLabReportId] = useState('');
  const [attachments, setAttachments] = useState<LabAttachment[]>([]);
  const [residues, setResidues] = useState<LabResidue[]>([]);
  const [reportInternalId] = useState(() => newReportId());
  const [selected, setSelected] = useState<string[]>([]);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [touched, setTouched] = useState(false);
  const [confirmMissingOpen, setConfirmMissingOpen] = useState(false);
  const gridRef = useRef<LabResiduesGridHandle>(null);

  const open = !!sample;
  const missingAnalytes = plotAnalytes.filter((a) => !residues.some((r) => r.analyte === a));
  const importedAnalytes = plotAnalytes.filter((a) => residues.some((r) => r.analyte === a));
  const hasAnalyteStatus = missingAnalytes.length > 0 || importedAnalytes.length > 0;
  const step0Valid = !!laboratory.trim() && labReportId.trim() !== '' && attachments.length > 0;
  const allLabs = [...LABORATORY_OPTIONS, ...customLabs];

  const handleContinue = () => {
    setTouched(true);
    if (step0Valid) { setActiveStep(1); setTouched(false); }
  };

  const handleConfirmNewLab = (name: string) => {
    if (!allLabs.includes(name)) setCustomLabs((prev) => [...prev, name]);
    setLaboratory(name);
    setAddLabOpen(false);
  };

  const handleAddFiles = (files: FileList) => {
    const start = Date.now();
    const added: LabAttachment[] = Array.from(files).map((f, i) => ({
      id: `att-${start}-${i}`, name: f.name, size: f.size,
    }));
    setAttachments((prev) => [...prev, ...added]);
  };
  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleAddResidue = (analyte?: string) => {
    gridRef.current?.addRow(analyte);
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

  const handleSaveReport = () => {
    if (!sample) return;
    const trimmedId = labReportId.trim();
    const newReport: LabReport = {
      id: reportInternalId, laboratory, labReportId: trimmedId, attachments,
    };
    const taggedResidues = residues.map((r) => ({ ...r, labReportId: trimmedId }));

    updateLabSample(sample.id, {
      reports: [...(sample.reports ?? []), newReport],
      residues: [...(sample.residues ?? []), ...taggedResidues],
      isDraft: false,
    });
    toast.success('Report added');
    onClose();
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

  // Missing analytes is a data-completeness nudge, not a hard block — more
  // recorded results make for better predictions (and better training
  // data), so Save surfaces one reminder rather than silently letting a gap
  // through. Shares the delete-sample dialog's shell, but both paths here
  // perform a real action (import vs. save-as-is) rather than a Cancel.
  const handleSaveReportClick = () => {
    if (missingAnalytes.length > 0) {
      setConfirmMissingOpen(true);
      return;
    }
    handleSaveReport();
  };

  // Removes exactly the rows that came from the plot's treatments and are
  // still present — recomputed live from `residues`, so this stays correct
  // even if the user has since added/edited rows manually.
  const handleUndoImport = () => {
    const ids = residues.filter((r) => importedAnalytes.includes(r.analyte)).map((r) => r.id);
    gridRef.current?.deleteRows(ids);
  };

  const gridHeight = Math.min(500, Math.max(160, residues.length * 52 + 52));

  if (!sample) {
    return <Dialog open={false} onClose={onClose} />;
  }

  const dialogMaxWidth: 'sm' | 'md' = activeStep === 1 ? 'md' : 'sm';
  const dialogTitle = activeStep === 0 ? 'Add a report' : 'Add analytes';

  // Fires once AG-Grid's own internal api is genuinely ready (not a guessed
  // delay). When treatments surfaced no analytes to offer, there is nothing
  // to import — start with one blank row, same as the standalone
  // AddResultsDialog. Otherwise every detected analyte is imported straight
  // away (the recommended, reversible default) — the status row above the
  // grid reflects this immediately, no toast needed.
  const handleResultsGridReady = () => {
    if (plotAnalytes.length === 0) {
      gridRef.current?.addRow();
      return;
    }
    handleImportAnalytes(plotAnalytes);
  };

  return (
    <>
    <Dialog open={open} onClose={onClose} fullWidth maxWidth={dialogMaxWidth}
      PaperProps={{ sx: { borderRadius: '12px', boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.12)' } }}>
      <DialogTitle sx={{ m: 0, px: 3, pt: 3, pb: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.125rem' }}>
          {dialogTitle}
        </Typography>
        <IconButton onClick={onClose} sx={{ color: 'text.secondary', p: 0.5 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {activeStep === 0 && (
        <>
          <DialogContent sx={{ px: 3, pt: 1, pb: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Enter the report details and upload the files you received from the lab.
            </Typography>
            <ReportFields
              laboratory={laboratory}
              onLaboratoryChange={setLaboratory}
              allLabs={allLabs}
              onAddLab={() => setAddLabOpen(true)}
              labReportId={labReportId}
              onLabReportIdChange={setLabReportId}
              attachments={attachments}
              onAddFiles={handleAddFiles}
              onRemoveAttachment={handleRemoveAttachment}
              showErrors={touched}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3, pt: 2, gap: 1, justifyContent: 'flex-end' }}>
            <Button onClick={onClose} variant="text" color="inherit"
              sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'none', px: 2, height: 36 }}>
              Cancel
            </Button>
            <Button onClick={handleContinue} variant="contained" color="primary"
              sx={{ fontWeight: 600, textTransform: 'none', px: 2, height: 36, borderRadius: '8px' }}>
              Continue
            </Button>
          </DialogActions>
        </>
      )}

      {activeStep === 1 && (
        <>
          {/* pt on DialogContent itself is a no-op here: MUI's own DialogContent
              styleOverrides force `padding-top: 0` whenever it directly follows
              a DialogTitle (`.MuiDialogTitle-root + .MuiDialogContent-root`),
              at higher specificity than any sx override on this element. The
              top/bottom spacing around the status row is set on the Stack's
              own margin instead, so it isn't silently cancelled by that rule. */}
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
                  reports={[]}
                  hideLabReport
                  hideSource
                  recommendedAnalytes={plotAnalytes}
                  onAdd={(r) => setResidues((prev) => [...prev, r])}
                  onUpdate={(id, patch) => setResidues((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))}
                  onDelete={(id) => setResidues((prev) => prev.filter((r) => r.id !== id))}
                  onSelectionChange={setSelected}
                  onGridReady={handleResultsGridReady}
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
            <Button onClick={handleSaveReportClick} variant="contained" color="primary"
              sx={{ fontWeight: 600, textTransform: 'none', px: 2, height: 36, borderRadius: '8px' }}>
              Save
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>

    <AddLaboratoryDialog
      open={addLabOpen}
      onClose={() => setAddLabOpen(false)}
      onConfirm={handleConfirmNewLab}
    />

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
      onSecondary={handleSaveReport}
      primaryLabel="Add results"
      onPrimary={() => handleImportAnalytes(missingAnalytes)}
    />
    </>
  );
}
