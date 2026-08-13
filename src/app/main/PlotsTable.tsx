import React, { useMemo } from 'react';
import { useNavigate } from '../variants/variant-context';
import {
  Box,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Checkbox,
} from '@mui/material';
import { TableCard } from '../design-system/TableCard';
import { isPlotDraft, type PlotData } from '../data/plots-data';

type SortField = 'plotName' | 'owner' | 'variety' | 'location' | 'lastTreatment' | 'plantingDate';
type SortOrder = 'asc' | 'desc';

interface PlotsTableProps {
  data: PlotData[];
  selected: string[];
  onSelectChange: (selectedIds: string[]) => void;
  /** When true, draft plots render a red "Draft" Chip next to the plot name. */
  showDraftBadge?: boolean;
  /** When true, a sortable "Planting date" column is inserted after Plot. */
  showPlantingDate?: boolean;
}

export function PlotsTable({ data, selected, onSelectChange, showDraftBadge = false, showPlantingDate = false }: PlotsTableProps) {
  const navigate = useNavigate();
  const [orderBy, setOrderBy] = React.useState<SortField | null>(null);
  const [order, setOrder] = React.useState<SortOrder>('asc');

  const handleSort = (field: SortField) => {
    const isAsc = orderBy === field && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(field);
  };

  const sortedData = useMemo(() => {
    if (!orderBy) return data;

    return [...data].sort((a, b) => {
      const aValue = a[orderBy];
      const bValue = b[orderBy];

      if (orderBy === 'lastTreatment' || orderBy === 'plantingDate') {
        const aTime = aValue ? (aValue as Date).getTime() : 0;
        const bTime = bValue ? (bValue as Date).getTime() : 0;
        return order === 'asc' ? aTime - bTime : bTime - aTime;
      }

      const aStr = String(aValue ?? '').toLowerCase();
      const bStr = String(bValue ?? '').toLowerCase();

      if (aStr < bStr) return order === 'asc' ? -1 : 1;
      if (aStr > bStr) return order === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, orderBy, order]);

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      onSelectChange(data.map(row => row.id));
    } else {
      onSelectChange([]);
    }
  };

  const handleSelect = (id: string) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected: string[] = [];

    if (selectedIndex === -1) {
      newSelected = [...selected, id];
    } else {
      newSelected = selected.filter(selectedId => selectedId !== id);
    }

    onSelectChange(newSelected);
  };

  const isSelected = (id: string) => selected.indexOf(id) !== -1;

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  return (
    <TableCard>
      <TableContainer sx={{ maxHeight: 'calc(100vh - 280px)' }}>
        <Table stickyHeader aria-label="plots table">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selected.length > 0 && selected.length < data.length}
                  checked={data.length > 0 && selected.length === data.length}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem' }}>
                <TableSortLabel
                  active={orderBy === 'plotName'}
                  direction={orderBy === 'plotName' ? order : 'asc'}
                  onClick={() => handleSort('plotName')}
                >
                  Plot
                </TableSortLabel>
              </TableCell>
              {showPlantingDate && (
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem' }}>
                  <TableSortLabel
                    active={orderBy === 'plantingDate'}
                    direction={orderBy === 'plantingDate' ? order : 'asc'}
                    onClick={() => handleSort('plantingDate')}
                  >
                    Planting date
                  </TableSortLabel>
                </TableCell>
              )}
              <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem' }}>
                <TableSortLabel
                  active={orderBy === 'owner'}
                  direction={orderBy === 'owner' ? order : 'asc'}
                  onClick={() => handleSort('owner')}
                >
                  Owner
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem' }}>
                <TableSortLabel
                  active={orderBy === 'variety'}
                  direction={orderBy === 'variety' ? order : 'asc'}
                  onClick={() => handleSort('variety')}
                >
                  Variety
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem' }}>
                <TableSortLabel
                  active={orderBy === 'location'}
                  direction={orderBy === 'location' ? order : 'asc'}
                  onClick={() => handleSort('location')}
                >
                  Location
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem' }}>
                <TableSortLabel
                  active={orderBy === 'lastTreatment'}
                  direction={orderBy === 'lastTreatment' ? order : 'asc'}
                  onClick={() => handleSort('lastTreatment')}
                >
                  Last real treatment
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showPlantingDate ? 7 : 6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No plots found
                </TableCell>
              </TableRow>
            ) : (
              sortedData.map((row) => {
                const isItemSelected = isSelected(row.id);
                return (
                  <TableRow
                    hover
                    key={row.id}
                    selected={isItemSelected}
                    onClick={() => navigate(`/plot/${row.id}`)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell 
                      padding="checkbox"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={isItemSelected}
                        onChange={() => handleSelect(row.id)}
                      />
                    </TableCell>
                    <TableCell sx={{ color: 'text.primary', fontSize: '0.875rem' }}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Box component="span">{row.plotName}</Box>
                        {showDraftBadge && isPlotDraft(row) && (
                          <Chip label="Draft" size="small" variant="outlined" color="error"
                            sx={{ height: 22, borderRadius: '6px', fontWeight: 600, fontSize: '0.6875rem' }} />
                        )}
                      </Stack>
                    </TableCell>
                    {showPlantingDate && (
                      <TableCell sx={{ color: row.plantingDate ? 'text.primary' : 'text.secondary', fontSize: '0.875rem', fontStyle: row.plantingDate ? 'normal' : 'italic' }}>
                        {row.plantingDate ? formatDate(row.plantingDate) : 'Not set'}
                      </TableCell>
                    )}
                    <TableCell sx={{ color: 'text.primary', fontSize: '0.875rem' }}>
                      {row.owner}
                    </TableCell>
                    <TableCell sx={{ color: 'text.primary', fontSize: '0.875rem' }}>
                      {row.variety}
                    </TableCell>
                    <TableCell sx={{ color: 'text.primary', fontSize: '0.875rem' }}>
                      {row.location}
                    </TableCell>
                    <TableCell sx={{ color: row.lastTreatment ? 'text.primary' : 'text.secondary', fontSize: '0.875rem', fontStyle: row.lastTreatment ? 'normal' : 'italic' }}>
                      {row.lastTreatment ? formatDate(row.lastTreatment) : 'No treatments yet'}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </TableCard>
  );
}
