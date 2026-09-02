import React, { useState } from 'react';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Typography,
  Alert,
} from '@mui/material';
import { Close as CloseIcon, AutoAwesome } from '@mui/icons-material';
import { toast } from 'sonner';
import {
  newReportId, updateLabSample, LABORATORY_OPTIONS,
  LabAttachment, LabReport, LabSampleData,
} from '../data/lab-results-data';
import { AddLaboratoryDialog } from './AddLaboratoryDialog';
import { ReportFields } from './ReportFields';
import { loadDoc } from '../lab-shared/parsers/load-pdf';
import { route } from '../lab-shared/parsers';

// Friendly lab name per detected template, used to prefill the Lab field.
const TEMPLATE_LAB: Record<string, string> = {
  'aqua-informe-de-ensayo': 'Tentamus',
  'eurofins-relatorio-de-ensaio': 'Eurofins',
  'orangedata-analytical-report': 'orange-data',
};

export interface AddReportDialogProps {
  /** The sample this report is being added to. Dialog is open whenever this
   *  is non-null. Pass a fresh key from the caller so re-opening the dialog
   *  (even for the same sample) starts clean. */
  sample: LabSampleData | null;
  /** When set, edits this existing report instead of creating a new one.
   *  Must belong to `sample.reports`. */
  editingReport?: LabReport | null;
  onClose: () => void;
}

/**
 * Single-purpose "Add report" popup — Laboratory + Lab report ID + file
 * attachment(s) only. Reports and results are independent actions: this dialog never
 * touches residues. Triggered from the Reports card's "Add report" button
 * and a report line's Edit icon (via `editingReport`) on the sample page.
 */
export function AddReportDialog({ sample, editingReport, onClose }: AddReportDialogProps) {
  const isEditing = !!editingReport;

  const [laboratory, setLaboratory] = useState(editingReport?.laboratory ?? sample?.laboratory ?? '');
  const [customLabs, setCustomLabs] = useState<string[]>([]);
  const [addLabOpen, setAddLabOpen] = useState(false);
  const [labReportId, setLabReportId] = useState(editingReport?.labReportId ?? '');
  const [attachments, setAttachments] = useState<LabAttachment[]>(editingReport?.attachments ?? []);
  const [reportInternalId] = useState(() => editingReport?.id ?? newReportId());
  const [touched, setTouched] = useState(false);
  const [parseInfo, setParseInfo] = useState<{ lab: string; id: string; count: number; file: string } | null>(null);

  const open = !!sample;
  const fieldsValid = !!laboratory.trim() && labReportId.trim() !== '' && attachments.length > 0;
  const allLabs = [...LABORATORY_OPTIONS, ...customLabs];

  const handleConfirmNewLab = (name: string) => {
    if (!allLabs.includes(name)) setCustomLabs((prev) => [...prev, name]);
    setLaboratory(name);
    setAddLabOpen(false);
  };

  const handleAddFiles = (files: FileList) => {
    const start = Date.now();
    const arr = Array.from(files);
    const added: LabAttachment[] = arr.map((f, i) => ({
      id: `att-${start}-${i}`, name: f.name, size: f.size,
    }));
    setAttachments((prev) => [...prev, ...added]);

    // If a PDF was uploaded, parse it in-browser and prefill the report fields.
    const pdf = arr.find((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    if (pdf) void parseAndPrefill(pdf);
  };

  const parseAndPrefill = async (file: File) => {
    try {
      const res = route(await loadDoc(await file.arrayBuffer()));
      const lab = TEMPLATE_LAB[res.template] ?? '';
      const id = String(res.header.sample_id ?? res.header.report_number ?? '');
      const count = res._validation.detected_count;
      if (lab && !laboratory.trim()) {
        setCustomLabs((prev) => (allLabs.includes(lab) || prev.includes(lab) ? prev : [...prev, lab]));
        setLaboratory(lab);
      }
      if (id && !labReportId.trim()) setLabReportId(id);
      setParseInfo({ lab, id, count, file: file.name });
      toast.success(`Read ${file.name}: ${lab || 'report'} ${id} · ${count} residue${count === 1 ? '' : 's'} detected`);
    } catch {
      // Unrecognized template — leave the fields for manual entry.
      toast(`Couldn't auto-read ${file.name}; please enter the details manually.`);
    }
  };
  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSave = () => {
    setTouched(true);
    if (!sample || !fieldsValid) return;
    const trimmedId = labReportId.trim();
    const newReport: LabReport = {
      id: reportInternalId, laboratory, labReportId: trimmedId, attachments,
    };

    if (isEditing && editingReport) {
      const otherReports = (sample.reports ?? []).filter((r) => r.id !== editingReport.id);
      updateLabSample(sample.id, { reports: [...otherReports, newReport], isDraft: false });
      toast.success('Report updated');
    } else {
      updateLabSample(sample.id, { reports: [...(sample.reports ?? []), newReport], isDraft: false });
      toast.success('Report added');
    }
    onClose();
  };

  if (!sample) {
    return <Dialog open={false} onClose={onClose} />;
  }

  return (
    <>
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm"
      PaperProps={{ sx: { borderRadius: '12px', boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.12)' } }}>
      <DialogTitle sx={{ m: 0, px: 3, pt: 3, pb: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.125rem' }}>
          {isEditing ? 'Edit report' : 'Add a report'}
        </Typography>
        <IconButton onClick={onClose} sx={{ color: 'text.secondary', p: 0.5 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pt: 1, pb: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {isEditing
            ? 'Update the report details or replace the files.'
            : 'Enter the report details and upload the files you received from the lab.'}
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
        {parseInfo && (
          <Alert
            icon={<AutoAwesome fontSize="small" />}
            severity="success"
            sx={{ mt: 1.5, borderRadius: '8px', '& .MuiAlert-message': { fontSize: '0.8125rem' } }}
          >
            Detected <strong>{parseInfo.lab || 'report'}</strong>
            {parseInfo.id ? <> report <strong>{parseInfo.id}</strong></> : ''} · {parseInfo.count} residue
            {parseInfo.count === 1 ? '' : 's'} in {parseInfo.file}. Empty fields prefilled — parsed in your browser, no upload.
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, pt: 2, gap: 1, justifyContent: 'flex-end' }}>
        <Button onClick={onClose} variant="text" color="inherit"
          sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'none', px: 2, height: 36 }}>
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" color="primary"
          sx={{ fontWeight: 600, textTransform: 'none', px: 2, height: 36, borderRadius: '8px' }}>
          {isEditing ? 'Save' : 'Add report'}
        </Button>
      </DialogActions>
    </Dialog>

    <AddLaboratoryDialog
      open={addLabOpen}
      onClose={() => setAddLabOpen(false)}
      onConfirm={handleConfirmNewLab}
    />
    </>
  );
}
