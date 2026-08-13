import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography, Fade } from '@mui/material';
import { Check as CheckIcon } from '@mui/icons-material';
import { useDemoMode, useOnboardingStep, useStepProgress, useCoachActive } from '../data/auth-state';

const STEPS = [
  { key: 'create-plot', label: 'Create plot' },
  { key: 'add-treatment', label: 'Add treatment' },
  { key: 'view-forecast', label: 'Residue forecast' },
] as const;

const RED = '#d4183d';
const GREEN = '#4caf50';
const GRAY = '#e0e0e0';
const DOT = 28;
const CROSSFADE = 600;
const SWEEP_DURATION = 10000;

export function OnboardingCoach() {
  const demoMode = useDemoMode();
  const step = useOnboardingStep();
  const progress = useStepProgress();
  const coachActive = useCoachActive();
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'active' | 'completing' | 'success' | 'hidden'>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const isOnboarding = demoMode === 'onboarding';
  const isDone = step === 'done';

  useEffect(() => {
    clearTimeout(timerRef.current);

    if (isDone && phase === 'active') {
      // Step 1: turn last dot green (completing phase)
      setPhase('completing');
      // Step 2: after a beat, crossfade to success content
      timerRef.current = setTimeout(() => {
        setPhase('success');
        // Step 3: after sweep, fade out and hide
        setTimeout(() => {
          setVisible(false);
          setTimeout(() => setPhase('hidden'), CROSSFADE);
        }, SWEEP_DURATION + 400);
      }, 800);
    } else if (isOnboarding && coachActive && !isDone && phase !== 'active') {
      setPhase('active');
      timerRef.current = setTimeout(() => setVisible(true), 300);
    } else if (!isOnboarding && !isDone && phase !== 'idle') {
      setPhase('idle');
      setVisible(false);
    }

    return () => clearTimeout(timerRef.current);
  }, [isOnboarding, coachActive, isDone]);

  useEffect(() => {
    if (isOnboarding && !coachActive) {
      setPhase('idle');
      setVisible(false);
    }
  }, [isOnboarding, coachActive]);

  if (phase === 'idle' || phase === 'hidden') return null;

  const activeIndex = STEPS.findIndex(s => s.key === step);
  const currentLabel = STEPS[activeIndex]?.label || '';
  const isSuccess = phase === 'success';
  const isCompleting = phase === 'completing';

  // In completing phase, all dots are green (last step just turned green)
  function getState(i: number): 'completed' | 'active' | 'upcoming' {
    if (isCompleting || isSuccess) return 'completed';
    if (i < activeIndex) return 'completed';
    if (i === activeIndex) return 'active';
    return 'upcoming';
  }

  function lineFill(fromIdx: number): { color: string; pct: number } {
    if (isCompleting || isSuccess) return { color: GREEN, pct: 100 };
    if (fromIdx < activeIndex) return { color: GREEN, pct: 100 };
    if (fromIdx === activeIndex) return { color: RED, pct: progress * 100 };
    return { color: GRAY, pct: 0 };
  }

  return (
    <Fade in={visible} timeout={CROSSFADE}>
      <Box sx={{
        position: 'fixed', bottom: 24, left: 24, zIndex: 1200,
        bgcolor: 'background.paper', borderRadius: '12px', overflow: 'hidden',
        border: '1px solid rgba(0,0,0,0.20)',
        boxShadow: '0 2px 16px rgba(0,0,0,0.10), 0 0 1px rgba(0,0,0,0.08)',
        px: 2.5, py: 2, width: 240,
      }}>
        {/* Sweep overlay — only in success phase */}
        {isSuccess && (
          <Box sx={{
            position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3,
          }}>
            <Box sx={{
              position: 'absolute', top: 0, left: 0, bottom: 0, width: '100%',
              bgcolor: 'rgba(0,0,0,0.05)',
              animation: `coachSweep ${SWEEP_DURATION}ms linear forwards`,
            }} />
          </Box>
        )}

        {/* Active content — fades out on success */}
        <Box sx={{
          opacity: isSuccess ? 0 : 1,
          transition: `opacity ${CROSSFADE}ms ease`,
          position: isSuccess ? 'absolute' : 'relative',
          inset: isSuccess ? 0 : undefined,
          px: isSuccess ? 2.5 : 0,
          py: isSuccess ? 2 : 0,
          zIndex: 1,
        }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
            See your residue forecast
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 700, mb: 2 }}>
            {currentLabel}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', height: DOT }}>
            {STEPS.map((s, i) => {
              const st = getState(i);
              const bg = st === 'completed' ? GREEN : st === 'active' ? RED : GRAY;
              const fg = st === 'upcoming' ? 'text.disabled' : 'white';
              return (
                <React.Fragment key={s.key}>
                  {i > 0 && (
                    <Box sx={{ flex: 1, height: 3, bgcolor: GRAY, borderRadius: 1, position: 'relative', overflow: 'hidden', mx: -0.25 }}>
                      <Box sx={{
                        position: 'absolute', left: 0, top: 0, height: '100%',
                        bgcolor: lineFill(i - 1).color,
                        width: `${lineFill(i - 1).pct}%`,
                        transition: 'width 0.5s ease, background-color 0.5s ease',
                      }} />
                    </Box>
                  )}
                  <Box sx={{
                    width: DOT, height: DOT, borderRadius: '50%', flexShrink: 0,
                    bgcolor: bg, transition: 'background-color 0.5s ease, box-shadow 0.5s ease',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative', zIndex: 1,
                    ...(st === 'active' && {
                      boxShadow: '0 0 0 4px rgba(212,24,61,0.12)',
                      animation: 'coachGlow 3s ease-in-out infinite',
                    }),
                  }}>
                    {st === 'completed' ? (
                      <CheckIcon sx={{ fontSize: 16, color: 'white' }} />
                    ) : (
                      <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: fg, lineHeight: 1 }}>{i + 1}</Typography>
                    )}
                  </Box>
                </React.Fragment>
              );
            })}
          </Box>
        </Box>

        {/* Success content — fades in */}
        <Box sx={{
          opacity: isSuccess ? 1 : 0,
          transition: `opacity ${CROSSFADE}ms ease`,
          position: isSuccess ? 'relative' : 'absolute',
          inset: isSuccess ? undefined : 0,
          px: isSuccess ? 0 : 2.5,
          py: isSuccess ? 0 : 2,
          zIndex: 2,
          pointerEvents: isSuccess ? 'auto' : 'none',
        }}>
          <Box sx={{
            width: DOT, height: DOT, borderRadius: '50%', mb: 1.5,
            bgcolor: GREEN, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CheckIcon sx={{ fontSize: 16, color: 'white' }} />
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.25 }}>
            Goal reached
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            Congratulations on your first forecast
          </Typography>
        </Box>

        <style>{`
          @keyframes coachGlow {
            0%, 100% { box-shadow: 0 0 0 4px rgba(212,24,61,0.12); }
            50% { box-shadow: 0 0 0 7px rgba(212,24,61,0.06); }
          }
          @keyframes coachSweep {
            0% { clip-path: inset(0 100% 0 0); }
            100% { clip-path: inset(0 0 0 0); }
          }
        `}</style>
      </Box>
    </Fade>
  );
}
