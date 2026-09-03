import React, { useState } from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { AttachFile, InboxOutlined, ErrorOutline, CheckCircle } from '@mui/icons-material';
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
  snippet: string;
  file: string;
  received: string;
  to: string;
  unread?: boolean;
}

type Folder = 'inbox' | 'matching' | 'filed';

export function InboxPage() {
  const navigate = useNavigate();
  const samples = useLabSamples().filter((s) => !s.isDraft);
  const plots = usePlots();
  const [folder, setFolder] = useState<Folder>('inbox');

  const byAddress = new Map<string, LabSampleData>();
  samples.forEach((s) => byAddress.set(getReturnAddress(s), s));
  const addrOf = (i: number) => (samples[i] ? getReturnAddress(samples[i]) : `x${i}@reports.resiyou.com`);
  const plotName = (plotId: string) => plots.find((p) => p.id === plotId)?.plotName ?? '';

  const mails: Mail[] = [
    { id: 'm1', fromName: 'Eurofins — Food Testing Lisboa', from: 'no-reply@ftib.eurofins.com', subject: 'Relatório de ensaio · AR-26-XV-025103-01', snippet: 'Please find attached the analytical report for your sample. Kind regards, …', file: 'AR-26-XV-025103-01.pdf', received: '09:14', to: addrOf(0), unread: true },
    { id: 'm2', fromName: 'Tentamus Almería', from: 'lab@lab-sl.com', subject: 'INFORME DE ENSAYO A6069815', snippet: 'Adjuntamos el informe de ensayo de residuos correspondiente a la muestra …', file: 'A6069815.pdf', received: '08:02', to: addrOf(1), unread: true },
    { id: 'm3', fromName: 'SGS Schweiz AG', from: 'reports@sgs.com', subject: 'Analytical report — 335 RA2 3.052', snippet: 'Dear customer, the report for the submitted sample is attached. …', file: '335-RA2-3.052.pdf', received: 'Yesterday', to: 'unknown-a@reports.resiyou.com', unread: true },
    { id: 'm4', fromName: 'Bureau Veritas', from: 'lab-reports@bureauveritas.com', subject: 'Residue analysis certificate', snippet: 'Certificate of analysis enclosed for your reference. …', file: 'BV-2026-1188.pdf', received: 'Yesterday', to: addrOf(2) },
    { id: 'm5', fromName: 'ALS Czech Republic', from: 'noreply@alsglobal.com', subject: 'Test report attached', snippet: 'The test report for your sample is now available, see attachment. …', file: 'ALS-26-4471.pdf', received: 'Mon', to: 'unknown-b@reports.resiyou.com' },
    { id: 'm6', fromName: 'Eurofins — Food Testing Lisboa', from: 'no-reply@ftib.eurofins.com', subject: 'Relatório de ensaio · 340 RA2 3.018', snippet: 'Segue em anexo o relatório de ensaio da amostra recebida. …', file: '340-RA2-3.018.pdf', received: 'Mon', to: addrOf(3) },
    { id: 'm7', fromName: 'Intertek', from: 'reports@intertek.com', subject: 'Certificate of Analysis', snippet: 'Please see attached the certificate of analysis. …', file: 'ITK-88213.pdf', received: 'Sun', to: addrOf(4) },
  ];

  const isFiled = (m: Mail) => byAddress.has(m.to);
  const counts = {
    inbox: mails.length,
    matching: mails.filter((m) => !isFiled(m)).length,
    filed: mails.filter(isFiled).length,
  };
  const shown = mails.filter((m) =>
    folder === 'inbox' ? true : folder === 'matching' ? !isFiled(m) : isFiled(m));

  const folders: { key: Folder; label: string; count: number; color?: string }[] = [
    { key: 'inbox', label: 'Inbox', count: counts.inbox },
    { key: 'matching', label: 'Needs matching', count: counts.matching, color: '#b91c1c' },
    { key: 'filed', label: 'Filed', count: counts.filed },
  ];

  return (
    <PageLayout variant="wide" title="Inbox">
      <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
        {/* Folder rail */}
        <Stack sx={{ width: 200, flexShrink: 0 }} spacing={0.5}>
          {folders.map((f) => {
            const active = folder === f.key;
            return (
              <Box key={f.key} onClick={() => setFolder(f.key)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1, borderRadius: '8px', cursor: 'pointer',
                  bgcolor: active ? 'primary.softBg' : 'transparent', color: active ? 'primary.main' : 'text.primary',
                  '&:hover': { bgcolor: active ? 'primary.softBg' : 'action.hover' },
                }}>
                {f.key === 'inbox' && <InboxOutlined sx={{ fontSize: 18 }} />}
                {f.key === 'matching' && <ErrorOutline sx={{ fontSize: 18, color: active ? 'primary.main' : '#b91c1c' }} />}
                {f.key === 'filed' && <CheckCircle sx={{ fontSize: 18, color: active ? 'primary.main' : '#15803d' }} />}
                <Typography sx={{ fontWeight: active ? 700 : 600, fontSize: '0.875rem', flex: 1 }}>{f.label}</Typography>
                <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: f.color ?? 'text.secondary' }}>{f.count}</Typography>
              </Box>
            );
          })}
        </Stack>

        {/* Message list */}
        <Box sx={{ flex: 1, minWidth: 0, border: '1px solid', borderColor: 'divider', borderRadius: '12px', overflow: 'hidden', bgcolor: 'background.paper' }}>
          {shown.map((m) => {
            const sample = byAddress.get(m.to) ?? null;
            return (
              <Box
                key={m.id}
                onClick={() => sample && navigate(`/plot/${sample.plotId}/samples/${sample.id}`)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.25,
                  borderBottom: '1px solid', borderColor: 'grey.100',
                  cursor: sample ? 'pointer' : 'default',
                  bgcolor: m.unread ? 'rgba(212,24,61,0.02)' : 'transparent',
                  '&:hover': { bgcolor: 'action.hover' },
                  '&:last-of-type': { borderBottom: 'none' },
                }}>
                {/* unread dot */}
                <Box sx={{ width: 8, flexShrink: 0 }}>
                  {m.unread && <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main' }} />}
                </Box>
                {/* sender */}
                <Typography noWrap sx={{ width: 210, flexShrink: 0, fontWeight: m.unread ? 700 : 500, fontSize: '0.875rem' }}>
                  {m.fromName}
                </Typography>
                {/* subject + snippet */}
                <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                  <Typography noWrap sx={{ fontSize: '0.875rem' }}>
                    <Box component="span" sx={{ fontWeight: m.unread ? 700 : 500 }}>{m.subject}</Box>
                    <Box component="span" sx={{ color: 'text.secondary' }}>{'  —  '}{m.snippet}</Box>
                  </Typography>
                </Box>
                {/* filed / needs-matching label */}
                {sample ? (
                  <Chip size="small" icon={<CheckCircle sx={{ fontSize: 14 }} />}
                    label={`Filed · ${sample.sampleName}${plotName(sample.plotId) ? ` · ${plotName(sample.plotId)}` : ''}`}
                    sx={{ flexShrink: 0, maxWidth: 260, bgcolor: '#e8f6ec', color: '#15803d', fontWeight: 600, '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' } }} />
                ) : (
                  <Chip size="small" icon={<ErrorOutline sx={{ fontSize: 14 }} />} label="Needs matching"
                    onClick={(e) => { e.stopPropagation(); toast.info('Pick a sample to file this report to.'); }}
                    sx={{ flexShrink: 0, bgcolor: '#fdeaea', color: '#b91c1c', fontWeight: 600, cursor: 'pointer' }} />
                )}
                {/* attachment + time */}
                <AttachFile sx={{ fontSize: 16, color: 'text.disabled', flexShrink: 0 }} />
                <Typography sx={{ width: 74, flexShrink: 0, textAlign: 'right', fontSize: '0.75rem', color: 'text.secondary' }}>
                  {m.received}
                </Typography>
              </Box>
            );
          })}
          {shown.length === 0 && (
            <Typography sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>Nothing here.</Typography>
          )}
        </Box>
      </Box>
    </PageLayout>
  );
}
