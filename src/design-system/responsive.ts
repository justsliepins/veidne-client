import { veidneTokens } from './tokens';

/**
 * Media query strings for use in Griffel makeStyles.
 * Usage in any .styles.ts file:
 *
 * import { media } from '@/design-system/responsive';
 *
 * export const useStyles = makeStyles({
 *   root: {
 *     padding: '48px',
 *     [media.below.md]: { padding: '16px' },
 *     [media.below.sm]: { padding: '12px' },
 *   },
 * });
 */

const bp = veidneTokens.breakpoints;

export const media = {
  // Mobile-first: apply when viewport is AT LEAST this wide
  above: {
    sm: `@media (min-width: ${bp.sm})`,
    md: `@media (min-width: ${bp.md})`,
    lg: `@media (min-width: ${bp.lg})`,
    xl: `@media (min-width: ${bp.xl})`,
  },
  // Desktop-first: apply when viewport is BELOW this width
  below: {
    sm: `@media (max-width: ${parseInt(bp.sm) - 1}px)`,
    md: `@media (max-width: ${parseInt(bp.md) - 1}px)`,
    lg: `@media (max-width: ${parseInt(bp.lg) - 1}px)`,
    xl: `@media (max-width: ${parseInt(bp.xl) - 1}px)`,
  },
  // Range queries
  between: (min: string, max: string) =>
    `@media (min-width: ${min}) and (max-width: ${parseInt(max) - 1}px)`,
} as const;
