import React from 'react';
import { Tabs } from '@mui/material';

/**
 * Single source of truth for the plot-detail tab strips.
 *
 *  - PrimaryTabs   → the top row (Treatments / Residue forecast / …)
 *  - SecondaryTabs → the second row that lives inside a primary tab
 *                    (Real / + New simulated plan, Samples / Reports / Results, etc.)
 *
 * Both share the same horizontal-spacing strategy — `minWidth: 100` on each
 * `<Tab>` is the inherent gap. They never add `mr` between tabs (that's what
 * made the second row look loose compared with the top row). Difference between
 * primary and secondary is height + indicator weight only.
 */

const baseSx = {
  '& .MuiTab-root': {
    minWidth: 100,
    color: 'text.secondary',
    textTransform: 'none',
    fontWeight: 600,
    fontSize: '0.875rem',
    '&.Mui-selected': { color: 'primary.main' },
  },
} as const;

export interface PlotTabsProps {
  value: number;
  onChange: (event: React.SyntheticEvent, value: number) => void;
  children: React.ReactNode;
}

export function PrimaryTabs({ value, onChange, children }: PlotTabsProps) {
  return (
    <Tabs
      value={value} onChange={onChange}
      indicatorColor="primary" textColor="primary"
      sx={{ minHeight: 48, ...baseSx, '& .MuiTab-root': { ...baseSx['& .MuiTab-root'] } }}
    >
      {children}
    </Tabs>
  );
}

export function SecondaryTabs({ value, onChange, children }: PlotTabsProps) {
  return (
    <Tabs
      value={value} onChange={onChange}
      indicatorColor="primary" textColor="primary"
      sx={{ minHeight: 36, ...baseSx, '& .MuiTab-root': { ...baseSx['& .MuiTab-root'], minHeight: 36 } }}
    >
      {children}
    </Tabs>
  );
}
