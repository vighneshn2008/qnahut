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
  radius: '13px',
  backgroundImage: '',
  buzzerSoundDataUrl: '',
};

/** Ready-made looks shown in the theme editor. */
export const THEME_PRESETS = [
  {
    ...DEFAULT_THEME,
    name: 'Cyber Arena',
  },
  {
    ...DEFAULT_THEME,
    name: 'Neon Noir',
    colors: {
      ...DEFAULT_THEME.colors,
      bgVoid: '#0B0713',
      bgPanel: '#171026',
      bgRaised: '#231A3A',
      border: '#352A52',
      accentPrimary: '#B06BFF',
      accentSecondary: '#FF5CE1',
      accentSuccess: '#7CF29C',
    },
  },
  {
    ...DEFAULT_THEME,
    name: 'Ocean',
    colors: {
      ...DEFAULT_THEME.colors,
      bgVoid: '#050D1A',
      bgPanel: '#0C1B30',
      bgRaised: '#14304E',
      border: '#1F4770',
      accentPrimary: '#38BDF8',
      accentSecondary: '#6366F1',
      accentSuccess: '#2DD4BF',
    },
  },
  {
    ...DEFAULT_THEME,
    name: 'Molten',
    colors: {
      ...DEFAULT_THEME.colors,
      bgVoid: '#120704',
      bgPanel: '#241009',
      bgRaised: '#3A1C11',
      border: '#57291A',
      accentPrimary: '#FFB454',
      accentSecondary: '#FF3D3D',
      accentSuccess: '#4ADE80',
    },
  },
  {
    ...DEFAULT_THEME,
    name: 'Emerald',
    colors: {
      ...DEFAULT_THEME.colors,
      bgVoid: '#04120C',
      bgPanel: '#0A2117',
      bgRaised: '#113426',
      border: '#1B4C38',
      accentPrimary: '#34D399',
      accentSecondary: '#84CC16',
      accentSuccess: '#A3E635',
      accentWarn: '#FBBF24',
    },
  },
  {
    ...DEFAULT_THEME,
    name: 'Royal Gold',
    colors: {
      ...DEFAULT_THEME.colors,
      bgVoid: '#0E0C07',
      bgPanel: '#1F1A10',
      bgRaised: '#332A19',
      border: '#4A3D24',
      accentPrimary: '#F5C96B',
      accentSecondary: '#E8A33D',
      accentSuccess: '#7CF29C',
      accentWarn: '#FFE3A3',
    },
  },
  {
    ...DEFAULT_THEME,
    name: 'Mono',
    colors: {
      ...DEFAULT_THEME.colors,
      bgVoid: '#0A0A0A',
      bgPanel: '#141414',
      bgRaised: '#1E1E1E',
      border: '#2E2E2E',
      textPrimary: '#F4F4F5',
      textMuted: '#858585',
      accentPrimary: '#FFFFFF',
      accentSecondary: '#A1A1AA',
      accentWarn: '#D4D4D8',
      accentSuccess: '#E4E4E7',
    },
  },
  {
    ...DEFAULT_THEME,
    name: 'Out of Galaxy',
    colors: {
      ...DEFAULT_THEME.colors,
      bgVoid: '#080B1F',
      bgPanel: '#101736',
      bgRaised: '#1B2248',
      border: '#2C3560',
      textPrimary: '#EAF0FF',
      textMuted: '#8A90B8',
      accentPrimary: '#8B9DFF',
      accentSecondary: '#E879F9',
      accentWarn: '#FCD34D',
      accentSuccess: '#6EE7B7',
    },
  },
];

/** Font stacks offered in the theme editor. */
export const FONT_SETS = [
  {
    label: 'Arena',
    display: "'Space Grotesk', system-ui, sans-serif",
    body: "'Inter', system-ui, sans-serif",
    mono: "'JetBrains Mono', 'Courier New', monospace",
  },
  {
    label: 'Tech',
    display: "'Orbitron', system-ui, sans-serif",
    body: "'Rajdhani', system-ui, sans-serif",
    mono: "'JetBrains Mono', 'Courier New', monospace",
  },
  {
    label: 'Clean',
    display: "'Poppins', system-ui, sans-serif",
    body: "'Source Sans 3', system-ui, sans-serif",
    mono: "'IBM Plex Mono', 'Courier New', monospace",
  },
  {
    label: 'Poster',
    display: "'Bebas Neue', system-ui, sans-serif",
    body: "'Inter', system-ui, sans-serif",
    mono: "'JetBrains Mono', 'Courier New', monospace",
  },
  {
    label: 'Modern',
    display: "'Sora', system-ui, sans-serif",
    body: "'Inter', system-ui, sans-serif",
    mono: "'IBM Plex Mono', 'Courier New', monospace",
  },
  {
    label: 'Retro',
    display: "'Press Start 2P', system-ui, sans-serif",
    body: "'VT323', system-ui, monospace",
    mono: "'VT323', system-ui, monospace",
  },
  {
    label: 'Comic',
    display: "'Lilita One', system-ui, sans-serif",
    body: "'Nunito', system-ui, sans-serif",
    mono: "'Fira Code', 'Courier New', monospace",
  },
  {
    label: 'Luxury',
    display: "'Playfair Display', Georgia, serif",
    body: "'Cormorant Garamond', Georgia, serif",
    mono: "'Cormorant Garamond', Georgia, serif",
  },
];