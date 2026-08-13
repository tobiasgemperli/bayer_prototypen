import React, { useState } from 'react';
import {
  Box, Typography, Button, Chip, IconButton, Checkbox, Tooltip,
  Select, MenuItem, FormControl, CircularProgress, Menu, Divider,
  Paper, Stack,
} from '@mui/material';
import { Add, CheckCircle, MoreVert, ArrowForward, MoveDown } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  useSprayPlans,
  addPlan,
  addSpray,
  updateSpray,
  markSprayExecuted,
  setPlanStatus,
  convertToPlanned,
  planProgress,
  SprayPlan,
  PlannedSpray,
  SPRAY_PRODUCTS,
  DOSE_UNITS,
} from '../../data/spray-plans-data';
import { EmptyState } from '../../design-system/EmptyState';

// ─── helpers ──────────────────────────────────────────────────────────────────

function productAbbrev(product: string): string {
  // Use first 6 chars as an abbreviation for chip labels
  const abbrevMap: Record<string, string> = {
    'DECIS FLUX®': 'DECIS',
    'Roundup': 'Round.',
    'Bumper 25 EC': 'Bump.',
    'Confidor': 'Confid.',
    'Movento': 'Movent.',
  };
  return abbrevMap[product] ?? product.slice(0, 6);
}

function formatDate(d: Date | null): string {
  if (!d) return '—';
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(d);
}

// ─── ProgressRing — circular progress using SVG ───────────────────────────────

