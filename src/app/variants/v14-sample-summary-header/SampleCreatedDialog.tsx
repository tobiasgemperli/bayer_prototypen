import React from 'react';
import {
  Box, Button, Dialog, DialogContent, IconButton, Stack, Typography,
} from '@mui/material';
import { Add, CheckRounded, Close as CloseIcon, OpenInNew } from '@mui/icons-material';

export interface SampleCreatedDialogProps {
  open: boolean;
  onClose: () => void;
  onOpenSheet: () => void;
  onAddReportAndResults: () => void;
  labHasApiConnection?: boolean;
  labName?: string;
}

function StepItem({ number, title, description }: {
  number: number; title: string; description: React.ReactNode;
}) {
  return (
    <Box sx={{ textAlign: 'center' }}>
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
        <Box
          sx={{
            width: 24, height: 24, flexShrink: 0, borderRadius: '50%',
            bgcolor: 'primary.main', color: '#FFFFFF',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: '0.9375rem', lineHeight: 1,
          }}
        >
          {number}
        </Box>
        <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem', lineHeight: 1.3 }}>
          {title}
        </Typography>
      </Stack>
      <Typography sx={{ color: 'text.secondary', fontSize: '0.8125rem', lineHeight: 1.5, mt: 0.5 }}>
        {description}
      </Typography>
    </Box>
  );
}

export function SampleCreatedDialog({
  open, onClose, onOpenSheet, onAddReportAndResults, labHasApiConnection = false, labName,
}: SampleCreatedDialogProps) {
  const labLabel = labName || 'the laboratory';
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth={false}
      PaperProps={{
        sx: {
          width: '666px', maxWidth: '666px',
          borderRadius: '12px',
          boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.12)',
          position: 'relative',
        },
      }}
    >
      <IconButton
        aria-label="close"
        onClick={onClose}
        sx={{ position: 'absolute', top: 8, right: 8, color: (t) => t.palette.grey[500], p: 0.5 }}
      >
        <CloseIcon />
      </IconButton>

      <DialogContent sx={{ px: 4, pt: 4, pb: 4, textAlign: 'center' }}>
        {/* Icon circle — this dialog always signals a successful outcome
            (sample created), so both the cloud and the checkmark stay
            success green here, regardless of API connection. */}
        <Box
          sx={{
            width: 64, height: 64, mx: 'auto', mb: 2, borderRadius: '50%',
            bgcolor: 'success.softBg',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Box
            sx={{
              width: 40, height: 40, borderRadius: '50%',
              bgcolor: 'success.light',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {labHasApiConnection ? (
              <Box
                component="span"
                className="material-symbols-outlined"
                sx={{
                  fontSize: 22, color: '#FFFFFF', lineHeight: 1,
                  fontVariationSettings: '"FILL" 1, "wght" 500, "GRAD" 0, "opsz" 24',
                }}
              >
                cloud
              </Box>
            ) : (
              <CheckRounded sx={{ fontSize: 26, color: '#FFFFFF' }} />
            )}
          </Box>
        </Box>

        {/* Title */}
        <Typography variant="h6" component="div"
          sx={{ fontWeight: 700, fontSize: '1.25rem', lineHeight: 1.25, mb: 3 }}>
          {labHasApiConnection ? 'One step left before we take over' : 'Sample created'}
        </Typography>

        {/* Numbered steps — each step's circle+title row and description are centered */}
        <Stack spacing={3} sx={{ maxWidth: 440, mx: 'auto', mb: 3.5 }}>
          <StepItem
            number={1}
            title="Send in the sample sheet"
            description={<>Download the sample sheet and send it to {labLabel} together with your physical sample.</>}
          />
          {labHasApiConnection ? (
            <StepItem
              number={2}
              title="Results import automatically"
              description={<>{labLabel} is directly connected to ResiYou. Once they submit the results, they're imported automatically, and you'll be notified by email.</>}
            />
          ) : (
            <StepItem
              number={2}
              title="Add the report once it's back"
              description="As soon as you receive the results from the lab, come back here to add the report and its data to this sample."
            />
          )}
        </Stack>

        <Button
          onClick={onOpenSheet}
          variant="contained"
          color="primary"
          startIcon={<OpenInNew sx={{ fontSize: 18 }} />}
          sx={{ textTransform: 'none', fontWeight: 600, height: 40, borderRadius: '8px', px: 2.5 }}
        >
          Sample sheet
        </Button>

        <Box sx={{ mt: 1 }}>
          {labHasApiConnection ? (
            <Button
              onClick={onClose}
              variant="text"
              color="primary"
              sx={{ fontWeight: 600, textTransform: 'none', fontSize: '0.8125rem' }}
            >
              Close
            </Button>
          ) : (
            <Button
              onClick={onAddReportAndResults}
              variant="text"
              color="primary"
              startIcon={<Add sx={{ fontSize: 16 }} />}
              sx={{ fontWeight: 600, textTransform: 'none', fontSize: '0.8125rem' }}
            >
              Already have the results? Add report &amp; results
            </Button>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
