import { useRef, useState } from 'react';
import { Palette, Upload, Download, RotateCcw } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.jsx';
import { downloadThemeJson, readThemeFile } from '../../utils/theme.js';
import Button from './Button.jsx';

export default function ThemeControls({ onBuildTheme }) {
  const { theme, setTheme, resetTheme } = useTheme();
  const fileInputRef = useRef(null);
  const [error, setError] = useState('');

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const parsed = await readThemeFile(file);
      setTheme(parsed);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="row gap-sm">
      <Palette size={16} aria-hidden="true" style={{ color: 'var(--color-text-muted)' }} />
      <span className="mono" style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
        {theme.name}
      </span>
      {onBuildTheme && (
        <Button variant="ghost" onClick={onBuildTheme}>
          Build theme
        </Button>
      )}
      <Button
        variant="ghost"
        className="btn-icon"
        onClick={() => fileInputRef.current?.click()}
        title="Import theme JSON"
      >
        <Upload size={16} aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        className="btn-icon"
        onClick={() => downloadThemeJson(theme)}
        title="Export current theme"
      >
        <Download size={16} aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        className="btn-icon"
        onClick={resetTheme}
        title="Reset to default theme"
      >
        <RotateCcw size={16} aria-hidden="true" />
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      {error && (
        <span style={{ fontSize: 12, color: 'var(--color-accent-secondary)' }}>{error}</span>
      )}
    </div>
  );
}