function ProgressRing({ pct, executed, total }: { pct: number; executed: number; total: number }) {
  const r = 14;
  const circ = 2 * Math.PI * r;
  const stroke = circ - (pct / 100) * circ;
  return (
    <Box sx={{ position: 'relative', width: 36, height: 36, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={36} height={36} style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
        <circle cx={18} cy={18} r={r} fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth={3} />
        <circle
          cx={18} cy={18} r={r} fill="none"
          stroke={pct === 100 ? '#4caf50' : '#d4183d'}
          strokeWidth={3}
          strokeDasharray={circ}
          strokeDashoffset={stroke}
          strokeLinecap="round"
        />
      </svg>
      <Typography sx={{ fontSize: '0.5625rem', fontWeight: 700, color: pct === 100 ? 'success.main' : 'text.primary', lineHeight: 1 }}>
        {executed}/{total}
      </Typography>
    </Box>
  );
}

// ─── SprayRow — an editable spray row inside a card ───────────────────────────

interface SprayRowProps {
  planId: string;
  spray: PlannedSpray;
}

function SprayRow({ planId, spray }: SprayRowProps) {
  const [editingDate, setEditingDate] = useState(false);
  const executed = spray.status === 'executed';

  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 0.75, py: 0.5,
      borderTop: '1px solid', borderColor: 'divider',
    }}>
      {/* Executed checkbox */}
      <Tooltip title={executed ? 'Mark as planned' : 'Mark as executed'} placement="top">
        <Checkbox
          size="small"
          checked={executed}
          onChange={(e) => markSprayExecuted(planId, spray.id, e.target.checked)}
          sx={{ p: 0.25, color: 'text.disabled', '&.Mui-checked': { color: 'success.main' } }}
        />
      </Tooltip>

      {/* Product select */}
      <FormControl size="small" sx={{ minWidth: 100, flex: 1 }}>
        <Select
          value={spray.product}
          displayEmpty
          onChange={(e) => updateSpray(planId, spray.id, { product: e.target.value })}
          renderValue={(v) => v || <span style={{ color: '#9ca3af' }}>Product</span>}
          sx={{
            fontSize: '0.75rem',
            fontWeight: executed ? 400 : 600,
            textDecoration: executed ? 'line-through' : 'none',
            color: executed ? 'text.disabled' : 'text.primary',
            '& .MuiOutlinedInput-notchedOutline': { borderRadius: '6px' },
            '& .MuiSelect-select': { py: 0.5, px: 1 },
          }}
        >
          {SPRAY_PRODUCTS.map((p) => (
            <MenuItem key={p} value={p} sx={{ fontSize: '0.8125rem' }}>{p}</MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Dose */}
      <FormControl size="small" sx={{ width: 70 }}>
        <Select
          value={spray.doseUnit}
          onChange={(e) => updateSpray(planId, spray.id, { doseUnit: e.target.value })}
          sx={{ fontSize: '0.75rem', '& .MuiSelect-select': { py: 0.5, px: 1 }, '& .MuiOutlinedInput-notchedOutline': { borderRadius: '6px' } }}
        >
          {DOSE_UNITS.map((u) => (
            <MenuItem key={u} value={u} sx={{ fontSize: '0.8125rem' }}>{u}</MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Date — inline DatePicker toggle */}
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        {editingDate ? (
          <Box sx={{ width: 120 }}>
            <DatePicker
              value={spray.date}
              onChange={(d) => {
                updateSpray(planId, spray.id, { date: d });
                setEditingDate(false);
              }}
              onClose={() => setEditingDate(false)}
              slotProps={{ textField: { size: 'small', autoFocus: true, sx: { '& .MuiInputBase-input': { fontSize: '0.75rem', py: 0.5 }, '& .MuiOutlinedInput-notchedOutline': { borderRadius: '6px' } } } }}
            />
          </Box>
        ) : (
          <Button
            size="small" variant="text" color="inherit"
            onClick={() => setEditingDate(true)}
            sx={{ fontSize: '0.7rem', color: spray.date ? 'text.secondary' : 'text.disabled', minWidth: 0, px: 0.5, textTransform: 'none' }}
          >
            {formatDate(spray.date)}
          </Button>
        )}
      </LocalizationProvider>
    </Box>
  );
}

// ─── PlanCard ─────────────────────────────────────────────────────────────────

interface PlanCardProps {
  plan: SprayPlan;
  column: 'simulations' | 'pending' | 'completed';
}

function PlanCard({ plan, column }: PlanCardProps) {
  const prog = planProgress(plan);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [addingSpray, setAddingSpray] = useState(false);

  const handleAddSpray = () => {
    addSpray(plan.id);
    setAddingSpray(true);
  };

  const handleMoveToPending = () => {
    convertToPlanned(plan.id);
    setPlanStatus(plan.id, 'pending');
    setMenuAnchor(null);
  };

  const handleMoveToCompleted = () => {
    setPlanStatus(plan.id, 'completed');
    setMenuAnchor(null);
  };

  const handleReopen = () => {
    setPlanStatus(plan.id, 'pending');
    setMenuAnchor(null);
  };

  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid', borderColor: 'divider',
        borderRadius: '8px', p: 1.5, mb: 1.5,
        bgcolor: 'background.paper',
        transition: 'box-shadow 0.15s',
        '&:hover': { boxShadow: '0 2px 8px rgba(0,0,0,0.09)' },
      }}
    >
      {/* Card header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
        <ProgressRing pct={prog.pct} executed={prog.executed} total={prog.total} />

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: 'text.primary', lineHeight: 1.3, wordBreak: 'break-word' }}>
            {plan.name}
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.25 }}>
            {plan.season}
          </Typography>
        </Box>

        {/* Move menu trigger */}
        <IconButton
          size="small" onClick={(e) => setMenuAnchor(e.currentTarget)}
          sx={{ color: 'text.disabled', flexShrink: 0, mt: -0.25 }}
        >
          <MoreVert fontSize="small" />
        </IconButton>

        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={() => setMenuAnchor(null)}
          PaperProps={{ sx: { borderRadius: '8px', minWidth: 180 } }}
        >
          {column === 'simulations' && (
            <MenuItem onClick={handleMoveToPending} sx={{ fontSize: '0.875rem', gap: 1 }}>
              <ArrowForward fontSize="small" sx={{ color: 'primary.main' }} />
              Move to Pending
            </MenuItem>
          )}
          {column === 'pending' && (
            <MenuItem onClick={handleMoveToCompleted} sx={{ fontSize: '0.875rem', gap: 1 }}>
              <CheckCircle fontSize="small" sx={{ color: 'success.main' }} />
              Move to Completed
            </MenuItem>
          )}
          {column === 'completed' && (
            <MenuItem onClick={handleReopen} sx={{ fontSize: '0.875rem', gap: 1 }}>
              <MoveDown fontSize="small" sx={{ color: 'text.secondary' }} />
              Reopen (→ Pending)
            </MenuItem>
          )}
          {column !== 'simulations' && column !== 'completed' && (
            <>
              <Divider />
              <MenuItem onClick={handleReopen} sx={{ fontSize: '0.875rem', gap: 1, color: 'text.secondary' }}>
                Back to Simulations
              </MenuItem>
            </>
          )}
        </Menu>
      </Box>

      {/* Spray chips summary row */}
      {plan.sprays.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
          {plan.sprays.map((spray) => (
            <Chip
              key={spray.id}
              size="small"
              label={productAbbrev(spray.product || '?')}
              icon={spray.status === 'executed'
                ? <CheckCircle sx={{ fontSize: '12px !important', color: 'success.main !important' }} />
                : undefined
              }
              sx={{
                fontSize: '0.6875rem',
                fontWeight: 600,
                height: 20,
                bgcolor: spray.status === 'executed' ? 'rgba(76,175,80,0.10)' : 'rgba(0,0,0,0.06)',
                color: spray.status === 'executed' ? 'success.dark' : 'text.secondary',
                border: 'none',
                '& .MuiChip-label': { px: 0.75 },
                '& .MuiChip-icon': { ml: 0.5 },
              }}
            />
          ))}
        </Box>
      )}

      {/* "All done" nudge */}
      {prog.allExecuted && column !== 'completed' && (
        <Button
          size="small" variant="soft" color="success"
          startIcon={<CheckCircle sx={{ fontSize: 14 }} />}
          onClick={handleMoveToCompleted}
          sx={{ fontSize: '0.75rem', textTransform: 'none', fontWeight: 700, borderRadius: '6px', height: 28, px: 1.25, mb: 1 }}
        >
          All done — Complete
        </Button>
      )}

      {/* Spray rows (editable) */}
      {plan.sprays.map((spray) => (
        <SprayRow key={spray.id} planId={plan.id} spray={spray} />
      ))}

      {/* + spray */}
      {column !== 'completed' && (
        <Button
          size="small" variant="text"
          startIcon={<Add sx={{ fontSize: 14 }} />}
          onClick={handleAddSpray}
          sx={{ mt: plan.sprays.length > 0 ? 0.5 : 0, fontSize: '0.75rem', textTransform: 'none', color: 'primary.main', fontWeight: 600, px: 0.5, minHeight: 28 }}
        >
          + spray
        </Button>
      )}
    </Paper>
  );
}

