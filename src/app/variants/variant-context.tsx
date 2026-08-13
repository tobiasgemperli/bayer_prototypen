import React, { createContext, useCallback, useContext } from 'react';
import {
  useNavigate as rrUseNavigate,
  NavigateFunction, NavigateOptions, To,
} from 'react-router';

/** ID of the currently active variant, or null when on the baseline. */
const VariantContext = createContext<string | null>(null);

export function VariantProvider({
  id, children,
}: { id: string | null; children: React.ReactNode }) {
  return <VariantContext.Provider value={id}>{children}</VariantContext.Provider>;
}

export function useVariantId(): string | null {
  return useContext(VariantContext);
}

/**
 * Drop-in replacement for react-router's useNavigate.
 * When inside a variant, absolute paths get auto-prefixed with /v/:variantId/.
 * Baseline and external/relative paths pass through unchanged.
 */
export function useNavigate(): NavigateFunction {
  const variantId = useContext(VariantContext);
  const rrNavigate = rrUseNavigate();

  return useCallback(((to: To | number, options?: NavigateOptions) => {
    if (typeof to === 'number') {
      rrNavigate(to);
      return;
    }
    if (variantId) {
      if (typeof to === 'string' && to.startsWith('/')) {
        rrNavigate(`/v/${variantId}${to === '/' ? '' : to}`, options);
        return;
      }
      if (typeof to === 'object' && to.pathname?.startsWith('/')) {
        rrNavigate({ ...to, pathname: `/v/${variantId}${to.pathname === '/' ? '' : to.pathname}` }, options);
        return;
      }
    }
    rrNavigate(to as To, options);
  }) as NavigateFunction, [variantId, rrNavigate]);
}
