import React, { useState, useMemo, useCallback } from 'react';
import {
  Box, Typography, Button, Chip, Stack, Select, MenuItem,
  FormControl, InputLabel, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Popover, Paper, Divider, IconButton,
  LinearProgress, Tooltip,
} from '@mui/material';
import {
  Add, ChevronLeft, ChevronRight, CheckCircle, ErrorOutline,
  MoreVert, Delete, PlayArrow,
} from '@mui/icons-material';
import {
  useSprayPlans,
  addPlan,
  addSpray,
  deleteSpray,
  markSprayExecuted,
  setPlanStatus,
  planProgress,
  SPRAY_PRODUCTS,
  SPRAY_METHODS,
  DOSE_UNITS,
  SprayPlan,
  PlannedSpray,
} from '../../data/spray-plans-data';
import { EmptyState } from '../../design-system/EmptyState';

/**
 * Demo anchor: seed data dates are in 2024. To show the "overdue" treatment
 * meaningfully in the demo (sprays in the past that haven't been executed),
 * we anchor "today" to a date shortly after the earliest seed spray so that
 * the demo reads well without requiring real-time execution.
 * See README.md for details.
 */
const DEMO_TODAY = new Date('2024-03-08');

function isOverdue(spray: PlannedSpray): boolean {
  return (
    spray.status === 'planned' &&
    spray.date !== null &&
    spray.date < DEMO_TODAY
  );
}

// ── Month-grid helpers ──────────────────────────────────────────────────────────

function startOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Returns grid cells: nulls for leading blanks + day numbers for the month. */
function buildMonthGrid(year: number, month: number): (number | null)[] {
  const first = startOfMonth(year, month).getDay(); // 0=Sun
  const total = daysInMonth(year, month);
  const cells: (number | null)[] = Array(first).fill(null);
  for (let d = 1; d <= total; d++) cells.push(d);
  // pad to full week rows
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ── Status chip helpers ─────────────────────────────────────────────────────────

function PlanStatusChip({ status }: { status: SprayPlan['status'] }) {
  return (
    <Chip
      label={status === 'completed' ? 'Completed' : 'Pending'}
      size="small"
      color={status === 'completed' ? 'success' : 'default'}
      variant="outlined"
      sx={{ fontWeight: 700, fontSize: '0.75rem' }}
    />
  );
}

function KindChip({ kind }: { kind: SprayPlan['kind'] }) {
  return (
    <Chip
      label={kind === 'simulated' ? 'Simulation' : 'Plan'}
      size="small"
      color={kind === 'simulated' ? 'warning' : 'primary'}
      variant="filled"
      sx={{ fontWeight: 700, fontSize: '0.7rem', height: 20 }}
    />
  );
}

// ── New plan dialog ─────────────────────────────────────────────────────────────

interface NewPlanDialogProps {
  open: boolean;
  plotId: string;
  onClose: () => void;
  onCreated: (planId: string) => void;
}

function NewPlanDialog({ open, plotId, onClose, onCreated }: NewPlanDialogProps) {
  const [name, setName] = useState('');
  const [season, setSeason] = useState('Spring 2024');
  const [kind, setKind] = useState<'planned' | 'simulated'>('planned');

  const handleCreate = () => {
    if (!name.trim()) return;
    const plan = addPlan(plotId, { name: name.trim(), season, kind });
    setName('');
    setSeason('Spring 2024');
    setKind('planned');
    onCreated(plan.id);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem', pb: 1 }}>
        New spray plan
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
        <TextField
          label="Plan name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          size="small"
          autoFocus
          fullWidth
          onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
        />
        <TextField
          label="Season"
          value={season}
          onChange={(e) => setSeason(e.target.value)}
          size="small"
          fullWidth
        />
        <FormControl size="small" fullWidth>
          <InputLabel>Type</InputLabel>
          <Select value={kind} label="Type" onChange={(e) => setKind(e.target.value as 'planned' | 'simulated')}>
            <MenuItem value="planned">Plan (committed)</MenuItem>
            <MenuItem value="simulated">Simulation (what-if)</MenuItem>
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none', fontWeight: 600 }}>Cancel</Button>
        <Button
          variant="contained" onClick={handleCreate} disabled={!name.trim()}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          Create plan
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Add spray popover (click on a day) ─────────────────────────────────────────

interface AddSprayPopoverProps {
  anchorEl: HTMLElement | null;
  date: Date | null;
  planId: string;
  onClose: () => void;
}

function AddSprayPopover({ anchorEl, date, planId, onClose }: AddSprayPopoverProps) {
  const [product, setProduct] = useState('');
  const [method, setMethod] = useState('Foliar spray');
  const [doseValue, setDoseValue] = useState('');
  const [doseUnit, setDoseUnit] = useState('L/ha');

  const handleAdd = () => {
    if (!product || !date) return;
    addSpray(planId, { date, product, method, doseValue, doseUnit });
    setProduct('');
    setDoseValue('');
    onClose();
  };

  const open = Boolean(anchorEl);

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      PaperProps={{ sx: { p: 2, width: 280, borderRadius: '10px' } }}
    >
      <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', mb: 1.5 }}>
        Add spray — {date?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </Typography>
      <Stack spacing={1.5}>
        <FormControl size="small" fullWidth>
          <InputLabel>Product</InputLabel>
          <Select value={product} label="Product" onChange={(e) => setProduct(e.target.value)}>
            {SPRAY_PRODUCTS.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" fullWidth>
          <InputLabel>Method</InputLabel>
          <Select value={method} label="Method" onChange={(e) => setMethod(e.target.value)}>
            {SPRAY_METHODS.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
          </Select>
        </FormControl>
        <Stack direction="row" spacing={1}>
          <TextField
            label="Dose"
            size="small"
            value={doseValue}
            onChange={(e) => setDoseValue(e.target.value)}
            sx={{ flex: 1 }}
          />
          <FormControl size="small" sx={{ minWidth: 80 }}>
            <InputLabel>Unit</InputLabel>
            <Select value={doseUnit} label="Unit" onChange={(e) => setDoseUnit(e.target.value)}>
              {DOSE_UNITS.map((u) => <MenuItem key={u} value={u}>{u}</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>
        <Stack direction="row" justifyContent="flex-end" spacing={1} pt={0.5}>
          <Button size="small" onClick={onClose} sx={{ textTransform: 'none', fontWeight: 600 }}>Cancel</Button>
          <Button
            size="small" variant="contained" onClick={handleAdd} disabled={!product}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Add spray
          </Button>
        </Stack>
      </Stack>
    </Popover>
  );
}

// ── Spray chip — rendered on a calendar day ────────────────────────────────────

interface SprayChipProps {
  spray: PlannedSpray;
  planId: string;
}

function SprayChip({ spray, planId }: SprayChipProps) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const overdue = isOverdue(spray);

  const chipColor = spray.status === 'executed'
    ? 'success'
    : overdue
    ? 'error'
    : 'primary';

  const handleMenuClose = () => setMenuAnchor(null);

  const handleMarkExecuted = () => {
    markSprayExecuted(planId, spray.id, true);
    handleMenuClose();
  };

  const handleMarkPlanned = () => {
    markSprayExecuted(planId, spray.id, false);
    handleMenuClose();
  };

  const handleDelete = () => {
    deleteSpray(planId, spray.id);
    handleMenuClose();
  };

  const label = spray.product.length > 12 ? spray.product.slice(0, 12) + '…' : spray.product;

  return (
    <>
      <Tooltip
        title={`${spray.product} · ${spray.doseValue}${spray.doseUnit} · ${spray.method}${overdue ? ' · OVERDUE' : ''}`}
        arrow
        placement="top"
      >
        <Chip
          label={label}
          size="small"
          color={chipColor}
          variant={spray.status === 'executed' ? 'filled' : 'outlined'}
          onClick={(e) => { e.stopPropagation(); setMenuAnchor(e.currentTarget as HTMLElement); }}
          sx={{
            fontSize: '0.65rem',
            height: 18,
            maxWidth: '100%',
            cursor: 'pointer',
            fontWeight: 600,
            '& .MuiChip-label': { px: 0.75 },
          }}
        />
      </Tooltip>

      <Popover
        open={Boolean(menuAnchor)}
        anchorEl={menuAnchor}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        onClick={(e) => e.stopPropagation()}
        PaperProps={{ sx: { borderRadius: '8px', minWidth: 200 } }}
      >
        <Box sx={{ p: 1.5 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.8125rem', mb: 0.5 }}>
            {spray.product}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', mb: 1 }}>
            {spray.doseValue} {spray.doseUnit} · {spray.method}
            {overdue && (
              <Box component="span" sx={{ color: 'error.main', fontWeight: 700, ml: 0.5 }}>
                · OVERDUE
              </Box>
            )}
          </Typography>
          <Divider sx={{ my: 1 }} />
          <Stack spacing={0.5}>
            {spray.status === 'planned' ? (
              <Button
                size="small" startIcon={<PlayArrow sx={{ fontSize: 16 }} />}
                onClick={handleMarkExecuted}
                sx={{ textTransform: 'none', fontWeight: 600, justifyContent: 'flex-start', color: 'success.main' }}
              >
                Mark executed
              </Button>
            ) : (
              <Button
                size="small"
                onClick={handleMarkPlanned}
                sx={{ textTransform: 'none', fontWeight: 600, justifyContent: 'flex-start', color: 'text.secondary' }}
              >
                Revert to planned
              </Button>
            )}
            <Button
              size="small" startIcon={<Delete sx={{ fontSize: 16 }} />}
              onClick={handleDelete}
              sx={{ textTransform: 'none', fontWeight: 600, justifyContent: 'flex-start', color: 'error.main' }}
            >
              Delete spray
            </Button>
          </Stack>
        </Box>
      </Popover>
    </>
  );
}

// ── Month calendar ──────────────────────────────────────────────────────────────

interface MonthCalendarProps {
  year: number;
  month: number;
  sprays: PlannedSpray[];
  planId: string;
  onPrev: () => void;
  onNext: () => void;
  onDayClick: (day: number, el: HTMLElement) => void;
}

function MonthCalendar({ year, month, sprays, planId, onPrev, onNext, onDayClick }: MonthCalendarProps) {
  const cells = useMemo(() => buildMonthGrid(year, month), [year, month]);

  // Group sprays by day-of-month
  const spraysByDay = useMemo(() => {
    const map = new Map<number, PlannedSpray[]>();
    sprays.forEach((s) => {
      if (!s.date) return;
      if (s.date.getFullYear() === year && s.date.getMonth() === month) {
        const d = s.date.getDate();
        if (!map.has(d)) map.set(d, []);
        map.get(d)!.push(s);
      }
    });
    return map;
  }, [sprays, year, month]);

  const isToday = useCallback((day: number) => {
    const t = DEMO_TODAY;
    return t.getFullYear() === year && t.getMonth() === month && t.getDate() === day;
  }, [year, month]);

  return (
    <Box>
      {/* Month nav */}
      <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
        <IconButton size="small" onClick={onPrev}><ChevronLeft /></IconButton>
        <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem', minWidth: 140, textAlign: 'center' }}>
          {MONTH_NAMES[month]} {year}
        </Typography>
        <IconButton size="small" onClick={onNext}><ChevronRight /></IconButton>
      </Stack>

      {/* Weekday headers */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', mb: 0.5 }}>
        {WEEKDAY_LABELS.map((d) => (
          <Typography key={d} sx={{
            textAlign: 'center', fontSize: '0.6875rem', fontWeight: 700,
            color: 'text.secondary', textTransform: 'uppercase', py: 0.5,
          }}>
            {d}
          </Typography>
        ))}
      </Box>

      {/* Day cells */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', bgcolor: 'divider', border: '1px solid', borderColor: 'divider', borderRadius: '8px', overflow: 'hidden' }}>
        {cells.map((day, idx) => {
          if (day === null) {
            return <Box key={idx} sx={{ bgcolor: 'background.default', minHeight: 72 }} />;
          }
          const daySprays = spraysByDay.get(day) ?? [];
          const hasOverdue = daySprays.some(isOverdue);
          const today = isToday(day);

          return (
            <Box
              key={idx}
              onClick={(e) => onDayClick(day, e.currentTarget as HTMLElement)}
              sx={{
                bgcolor: 'background.paper',
                minHeight: 72,
                p: 0.5,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 0.25,
                '&:hover': { bgcolor: 'action.hover' },
                ...(today && { bgcolor: 'rgba(212,24,61,0.04)', '&:hover': { bgcolor: 'rgba(212,24,61,0.08)' } }),
              }}
            >
              <Typography sx={{
                fontSize: '0.75rem',
                fontWeight: today ? 700 : 400,
                color: today ? 'primary.main' : hasOverdue ? 'error.main' : 'text.primary',
                width: 22, height: 22, lineHeight: '22px', textAlign: 'center',
                ...(today && { bgcolor: 'primary.main', color: 'white', borderRadius: '50%' }),
              }}>
                {day}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, flex: 1, overflow: 'hidden' }}>
                {daySprays.slice(0, 3).map((s) => (
                  <SprayChip key={s.id} spray={s} planId={planId} />
                ))}
                {daySprays.length > 3 && (
                  <Typography sx={{ fontSize: '0.625rem', color: 'text.secondary', fontWeight: 600 }}>
                    +{daySprays.length - 3} more
                  </Typography>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

// ── Side summary panel ──────────────────────────────────────────────────────────

interface SideSummaryProps {
  plan: SprayPlan;
}

function SideSummary({ plan }: SideSummaryProps) {
  const progress = planProgress(plan);
  const overdueCount = plan.sprays.filter(isOverdue).length;

  const handleMarkCompleted = () => setPlanStatus(plan.id, 'completed');
  const handleRevertPending = () => setPlanStatus(plan.id, 'pending');

  return (
    <Box sx={{
      width: 220,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      p: 2,
      bgcolor: 'background.default',
      borderLeft: '1px solid',
      borderColor: 'divider',
    }}>
      <Box>
        <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', mb: 0.5 }}>
          Plan
        </Typography>
        <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', mb: 0.5 }}>
          {plan.name}
        </Typography>
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
          <KindChip kind={plan.kind} />
          <PlanStatusChip status={plan.status} />
        </Stack>
      </Box>

      <Divider />

      <Box>
        <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', mb: 1 }}>
          Progress
        </Typography>
        <Stack direction="row" justifyContent="space-between" alignItems="baseline" mb={0.5}>
          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>
            {progress.executed} / {progress.total} sprays
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
            {progress.pct}%
          </Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={progress.pct}
          color={progress.allExecuted ? 'success' : 'primary'}
          sx={{ height: 6, borderRadius: 3 }}
        />
      </Box>

      {overdueCount > 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, p: 1, bgcolor: 'error.50', borderRadius: '6px', border: '1px solid', borderColor: 'error.200' }}>
          <ErrorOutline sx={{ fontSize: 16, color: 'error.main', flexShrink: 0 }} />
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'error.main' }}>
            {overdueCount} overdue spray{overdueCount !== 1 ? 's' : ''}
          </Typography>
        </Box>
      )}

      {progress.allExecuted && plan.status === 'pending' && (
        <Button
          variant="contained"
          color="success"
          size="small"
          startIcon={<CheckCircle sx={{ fontSize: 16 }} />}
          onClick={handleMarkCompleted}
          sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
        >
          Mark plan completed
        </Button>
      )}

      {plan.status === 'completed' && (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />
            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'success.main' }}>
              Plan completed
            </Typography>
          </Box>
          <Button
            variant="text"
            size="small"
            onClick={handleRevertPending}
            sx={{ textTransform: 'none', fontWeight: 600, color: 'text.secondary', p: 0, justifyContent: 'flex-start' }}
          >
            Revert to pending
          </Button>
        </>
      )}

      <Divider />

      <Box>
        <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', mb: 0.75 }}>
          Season
        </Typography>
        <Typography sx={{ fontSize: '0.8125rem' }}>{plan.season}</Typography>
      </Box>
    </Box>
  );
}

// ── Main component ──────────────────────────────────────────────────────────────

interface SprayPlansCalendarProps {
  plotId: string;
}

export function SprayPlansCalendar({ plotId }: SprayPlansCalendarProps) {
  const allPlans = useSprayPlans();
  const plotPlans = useMemo(() => allPlans.filter((p) => p.plotId === plotId), [allPlans, plotId]);

  // Plan selector: undefined = "All plans" (no calendar edit mode); a plan id = focused plan
  const [selectedPlanId, setSelectedPlanId] = useState<string | 'all'>('all');

  // Month navigation — seed data is 2024, start there for demo
  const [calYear, setCalYear] = useState(2024);
  const [calMonth, setCalMonth] = useState(2); // March = 2

  // Dialogs
  const [newPlanOpen, setNewPlanOpen] = useState(false);

  // Add-spray popover
  const [addSprayAnchor, setAddSprayAnchor] = useState<HTMLElement | null>(null);
  const [addSprayDate, setAddSprayDate] = useState<Date | null>(null);

  const activePlan = useMemo(
    () => (selectedPlanId !== 'all' ? plotPlans.find((p) => p.id === selectedPlanId) : undefined),
    [plotPlans, selectedPlanId],
  );

  // Sprays to show on the calendar:
  // - "All plans" → all sprays from all plans (read-only, can't add)
  // - selected plan → only that plan's sprays (full edit)
  const calendarSprays = useMemo<PlannedSpray[]>(() => {
    if (selectedPlanId === 'all') {
      return plotPlans.flatMap((p) => p.sprays);
    }
    return activePlan?.sprays ?? [];
  }, [selectedPlanId, plotPlans, activePlan]);

  const handlePrevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); }
    else setCalMonth((m) => m - 1);
  };
  const handleNextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); }
    else setCalMonth((m) => m + 1);
  };

  const handleDayClick = (day: number, el: HTMLElement) => {
    if (selectedPlanId === 'all') return; // can't add when "All plans" selected
    const date = new Date(calYear, calMonth, day);
    setAddSprayDate(date);
    setAddSprayAnchor(el);
  };

  const handlePlanCreated = (planId: string) => {
    setSelectedPlanId(planId);
  };

  // Empty state: no plans for this plot
  if (plotPlans.length === 0) {
    return (
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        <EmptyState
          title="Schedule your sprays"
          body="Create a spray plan and map sprays onto a calendar to track your season."
          ctaLabel="New spray plan"
          ctaVariant="contained"
          onCta={() => setNewPlanOpen(true)}
        />
        <NewPlanDialog
          open={newPlanOpen}
          plotId={plotId}
          onClose={() => setNewPlanOpen(false)}
          onCreated={handlePlanCreated}
        />
      </Box>
    );
  }

  // Spray chip for "All plans" view needs a planId — look it up from spray id
  const getPlanIdForSpray = (sprayId: string): string => {
    for (const p of plotPlans) {
      if (p.sprays.some((s) => s.id === sprayId)) return p.id;
    }
    return '';
  };

  return (
    <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Toolbar */}
      <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>Plan</InputLabel>
          <Select
            value={selectedPlanId}
            label="Plan"
            onChange={(e) => setSelectedPlanId(e.target.value)}
          >
            <MenuItem value="all">All plans</MenuItem>
            {plotPlans.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant="soft"
          size="small"
          startIcon={<Add />}
          onClick={() => setNewPlanOpen(true)}
          sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '8px', height: 36 }}
        >
          New plan
        </Button>
        {selectedPlanId === 'all' && (
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8125rem' }}>
            Select a plan to add sprays
          </Typography>
        )}
      </Box>

      {/* Body: calendar + side summary */}
      <Box sx={{ flexGrow: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Calendar area */}
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
          <MonthCalendar
            year={calYear}
            month={calMonth}
            sprays={calendarSprays}
            planId={activePlan?.id ?? ''}
            onPrev={handlePrevMonth}
            onNext={handleNextMonth}
            onDayClick={handleDayClick}
          />
        </Box>

        {/* Side summary — only when a specific plan is selected */}
        {activePlan && <SideSummary plan={activePlan} />}
      </Box>

      {/* Add spray popover */}
      {activePlan && (
        <AddSprayPopover
          anchorEl={addSprayAnchor}
          date={addSprayDate}
          planId={activePlan.id}
          onClose={() => { setAddSprayAnchor(null); setAddSprayDate(null); }}
        />
      )}

      {/* New plan dialog */}
      <NewPlanDialog
        open={newPlanOpen}
        plotId={plotId}
        onClose={() => setNewPlanOpen(false)}
        onCreated={handlePlanCreated}
      />
    </Box>
  );
}