// ─── BoardColumn ──────────────────────────────────────────────────────────────

interface BoardColumnProps {
  title: string;
  count: number;
  plans: SprayPlan[];
  column: 'simulations' | 'pending' | 'completed';
  onAddPlan?: () => void;
  accentColor?: string;
}

function BoardColumn({ title, count, plans, column, onAddPlan, accentColor }: BoardColumnProps) {
  return (
    <Box sx={{
      flex: '0 0 calc(33.33% - 12px)',
      minWidth: 280,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Column header */}
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        mb: 1.5, pb: 1.25,
        borderBottom: '2px solid', borderColor: accentColor ?? 'divider',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }}>
            {title}
          </Typography>
          <Chip
            label={count}
            size="small"
            sx={{ height: 20, fontSize: '0.75rem', fontWeight: 700, bgcolor: 'action.hover', color: 'text.secondary', '& .MuiChip-label': { px: 1 } }}
          />
        </Box>
        {onAddPlan && (
          <Button
            size="small" variant="soft" color="primary"
            startIcon={<Add sx={{ fontSize: 16 }} />}
            onClick={onAddPlan}
            sx={{ fontWeight: 600, fontSize: '0.8125rem', textTransform: 'none', borderRadius: '8px', height: 32, px: 1.5 }}
          >
            Add plan
          </Button>
        )}
      </Box>

      {/* Plan cards */}
      <Box sx={{ flex: 1, overflowY: 'auto', pr: 0.25 }}>
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} column={column} />
        ))}
        {plans.length === 0 && (
          <Box sx={{ py: 3, textAlign: 'center' }}>
            <Typography sx={{ fontSize: '0.8125rem', color: 'text.disabled', fontStyle: 'italic' }}>
              No plans here
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

// ─── SprayPlansBoard (exported) ───────────────────────────────────────────────

export function SprayPlansBoard({ plotId }: { plotId: string }) {
  const allPlans = useSprayPlans();
  const plans = allPlans.filter((p) => p.plotId === plotId);

  const simulations = plans.filter((p) => p.kind === 'simulated');
  const pending = plans.filter((p) => p.kind === 'planned' && p.status === 'pending');
  const completed = plans.filter((p) => p.status === 'completed');

  const hasAnyPlan = plans.length > 0;

  if (!hasAnyPlan) {
    return (
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <EmptyState
          title="Plan your spray programme"
          body="Create simulation plans to test scenarios, then commit and track real spray executions."
          ctaLabel="New spray plan"
          onCta={() => addPlan(plotId, { kind: 'simulated' })}
          ctaVariant="outlined"
        />
      </Box>
    );
  }

  const handleAddSimulation = () => addPlan(plotId, { kind: 'simulated', name: 'New simulation' });
  const handleAddPending = () => addPlan(plotId, { kind: 'planned', status: 'pending', name: 'New spray plan' });

  return (
    <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Toolbar */}
      <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {plans.length} plan{plans.length !== 1 ? 's' : ''}
        </Typography>
      </Box>

      {/* Board */}
      <Box sx={{
        flex: 1, overflowX: 'auto', overflowY: 'hidden',
        display: 'flex', gap: 2.5, p: 2.5, alignItems: 'flex-start',
      }}>
        <BoardColumn
          title="Simulations"
          count={simulations.length}
          plans={simulations}
          column="simulations"
          onAddPlan={handleAddSimulation}
          accentColor="rgba(212,24,61,0.35)"
        />
        <BoardColumn
          title="Pending"
          count={pending.length}
          plans={pending}
          column="pending"
          onAddPlan={handleAddPending}
          accentColor="rgba(237,108,2,0.5)"
        />
        <BoardColumn
          title="Completed"
          count={completed.length}
          plans={completed}
          column="completed"
          accentColor="rgba(76,175,80,0.5)"
        />
      </Box>
    </Box>
  );
}
