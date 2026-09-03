import React, { useMemo } from 'react';
import { Box, Chip, Stack, Typography, Button } from '@mui/material';
import { AttachFile, CheckCircle, ErrorOutline, OpenInNew } from '@mui/icons-material';
import { toast } from 'sonner';
import { useLabSamples, getReturnAddress, LabSampleData } from '../data/lab-results-data';
import { usePlots } from '../data/plots-data';
import { useNavigate } from '../variants/variant-context';
import { PageLayout } from '../design-system/PageLayout';

interface Mail {
  id: string;
  fromName: string;
  from: string;
  subject: string;
  file: string;
  received: string;
  to: string;
}

/**
 * Inbox — incoming lab emails. A report a lab emails to a sample's return
 * address (see getReturnAddress) lands here and is auto-filed to that sample;
 * an email to an unrecognized address is flagged for manual matching. Mock
 * data for the prototype; addresses are wired to real samples so matching works.
 */
export function InboxPage() {
  const navigate = useNavigate();
  const samples = useLabSamples().filter((s) => !s.isDraft);
  const plots = usePlots();

  const byAddress = useMemo(() => {
    const m = new Map<string, LabSampleData>();
    samples.forEach((s) => m.set(getReturnAddress(s), s));
    return m;
  }, [samples]);

  const targets = samples.slice(0, 3);
  const mails: Mail[] = [
    {
      id: 'm1', fromName: 'Eurofins — Food Testing Lisboa', from: 'no-reply@ftib.eurofins.com',
      subject: 'Relatório de ensaio · AR-26-XV-025103-01', file: 'AR-26-XV-025103-01.pdf',
      received: '2 hours ago', to: targets[0] ? getReturnAddress(targets[0]) : 'x@reports.resiyou.com',
    },
    {
      id: 'm2', fromName: 'Tentamus Almería', from: 'lab@lab-sl.com',
      subject: 'INFORME DE ENSAYO A6069815', file: 'A6069815.pdf',
      received: 'Yesterday', to: targets[1] ? getReturnAddress(targets[1]) : 'y@reports.resiyou.com',
    },
    {
      id: 'm3', fromName: 'SGS Schweiz AG', from: 'reports@sgs.com',
      subject: 'Analytical report — 335 RA2 3.052', file: '335-RA2-3.052.pdf',
      received: '2 days ago', to: 'unknown-sample@reports.resiyou.com',
    },
  ];

  const plotName = (plotId: string) => plots.find((p) => p.id === plotId)?.plotName ?? '';

  return (
    <PageLayout variant="wide" title="Inbox">
      <Typography color="text.secondary" variant="body2" sx={{ mb: 3, maxWidth: 640 }}>
        Reports labs email to a sample’s return address arrive here and are filed to that sample automatically.
        Anything we can’t match is flagged for you to place manually.
      </Typography>

      <Stack spacing={1.5} sx={{ maxWidth: 900 }}>
        {mails.map((mail) => {
          const sample = byAddress.get(mail.to) ?? null;
          return (
            <Box
              key={mail.id}
              onClick={() => sample && navigate(`/plot/${sample.plotId}/samples/${sample.id}`)}
              sx={{
                border: '1px solid', borderColor: 'divider', borderRadius: '12px', p: 2,
                display: 'flex', gap: 2, alignItems: 'flex-start',
                cursor: sample ? 'pointer' : 'default',
                '&:hover': sample ? { borderColor: 'primary.main', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' } : {},
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                  <Typography sx={{ fontWeight: 700 }} noWrap>{mail.fromName}</Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>&lt;{mail.from}&gt;</Typography>
                </Stack>
                <Typography variant="body2" sx={{ mb: 1 }} noWrap>{mail.subject}</Typography>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Chip icon={<AttachFile sx={{ fontSize: 15 }} />} label={mail.file} size="small"
                    variant="outlined" sx={{ borderRadius: '6px' }} />
                  <Typography variant="caption" color="text.secondary">to {mail.to}</Typography>
                </Stack>
              </Box>

              <Stack spacing={1} alignItems="flex-end" sx={{ flexShrink: 0 }}>
                <Typography variant="caption" color="text.secondary">{mail.received}</Typography>
                {sample ? (
                  <Chip
                    icon={<CheckCircle sx={{ fontSize: 16 }} />}
                    label={`Filed to ${sample.sampleName}${plotName(sample.plotId) ? ` · ${plotName(sample.plotId)}` : ''}`}
                    size="small"
                    sx={{ bgcolor: '#e8f6ec', color: '#15803d', fontWeight: 600 }}
                  />
                ) : (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip icon={<ErrorOutline sx={{ fontSize: 16 }} />} label="No matching sample" size="small"
                      sx={{ bgcolor: '#fdeaea', color: '#b91c1c', fontWeight: 600 }} />
                    <Button size="small" variant="soft" color="primary"
                      onClick={(e) => { e.stopPropagation(); toast.info('Pick a sample to file this report to.'); }}
                      sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px', height: 30 }}>
                      Match
                    </Button>
                  </Stack>
                )}
                {sample && (
                  <Button size="small" color="inherit" endIcon={<OpenInNew sx={{ fontSize: 15 }} />}
                    onClick={(e) => { e.stopPropagation(); navigate(`/plot/${sample.plotId}/samples/${sample.id}`); }}
                    sx={{ textTransform: 'none', color: 'text.secondary', minWidth: 0 }}>
                    Open sample
                  </Button>
                )}
              </Stack>
            </Box>
          );
        })}
      </Stack>
    </PageLayout>
  );
}
