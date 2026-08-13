import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Add } from '@mui/icons-material';

interface EmptyStateProps {
  title: string;
  body?: string;
  ctaLabel?: string;
  onCta?: () => void;
  /** Variant of CTA button. Defaults to "outlined". */
  ctaVariant?: 'outlined' | 'contained';
  /** Illustration image URL. When provided, replaces the default sad-box SVG. */
  illustration?: string;
  /** Optional subtle secondary action, rendered as a text link below the primary CTA. */
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Visual tone.
   *  - `initial` (default): full onboarding empty — illustration + min 400px height.
   *  - `filtered`: filter narrowed to nothing — no illustration, 200px min height.
   *  - `inline-row`: compact, designed to drop into a `<TableCell>` — no illustration, single muted line. */
  tone?: 'initial' | 'filtered' | 'inline-row';
}

/** Shared empty state. Renders an illustration (image or default sad-box), title, body, CTA.
 *  Always centered — works whether the parent is a flex column (uses flexGrow) or a
 *  plain Box / overflow-auto wrapper (uses height: 100% + minHeight fallback). */
export function EmptyState({
  title, body, ctaLabel, onCta, ctaVariant = 'outlined',
  illustration, secondaryLabel, onSecondary, tone = 'initial',
}: EmptyStateProps) {
  // inline-row — drop into a `<TableCell colSpan>` with muted text, no chrome.
  if (tone === 'inline-row') {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          {title}
        </Typography>
      </Box>
    );
  }

  // filtered — narrowed by user filter; no illustration, smaller min-height.
  const isFiltered = tone === 'filtered';
  const showIllustration = !isFiltered;

  return (
    <Box sx={{
      flexGrow: 1,
      width: '100%',
      // Fill the parent's height when it has one (e.g. a scrollable content
      // area) so the centering computation has vertical space to work with.
      height: '100%',
      // Fallback for parents that shrink-to-content (no explicit height + no
      // flex chain) — guarantees the empty state always has room to centre.
      minHeight: isFiltered ? 200 : 400,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', textAlign: 'center', p: 4, gap: 3,
    }}>
      {showIllustration && (illustration ? (
        <Box component="img" src={illustration} alt=""
          sx={{ width: 300, height: 200, maxWidth: '100%', objectFit: 'contain', userSelect: 'none', pointerEvents: 'none' }} />
      ) : (
        <Box sx={{ width: 64, height: 64, opacity: 0.85 }}>
          <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="10" y="20" width="44" height="34" rx="3" stroke="#888" strokeWidth="2" fill="#f7f7f7" />
            <path d="M10 28 H54" stroke="#888" strokeWidth="2" />
            <circle cx="24" cy="40" r="1.6" fill="#555" />
            <circle cx="40" cy="40" r="1.6" fill="#555" />
            <path d="M24 48 Q32 44 40 48" stroke="#555" strokeWidth="1.6" fill="none" strokeLinecap="round" />
            <path d="M6 26 Q4 22 8 18" stroke="#888" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M58 26 Q60 22 56 18" stroke="#888" strokeWidth="2" fill="none" strokeLinecap="round" />
          </svg>
        </Box>
      ))}

      {/* Text group — title + description read as one unit (tight spacing) */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxWidth: 420 }}>
        <Typography sx={{ fontWeight: 700, fontSize: '1rem' }}>{title}</Typography>
        {body && (
          <Typography variant="body2" color="text.secondary">{body}</Typography>
        )}
      </Box>

      {(ctaLabel || secondaryLabel) && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          {ctaLabel && onCta && (
            <Button
              variant={ctaVariant} color="primary" startIcon={<Add />} onClick={onCta}
              sx={{ fontWeight: 600, textTransform: 'none', borderRadius: '8px', height: 40, px: 2.5 }}
            >{ctaLabel}</Button>
          )}
          {secondaryLabel && onSecondary && (
            <Button
              variant="text" color="primary" onClick={onSecondary}
              sx={{ fontWeight: 600, textTransform: 'none', fontSize: '0.8125rem' }}
            >{secondaryLabel}</Button>
          )}
        </Box>
      )}
    </Box>
  );
}
