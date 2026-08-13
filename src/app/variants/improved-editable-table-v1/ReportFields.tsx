import React, { useRef, useState } from 'react';
import { Box, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { InfoOutlined, UploadFile } from '@mui/icons-material';
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
      <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
        <Box component="span" sx={{ fontWeight: 600, color: 'primary.main' }}>Click to upload</Box>
        {' '}or drag and drop
      </Typography>
      <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled', mt: 0.75 }}>
        Supports PDF, PNG, JPG, and CSV · Up to 10 MB
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
  /** Reveal required-field errors — set once the user has tried to submit,
   *  same touched/showErrors convention as SampleFormDialog. */
  showErrors?: boolean;
}

/** Shared report-fields layout — Lab + Lab report ID on one row, then
 *  a full-width multi-file drop zone with the uploaded files listed
 *  below it. Single source used by both AddReportDialog (single-purpose
 *  report popup) and AddReportAndResultsDialog (list quick-add wizard) so
 *  they never drift apart. */
export function ReportFields({
  laboratory, onLaboratoryChange, allLabs, onAddLab,
  labReportId, onLabReportIdChange,
  attachments, onAddFiles, onRemoveAttachment,
  showErrors,
}: ReportFieldsProps) {
  const labMissing = !laboratory.trim();
  const idMissing = !labReportId.trim();
  const filesMissing = attachments.length === 0;

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
        <Box>
          <FieldLabel required>Lab</FieldLabel>
          <LabAutocomplete
            value={laboratory}
            options={allLabs}
            onChange={onLaboratoryChange}
            onAddLab={onAddLab}
          />
          {showErrors && labMissing && (
            <Typography sx={{ mt: 0.5, color: 'error.main', fontSize: '0.75rem' }}>
              Lab is required
            </Typography>
          )}
        </Box>
        <Box>
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.5 }}>
            <FieldLabel required sx={{ mb: 0 }}>Lab report ID</FieldLabel>
            <Tooltip
              arrow placement="top" enterDelay={150}
              title="Find this near the top of the lab report. It may be labelled Report number, Reference number, or similar."
            >
              <InfoOutlined sx={{ fontSize: 14, color: 'text.disabled', cursor: 'help' }} />
            </Tooltip>
          </Stack>
          <TextField
            fullWidth size="small" placeholder="e.g. RPT-2024-001"
            value={labReportId} onChange={(e) => onLabReportIdChange(e.target.value)}
            error={showErrors && idMissing}
            helperText={showErrors && idMissing ? 'Lab report ID is required' : undefined}
            sx={fieldSx}
          />
        </Box>
      </Box>

      <Box>
        <FieldLabel required>Report files</FieldLabel>
        <AttachmentDropzone onFiles={onAddFiles} />
        {showErrors && filesMissing && (
          <Typography sx={{ mt: 0.5, color: 'error.main', fontSize: '0.75rem' }}>
            At least one report file is required
          </Typography>
        )}
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
