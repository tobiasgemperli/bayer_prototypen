import React, { useMemo, useState, useCallback, useRef } from 'react';
import {
  Box, Typography, Button, Chip, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Stack, ToggleButton, ToggleButtonGroup, TextField, IconButton,
} from '@mui/material';
import {
  Add, ArrowBack, CheckCircleOutline, ReplayOutlined,
  ContentCopy, DeleteOutline, SwapHoriz,
} from '@mui/icons-material';
import { ColDef, CustomCellRendererProps } from 'ag-grid-community';
import { toast } from 'sonner';

import {
  useSprayPlans,
  addPlan, deletePlan, duplicatePlan, setPlanStatus, convertToPlanned,
  addSpray, updateSpray, deleteSpray, markSprayExecuted,
  planProgress,
  SprayPlan, PlannedSpray,
  PlanKind, PlanStatus,
  SPRAY_PRODUCTS, SPRAY_METHODS, DOSE_UNITS,
} from '../../data/spray-plans-data';

import { EmptyState } from '../../design-system/EmptyState';
import { SaveBar } from '../../design-system/SaveBar';
import { BaseDialog } from '../../design-system/BaseDialog';
import { OptionsTrigger } from '../../design-system/OptionsTrigger';
import { ActionMenu, ActionItem } from '../../design-system/ActionMenu';
import { EditableDataGrid, EditableDataGridHandle } from '../../design-system/grid/EditableDataGrid';
import {
  dateColumn, DropdownCellRenderer, DropdownEditor,
} from '../../design-system/grid/grid-shared';

import noTreatmentImg from '../../assets/empty-states/no-treatment-yet-v01.jpg';

// ── Types ────────────────────────────────────────────────────────────────────

interface SprayPlansContentProps {
  plotId: string;
}

// ── Plan list view ────────────────────────────────────────────────────────────

export function SprayPlansContent({ plotId }: SprayPlansContentProps) {
  const allPlans = useSprayPlans();
  const plans = useMemo(
    () => allPlans.filter((p) => p.plotId === plotId),
    [allPlans, plotId]
  );

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [newPlanOpen, setNewPlanOpen] = useState(false);

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === selectedPlanId) ?? null,
    [plans, selectedPlanId]
  );

  const handleOpenNewPlan = () => setNewPlanOpen(true);

  const handlePlanCreated = (planId: string) => {
    setNewPlanOpen(false);
    setSelectedPlanId(planId);
  };

  // If we're viewing a plan detail
  if (selectedPlanId && selectedPlan) {
    return (
      <PlanDetailView
        plan={selectedPlan}
        onBack={() => setSelectedPlanId(null)}
      />
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {plans.length === 0 ? (
        <EmptyState
          title="Plan your spray programme"
          body="Create a spray plan to schedule and track applications."
          ctaLabel="New spray plan"
          onCta={handleOpenNewPlan}
        />
      ) : (
        <PlanListView
          plans={plans}
          onSelectPlan={setSelectedPlanId}
          onNewPlan={handleOpenNewPlan}
        />
      )}

      <NewPlanDialog
        open={newPlanOpen}
        plotId={plotId}
        onClose={() => setNewPlanOpen(false)}
        onCreated={handlePlanCreated}
      />
    </Box>
  );
}

// ── Plan list table ───────────────────────────────────────────────────────────

interface PlanListViewProps {
  plans: SprayPlan[];
  onSelectPlan: (id: string) => void;
  onNewPlan: () => void;
}

