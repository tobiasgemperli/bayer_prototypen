import React, { useRef, useState } from 'react';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Typography,
  Alert, Box, Stack, CircularProgress,
} from '@mui/material';
import { Close as CloseIcon, AutoAwesome, Add, DeleteOutline } from '@mui/icons-material';
import { toast } from 'sonner';
import {
  newReportId, updateLabSample, getAnalytesForPlot, LABORATORY_OPTIONS,
  LabAttachment, LabReport, LabResidue, LabSampleData, newResidueId,
} from '../data/lab-results-data';
import { AddLaboratoryDialog } from './AddLaboratoryDialog';
import { ReportFields } from './ReportFields';
import { FieldLabel } from '../design-system/FormField';
import { TableCard } from '../design-system/TableCard';
import { OptionsTrigger } from '../design-system/OptionsTrigger';
import { ActionMenu, ActionItem } from '../design-system/ActionMenu';
import { LabResiduesGrid, LabResiduesGridHandle } from '../lab-shared/LabResiduesGrid';
import { PdfThumbnail } from '../lab-shared/PdfThumbnail';
import { loadDoc } from '../lab-shared/parsers/load-pdf';
import { route, ParseResult } from '../lab-shared/parsers';

const softBtnSx = { fontWeight: 600, borderRadius: '8px', px: 2, height: 36, textTransform: 'none' } as const;

// Friendly lab name per detected template, used to prefill the Lab field.
const TEMPLATE_LAB: Record<string, string> = {
  'aqua-informe-de-ensayo': 'Tentamus',
  'eurofins-relatorio-de-ensaio': 'Eurofins',
  'orangedata-analytical-report': 'orange-data',
};

