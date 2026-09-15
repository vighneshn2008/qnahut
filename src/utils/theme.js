import { DEFAULT_THEME } from '../data/defaultTheme.js';

/** Shallow-merges an imported theme JSON on top of the default theme. */
export function mergeTheme(imported) {
  if (!imported || typeof imported !== 'object') return DEFAULT_THEME;
  return {
    name: imported.name || DEFAULT_THEME.name,
    colors: { ...DEFAULT_THEME.colors, ...(imported.colors || {}) },
    fonts: { ...DEFAULT_THEME.fonts, ...(imported.fonts || {}) },
    radius: imported.radius || DEFAULT_THEME.radius,
    backgroundImage: imported.backgroundImage || DEFAULT_THEME.backgroundImage,
    buzzerSoundDataUrl: imported.buzzerSoundDataUrl || DEFAULT_THEME.buzzerSoundDataUrl,
  };
}

/** Converts a theme object into a CSS custom-property map for inline styling. */
export function themeToCssVars(theme) {
  const vars = {
    '--radius': theme.radius,
    '--font-display': theme.fonts.display,
    '--font-body': theme.fonts.body,
    '--font-mono': theme.fonts.mono,
    '--theme-background-image': theme.backgroundImage ? `url("${theme.backgroundImage}")` : 'none',
  };
  Object.entries(theme.colors).forEach(([key, value]) => {
    const cssKey = `--color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    vars[cssKey] = value;
  });
  return vars;
}

export function downloadThemeJson(theme) {
  const blob = new Blob([JSON.stringify(theme, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(theme.name || 'qnahut-theme').toLowerCase().replace(/\s+/g, '-')}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function readThemeFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result));
      } catch {
        reject(new Error('That file is not valid JSON.'));
      }
    };
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.readAsText(file);
  });
}
