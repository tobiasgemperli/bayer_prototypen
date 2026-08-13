import React, { useState } from 'react';
import {
  Box, Typography, IconButton, Tooltip, Stack, Checkbox,
  Table, TableHead, TableBody, TableRow, TableCell,
} from '@mui/material';
import {
  MoreVert, ContentCopy, DeleteOutline, Download, Send,
  Add, Science, PictureAsPdf,
} from '@mui/icons-material';
import { TableCard } from '../../design-system/TableCard';
import { ActionMenu, ActionItem } from '../../design-system/ActionMenu';
import { RowActionButton } from '../../design-system/grid/grid-shared';
import { VariantPicker } from '../../main/VariantPicker';
import { toast } from 'sonner';

/**
 * Row action patterns — one descriptive paragraph + one example row per pattern.
 * No page chrome on purpose. Rows reuse the Plots table markup.
 */
export function TableActionsDemoPage() {
  return (
    <Box sx={{ height: '100vh', width: '100%', overflowY: 'auto', bgcolor: '#FFFFFF' }}>
      <Box sx={{
        width: '100%', px: 5, py: 6,
        display: 'flex', flexDirection: 'column', gap: 5,
      }}>
        <Pattern1 />
        <Pattern2 />
        <Pattern3 />
      </Box>
      <VariantPicker />
    </Box>
  );
}

/* ───────────────────────────────────────────────────────────────────────── */
/* One dummy row in Plots-style table markup. The trailing cell hosts the
   pattern's action affordances. */
function DemoRow({ actions }: { actions: React.ReactNode }) {
  return (
    <TableCard>
      <Table aria-label="demo">
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              <Checkbox />
            </TableCell>
            <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem' }}>Plot</TableCell>
            <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem' }}>Owner</TableCell>
            <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem' }}>Variety</TableCell>
            <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem' }}>Location</TableCell>
            <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem' }}>Last real treatment</TableCell>
            <TableCell sx={{ width: 0 }} />
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow hover sx={{ cursor: 'pointer' }}>
            <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
              <Checkbox />
            </TableCell>
            <TableCell sx={{ color: 'text.primary', fontSize: '0.875rem' }}>North Field A</TableCell>
            <TableCell sx={{ color: 'text.primary', fontSize: '0.875rem' }}>Maria Lopez</TableCell>
            <TableCell sx={{ color: 'text.primary', fontSize: '0.875rem' }}>Tigress</TableCell>
            <TableCell sx={{ color: 'text.primary', fontSize: '0.875rem' }}>Lat 47.31, Lon 8.42</TableCell>
            <TableCell sx={{ color: 'text.primary', fontSize: '0.875rem' }}>Mar 12, 2024</TableCell>
            <TableCell
              align="right"
              sx={{ whiteSpace: 'nowrap' }}
              onClick={(e) => e.stopPropagation()}
            >
              <Stack direction="row" alignItems="center" spacing={0.5} justifyContent="flex-end">
                {actions}
              </Stack>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableCard>
  );
}

function Description({ children }: { children: React.ReactNode }) {
  return (
    <Typography sx={{ color: 'text.secondary', fontSize: '0.9375rem', lineHeight: 1.6, mb: 1.5 }}>
      {children}
    </Typography>
  );
}

/* ── Pattern 1 — Many actions → single Options kebab ───────────────────── */
function Pattern1() {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const handle = (label: string) => toast.success(label);

  const actions: ActionItem[] = [
    { label: 'Add applied treatments to plots', icon: <Add fontSize="small" />, key: 'add', onClick: () => handle('Add applied treatments') },
    { label: 'Get residue forecast', icon: <Science fontSize="small" />, key: 'forecast', onClick: () => handle('Get residue forecast') },
    { label: 'Copy treatments', icon: <ContentCopy fontSize="small" />, key: 'copy-t', onClick: () => handle('Copy treatments') },
    { label: 'Copy plot to another season', icon: <ContentCopy fontSize="small" />, key: 'copy-p', onClick: () => handle('Copy plot to another season') },
    { divider: true, key: 'd1', onClick: () => {} },
    { label: 'Export as Excel', icon: <Download fontSize="small" />, key: 'excel', onClick: () => handle('Export as Excel') },
    { label: 'Export as PDF', icon: <PictureAsPdf fontSize="small" />, key: 'pdf', onClick: () => handle('Export as PDF') },
    { divider: true, key: 'd2', onClick: () => {} },
    { label: 'Delete plot', icon: <DeleteOutline fontSize="small" />, key: 'delete', onClick: () => handle('Deleted') },
  ];

  return (
    <Box>
      <Description>
        When the row has many actions, more than three common ones, or more than one special action, collapse them behind a single ⋮ icon with the tooltip Options. Clicking it reveals the full list, like in Plots.
      </Description>
      <DemoRow
        actions={
          <>
            <Tooltip arrow placement="top" enterDelay={150} title="Options">
              <IconButton size="small" onClick={(e) => setAnchor(e.currentTarget)}>
                <MoreVert fontSize="small" />
              </IconButton>
            </Tooltip>
            <ActionMenu
              anchorEl={anchor}
              open={Boolean(anchor)}
              onClose={() => setAnchor(null)}
              actions={actions}
            />
          </>
        }
      />
    </Box>
  );
}

/* ── Pattern 2 — Very few common actions → inline icon buttons ─────────── */
function Pattern2() {
  return (
    <Box>
      <Description>
        When the row has very few actions and they are all common (e.g. Duplicate, Delete), show them inline as icon buttons. Each icon gets a tooltip that names the action.
      </Description>
      <DemoRow
        actions={
          <>
            <Tooltip arrow placement="top" enterDelay={150} title="Duplicate">
              <IconButton size="small" onClick={() => toast.success('Duplicated')}>
                <ContentCopy fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip arrow placement="top" enterDelay={150} title="Delete">
              <IconButton size="small" onClick={() => toast.success('Deleted')}>
                <DeleteOutline fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        }
      />
    </Box>
  );
}

/* ── Pattern 3 — Few common + one special → icons + secondary CTA ──────── */
function Pattern3() {
  return (
    <Box>
      <Description>
        When the row has up to three common actions plus one special action, keep the common ones as icon buttons and surface the special one as a button with icon and label. If a second special action appears, fall back to Pattern 1.
      </Description>
      <DemoRow
        actions={
          <>
            <Tooltip arrow placement="top" enterDelay={150} title="Duplicate">
              <IconButton size="small" onClick={() => toast.success('Duplicated')}>
                <ContentCopy fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip arrow placement="top" enterDelay={150} title="Download">
              <IconButton size="small" onClick={() => toast.success('Downloaded')}>
                <Download fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip arrow placement="top" enterDelay={150} title="Delete">
              <IconButton size="small" onClick={() => toast.success('Deleted')}>
                <DeleteOutline fontSize="small" />
              </IconButton>
            </Tooltip>
            <Box sx={{ width: 4 }} />
            <RowActionButton
              startIcon={<Send fontSize="small" />}
              onClick={() => toast.success('Sent to lab')}
              sx={{ height: 32 }}
            >
              Send to lab
            </RowActionButton>
          </>
        }
      />
    </Box>
  );
}
