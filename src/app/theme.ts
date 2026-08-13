import { createTheme, alpha } from '@mui/material/styles';
import type {} from '@mui/x-date-pickers/themeAugmentation';

// ── Type augmentations ────────────────────────────────────────────────────────
// Add M3 typography tokens to MUI's Typography variants and prop overrides.
// Add a `softBg` slot to the primary palette for the M3 8 % primary tint.

declare module '@mui/material/styles' {
  interface TypographyVariants {
    headlineSmall: React.CSSProperties;
    titleLarge: React.CSSProperties;
    titleMedium: React.CSSProperties;
    titleSmall: React.CSSProperties;
    bodyLarge: React.CSSProperties;
    bodyMedium: React.CSSProperties;
    bodySmall: React.CSSProperties;
    labelLarge: React.CSSProperties;
    labelMedium: React.CSSProperties;
    labelSmall: React.CSSProperties;
  }
  interface TypographyVariantsOptions {
    headlineSmall?: React.CSSProperties;
    titleLarge?: React.CSSProperties;
    titleMedium?: React.CSSProperties;
    titleSmall?: React.CSSProperties;
    bodyLarge?: React.CSSProperties;
    bodyMedium?: React.CSSProperties;
    bodySmall?: React.CSSProperties;
    labelLarge?: React.CSSProperties;
    labelMedium?: React.CSSProperties;
    labelSmall?: React.CSSProperties;
  }
  interface PaletteColor {
    softBg?: string;
  }
  interface SimplePaletteColorOptions {
    softBg?: string;
  }
}
declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    headlineSmall: true;
    titleLarge: true;
    titleMedium: true;
    titleSmall: true;
    bodyLarge: true;
    bodyMedium: true;
    bodySmall: true;
    labelLarge: true;
    labelMedium: true;
    labelSmall: true;
  }
}
declare module '@mui/material/Button' {
  interface ButtonPropsVariantOverrides {
    soft: true;
  }
}

// ── Tokens ────────────────────────────────────────────────────────────────────
// Single source for the values that show up everywhere in `sx={}`.

const BRAND = {
  main: '#d4183d',
  light: '#e14664',
  dark: '#94102a',
  contrastText: '#ffffff',
};

// M3 elevation level-2 (used by 6 papers in the codebase already — kept here so
// every paper renders the same shadow once they switch to `elevation={2}`).
const M3_SHADOW_LEVEL_2 =
  '0px 1px 2px rgba(0,0,0,0.3), 0px 2px 6px 2px rgba(0,0,0,0.15)';

// ── Theme ─────────────────────────────────────────────────────────────────────

