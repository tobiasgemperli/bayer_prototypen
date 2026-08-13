import React, { useRef, useState } from 'react';
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton,
  Step, StepLabel, Stepper, Stack, TextField, Typography,
} from '@mui/material';
import { Add, AttachFile, CheckRounded, Close as CloseIcon } from '@mui/icons-material';
import { toast } from 'sonner';
import {
  getAnalytesForPlot, newReportId, updateLabSample, LABS_WITH_API_CONNECTION,
  LabAttachment, LabReport, LabResidue, LabSampleData,
} from '../../data/lab-results-data';
import { FieldLabel, fieldSx } from '../../design-system/FormField';
import { AttachmentChip } from '../../design-system/AttachmentChip';
import { ActionChip, ApiConnectionChip } from '../../design-system/Chips';
import { LabResiduesGrid, LabResiduesGridHandle, newResidueRow } from '../../lab-shared/LabResiduesGrid';

const softBtnSx = {
  fontWeight: 600, borderRadius: '8px', px: 2, height: 40, textTransform: 'none',
} as const;

const rowFieldColSx = { height: 40, display: 'flex', alignItems: 'center' } as const;

const STEP_LABELS = ['Report', 'Results'];

export interface AddReportResultsDialogProps {
  /** The sample this report/results are being added to. Dialog is open
   *  whenever this is non-null. Pass a fresh key from the caller so
   *  re-opening the dialog (even for the same sample) starts clean. */
  sample: LabSampleData | null;
  onClose: () => void;
}

/**
 * 3-step quick-add popup: Report (ID + PDF) → Results (recommended chips +
 * grid) → success screen with Close / Add another report. Triggered from
 * the samples table's "Add report & results" row action and from
 * SampleCreatedDialog's same-named button — both open this instead of
 * navigating to the full SampleReportPage. Saves at the end of Step 2
 * (merging into the sample's existing reports/results, not overwriting
 * them — this can run against a sample that already has data).
 */
