import { makeStyles, shorthands } from '@fluentui/react-components';
import { media } from '@/design-system/responsive';

export const useStyles = makeStyles({
  surface: {
    width: 'min(720px, 95vw)',
    maxHeight: ['min(85vh, 720px)', 'min(85dvh, 720px)'],
    display: 'flex', flexDirection: 'column',
    ...shorthands.padding('0'),
    borderRadius: '16px',
    backgroundColor: '#FFFFFF',
    boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.16)',
    overflow: 'hidden',
    [media.below.sm]: {
      width: '100vw', maxHeight: ['100vh', '100dvh'], borderRadius: '0',
    },
  },
  modalHeader: {
    flexGrow: 0, flexShrink: 0, flexBasis: 'auto',
    ...shorthands.padding('24px', '28px', '16px'),
    [media.below.sm]: { ...shorthands.padding('20px', '16px', '12px') },
  },
  title: { fontSize: '20px', lineHeight: '28px', fontWeight: 600, color: '#1A1622' },
  subtitle: { fontSize: '14px', lineHeight: '20px', color: '#5E5560', marginTop: '4px' },
  table: {
    flexGrow: 1, flexShrink: 1, flexBasis: 'auto',
    minHeight: '0',
    overflowY: 'auto',
    overscrollBehavior: 'contain',
    WebkitOverflowScrolling: 'touch',
    backgroundColor: '#FAFBFF',
    marginLeft: '28px', marginRight: '28px',
    borderRadius: '8px',
    [media.below.sm]: { marginLeft: '0', marginRight: '0', borderRadius: '0' },
  },
  tableHeader: {
    display: 'flex', alignItems: 'center',
    backgroundColor: '#5566C4', height: '40px', padding: '0 12px',
    fontSize: '12px', fontWeight: 600, color: '#FFFFFF',
    position: 'sticky', top: '0', zIndex: 1,
  },
  sectionHeader: {
    fontSize: '12px', lineHeight: '16px', fontWeight: 600,
    textTransform: 'uppercase' as const, padding: '12px',
  },
  sectionMatched: { color: '#15803D' },
  sectionUnmatched: { color: '#F59E0B' },
  row: {
    display: 'flex', alignItems: 'center', minHeight: '48px', padding: '4px 12px',
    borderBottomStyle: 'solid', borderBottomWidth: '1px', borderBottomColor: '#E8E8F0',
    [media.below.sm]: {
      flexWrap: 'wrap' as const,
      ...shorthands.padding('12px'),
      gap: '8px',
    },
  },
  iconMatched: { color: '#15803D', flexShrink: 0 },
  iconUnmatched: { color: '#F59E0B', flexShrink: 0 },
  colName: {
    fontSize: '13px', lineHeight: '20px', fontWeight: 500, color: '#1A1622',
    flexGrow: 1, flexShrink: 1, flexBasis: '0',
    minWidth: '0',
    overflow: 'hidden', textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    marginLeft: '8px',
  },
  fills: {
    color: '#5E5560', fontSize: '13px', marginLeft: '8px', marginRight: '8px', flexShrink: 0,
  },
  dropdownCol: {
    display: 'flex', flexDirection: 'column', gap: '3px',
    width: '160px',
    [media.below.md]: { width: 'auto', flexGrow: 1 },
    [media.below.sm]: { width: '100%' },
  },
  dropdown: {
    width: '100%', fontSize: '13px',
  },
  // Calm, muted explanation that an unmapped column is skipped. Clears on map.
  skipHint: {
    fontSize: '12px', lineHeight: '16px', color: '#5E5560',
  },
  preview: {
    fontSize: '13px', lineHeight: '20px', color: '#5E5560',
    maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const, marginLeft: '8px',
    [media.below.md]: { display: 'none' },
  },
  headerCol: { flexGrow: 1 },
  headerPlaceholder: {
    width: '160px',
    [media.below.md]: { flexGrow: 1, width: 'auto' },
  },
  headerPreview: {
    width: '120px', marginLeft: '8px',
    [media.below.md]: { display: 'none' },
  },
  staticPlaceholder: {
    width: '160px', fontSize: '13px', color: '#1A1622', fontWeight: 500,
    [media.below.md]: { width: 'auto', flexGrow: 1 },
    [media.below.sm]: { width: '100%' },
  },
  noticeBanner: {
    backgroundColor: '#FFFBEB',
    borderLeftStyle: 'solid',
    borderLeftWidth: '3px',
    borderLeftColor: '#F59E0B',
    padding: '12px 16px',
    marginTop: '16px',
    borderRadius: '0 4px 4px 0',
  },
  noticeBold: { fontSize: '13px', fontWeight: 600, color: '#78350F' },
  noticeText: { fontSize: '13px', color: '#78350F', marginTop: '2px' },
  footer: {
    flexGrow: 0, flexShrink: 0, flexBasis: 'auto',
    display: 'flex', justifyContent: 'flex-end', gap: '12px',
    ...shorthands.padding('16px', '28px', '24px'),
    borderTopStyle: 'solid', borderTopWidth: '1px', borderTopColor: '#E8E8F0',
    [media.below.sm]: {
      ...shorthands.padding('12px', '16px', '16px'),
      flexDirection: 'column',
      alignItems: 'stretch',
    },
  },
});
