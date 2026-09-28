export const THEME = {
  bgMain: '#0E1015',
  bgSurface: '#181B24',
  bgSurfaceHighlight: '#222736',
  bgInput: '#13151D',
  primary: '#10A37F',
  accentPink: '#EC4899',
  accentPurple: '#8B5CF6',
  warning: '#F59E0B',
  danger: '#EF4444',
  textWhite: '#F3F4F6',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  border: '#2A3042',
} as const;

export type ThemeColors = typeof THEME;