function PlanListView({ plans, onSelectPlan, onNewPlan }: PlanListViewProps) {
  const headerCellSx = {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: 'text.secondary',
    py: 1.5,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    borderBottom: '1px solid',
    borderColor: 'divider',
  };
  const cellSx = { fontSize: '0.875rem', py: 1.5, verticalAlign: 'middle' };

  return (
    <>
      {/* Toolbar */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography
          sx={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'text.secondary',
            textTransform: 'uppercase',
          }}
        >
          {plans.length} plan{plans.length !== 1 ? 's' : ''}
        </Typography>
        <Button
          variant="soft"
          color="primary"
          startIcon={<Add />}
          onClick={onNewPlan}
          sx={{
            fontWeight: 600,
            textTransform: 'none',
            borderRadius: '8px',
            height: 36,
            px: 2,
          }}
        >
          New spray plan
        </Button>
      </Box>

      {/* Table */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={headerCellSx}>Name</TableCell>
                <TableCell sx={headerCellSx}>Season</TableCell>
                <TableCell sx={headerCellSx}>Kind</TableCell>
                <TableCell sx={{ ...headerCellSx, width: 80 }}>Sprays</TableCell>
                <TableCell sx={{ ...headerCellSx, minWidth: 160 }}>Progress</TableCell>
                <TableCell sx={headerCellSx}>Status</TableCell>
                <TableCell sx={{ ...headerCellSx, width: 52 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {plans.map((plan) => (
                <PlanRow
                  key={plan.id}
                  plan={plan}
                  onSelect={() => onSelectPlan(plan.id)}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </>
  );
}

// ── Plan table row ────────────────────────────────────────────────────────────

function PlanRow({ plan, onSelect }: { plan: SprayPlan; onSelect: () => void }) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const prog = planProgress(plan);

  const cellSx = { fontSize: '0.875rem', py: 1.5, verticalAlign: 'middle' };

  const actions: ActionItem[] = [
    plan.status === 'pending'
      ? {
          label: 'Mark completed',
          icon: <CheckCircleOutline fontSize="small" />,
          key: 'complete',
          onClick: () => {
            setPlanStatus(plan.id, 'completed');
            toast.success('Plan marked as completed');
          },
        }
      : {
          label: 'Reopen',
          icon: <ReplayOutlined fontSize="small" />,
          key: 'reopen',
          onClick: () => {
            setPlanStatus(plan.id, 'pending');
            toast.success('Plan reopened');
          },
        },
    ...(plan.kind === 'simulated'
      ? [
          {
            label: 'Convert to plan',
            icon: <SwapHoriz fontSize="small" />,
            key: 'convert',
            onClick: () => {
              convertToPlanned(plan.id);
              toast.success('Simulation converted to plan');
            },
          },
        ]
      : []),
    { divider: true, key: 'd1', onClick: () => {} },
    {
      label: 'Duplicate',
      icon: <ContentCopy fontSize="small" />,
      key: 'duplicate',
      onClick: () => {
        duplicatePlan(plan.id);
        toast.success('Plan duplicated');
      },
    },
    { divider: true, key: 'd2', onClick: () => {} },
    {
      label: 'Delete',
      icon: <DeleteOutline fontSize="small" />,
      key: 'delete',
      color: 'error.main',
      onClick: () => {
        deletePlan(plan.id);
        toast.success('Plan deleted');
      },
    },
  ];

  return (
    <TableRow
      hover
      sx={{ cursor: 'pointer' }}
      onClick={onSelect}
    >
      <TableCell sx={{ ...cellSx, fontWeight: 600 }}>{plan.name}</TableCell>
      <TableCell sx={cellSx}>{plan.season}</TableCell>
      <TableCell sx={cellSx}>
        <KindChip kind={plan.kind} />
      </TableCell>
      <TableCell sx={{ ...cellSx, textAlign: 'center' }}>{plan.sprays.length}</TableCell>
      <TableCell sx={cellSx}>
        <PlanProgressCell prog={prog} />
      </TableCell>
      <TableCell sx={cellSx}>
        <StatusChip status={plan.status} />
      </TableCell>
      <TableCell
        sx={cellSx}
        onClick={(e) => e.stopPropagation()}
      >
        <OptionsTrigger
          onClick={(e) => setAnchorEl(e.currentTarget)}
          disabled={false}
        />
        <ActionMenu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          actions={actions}
        />
      </TableCell>
    </TableRow>
  );
}

// ── Chips ─────────────────────────────────────────────────────────────────────

function KindChip({ kind }: { kind: PlanKind }) {
  return kind === 'simulated' ? (
    <Chip
      label="Simulated"
      size="small"
      variant="outlined"
      sx={{ fontWeight: 600, fontSize: '0.75rem' }}
    />
  ) : (
    <Chip
      label="Planned"
      size="small"
      color="primary"
      sx={{ fontWeight: 600, fontSize: '0.75rem' }}
    />
  );
}

function StatusChip({ status }: { status: PlanStatus }) {
  return status === 'completed' ? (
    <Chip
      label="Completed"
      size="small"
      color="success"
      sx={{ fontWeight: 600, fontSize: '0.75rem' }}
    />
  ) : (
    <Chip
      label="Pending"
      size="small"
      variant="outlined"
      sx={{ fontWeight: 600, fontSize: '0.75rem', color: 'text.secondary', borderColor: 'divider' }}
    />
  );
}

function PlanProgressCell({ prog }: { prog: ReturnType<typeof planProgress> }) {
  if (prog.total === 0) {
    return <Typography sx={{ fontSize: '0.8125rem', color: 'text.disabled' }}>No sprays</Typography>;
  }
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
        {prog.executed}/{prog.total} executed
      </Typography>
      <LinearProgress
        variant="determinate"
        value={prog.pct}
        sx={{
          height: 4,
          borderRadius: 2,
          bgcolor: 'action.hover',
          '& .MuiLinearProgress-bar': { borderRadius: 2 },
        }}
        color={prog.allExecuted ? 'success' : 'primary'}
      />
    </Box>
  );
}

// ── Plan detail view (sprays editable grid) ────────────────────────────────────

interface PlanDetailViewProps {
  plan: SprayPlan;
  onBack: () => void;
}

/** Flat row shape for the EditableDataGrid. */
interface SprayRow {
  id: string;
  date: Date | null;
  product: string;
  method: string;
  doseValue: string;
  doseUnit: string;
  executed: boolean;
}

function planToRows(plan: SprayPlan): SprayRow[] {
  return plan.sprays.map((s) => ({
    id: s.id,
    date: s.date,
    product: s.product,
    method: s.method,
    doseValue: s.doseValue,
    doseUnit: s.doseUnit,
    executed: s.status === 'executed',
  }));
}

function PlanDetailView({ plan, onBack }: PlanDetailViewProps) {
  const gridRef = useRef<EditableDataGridHandle>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [gridKey, setGridKey] = useState(0);
  const prog = planProgress(plan);

  const handleCellChange = useCallback(
    (rowId: string, field: string, value: unknown) => {
      const spray = plan.sprays.find((s) => s.id === rowId);
      if (!spray) return;

      if (field === 'executed') {
        markSprayExecuted(plan.id, rowId, Boolean(value));
      } else {
        // Map grid field names to PlannedSpray keys
        const patch: Partial<PlannedSpray> = {};
        if (field === 'date') patch.date = value as Date | null;
        else if (field === 'product') patch.product = value as string;
        else if (field === 'method') patch.method = value as string;
        else if (field === 'doseValue') patch.doseValue = String(value ?? '');
        else if (field === 'doseUnit') patch.doseUnit = value as string;
        updateSpray(plan.id, rowId, patch);
      }
    },
    [plan.id, plan.sprays]
  );

  const handleSave = () => {
    gridRef.current?.save();
    toast.success('Spray plan saved');
  };

  const handleCancel = () => {
    setGridKey((k) => k + 1);
    setHasUnsavedChanges(false);
    toast.info('Changes discarded');
  };

  const handleAddSpray = () => {
    addSpray(plan.id);
    setHasUnsavedChanges(true);
  };

  const handleDeleteSpray = useCallback(
    (sprayId: string) => {
      deleteSpray(plan.id, sprayId);
      gridRef.current?.deleteRow(sprayId);
    },
    [plan.id]
  );

  const colDefs: ColDef<SprayRow>[] = useMemo(
    () => [
      dateColumn('date', 'Date', { flex: 1.2, minWidth: 130 }),
      {
        field: 'product',
        headerName: 'Product',
        flex: 1.8,
        editable: true,
        cellRenderer: DropdownCellRenderer,
        cellEditor: DropdownEditor,
        cellEditorParams: { values: SPRAY_PRODUCTS, searchPlaceholder: 'Search product…' },
      },
      {
        field: 'method',
        headerName: 'Method',
        flex: 1.4,
        editable: true,
        cellRenderer: DropdownCellRenderer,
        cellEditor: DropdownEditor,
        cellEditorParams: { values: SPRAY_METHODS, searchPlaceholder: 'Search method…' },
      },
      {
        field: 'doseValue',
        headerName: 'Dose',
        flex: 0.7,
        editable: true,
        type: 'numericColumn',
        cellDataType: false,
        cellEditor: 'agNumberCellEditor',
      },
      {
        field: 'doseUnit',
        headerName: 'Unit',
        flex: 0.8,
        editable: true,
        cellRenderer: DropdownCellRenderer,
        cellEditor: DropdownEditor,
        cellEditorParams: { values: DOSE_UNITS, searchPlaceholder: 'Search unit…' },
      },
      {
        field: 'executed',
        headerName: 'Executed',
        flex: 0.9,
        editable: true,
        cellDataType: 'boolean',
        cellEditor: 'agCheckboxCellEditor',
        cellRenderer: 'agCheckboxCellRenderer',
      },
      {
        headerName: '',
        width: 52,
        editable: false,
        sortable: false,
        filter: false,
        suppressNavigable: true,
        suppressKeyboardEvent: () => true,
        cellRenderer: SprayDeleteRenderer,
        cellStyle: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
      },
    ],
    []
  );

  const context = useMemo(
    () => ({ onDeleteSpray: handleDeleteSpray }),
    [handleDeleteSpray]
  );

  const initialRows = useMemo(() => planToRows(plan), [plan.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Back + plan header */}
      <Box
        sx={{
          px: 2,
          pt: 2,
          pb: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        <Button
          startIcon={<ArrowBack />}
          onClick={onBack}
          size="small"
          color="inherit"
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            color: 'text.secondary',
            alignSelf: 'flex-start',
            px: 0,
            '&:hover': { bgcolor: 'transparent', color: 'primary.main' },
          }}
        >
          All plans
        </Button>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {plan.name}
            </Typography>
            <KindChip kind={plan.kind} />
            <StatusChip status={plan.status} />
          </Box>

          {/* Primary actions */}
          <Stack direction="row" spacing={1}>
            {plan.kind === 'simulated' && (
              <Button
                variant="soft"
                color="primary"
                startIcon={<SwapHoriz />}
                onClick={() => {
                  convertToPlanned(plan.id);
                  toast.success('Simulation converted to plan');
                }}
                sx={{
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: '8px',
                  height: 36,
                  px: 2,
                }}
              >
                Convert to plan
              </Button>
            )}
            {plan.status === 'pending' ? (
              <Button
                variant="contained"
                color="primary"
                startIcon={<CheckCircleOutline />}
                onClick={() => {
                  setPlanStatus(plan.id, 'completed');
                  toast.success('Plan marked as completed');
                }}
                sx={{
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: '8px',
                  height: 36,
                  px: 2,
                }}
              >
                Mark plan completed
              </Button>
            ) : (
              <Button
                variant="soft"
                color="inherit"
                startIcon={<ReplayOutlined />}
                onClick={() => {
                  setPlanStatus(plan.id, 'pending');
                  toast.success('Plan reopened');
                }}
                sx={{
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: '8px',
                  height: 36,
                  px: 2,
                  color: 'text.secondary',
                  borderColor: 'divider',
                }}
              >
                Reopen
              </Button>
            )}
          </Stack>
        </Box>

        {/* Season + progress summary */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
            {plan.season}
          </Typography>
          {prog.total > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                {prog.executed}/{prog.total} sprays executed
              </Typography>
              <LinearProgress
                variant="determinate"
                value={prog.pct}
                sx={{
                  width: 100,
                  height: 4,
                  borderRadius: 2,
                  bgcolor: 'action.hover',
                  '& .MuiLinearProgress-bar': { borderRadius: 2 },
                }}
                color={prog.allExecuted ? 'success' : 'primary'}
              />
            </Box>
          )}
        </Box>
      </Box>

      {/* Sprays toolbar */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {hasUnsavedChanges ? (
          <SaveBar onSave={handleSave} onCancel={handleCancel} />
        ) : (
          <>
            <Typography
              sx={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'text.secondary',
                textTransform: 'uppercase',
              }}
            >
              {plan.sprays.length} spray{plan.sprays.length !== 1 ? 's' : ''}
            </Typography>
            <Button
              variant="soft"
              color="primary"
              startIcon={<Add />}
              onClick={handleAddSpray}
              sx={{
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: '8px',
                height: 36,
                px: 2,
              }}
            >
              Add spray
            </Button>
          </>
        )}
      </Box>

      {/* Sprays grid */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden', position: 'relative' }}>
        {plan.sprays.length === 0 ? (
          <EmptyState
            title="No sprays yet"
            body="Add your first spray to start tracking applications for this plan."
            ctaLabel="Add spray"
            onCta={handleAddSpray}
          />
        ) : (
          <EditableDataGrid
            key={`${plan.id}-${gridKey}`}
            ref={gridRef}
            initialData={initialRows}
            columnDefs={colDefs as ColDef[]}
            dateField="date"
            context={context}
            onDirtyStateChange={setHasUnsavedChanges}
            onCellChange={handleCellChange}
          />
        )}
      </Box>
    </Box>
  );
}

// ── Delete cell renderer for spray rows ────────────────────────────────────────

function SprayDeleteRenderer({ data, context }: CustomCellRendererProps) {
  const { onDeleteSpray } = context as { onDeleteSpray: (id: string) => void };
  return (
    <IconButton
      size="small"
      onClick={(e) => {
        e.stopPropagation();
        onDeleteSpray(data.id);
      }}
      sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}
    >
      <DeleteOutline fontSize="small" />
    </IconButton>
  );
}

// ── New plan dialog ─────────────────────────────────────────────────────────────

interface NewPlanDialogProps {
  open: boolean;
  plotId: string;
  onClose: () => void;
  onCreated: (planId: string) => void;
}

const SEASONS = ['Spring 2024', 'Summer 2024', 'Autumn 2024', 'Spring 2025', 'Summer 2025'];

function NewPlanDialog({ open, plotId, onClose, onCreated }: NewPlanDialogProps) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<PlanKind>('planned');
  const [season, setSeason] = useState(SEASONS[0]);

  const handleConfirm = () => {
    if (!name.trim()) return;
    const plan = addPlan(plotId, { name: name.trim(), kind, season });
    setName('');
    setKind('planned');
    setSeason(SEASONS[0]);
    onCreated(plan.id);
    toast.success('Spray plan created');
  };

  return (
    <BaseDialog
      open={open}
      onClose={onClose}
      title="New spray plan"
      confirmLabel="Create plan"
      onConfirm={handleConfirm}
      maxWidth="xs"
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1.5 }}>
        <TextField
          label="Plan name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          fullWidth
          size="small"
          placeholder="e.g. Pre-harvest programme"
          onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm(); }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
        />

        <Box>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', mb: 0.75 }}>
            Season
          </Typography>
          <TextField
            select
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            fullWidth
            size="small"
            SelectProps={{ native: true }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
          >
            {SEASONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </TextField>
        </Box>

        <Box>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'text.secondary', mb: 0.75 }}>
            Kind
          </Typography>
          <ToggleButtonGroup
            value={kind}
            exclusive
            onChange={(_, v) => { if (v) setKind(v); }}
            size="small"
            fullWidth
            sx={{
              '& .MuiToggleButton-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                borderRadius: '8px',
                flex: 1,
              },
            }}
          >
            <ToggleButton value="planned">Planned</ToggleButton>
            <ToggleButton value="simulated">Simulated</ToggleButton>
          </ToggleButtonGroup>
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.75 }}>
            {kind === 'planned'
              ? 'A committed plan you intend to execute.'
              : 'A what-if scenario you can convert to a plan later.'}
          </Typography>
        </Box>
      </Box>
    </BaseDialog>
  );
}
