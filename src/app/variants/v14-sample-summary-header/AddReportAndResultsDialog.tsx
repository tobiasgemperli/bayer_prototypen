import React, { useRef, useState } from 'react';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton,
  Stack, Tooltip, Typography,
} from '@mui/material';
import { Add, Close as CloseIcon, DeleteOutline, InfoOutlined } from '@mui/icons-material';
import { toast } from 'sonner';
import {
  getAnalytesForPlot, newReportId, updateLabSample, LABORATORY_OPTIONS,
  LabAttachment, LabReport, LabResidue, LabSampleData,
} from '../../data/lab-results-data';
import { ActionChip } from '../../design-system/Chips';
import { OptionsTrigger } from '../../design-system/OptionsTrigger';
import { ActionMenu, ActionItem } from '../../design-system/ActionMenu';
import { LabResiduesGrid, LabResiduesGridHandle } from '../../lab-shared/LabResiduesGrid';
import { ReportFields } from './ReportFields';
import { AddLaboratoryDialog } from './AddLaboratoryDialog';

const softBtnSx = {
  fontWeight: 600, borderRadius: '8px', px: 2, height: 40, textTransform: 'none',
} as const;

export interface AddReportAndResultsDialogProps {
  /** The sample this report/results are being added to. Dialog is open
   *  whenever this is non-null. Pass a fresh key from the caller so
   *  re-opening the dialog (even for the same sample) starts clean. */
  sample: LabSampleData | null;
  onClose: () => void;
}

/**
 * 2-step quick-add popup: Report (lab + ID + attachments) → Results (suggested
 * chips + grid). This is the samples LIST's convenience action — a fast
 * one-shot way to add both without opening the sample page. It's a
 * different entry point from the sample page's own Reports/Results cards,
 * which are two fully independent actions (see AddReportDialog for the
 * report-only popup used there); this combined wizard is intentional here.
 * Triggered from the samples table's "Add report & results" row action and
 * from SampleCreatedDialog's same-named link.
 */
export function AddReportAndResultsDialog({ sample, onClose }: AddReportAndResultsDialogProps) {
  const [activeStep, setActiveStep] = useState(0); // 0=Report, 1=Results
  const [laboratory, setLaboratory] = useState(sample?.laboratory ?? '');
  const [customLabs, setCustomLabs] = useState<string[]>([]);
  const [addLabOpen, setAddLabOpen] = useState(false);
  const [labReportId, setLabReportId] = useState('');
  const [attachments, setAttachments] = useState<LabAttachment[]>([]);
  const [residues, setResidues] = useState<LabResidue[]>([]);
  const [reportInternalId] = useState(() => newReportId());
  const [selected, setSelected] = useState<string[]>([]);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const gridRef = useRef<LabResiduesGridHandle>(null);

  const open = !!sample;
  const plotAnalytes = sample ? getAnalytesForPlot(sample.plotId) : [];
  const step0Filled = labReportId.trim() !== '' || attachments.length > 0;
  const allLabs = [...LABORATORY_OPTIONS, ...customLabs];

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

  const gridHeight = Math.min(500, Math.max(160, residues.length * 52 + 52));

  if (!sample) {
    return <Dialog open={false} onClose={onClose} />;
  }

  const dialogMaxWidth: 'sm' | 'md' = activeStep === 1 ? 'md' : 'sm';

  return (
    <>
    <Dialog open={open} onClose={onClose} fullWidth maxWidth={dialogMaxWidth}
      PaperProps={{ sx: { borderRadius: '12px', boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.12)' } }}>
      <DialogTitle sx={{ m: 0, px: 3, pt: 3, pb: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.125rem' }}>
          {activeStep === 0 ? 'Add report' : 'Add results'}
        </Typography>
        <IconButton onClick={onClose} sx={{ color: 'text.secondary', p: 0.5 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {activeStep === 0 && (
        <>
          <DialogContent sx={{ px: 3, pt: 1, pb: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Add the report's reference number and attach the file(s) you received from the lab.
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
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3, pt: 2, gap: 1, justifyContent: 'flex-end' }}>
            <Button onClick={onClose} variant="text" color="inherit"
              sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'none', px: 2, height: 36 }}>
              Cancel
            </Button>
            <Button onClick={() => setActiveStep(1)} variant="contained" color="primary"
              disabled={!step0Filled} sx={{ fontWeight: 600, textTransform: 'none', px: 2, height: 36, borderRadius: '8px' }}>
              Next
            </Button>
          </DialogActions>
        </>
      )}

      {activeStep === 1 && (
        <>
          <DialogContent sx={{ px: 3, pt: 1, pb: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Add the residue results found in this lab report.
            </Typography>
            <Stack direction="row" alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" gap={1}
              sx={{ mb: 1.5 }}>
              <Box>
                {plotAnalytes.length > 0 && (
                  <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.75 }}>
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary' }}>
                      Suggested analytes
                    </Typography>
                    <Tooltip title="These are analytes we detected in documented treatments on this plot." arrow placement="top" enterDelay={150}>
                      <InfoOutlined sx={{ fontSize: 14, color: 'text.disabled', cursor: 'help' }} />
                    </Tooltip>
                  </Stack>
                )}
                <Stack direction="row" flexWrap="wrap" gap={0.75}>
                  {plotAnalytes.map((analyte) => (
                    <ActionChip key={analyte} label={analyte} onClick={() => handleAddResidue(analyte)} />
                  ))}
                </Stack>
              </Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <Button variant="soft" color="primary"
                  startIcon={<Add sx={{ fontSize: 16 }} />}
                  onClick={() => handleAddResidue()}
                  sx={softBtnSx}>
                  Add analyte
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
                noRowsMessage="No analytes added yet."
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3, pt: 2, gap: 1, justifyContent: 'flex-end' }}>
            <Button onClick={onClose} variant="text" color="inherit"
              sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'none', px: 2, height: 36 }}>
              Cancel
            </Button>
            <Button onClick={handleSaveReport} variant="contained" color="primary"
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
    </>
  );
}