export const theme = createTheme({
  palette: {
    primary: {
      ...BRAND,
      softBg: alpha(BRAND.main, 0.08),
    },
    secondary: {
      main: '#94102a',
    },
    error: {
      main: '#d32f2f',
      light: '#fff5f5',
      dark: '#a02020',
      softBg: alpha('#d32f2f', 0.08),
    },
    warning: {
      main: '#ed6c02',
      light: '#ff9800',
      dark: '#b35200',
      softBg: alpha('#ed6c02', 0.08),
    },
    info: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
      softBg: alpha('#1976d2', 0.08),
    },
    success: {
      main: '#2c5a3e',
      light: '#4caf50',
      dark: '#1b5e20',
      softBg: alpha('#2c5a3e', 0.08),
    },
    background: {
      default: '#F6F7F9',
      paper: '#ffffff',
    },
    text: {
      primary: '#2E2E2E',
      secondary: '#4B5563',
    },
    divider: 'rgba(0,0,0,0.12)',
  },
  shape: {
    // M3 default. Per-component overrides below tweak this for Buttons (6, the
    // existing brand value) and Dialogs/Cards (12) — everything else (chips,
    // surfaces, fields) lands on 8.
    borderRadius: 8,
  },
  // M3 elevation level-2 is the de-facto shadow used by every dialog and the
  // SprayStatusChip menu. Setting it at index 2 means callers can just do
  // `elevation={2}` and get the right value.
  shadows: [
    'none',
    '0px 1px 2px rgba(0,0,0,0.3), 0px 1px 3px 1px rgba(0,0,0,0.15)', // level 1
    M3_SHADOW_LEVEL_2,                                                // level 2
    '0px 4px 8px 3px rgba(0,0,0,0.15), 0px 1px 3px rgba(0,0,0,0.30)', // level 3
    '0px 6px 10px 4px rgba(0,0,0,0.15), 0px 2px 3px rgba(0,0,0,0.30)', // level 4
    '0px 8px 12px 6px rgba(0,0,0,0.15), 0px 4px 4px rgba(0,0,0,0.30)', // level 5
    ...Array(19).fill(M3_SHADOW_LEVEL_2),
  ] as any,
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    // ── M3 type scale ──
    // Headline — page titles
    headlineSmall: { fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.33, letterSpacing: 0 },
    // Title — section / dialog titles
    titleLarge:    { fontSize: '1.375rem', fontWeight: 600, lineHeight: 1.27, letterSpacing: 0 },
    titleMedium:   { fontSize: '1rem',     fontWeight: 600, lineHeight: 1.5,  letterSpacing: '0.009em' },
    titleSmall:    { fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.43, letterSpacing: '0.007em' },
    // Body — paragraph / metadata
    bodyLarge:     { fontSize: '1rem',     fontWeight: 400, lineHeight: 1.5,  letterSpacing: 0 },
    bodyMedium:    { fontSize: '0.875rem', fontWeight: 400, lineHeight: 1.43, letterSpacing: 0 },
    bodySmall:     { fontSize: '0.75rem',  fontWeight: 400, lineHeight: 1.33, letterSpacing: 0 },
    // Label — UI affordances (buttons, tabs, field labels, chips, headers)
    labelLarge:    { fontSize: '0.875rem', fontWeight: 500, lineHeight: 1.43, letterSpacing: '0.007em' },
    labelMedium:   { fontSize: '0.75rem',  fontWeight: 500, lineHeight: 1.33, letterSpacing: '0.042em' },
    labelSmall:    { fontSize: '0.6875rem', fontWeight: 500, lineHeight: 1.45, letterSpacing: '0.045em' },
    // Keep the global `button` override — every MUI Button reads it.
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  components: {
    // ── Buttons ────────────────────────────────────────────────────────────────
    // Keep the brand's 6 px corner (deliberate deviation from the 8 px shape
    // default). The `soft` variant stays — it's the de-facto tonal button.
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '6px',
        },
      },
      variants: [
        {
          props: { variant: 'soft' },
          style: ({ theme, ownerState }) => {
            const palette = theme.palette as unknown as Record<string, { main: string }>;
            const color = ownerState.color && ownerState.color !== 'inherit'
              ? palette[ownerState.color]
              : theme.palette.primary;
            return {
              backgroundColor: alpha(color.main, 0.08),
              color: color.main,
              boxShadow: 'none',
              '&:hover': {
                backgroundColor: alpha(color.main, 0.16),
                boxShadow: 'none',
              },
              '&:active': {
                backgroundColor: alpha(color.main, 0.24),
              },
              '&.Mui-disabled': {
                backgroundColor: alpha(color.main, 0.04),
                color: alpha(color.main, 0.4),
              },
            };
          },
        },
      ],
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '0.875rem',
        },
      },
    },
    // ── Inputs ─────────────────────────────────────────────────────────────────
    // 8 px to match the `fieldSx` override that's currently applied in ~30 call
    // sites. Once this lands, those inline overrides become no-ops.
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          backgroundColor: '#ffffff',
        },
      },
    },
    // ── Surfaces ───────────────────────────────────────────────────────────────
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: '12px',
        },
      },
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
    },
    // Floating dropdown / menu surfaces — restore shadow suppressed by MuiPaper elevation: 0.
    MuiAutocomplete: {
      styleOverrides: {
        paper: {
          boxShadow: M3_SHADOW_LEVEL_2,
          borderRadius: '8px',
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          boxShadow: M3_SHADOW_LEVEL_2,
        },
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: {
          boxShadow: M3_SHADOW_LEVEL_2,
        },
      },
    },
    // ── Tables ─────────────────────────────────────────────────────────────────
    // The 30+ verbatim copies of header sx blocks collapse into this one rule.
    // `stickyHeader` matches AG-Grid's white header (`headerBackgroundColor` in
    // grid-shared.tsx) instead of MUI's own grey `stickyHeader` default; `head`
    // drops the all-caps transform to match AG-Grid's `GridColumnHeader`
    // convention (locked/auto-generated AG-Grid columns still render uppercase
    // via `LockedHeader`'s own inline sx — that's independent of this override).
    MuiTableCell: {
      styleOverrides: {
        head: ({ theme }) => ({
          ...theme.typography.labelMedium,
          color: theme.palette.text.secondary,
          fontWeight: 700,
        }),
        body: ({ theme }) => ({
          ...theme.typography.bodyMedium,
          color: theme.palette.text.primary,
        }),
        stickyHeader: ({ theme }) => ({
          backgroundColor: theme.palette.background.paper,
        }),
      },
    },
    // ── Date pickers ───────────────────────────────────────────────────────────
    MuiDatePicker: {
      defaultProps: {
        slotProps: {
          popper: { placement: 'bottom-end' },
        },
      },
    },
    MuiDesktopDatePicker: {
      defaultProps: {
        slotProps: {
          popper: { placement: 'bottom-end' },
        },
      },
    },
  },
});
