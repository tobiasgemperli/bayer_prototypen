import React from 'react';
import { Box, Table, TableHead, TableBody, TableRow, TableCell, TableContainer } from '@mui/material';
import { TableCard } from '../design-system/TableCard';
import { LabReportWithSample } from '../data/lab-results-data';

const headerCellSx = { fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem' };

/**
 * Shared read-only list of a plot's lab reports (clean PlotsTable-style table).
 * Used by every Lab-management variant (v5, v6, …). Row click opens the report.
 * Columns: Laboratory · Lab report ID · Attachments · Results (· Sample).
 */
export function LabReportsTable({
  reports, onOpen, hideSample = false,
}: {
  reports: LabReportWithSample[];
  onOpen: (reportId: string) => void;
  /** Hide the Sample column — for master-detail contexts where the sample is already selected. */
  hideSample?: boolean;
}) {
  return (
    <Box sx={{ p: 3 }}>
      <TableCard>
        <TableContainer>
          <Table aria-label="lab reports table">
            <TableHead>
              <TableRow>
                <TableCell sx={headerCellSx}>Laboratory</TableCell>
                <TableCell sx={headerCellSx}>Lab report ID</TableCell>
                <TableCell sx={headerCellSx}>Attachments</TableCell>
                <TableCell sx={headerCellSx}>Results</TableCell>
                {!hideSample && <TableCell sx={headerCellSx}>Sample</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {reports.map(({ sample, report }) => {
                const resultCount = report.residues?.length ?? 0;
                return (
                  <TableRow key={report.id} hover sx={{ cursor: 'pointer' }} onClick={() => onOpen(report.id)}>
                    <TableCell sx={{ fontSize: '0.875rem' }}>
                      {report.laboratory || <Box component="span" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>—</Box>}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'primary.main' }}>
                      {report.labReportId || <Box component="span" sx={{ color: 'text.disabled', fontStyle: 'italic', fontWeight: 400 }}>Untitled report</Box>}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.875rem' }}>{report.attachments.length}</TableCell>
                    <TableCell sx={{ fontSize: '0.875rem' }}>
                      {resultCount > 0 ? `${resultCount} analyte${resultCount !== 1 ? 's' : ''}` : <Box component="span" sx={{ color: 'text.disabled' }}>No results</Box>}
                    </TableCell>
                    {!hideSample && (
                      <TableCell sx={{ fontSize: '0.875rem' }}>{sample.sampleName || sample.sampleCode}</TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </TableCard>
    </Box>
  );
}