export function AddReportResultsDialog({ sample, onClose }: AddReportResultsDialogProps) {
  const [activeStep, setActiveStep] = useState(0); // 0=Report, 1=Results, 2=Success
  const [labReportId, setLabReportId] = useState('');
  const [attachment, setAttachment] = useState<LabAttachment | null>(null);
  const [residues, setResidues] = useState<LabResidue[]>([]);
  const [reportInternalId, setReportInternalId] = useState(() => newReportId());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<LabResiduesGridHandle>(null);

  const open = !!sample;
  const isApiLab = !!sample?.laboratory && LABS_WITH_API_CONNECTION.has(sample.laboratory);
  const plotAnalytes = sample ? getAnalytesForPlot(sample.plotId) : [];
  const step1Filled = labReportId.trim() !== '' || attachment !== null;

  const resetCycle = () => {
    setActiveStep(0);
    setLabReportId('');
    setAttachment(null);
    setResidues([]);
    setReportInternalId(newReportId());
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachment({ id: `att-${Date.now()}`, name: file.name, size: file.size });
    e.target.value = '';
  };

  const handleAddResidue = (analyte?: string) => {
    if (residues.length === 0) {
      setResidues([{ ...newResidueRow(), analyte: analyte ?? '' }]);
    } else {
      gridRef.current?.addRow(analyte);
    }
  };

  const handleSaveReport = () => {
    if (!sample) return;
    const trimmedId = labReportId.trim();
    const newReport: LabReport = {
      id: reportInternalId, laboratory: '', labReportId: trimmedId,
      attachments: attachment ? [attachment] : [],
    };
    const taggedResidues = residues.map((r) => ({ ...r, labReportId: trimmedId }));
    updateLabSample(sample.id, {
      reports: [...(sample.reports ?? []), newReport],
      residues: [...(sample.residues ?? []), ...taggedResidues],
      isDraft: false,
    });
    toast.success('Report added');
    setActiveStep(2);
  };

  const handleAddAnother = () => resetCycle();

  const gridHeight = residues.length > 0
    ? Math.min(500, Math.max(200, residues.length * 52 + 56))
    : 120;

  if (!sample) {
    return <Dialog open={false} onClose={onClose} />;
  }

  // API-connected lab — results import automatically, nothing to add manually.
  if (isApiLab) {
    return (
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs"
        PaperProps={{ sx: { borderRadius: '12px', position: 'relative' } }}>
        <IconButton onClick={onClose}
          sx={{ position: 'absolute', top: 8, right: 8, color: 'text.secondary', p: 0.5 }}>
          <CloseIcon />
        </IconButton>
        <DialogContent sx={{ px: 4, pt: 4, pb: 4, textAlign: 'center' }}>
          <ApiConnectionChip />
          <Typography sx={{ color: 'text.disabled', fontSize: '0.875rem', mt: 2, mb: 3 }}>
            Results for this sample will be imported automatically from {sample.laboratory} once the lab submits them.
          </Typography>
          <Button variant="text" color="primary" onClick={onClose}
            sx={{ fontWeight: 600, textTransform: 'none' }}>
            Close
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm"
      PaperProps={{ sx: { borderRadius: '12px', boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.12)' } }}>
      <DialogTitle sx={{ m: 0, px: 3, pt: 3, pb: activeStep < 2 ? 1.5 : 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.125rem' }}>
          Add report &amp; results
        </Typography>
        <IconButton onClick={onClose} sx={{ color: 'text.secondary', p: 0.5 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {activeStep < 2 && (
        <Box sx={{ px: 3, pb: 1 }}>
          <Stepper activeStep={activeStep} alternativeLabel sx={{ '& .MuiStepLabel-label': { fontSize: '0.75rem' } }}>
            {STEP_LABELS.map((label) => (
              <Step key={label}><StepLabel>{label}</StepLabel></Step>
            ))}
          </Stepper>
        </Box>
      )}

      {activeStep === 0 && (
        <>
          <DialogContent sx={{ px: 3, pt: 1, pb: 1 }}>
            <Stack direction="row" spacing={2}>
              <Box sx={{ flex: 1 }}>
                <FieldLabel>Lab report ID</FieldLabel>
                <TextField
                  fullWidth size="small" autoFocus placeholder="e.g. RPT-2024-001"
                  value={labReportId} onChange={(e) => setLabReportId(e.target.value)}
                  sx={fieldSx}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <FieldLabel>PDF</FieldLabel>
                <Box sx={rowFieldColSx}>
                  {attachment ? (
                    <AttachmentChip name={attachment.name} onClick={() => {}} onRemove={() => setAttachment(null)} />
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
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3, pt: 2, gap: 1 }}>
            <Button onClick={onClose} variant="text" color="inherit"
              sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'none', mr: 'auto' }}>
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
            {plotAnalytes.length > 0 && (
              <Box sx={{ mb: residues.length > 0 ? 1.5 : 0 }}>
                <Stack direction="row" flexWrap="wrap" gap={0.75}>
                  {plotAnalytes.map((analyte) => (
                    <ActionChip key={analyte} label={analyte} onClick={() => handleAddResidue(analyte)} />
                  ))}
                </Stack>
                <Typography sx={{ fontSize: '0.6875rem', color: 'text.disabled', mt: 0.75 }}>
                  Based on your applied treatments — click to add a result, even more than once
                </Typography>
              </Box>
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
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3, pt: 2, gap: 1 }}>
            <Button onClick={() => setActiveStep(0)} variant="text" color="primary"
              sx={{ fontWeight: 600, textTransform: 'none', mr: 'auto' }}>
              Back
            </Button>
            <Button onClick={handleSaveReport} variant="contained" color="primary"
              sx={{ fontWeight: 600, textTransform: 'none', px: 3 }}>
              Save
            </Button>
          </DialogActions>
        </>
      )}

      {activeStep === 2 && (
        <DialogContent sx={{ px: 4, pt: 2, pb: 4, textAlign: 'center' }}>
          <Box sx={{
            width: 64, height: 64, mx: 'auto', mb: 2, borderRadius: '50%',
            bgcolor: 'success.softBg', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Box sx={{
              width: 40, height: 40, borderRadius: '50%', bgcolor: 'success.light',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CheckRounded sx={{ fontSize: 26, color: '#FFFFFF' }} />
            </Box>
          </Box>

          <Typography variant="h6" component="div" sx={{ fontWeight: 700, fontSize: '1.25rem', lineHeight: 1.25, mb: 1 }}>
            Report added
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: '0.9375rem', lineHeight: 1.55, mb: 3 }}>
            {labReportId ? (
              <>
                <Box component="span" sx={{ fontWeight: 700, color: 'primary.main' }}>{labReportId}</Box>
                {' '}and its results were saved to this sample.
              </>
            ) : 'The report and its results were saved to this sample.'}
          </Typography>

          <Stack direction="row" spacing={1} justifyContent="center">
            <Button onClick={onClose} variant="text" color="primary"
              sx={{ fontWeight: 600, textTransform: 'none' }}>
              Close
            </Button>
            <Button onClick={handleAddAnother} variant="soft" color="primary"
              startIcon={<Add sx={{ fontSize: 16 }} />}
              sx={softBtnSx}>
              Add another report
            </Button>
          </Stack>
        </DialogContent>
      )}
    </Dialog>
  );
}
