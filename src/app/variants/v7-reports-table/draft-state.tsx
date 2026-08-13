import React from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import { Close as CloseIcon, KeyboardArrowDown } from '@mui/icons-material';
import { CustomCellRendererProps } from 'ag-grid-community';
import { LabReport, LabResidue, LabSampleData } from '../../data/lab-results-data';
// SSOT — generic draft chip + name-with-chip HOC live in the design system.
import { DraftChip, ManagedTag, nameCellWithDraft } from '../../design-system/grid/draft-state';

// Re-export so this variant's existing imports keep working.
export { DraftChip, ManagedTag, nameCellWithDraft };

// ── Draft predicates ─────────────────────────────────────────────────────────
// Every editable entity now carries an explicit `isDraft` flag (SSOT for draft
// state). It's set when the row is first created and cleared on save. Missing
// fields no longer drive the chip — that decoupling was the v7 redesign.

export function isSampleDraft(s: LabSampleData): boolean {
  return s.isDraft === true;
}

export function isReportDraft(r: LabReport): boolean {
  return r.isDraft === true;
}

export function isResidueDraft(r: LabResidue): boolean {
  // Any residue with the explicit isDraft flag is a draft — including
  // from-treatment rows the system auto-seeds with no residue level / value
  // yet. They sit waiting for the user to enter their measurements; until
  // they do, the row reads as a draft (chip + 4 px red marker).
  return r.isDraft === true;
}

// ── Analyte cell — draft chip + lock for from-treatment rows ─────────────────
// Mirrors DropdownCellRenderer's structure (value · clear · chevron) for manual
// rows, and degrades to a locked typography for from-treatment rows. Keeps the
// 30×30 / 20 px-glyph footprint so every selector cell still reads identical.

export function AnalyteCell({ value, api, node, column, data }: CustomCellRendererProps) {
  const residue = data as LabResidue;
  // Draft / Managed chips live on the Lab report column (the row's primary
  // identifier), not here — one chip per row, attached to the identifier.
  const locked = residue.fromTreatment;

  const toggleEditor = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (locked || node.rowIndex == null) return;
    const isEditing = api.getEditingCells().some(
      (c) => c.rowIndex === node.rowIndex && c.column.getColId() === column.getColId()
    );
    if (isEditing) api.stopEditing();
    else api.startEditingCell({ rowIndex: node.rowIndex, colKey: column.getColId() });
  };

  const clearValue = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    node.setDataValue(column.getColId(), '');
  };

  const iconBtnSx = {
    width: 30, height: 30, padding: '5px', flexShrink: 0,
    color: 'action.active',
  } as const;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', height: '100%', width: '100%', minWidth: 0 }}>
      <Box sx={{
        flex: 1, minWidth: 0,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        color: value ? 'text.primary' : 'text.disabled',
        display: 'flex', alignItems: 'center',
      }}>
        <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {value || '—'}
        </Box>
      </Box>
      {!locked && value && (
        <IconButton size="small" tabIndex={-1} onMouseDown={clearValue} sx={iconBtnSx} aria-label="Clear">
          <CloseIcon sx={{ fontSize: 20 }} />
        </IconButton>
      )}
      {!locked && (
        <IconButton size="small" tabIndex={-1} onMouseDown={toggleEditor} sx={iconBtnSx}>
          <KeyboardArrowDown sx={{ fontSize: 20 }} />
        </IconButton>
      )}
    </Box>
  );
}

// ── Source cell — visual distinction between from-treatment vs manual ────────

export function SourceCell({ data }: CustomCellRendererProps) {
  const residue = data as LabResidue;
  return (
    <Typography sx={{
      fontSize: '0.8125rem',
      color: residue.fromTreatment ? 'text.secondary' : 'primary.main',
      fontWeight: residue.fromTreatment ? 400 : 600,
    }}>
      {residue.fromTreatment ? 'From treatment' : 'Manually added'}
    </Typography>
  );
}
