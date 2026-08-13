import React, { useRef } from 'react';
import {
  Box, Typography, TextField, Stack, Link, IconButton, Button,
} from '@mui/material';
import { AttachFile, InsertDriveFile, DeleteOutline } from '@mui/icons-material';
import { toast } from 'sonner';
import { LabAttachment } from '../data/lab-results-data';

export interface LabReportFormData {
  laboratory: string;
  labReportId: string;
  attachments: LabAttachment[];
}

interface LabReportFormProps {
  value: LabReportFormData;
  onChange: (patch: Partial<LabReportFormData>) => void;
  /** Compact mode tightens spacing — useful inside cards/stacked layouts. */
  dense?: boolean;
  /** Hide the field labels (use when card header already says "Report N"). */
  hideHeading?: boolean;
}

/**
 * Shared lab report form: Laboratory + Lab report ID + Attachments.
 * Used by baseline LabReportTab, v2 ReportEditor, v3 ReportCard.
 */
export function LabReportForm({ value, onChange, dense = false, hideHeading = false }: LabReportFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAttach = () => fileInputRef.current?.click();
  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const newAtt: LabAttachment[] = files.map((f, i) => ({
      id: `att-${Date.now()}-${i}`, name: f.name, size: f.size,
    }));
    onChange({ attachments: [...value.attachments, ...newAtt] });
    toast.success('File uploaded successfully');
    e.target.value = '';
  };
  const removeAttachment = (id: string) => {
    onChange({ attachments: value.attachments.filter(a => a.id !== id) });
  };

  return (
    <Box sx={{ display: 'flex', gap: dense ? 4 : 6 }}>
      <Box sx={{ flex: 1, maxWidth: dense ? 460 : 520 }}>
        {!hideHeading && (
          <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', mb: 2 }}>Lab Report</Typography>
        )}
        <Stack spacing={dense ? 2 : 2.5}>
          <Box>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mb: 0.5 }}>Laboratory</Typography>
            <TextField
              size="small" fullWidth placeholder="Type here"
              value={value.laboratory}
              onChange={(e) => onChange({ laboratory: e.target.value })}
            />
          </Box>
          <Box>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mb: 0.5 }}>Lab report ID</Typography>
            <TextField
              size="small" fullWidth placeholder="Type here"
              value={value.labReportId}
              onChange={(e) => onChange({ labReportId: e.target.value })}
            />
          </Box>
        </Stack>
      </Box>

      <Box sx={{ flex: 1 }}>
        {!hideHeading && (
          <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', mb: 1.5 }}>Lab Report Attachments</Typography>
        )}
        {hideHeading && (
          <Typography sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary', textTransform: 'uppercase', mb: 1 }}>
            Attachments
          </Typography>
        )}
        {!hideHeading && (
          <Box component="ul" sx={{ pl: 2, m: 0, mb: 2, '& li': { fontSize: '0.8125rem', color: 'text.secondary' } }}>
            <li>Files are accepted in the following format - .pdf, .csv, .xlsx, .docx</li>
            <li>Maximum file size accepted - 5MB</li>
          </Box>
        )}
        <Button
          variant="soft" color="primary" startIcon={<AttachFile />} onClick={handleAttach}
          size={dense ? 'small' : 'medium'}
          sx={{ fontWeight: 600, textTransform: 'none', borderRadius: '8px', mb: hideHeading ? 1 : 2 }}
        >Attach files</Button>
        <input
          ref={fileInputRef} type="file" multiple hidden
          accept=".pdf,.csv,.xlsx,.docx"
          onChange={handleFiles}
        />
        <Stack spacing={0}>
          {value.attachments.length === 0 && hideHeading && (
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
              .pdf, .csv, .xlsx, .docx · max 5MB
            </Typography>
          )}
          {value.attachments.map(a => (
            <Box key={a.id} sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderBottom: '1px solid', borderColor: 'divider', py: dense ? 0.5 : 1,
            }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <InsertDriveFile fontSize="small" sx={{ color: 'text.secondary', fontSize: dense ? 16 : 20 }} />
                <Link
                  component="button"
                  sx={{ fontWeight: 600, color: 'primary.main', fontSize: dense ? '0.8125rem' : '0.875rem' }}
                  onClick={() => toast.info(`Open ${a.name}`)}
                >{a.name}</Link>
              </Stack>
              <IconButton size="small" onClick={() => removeAttachment(a.id)}>
                <DeleteOutline fontSize="small" sx={{ color: 'text.secondary', fontSize: dense ? 16 : 20 }} />
              </IconButton>
            </Box>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}