/** Map parsed residues into editable grid rows. */
function toLabResidues(res: ParseResult, labReportId: string): LabResidue[] {
  return res.detected_residues.map((r) => ({
    id: newResidueId(),
    analyte: r.analyte,
    residueLevel: 'Residue',
    residueValue: r.result_mgkg != null ? String(r.result_mgkg) : '',
    methodLoq: r.loq_mgkg != null ? String(r.loq_mgkg) : '',
    methodLod: '',
    fromTreatment: false,
    labReportId,
    isDraft: true,
  }));
}

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
 * "Add a report" popup. On open it shows only the file upload zone. When a PDF
 * is uploaded it is parsed in-browser and the dialog becomes a two-pane view:
 * the report page thumbnail on the left, and on the right the Lab + Lab report
 * ID (prefilled) plus the residues found in the report in an editable grid.
 * Saving stores the report and (for a new report) its residues on the sample.
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

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [parseInfo, setParseInfo] = useState<{ lab: string; id: string; count: number; file: string } | null>(null);
  const [parseFailed, setParseFailed] = useState(false);
  const [residues, setResidues] = useState<LabResidue[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const gridRef = useRef<LabResiduesGridHandle>(null);

  const open = !!sample;
  // Lab + Lab report ID are derived from the report, so a file is all that's required.
  const fieldsValid = attachments.length > 0;
  const allLabs = [...LABORATORY_OPTIONS, ...customLabs];
  const plotAnalytes = sample ? getAnalytesForPlot(sample.plotId) : [];

  const twoPane = !!pdfFile;
  const parseDone = parseInfo !== null || parseFailed;      // gate the grid until rows are ready
  const matchedCount = residues.filter((r) => plotAnalytes.includes(r.analyte)).length;

  const handleConfirmNewLab = (name: string) => {
    if (!allLabs.includes(name)) setCustomLabs((prev) => [...prev, name]);
    setLaboratory(name);
    setAddLabOpen(false);
  };

  const handleAddFiles = (files: FileList) => {
    const start = Date.now();
    const arr = Array.from(files);
    setAttachments((prev) => [...prev, ...arr.map((f, i) => ({ id: `att-${start}-${i}`, name: f.name, size: f.size }))]);
    const pdf = arr.find((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    if (pdf) { setPdfFile(pdf); setParseFailed(false); void parseAndPrefill(pdf); }
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
      setResidues(toLabResidues(res, reportInternalId));
      setParseInfo({ lab, id, count, file: file.name });
      toast.success(`Read ${file.name}: ${lab || 'report'} ${id} · ${count} residue${count === 1 ? '' : 's'} detected`);
    } catch {
      setParseFailed(true);                                  // unrecognized — manual entry
      toast(`Couldn't auto-read ${file.name}; add the details and residues manually.`);
    }
  };

  const handleClearFile = () => {
    setAttachments([]); setPdfFile(null); setParseInfo(null); setParseFailed(false);
    setResidues([]); setSelected([]);
  };

  const gridHeight = Math.min(420, Math.max(140, residues.length * 52 + 56));

  const bulkActions: ActionItem[] = [{
    label: `Delete result${selected.length !== 1 ? 's' : ''}`,
    icon: <DeleteOutline fontSize="small" />, key: 'delete', color: 'error.main',
    onClick: () => { gridRef.current?.deleteRows(selected); setSelected([]); setMenuAnchor(null); },
  }];

  const handleSave = () => {
    setTouched(true);
    if (!sample || !fieldsValid) return;
    // Lab + Lab report ID are derived from the parsed report (no manual fields);
    // fall back to the file name so residues still link to a report.
    const trimmedId = labReportId.trim() || (pdfFile ? pdfFile.name.replace(/\.[^.]+$/, '') : reportInternalId);
    const newReport: LabReport = { id: reportInternalId, laboratory, labReportId: trimmedId, attachments };
    // Residues link to a report by its (human) labReportId — see LabResiduesGrid.
    const savedResidues = residues.map((r) => ({ ...r, labReportId: trimmedId, isDraft: false }));

    if (isEditing && editingReport) {
      const otherReports = (sample.reports ?? []).filter((r) => r.id !== editingReport.id);
      updateLabSample(sample.id, { reports: [...otherReports, newReport], isDraft: false });
      toast.success('Report updated');
    } else {
      updateLabSample(sample.id, {
        reports: [...(sample.reports ?? []), newReport],
        ...(savedResidues.length ? { residues: [...(sample.residues ?? []), ...savedResidues] } : {}),
        isDraft: false,
      });
      toast.success(savedResidues.length
        ? `Report added with ${savedResidues.length} result${savedResidues.length === 1 ? '' : 's'}`
        : 'Report added');
    }
    onClose();
  };

  if (!sample) return <Dialog open={false} onClose={onClose} />;

  const uploadZone = (
    <ReportFields
      laboratory={laboratory} onLaboratoryChange={setLaboratory}
      allLabs={allLabs} onAddLab={() => setAddLabOpen(true)}
      labReportId={labReportId} onLabReportIdChange={setLabReportId}
      attachments={attachments} onAddFiles={handleAddFiles} onRemoveAttachment={handleClearFile}
      showErrors={touched}
      uploadOnly
    />
  );

  const resultsPane = (
    <Box>
      {!parseDone ? (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'text.secondary' }}>
          <CircularProgress size={16} /><Typography variant="body2">Reading residues from the report…</Typography>
        </Stack>
      ) : (
        <>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '.03em', color: 'text.secondary' }}>
                {residues.length} analyte{residues.length === 1 ? '' : 's'} added
              </Typography>
              {plotAnalytes.length > 0 && (
                <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.25 }}>
                  {matchedCount} found in this plot’s treatments
                </Typography>
              )}
            </Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Button variant="soft" color="primary" startIcon={<Add sx={{ fontSize: 16 }} />}
                onClick={() => gridRef.current?.addRow()} sx={softBtnSx}>
                Add residue
              </Button>
              {selected.length > 0 && (
                <>
                  <OptionsTrigger onClick={(e) => setMenuAnchor(e.currentTarget)} hasSelection />
                  <ActionMenu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)} actions={bulkActions} />
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
                noRowsMessage="No residues found — add them manually."
              />
            </Box>
          </TableCard>
        </>
      )}
    </Box>
  );

  return (
    <>
    <Dialog open={open} onClose={onClose} fullWidth maxWidth={twoPane ? 'lg' : 'sm'}
      PaperProps={{ sx: { borderRadius: '12px', boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.12)' } }}>
      <DialogTitle sx={{ m: 0, px: 3, pt: 3, pb: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.125rem' }}>
          {isEditing ? 'Edit report' : 'Add a report'}
        </Typography>
        <IconButton onClick={onClose} sx={{ color: 'text.secondary', p: 0.5 }}><CloseIcon /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pt: 1, pb: 1 }}>
        {!twoPane && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Upload the report you received from the lab — we’ll read the lab, report ID and residues from it.
          </Typography>
        )}

        {!twoPane ? (
          uploadZone
        ) : (
          <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
            {/* Left: PDF thumbnail */}
            <Box sx={{ width: 300, flexShrink: 0 }}>
              <FieldLabel required>Report file</FieldLabel>
              {pdfFile && <PdfThumbnail file={pdfFile} width={300} />}
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 220 }}>{pdfFile?.name}</Typography>
                <Button size="small" color="inherit" onClick={handleClearFile}
                  sx={{ textTransform: 'none', minWidth: 0, color: 'text.secondary' }}>Replace</Button>
              </Stack>
              {parseInfo && (
                <Alert icon={<AutoAwesome fontSize="small" />} severity="success"
                  sx={{ mt: 1.5, borderRadius: '8px', '& .MuiAlert-message': { fontSize: '0.75rem' } }}>
                  Detected <strong>{parseInfo.lab || 'report'}</strong>
                  {parseInfo.id ? <> {parseInfo.id}</> : ''}
                </Alert>
              )}
            </Box>
            {/* Right: residues found in the report */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              {resultsPane}
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, pt: 2, gap: 1, justifyContent: 'flex-end' }}>
        <Button onClick={onClose} variant="text" color="inherit"
          sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'none', px: 2, height: 36 }}>
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" color="primary"
          sx={{ fontWeight: 600, textTransform: 'none', px: 2, height: 36, borderRadius: '8px' }}>
          {isEditing ? 'Save' : 'Analyse'}
        </Button>
      </DialogActions>
    </Dialog>

    <AddLaboratoryDialog open={addLabOpen} onClose={() => setAddLabOpen(false)} onConfirm={handleConfirmNewLab} />
    </>
  );
}
