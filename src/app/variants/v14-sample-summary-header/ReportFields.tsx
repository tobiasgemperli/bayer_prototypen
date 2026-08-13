import React, { useRef, useState } from 'react';
import { Box, Stack, TextField, Typography } from '@mui/material';
import { UploadFile } from '@mui/icons-material';
import { FieldLabel, fieldSx } from '../../design-system/FormField';
import { AttachmentChip } from '../../design-system/AttachmentChip';
import { LabAttachment } from '../../data/lab-results-data';
import { LabAutocomplete } from './LabAutocomplete';

/** Click-to-upload / drag-and-drop zone — accepts multiple attachments at once. */
function AttachmentDropzone({ onFiles }: { onFiles: (files: FileList) => void }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) onFiles(e.dataTransfer.files);
  };

  return (
    <Box
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      sx={{
        border: '1px dashed', borderColor: dragOver ? 'primary.main' : 'divider',
        borderRadius: '8px', bgcolor: dragOver ? 'primary.softBg' : 'grey.50',
        py: 3, textAlign: 'center', cursor: 'pointer',
        transition: 'border-color 0.15s ease, background-color 0.15s ease',
      }}
    >
      <UploadFile sx={{ fontSize: 24, color: 'text.secondary', mb: 1 }} />
      <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'primary.main' }}>
        Upload a file
      </Typography>
      <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
        or drag and drop it here
      </Typography>
      <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled', mt: 0.75 }}>
        Supports PDF, PNG, JPG, and CSV • Up to 10 MB
      </Typography>
      <input
        ref={inputRef} type="file" hidden multiple accept=".pdf,.png,.jpg,.jpeg,.csv"
        onChange={(e) => {
          if (e.target.files?.length) onFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </Box>
  );
}

export interface ReportFieldsProps {
  laboratory: string;
  onLaboratoryChange: (next: string) => void;
  allLabs: string[];
  onAddLab: () => void;
  labReportId: string;
  onLabReportIdChange: (next: string) => void;
  attachments: LabAttachment[];
  onAddFiles: (files: FileList) => void;
  onRemoveAttachment: (id: string) => void;
}

/** Shared report-fields layout — Laboratory + Lab report ID on one row, then
 *  a full-width multi-file drop zone with the uploaded files listed
 *  below it. Single source used by both AddReportDialog (single-purpose
 *  report popup) and AddReportAndResultsDialog (list quick-add wizard) so
 *  they never drift apart. */
export function ReportFields({
  laboratory, onLaboratoryChange, allLabs, onAddLab,
  labReportId, onLabReportIdChange,
  attachments, onAddFiles, onRemoveAttachment,
}: ReportFieldsProps) {
  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
        <Box>
          <FieldLabel>Laboratory</FieldLabel>
          <LabAutocomplete
            value={laboratory}
            options={allLabs}
            onChange={onLaboratoryChange}
            onAddLab={onAddLab}
          />
        </Box>
        <Box>
          <FieldLabel>Lab report ID</FieldLabel>
          <TextField
            fullWidth size="small" placeholder="e.g. RPT-2024-001"
            value={labReportId} onChange={(e) => onLabReportIdChange(e.target.value)}
            sx={fieldSx}
          />
        </Box>
      </Box>

      <Box>
        <FieldLabel>Attachments</FieldLabel>
        <AttachmentDropzone onFiles={onAddFiles} />
        {attachments.length > 0 && (
          <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 1.5 }}>
            {attachments.map((a) => (
              <AttachmentChip key={a.id} name={a.name} onRemove={() => onRemoveAttachment(a.id)} />
            ))}
          </Stack>
        )}
      </Box>
    </Stack>
  );
}
