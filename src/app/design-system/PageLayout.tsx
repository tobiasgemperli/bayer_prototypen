import React, { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';

export type PageLayoutVariant = 'centered' | 'wide';

interface PageLayoutProps {
  /** Breadcrumb element (typically a `<Breadcrumbs>` block). */
  breadcrumbs?: ReactNode;
  /** Page title rendered as `h5`. */
  title?: ReactNode;
  /** Trailing content rendered right of the title — page-level secondary CTAs. Wide variant only. */
  titleActions?: ReactNode;
  /** Main scrollable content. */
  children: ReactNode;
  /** Bottom action-bar content (e.g. Cancel + Save). Omit to hide the action bar. */
  actions?: ReactNode;
  /**
   * `centered` — breadcrumb + title pinned top-left, content as a centered card (max `contentMaxWidth`).
   * `wide`     — breadcrumb + title at top-left in normal flow, content spans the full page width.
   */
  variant?: PageLayoutVariant;
  /** Centered-variant card max width (default 680). Ignored for `wide`. */
  contentMaxWidth?: number;
}

export function PageLayout({
  breadcrumbs,
  title,
  titleActions,
  children,
  actions,
  variant = 'centered',
  contentMaxWidth = 680,
}: PageLayoutProps) {
  const header = (breadcrumbs || title) && (
    <>
      {breadcrumbs}
      {title && (
        <Typography component="div" variant="h5" color="text.primary" sx={{ fontWeight: 700, mt: 1 }}>
          {title}
        </Typography>
      )}
    </>
  );

  if (variant === 'centered') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', bgcolor: 'background.default', height: '100%', overflow: 'hidden' }}>
        <Box sx={{ flex: 1, overflow: 'auto', p: 3, pb: 4 }}>
          <Box sx={{ width: '100%', maxWidth: contentMaxWidth, mx: 'auto' }}>
            {header && <Box sx={{ mb: 3 }}>{header}</Box>}
            {children}
          </Box>
        </Box>
        {actions && (
          <Box sx={{ flexShrink: 0, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', px: 3, py: 1.5 }}>
            <Box sx={{ width: '100%', maxWidth: contentMaxWidth, mx: 'auto', display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
              {actions}
            </Box>
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', bgcolor: 'background.default', height: '100%', overflow: 'hidden' }}>
      {(header || titleActions) && (
        <Box sx={{ flexShrink: 0, px: 3, pt: 3, pb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 2 }}>
          <Box>{header}</Box>
          {titleActions && <Box sx={{ flexShrink: 0 }}>{titleActions}</Box>}
        </Box>
      )}
      <Box sx={{ flex: 1, overflow: 'auto', px: 3, pb: 4 }}>
        {children}
      </Box>
      {actions && (
        <Box sx={{ flexShrink: 0, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', px: 3, py: 1.5, display: 'flex', justifyContent: 'flex-end', gap: 1.5 }}>
          {actions}
        </Box>
      )}
    </Box>
  );
}
