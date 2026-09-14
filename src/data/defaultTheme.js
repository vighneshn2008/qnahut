/**
 * Default theme tokens. A theme JSON file (imported from the UI) is
 * shallow-merged on top of this shape — see utils/theme.js#mergeTheme.
 */
export const DEFAULT_THEME = {
  name: 'Cyber Arena',
  colors: {
    bgVoid: '#0A0C10',
    bgPanel: '#12161F',
    bgRaised: '#1B2130',
    border: '#262D3D',
    textPrimary: '#E8EDF5',
    textMuted: '#7C8798',
    accentPrimary: '#2DE2E6',
    accentSecondary: '#FF3D8A',
    accentWarn: '#FFB454',
    accentSuccess: '#4ADE80',
  },
  fonts: {
    display: "'Space Grotesk', system-ui, sans-serif",
    body: "'Inter', system-ui, sans-serif",
    mono: "'JetBrains Mono', 'Courier New', monospace",
  },
  radius: '10px',
  backgroundImage: '',
};
