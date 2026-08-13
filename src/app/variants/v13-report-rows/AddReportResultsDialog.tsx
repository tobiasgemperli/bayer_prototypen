import React, { useRef, useState } from 'react';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton,
  Stack, TextField, Typography,
} from '@mui/material';
import { Add, AttachFile, Close as CloseIcon, DeleteOutline } from '@mui/icons-material';
import { toast } from 'sonner';
import {
  getAnalytesForPlot, newReportId, updateLabSample, LABORATORY_OPTIONS,
  LabAttachment, LabReport, LabResidue, LabSampleData,
} from '../../data/lab-results-data';
import { FieldLabel, fieldSx } from '../../design-system/FormField';
import { AttachmentChip } from '../../design-system/AttachmentChip';
import { ActionChip } from '../../design-system/Chips';
import { OptionsTrigger } from '../../design-system/OptionsTrigger';
import { ActionMenu, ActionItem } from '../../design-system/ActionMenu';
import { LabResiduesGrid, LabResiduesGridHandle } from '../../lab-shared/LabResiduesGrid';
import { LabAutocomplete } from './LabAutocomplete';
import { AddLaboratoryDialog } from './AddLaboratoryDialog';

const softBtnSx = {
  fontWeight: 600, borderRadius: '8px', px: 2, height: 40, textTransform: 'none',
} as const;

const rowFieldColSx = { height: 40, display: 'flex', alignItems: 'center' } as const;

export interface AddReportResultsDialogProps {
  /** The sample this report/results are being added to. Dialog is open
   *  whenever this is non-null. Pass a fresh key from the caller so
   *  re-opening the dialog (even for the same sample) starts clean. */
  sample: LabSampleData | null;
  onClose: () => void;
}

/**
 * 2-step quick-add popup: Report (lab + ID + PDF) → Results (recommended
 * chips + grid). Triggered from the samples table's "Add report & results"
 * row action and from SampleCreatedDialog's same-named button — both open
 * this instead of navigating to the full SampleReportPage. Saves on Save
 * (merging into the sample's existing reports/results, not overwriting
 * them — this can run against a sample that already has data), then closes
 * with a success toast rather than a third confirmation screen.
 */
export function AddReportResultsDialog({ sample, onClose }: AddReportResultsDialogProps) {
  const [activeStep, setActiveStep] = useState(0); // 0=Report, 1=Results
  const [laboratory, setLaboratory] = useState(sample?.laboratory ?? '');
  const [customLabs, setCustomLabs] = useState<string[]>([]);
  const [addLabOpen, setAddLabOpen] = useState(false);
  const [labReportId, setLabReportId] = useState('');
  const [attachment, setAttachment] = useState<LabAttachment | null>(null);
  const [residues, setResidues] = useState<LabResidue[]>([]);
  const [reportInternalId] = useState(() => newReportId());
  const [selected, setSelected] = useState<string[]>([]);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<LabResiduesGridHandle>(null);

  const open = !!sample;
  const plotAnalytes = sample ? getAnalytesForPlot(sample.plotId) : [];
  const step1Filled = labReportId.trim() !== '' || attachment !== null;
  const allLabs = [...LABORATORY_OPTIONS, ...customLabs];

  const handleConfirmNewLab = (name: string) => {
    if (!allLabs.includes(name)) setCustomLabs((prev) => [...prev, name]);
    setLaboratory(name);
    setAddLabOpen(false);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachment({ id: `att-${Date.now()}`, name: file.name, size: file.size });
    e.target.value = '';
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
      id: reportInternalId, laboratory, labReportId: trimmedId,
      attachments: attachment ? [attachment] : [],
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

  const gridHeight = Math.min(500, Math.max(160, residues.length * 52 + 56));

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
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                Add the report's reference number and attach the PDF you received from the lab.
              </Typography>
              <Box>
                <FieldLabel>Laboratory</FieldLabel>
                <LabAutocomplete
                  value={laboratory}
                  options={allLabs}
                  onChange={setLaboratory}
                  onAddLab={() => setAddLabOpen(true)}
                />
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box>
                  <FieldLabel>Lab report ID</FieldLabel>
                  <TextField
                    fullWidth size="small" autoFocus placeholder="e.g. RPT-2024-001"
                    value={labReportId} onChange={(e) => setLabReportId(e.target.value)}
                    sx={fieldSx}
                  />
                </Box>
                <Box>
                  <FieldLabel>PDF</FieldLabel>
                  <Box sx={rowFieldColSx}>
                    {attachment ? (
                      <AttachmentChip name={attachment.name} height={40} onClick={() => {}} onRemove={() => setAttachment(null)} />
                    ) : (
                      <>
                        <Button
                          variant="soft" color="primary"
                          startIcon={<AttachFile sx={{ fontSize: 18 }} />}
                          onClick={() => fileInputRef.current?.click()}
                          sx={softBtnSx}
                        >
                          Upload PDF
                        </Button>
                        <input ref={fileInputRef} type="file" hidden accept=".pdf,.csv,.xlsx,.docx" onChange={handleFile} />
                      </>
                    )}
                  </Box>
                </Box>
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3, pt: 2, gap: 1, justifyContent: 'flex-end' }}>
            <Button onClick={onClose} variant="text" color="inherit"
              sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'none' }}>
              Cancel
            </Button>
            <Button onClick={() => setActiveStep(1)} variant="contained" color="primary"
              disabled={!step1Filled} sx={{ fontWeight: 600, textTransform: 'none', px: 3 }}>
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
            <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}
              sx={{ mb: plotAnalytes.length > 0 ? 0.75 : 1.5 }}>
              <Stack direction="row" flexWrap="wrap" gap={0.75}>
                {plotAnalytes.map((analyte) => (
                  <ActionChip key={analyte} label={analyte} onClick={() => handleAddResidue(analyte)} />
                ))}
              </Stack>
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
            {plotAnalytes.length > 0 && (
              <Typography sx={{ fontSize: '0.6875rem', color: 'text.disabled', mb: residues.length > 0 ? 1.5 : 0 }}>
                Based on your applied treatments. Click an analyte to add a result, even more than once.
              </Typography>
            )}
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
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3, pt: 2, gap: 1, justifyContent: 'flex-end' }}>
            <Button onClick={onClose} variant="text" color="inherit"
              sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'none' }}>
              Cancel
            </Button>
            <Button onClick={handleSaveReport} variant="contained" color="primary"
              sx={{ fontWeight: 600, textTransform: 'none', px: 3 }}>
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
