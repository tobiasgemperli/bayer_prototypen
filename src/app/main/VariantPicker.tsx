import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Box, Button, Paper, Typography, Divider, Collapse } from '@mui/material';
import {
  Science, Check, ExpandMore, FolderOutlined, ScienceOutlined,
} from '@mui/icons-material';
import { PROJECTS, ProjectVersion } from '../variants/projects';
import { useDemoMode, setDemoMode, setAuthPhase, startOnboarding } from '../data/auth-state';
import { loadSeedData, clearPlots } from '../data/plots-data';

/**
 * Floating prototype navigator — the button is fixed at the bottom-right; the panel
 * is pinned by its bottom-right corner just above it, so it grows UP (and extends
 * LEFT) as folders expand, and scrolls instead of overflowing the viewport.
 *
 * Baseline (the main prototype) is standalone; each project is an accordion folder
 * of numbered versions (V1, V2 … + bracketed description).
 */
export function VariantPicker() {
  const location = useLocation();
  const navigate = useNavigate();
  const demoMode = useDemoMode();
  const [open, setOpen] = useState(false);

  const { activeId, basePath } = useMemo(() => parseVariantPath(location.pathname), [location.pathname]);
  const isOnboardingMode = demoMode === 'onboarding';
  const isRegister = location.pathname.startsWith('/signup');
  const onRoutedVersion = PROJECTS.some(p => p.versions.some(v => v.route && v.route === location.pathname));
  const inApp = !isOnboardingMode && !isRegister && !onRoutedVersion;
  const isBaseline = inApp && activeId == null;

  const isVersionActive = (v: ProjectVersion): boolean =>
    v.variantId ? inApp && activeId === v.variantId
      : v.flow === 'register' ? isRegister
        : v.flow === 'onboarding' ? isOnboardingMode
          : v.route ? location.pathname === v.route
            : false;

  let activeProjectName: string | null = null;
  let activeVersionText: string | null = null;
  for (const p of PROJECTS) {
    for (const v of p.versions) {
      if (isVersionActive(v)) { activeProjectName = p.name; activeVersionText = versionLabel(v.label); }
    }
  }

  const [openProject, setOpenProject] = useState<string | null>(activeProjectName ?? PROJECTS[0].name);
  const buttonLabel = isBaseline ? 'Baseline' : (activeVersionText ?? 'Baseline');

  // ── Actions ──────────────────────────────────────────────────────────────────
  const goLabVariant = (variantId: string | null) => {
    setOpen(false);
    if (inApp) {
      if (variantId === activeId) return;
      if (variantId == null) navigate(basePath, { state: location.state });
      else navigate(`/v/${variantId}${basePath === '/' ? '' : basePath}`, { state: location.state });
    } else {
      setDemoMode('seeded'); setAuthPhase('signed-in'); loadSeedData();
      navigate(variantId ? `/v/${variantId}/plot/1` : '/plot/1');
    }
  };
  const goRegister = () => { setOpen(false); setDemoMode('empty'); setAuthPhase('signed-in'); clearPlots(); navigate('/signup'); };
  const goOnboarding = () => { setOpen(false); startOnboarding(); clearPlots(); navigate('/'); };

  const selectVersion = (v: ProjectVersion) => {
    if (v.variantId) goLabVariant(v.variantId);
    else if (v.flow === 'register') goRegister();
    else if (v.flow === 'onboarding') goOnboarding();
    else if (v.route) { setOpen(false); navigate(v.route); }
  };

  const rowSx = {
    display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1, cursor: 'pointer',
    '&:hover': { bgcolor: 'action.hover' },
  } as const;

  return (
    <Box sx={{ position: 'fixed', right: 16, bottom: 16, zIndex: 1300 }}>
      {/* click-away backdrop */}
      {open && <Box onClick={() => setOpen(false)} sx={{ position: 'fixed', inset: 0 }} />}

      {/* panel — pinned bottom-right above the button, grows up + left */}
      {open && (
        <Paper elevation={8} sx={{
          position: 'absolute', bottom: 'calc(100% + 8px)', right: 0,
          width: 320, maxHeight: 'calc(100vh - 96px)', overflowY: 'auto',
          borderRadius: '12px',
        }}>
          <Box sx={{ px: 2, pt: 1.5, pb: 1, position: 'sticky', top: 0, bgcolor: 'background.paper', zIndex: 1 }}>
            <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700 }}>Prototype navigator</Typography>
            <Typography variant="caption" color="text.secondary">Baseline + project versions</Typography>
          </Box>

          {/* Baseline — standalone */}
          <Box sx={{ ...rowSx, bgcolor: isBaseline ? 'rgba(212,24,61,0.06)' : undefined }} onClick={() => goLabVariant(null)}>
            <Box sx={{ width: 22, display: 'flex', justifyContent: 'center' }}>
              {isBaseline ? <Check fontSize="small" color="primary" /> : <ScienceOutlined fontSize="small" sx={{ color: 'text.disabled' }} />}
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: '0.875rem', fontWeight: 600 }}>Baseline</Typography>
              <Typography variant="caption" color="text.secondary">The main prototype</Typography>
            </Box>
          </Box>

          <Divider />

          {/* Projects — accordion folders */}
          {PROJECTS.map((project) => {
            const expanded = openProject === project.name;
            return (
              <Box key={project.name}>
                <Box sx={rowSx} onClick={() => setOpenProject(expanded ? null : project.name)}>
                  <FolderOutlined fontSize="small" sx={{ color: 'text.secondary' }} />
                  <Typography sx={{ flex: 1, fontSize: '0.875rem', fontWeight: 700 }}>{project.name}</Typography>
                  <ExpandMore fontSize="small" sx={{ color: 'text.secondary', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
                </Box>
                <Collapse in={expanded}>
                  <Box sx={{ pb: 0.5 }}>
                    {project.versions.map((v) => {
                      const on = isVersionActive(v);
                      return (
                        <Box key={v.label + v.description}
                          sx={{ ...rowSx, alignItems: 'flex-start', pl: 4, py: 0.75, bgcolor: on ? 'rgba(212,24,61,0.06)' : undefined }}
                          onClick={() => selectVersion(v)}>
                          <Box sx={{ width: 22, display: 'flex', justifyContent: 'center', pt: 0.25 }}>
                            {on && <Check fontSize="small" color="primary" />}
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography sx={{ fontSize: '0.875rem', fontWeight: on ? 700 : 500, color: on ? 'primary.main' : 'text.primary' }}>
                              {versionLabel(v.label)}
                            </Typography>
                            <Typography sx={{ fontSize: '0.75rem', color: on ? 'primary.main' : 'text.secondary', mt: 0.125 }}>
                              {v.description}
                            </Typography>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                </Collapse>
                <Divider />
              </Box>
            );
          })}
        </Paper>
      )}

      <Button
        variant="contained"
        onClick={() => { if (!open) setOpenProject(activeProjectName ?? PROJECTS[0].name); setOpen(o => !o); }}
        startIcon={<Science fontSize="small" />}
        sx={{
          position: 'relative',
          textTransform: 'none', fontWeight: 600, borderRadius: '999px',
          bgcolor: isBaseline ? 'text.primary' : 'primary.main', color: 'white',
          '&:hover': { bgcolor: isBaseline ? 'text.secondary' : 'primary.dark' },
          boxShadow: 3, px: 2, height: 38,
        }}
      >
        {buttonLabel}
      </Button>
    </Box>
  );
}

/** "V14" -> "Version 14" — spelled out for readability, both in the closed-nav
 *  button label and the open panel's version rows. */
function versionLabel(label: string): string {
  return label.replace(/^V/, 'Version ');
}

/** Splits /v/:variantId/... into { activeId, basePath }. Returns {activeId: null, basePath: pathname} for baseline. */
function parseVariantPath(pathname: string): { activeId: string | null; basePath: string } {
  const m = pathname.match(/^\/v\/([^/]+)(\/.*)?$/);
  if (m) return { activeId: m[1], basePath: m[2] || '/' };
  return { activeId: null, basePath: pathname };
}
