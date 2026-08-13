import React, { useMemo } from 'react';
import {
  Box, Button, Chip, Divider, Stack, Step, StepLabel, Stepper,
  Table, TableBody, TableCell, TableHead, TableRow, Typography, Checkbox,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import {
  useSprayPlans,
  addPlan,
  addSpray,
  convertToPlanned,
  markSprayExecuted,
  setPlanStatus,
  planProgress,
  suggestedStatus,
  SprayPlan,
} from '../../data/spray-plans-data';
import { EmptyState } from '../../design-system/EmptyState';
import noTreatmentImg from '../../assets/empty-states/no-treatment-yet-v01.jpg';

// ── Step derivation ────────────────────────────────────────────────────────────

/**
 * Derive the active stepper step (0–3) from plan data.
 *
 *   0 → Simulated    (kind === 'simulated')
 *   1 → Planned      (kind === 'planned', 0 sprays executed)
 *   2 → In progress  (kind === 'planned', some but not all sprays executed)
 *   3 → Completed    (status === 'completed', or all sprays executed and confirmed)
 */
function deriveStep(plan: SprayPlan): number {
  if (plan.status === 'completed') return 3;
  if (plan.kind === 'simulated') return 0;
  const { executed, allExecuted } = planProgress(plan);
  if (allExecuted) return 3;
  if (executed > 0) return 2;
  return 1;
}

const STEP_LABELS = ['Simulated', 'Planned', 'In progress', 'Completed'];

// ── Kind chip ──────────────────────────────────────────────────────────────────

function KindChip({ kind }: { kind: SprayPlan['kind'] }) {
  return (
    <Chip
      label={kind === 'simulated' ? 'Simulation' : 'Plan'}
      size="small"
      color={kind === 'simulated' ? 'default' : 'primary'}
      variant={kind === 'simulated' ? 'outlined' : 'filled'}
      sx={{ fontWeight: 600, fontSize: '0.75rem' }}
    />
  );
}

// ── Status chip ────────────────────────────────────────────────────────────────

function StatusChip({ status }: { status: SprayPlan['status'] }) {
  if (status === 'completed') {
    return (
      <Chip
        label="Completed"
        size="small"
        color="success"
        variant="outlined"
        sx={{ fontWeight: 600, fontSize: '0.75rem' }}
      />
    );
  }
  return null;
}

// ── Format helpers ─────────────────────────────────────────────────────────────

function fmtDate(d: Date | null | undefined): string {
  if (!d) return '—';
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

// ── Plan panel ─────────────────────────────────────────────────────────────────

function PlanPanel({ plan }: { plan: SprayPlan }) {
  const activeStep = deriveStep(plan);
  const progress = planProgress(plan);
  const suggested = suggestedStatus(plan);

  // Stage actions
  const showCommit = plan.kind === 'simulated';
  const showConfirmCompleted =
    suggested === 'completed' && plan.status !== 'completed' && plan.kind === 'planned';
  const showReopen = plan.status === 'completed';

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '10px',
        overflow: 'hidden',
        bgcolor: 'background.paper',
      }}
    >
      {/* Plan header */}
      <Box
        sx={{
          px: 2.5,
          py: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'action.hover',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem', flex: 1 }}>
          {plan.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {plan.season}
        </Typography>
        <KindChip kind={plan.kind} />
        <StatusChip status={plan.status} />
      </Box>

      {/* Stepper */}
      <Box sx={{ px: 3, py: 2.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {STEP_LABELS.map((label) => (
            <Step key={label}>
              <StepLabel
                sx={{
                  '& .MuiStepLabel-label': {
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    mt: 0.5,
                  },
                }}
              >
                {label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      {/* Sprays table */}
      <Box sx={{ px: 0 }}>
        {plan.sprays.length > 0 ? (
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Product', 'Date', 'Dose', 'Method', 'Executed', 'Executed on'].map(
                  (col) => (
                    <TableCell
                      key={col}
                      sx={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: 'text.secondary',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        py: 1.25,
                        px: 2,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                      }}
                    >
                      {col}
                    </TableCell>
                  )
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {plan.sprays.map((spray) => {
                const isExecuted = spray.status === 'executed';
                return (
                  <TableRow
                    key={spray.id}
                    hover
                    sx={{
                      '&:last-child td': { borderBottom: 0 },
                      bgcolor: isExecuted ? 'rgba(76,175,80,0.04)' : 'inherit',
                    }}
                  >
                    <TableCell sx={{ px: 2, py: 1.25, fontSize: '0.875rem' }}>
                      {spray.product || '—'}
                    </TableCell>
                    <TableCell sx={{ px: 2, py: 1.25, fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                      {fmtDate(spray.date)}
                    </TableCell>
                    <TableCell sx={{ px: 2, py: 1.25, fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                      {spray.doseValue ? `${spray.doseValue} ${spray.doseUnit}` : '—'}
                    </TableCell>
                    <TableCell sx={{ px: 2, py: 1.25, fontSize: '0.875rem' }}>
                      {spray.method || '—'}
                    </TableCell>
                    <TableCell sx={{ px: 2, py: 1.25 }}>
                      <Checkbox
                        checked={isExecuted}
                        onChange={(e) =>
                          markSprayExecuted(plan.id, spray.id, e.target.checked)
                        }
                        size="small"
                        color="success"
                        sx={{ p: 0 }}
                      />
                    </TableCell>
                    <TableCell
                      sx={{
                        px: 2,
                        py: 1.25,
                        fontSize: '0.875rem',
                        color: isExecuted ? 'text.primary' : 'text.disabled',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {fmtDate(spray.executedDate)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <Box sx={{ px: 2.5, py: 2 }}>
            <Typography variant="body2" color="text.secondary">
              No sprays yet.
            </Typography>
          </Box>
        )}
      </Box>

      {/* Plan footer — actions */}
      <Box
        sx={{
          px: 2.5,
          py: 1.75,
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'action.hover',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          flexWrap: 'wrap',
        }}
      >
        {/* Progress text */}
        {plan.kind === 'planned' && plan.status !== 'completed' && (
          <Typography variant="body2" color="text.secondary" sx={{ flex: 1, fontSize: '0.8125rem' }}>
            {progress.executed} / {progress.total} spray{progress.total !== 1 ? 's' : ''} executed
          </Typography>
        )}
        {plan.status === 'completed' && (
          <Typography
            variant="body2"
            color="success.main"
            sx={{ flex: 1, fontSize: '0.8125rem', fontWeight: 600 }}
          >
            All {progress.total} spray{progress.total !== 1 ? 's' : ''} executed — plan completed
          </Typography>
        )}
        {plan.kind === 'simulated' && (
          <Typography variant="body2" color="text.secondary" sx={{ flex: 1, fontSize: '0.8125rem' }}>
            Simulation — commit to make it a live plan
          </Typography>
        )}

        {/* Add spray (always outlined, never primary per conventions) */}
        {!showReopen && (
          <Button
            variant="soft"
            size="small"
            startIcon={<Add />}
            onClick={() => addSpray(plan.id)}
            sx={{ fontWeight: 600, textTransform: 'none', borderRadius: '8px', height: 34 }}
          >
            Add spray
          </Button>
        )}

        {/* Simulated → Commit to plan (primary when it's the stage action) */}
        {showCommit && (
          <Button
            variant="contained"
            size="small"
            color="primary"
            onClick={() => convertToPlanned(plan.id)}
            sx={{ fontWeight: 600, textTransform: 'none', borderRadius: '8px', height: 34 }}
          >
            Commit to plan
          </Button>
        )}

        {/* All executed — confirm completed */}
        {showConfirmCompleted && (
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Typography variant="body2" color="success.main" sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>
              All sprays executed
            </Typography>
            <Button
              variant="contained"
              size="small"
              color="success"
              onClick={() => setPlanStatus(plan.id, 'completed')}
              sx={{ fontWeight: 600, textTransform: 'none', borderRadius: '8px', height: 34 }}
            >
              Confirm completed
            </Button>
          </Stack>
        )}

        {/* Reopen — only shown when plan is completed */}
        {showReopen && (
          <Button
            variant="soft"
            size="small"
            color="inherit"
            onClick={() => setPlanStatus(plan.id, 'pending')}
            sx={{ fontWeight: 600, textTransform: 'none', borderRadius: '8px', height: 34, color: 'text.secondary' }}
          >
            Reopen
          </Button>
        )}
      </Box>
    </Box>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

export function SprayPlansLifecycle({ plotId }: { plotId: string }) {
  const allPlans = useSprayPlans();
  const plans = useMemo(() => allPlans.filter((p) => p.plotId === plotId), [allPlans, plotId]);

  const handleNewPlan = () => {
    addPlan(plotId, { kind: 'simulated' });
  };

  // Empty state — CTA is the only control on screen (toolbar hidden per conventions)
  if (plans.length === 0) {
    return (
      <EmptyState
        illustration={noTreatmentImg}
        title="Start with a simulation"
        body="Model your spray programme as a simulation, then commit it to a live plan and track execution spray by spray."
        ctaLabel="New spray plan"
        ctaVariant="contained"
        onCta={handleNewPlan}
      />
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Toolbar — only shown when plans exist */}
      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>
          {plans.length} spray plan{plans.length !== 1 ? 's' : ''}
        </Typography>
        <Button
          variant="soft"
          color="primary"
          size="small"
          startIcon={<Add />}
          onClick={handleNewPlan}
          sx={{ fontWeight: 600, textTransform: 'none', borderRadius: '8px', height: 34 }}
        >
          New plan
        </Button>
      </Box>

      {/* Plan list */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2.5 }}>
        <Stack spacing={2.5}>
          {plans.map((plan, idx) => (
            <React.Fragment key={plan.id}>
              <PlanPanel plan={plan} />
              {idx < plans.length - 1 && <Divider sx={{ display: 'none' }} />}
            </React.Fragment>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}
