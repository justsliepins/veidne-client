export const PLACEHOLDER_PALETTE = [
  { bg: '#F3E8FF', border: '#C084FC', dot: '#A855F7', chipText: '#7C3AED' },  // purple
  { bg: 'rgba(85, 102, 196, 0.1)', border: '#46529E', dot: '#46529E', chipText: '#46529E' },  // blue
  { bg: '#ECFDF5', border: '#6EE7B7', dot: '#10B981', chipText: '#15803D' },  // green
  { bg: '#FFFBEB', border: '#FCD34D', dot: '#F59E0B', chipText: '#B45309' },  // amber
  { bg: '#FDF2F8', border: '#F9A8D4', dot: '#EC4899', chipText: '#BE185D' },  // pink
  { bg: '#F0FDFA', border: '#5EEAD4', dot: '#14B8A6', chipText: '#0F766E' },  // teal
  { bg: '#FFF1F2', border: '#FDA4AF', dot: '#F43F5E', chipText: '#BE123C' },  // rose
  { bg: '#EEF2FF', border: '#A5B4FC', dot: '#6366F1', chipText: '#4338CA' },  // indigo
] as const;

export function getPlaceholderColor(index: number) {
  return PLACEHOLDER_PALETTE[index % PLACEHOLDER_PALETTE.length];
}
