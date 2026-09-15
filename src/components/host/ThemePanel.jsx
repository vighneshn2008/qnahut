import { useRef } from 'react';
import { Play, Undo2, Upload, X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.jsx';
import { FONT_SETS, THEME_PRESETS } from '../../data/defaultTheme.js';
import Button from '../common/Button.jsx';
import Panel from '../common/Panel.jsx';

const COLOR_FIELDS = [
  { key: 'bgVoid', label: 'App background' },
  { key: 'bgPanel', label: 'Panel background' },
  { key: 'bgRaised', label: 'Cards & raised' },
  { key: 'border', label: 'Borders' },
  { key: 'textPrimary', label: 'Primary text' },
  { key: 'textMuted', label: 'Muted text' },
  { key: 'accentPrimary', label: 'Accent — primary' },
  { key: 'accentSecondary', label: 'Accent — secondary' },
  { key: 'accentWarn', label: 'Accent — warning' },
  { key: 'accentSuccess', label: 'Accent — success' },
];

export default function ThemePanel() {
  const { theme, setTheme, resetTheme } = useTheme();
  const backgroundInputRef = useRef(null);
  const soundInputRef = useRef(null);

  function patch(patchValue) {
    setTheme({ ...theme, ...patchValue });
  }

  function handleColor(key, value) {
    patch({ colors: { ...theme.colors, [key]: value } });
  }

  function handleBackgroundFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => patch({ backgroundImage: reader.result });
    reader.readAsDataURL(file);
  }

  function handleSoundFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => patch({ buzzerSoundDataUrl: reader.result });
    reader.readAsDataURL(file);
  }

  function previewSound() {
    if (!theme.buzzerSoundDataUrl || typeof Audio === 'undefined') return;
    const audio = new Audio(theme.buzzerSoundDataUrl);
    audio.play().catch(() => {});
  }

  const currentFontLabel =
    FONT_SETS.find(
      (set) => set.display === theme.fonts.display && set.body === theme.fonts.body,
    )?.label || 'Custom';

  return (
    <Panel
      title="Theme"
      action={
        <Button variant="ghost" icon={Undo2} onClick={resetTheme}>
          Reset
        </Button>
      }
    >
      <div className="stack gap-md">
        <div className="stack gap-xs">
          <span className="label" style={{ marginBottom: 0 }}>
            Presets
          </span>
          <div className="row gap-xs wrap">
            {THEME_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                className="badge"
                style={{
                  cursor: 'pointer',
                  gap: 6,
                  display: 'inline-flex',
                  alignItems: 'center',
                  borderColor:
                    theme.name === preset.name ? 'var(--color-accent-primary)' : undefined,
                  color: theme.name === preset.name ? 'var(--color-accent-primary)' : undefined,
                }}
                onClick={() => setTheme(preset)}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    flexShrink: 0,
                    background: `linear-gradient(135deg, ${preset.colors.accentPrimary}, ${preset.colors.accentSecondary})`,
                  }}
                />
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        <div className="stack gap-xs">
          <span className="label" style={{ marginBottom: 0 }}>
            Colors
          </span>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
              gap: '6px 14px',
            }}
          >
            {COLOR_FIELDS.map((field) => (
              <label
                key={field.key}
                className="row gap-xs"
                style={{ justifyContent: 'space-between', fontSize: 12, cursor: 'pointer' }}
              >
                <span style={{ color: 'var(--color-text-muted)' }}>{field.label}</span>
                <span className="row gap-xs" style={{ alignItems: 'center' }}>
                  <code className="mono" style={{ fontSize: 11 }}>
                    {theme.colors[field.key]}
                  </code>
                  <input
                    type="color"
                    value={theme.colors[field.key]}
                    onChange={(e) => handleColor(field.key, e.target.value)}
                    aria-label={field.label}
                    style={{
                      width: 26,
                      height: 22,
                      padding: 0,
                      border: '1px solid var(--color-border)',
                      borderRadius: 4,
                      background: 'transparent',
                      cursor: 'pointer',
                    }}
                  />
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="row gap-sm wrap">
          <div style={{ maxWidth: 180 }}>
            <label className="label" htmlFor="theme-font-set">
              Font set
            </label>
            <select
              id="theme-font-set"
              className="input"
              value={currentFontLabel}
              onChange={(e) => {
                const set = FONT_SETS.find((option) => option.label === e.target.value);
                if (set)
                  patch({ fonts: { display: set.display, body: set.body, mono: set.mono } });
              }}
            >
              {FONT_SETS.map((set) => (
                <option key={set.label} value={set.label}>
                  {set.label}
                </option>
              ))}
              {currentFontLabel === 'Custom' && <option value="Custom">Custom</option>}
            </select>
          </div>
          <div style={{ maxWidth: 180 }}>
            <label className="label" htmlFor="theme-radius">
              Corner radius — {theme.radius}
            </label>
            <input
              id="theme-radius"
              type="range"
              min={0}
              max={28}
              step={1}
              value={parseInt(theme.radius, 10) || 0}
              onChange={(e) => patch({ radius: `${Number(e.target.value)}px` })}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        <div className="stack gap-xs">
          <span className="label" style={{ marginBottom: 0 }}>
            Background image
          </span>
          <div className="row gap-sm wrap">
            <Button variant="ghost" icon={Upload} onClick={() => backgroundInputRef.current?.click()}>
              {theme.backgroundImage ? 'Replace background' : 'Upload background'}
            </Button>
            {theme.backgroundImage && (
              <Button
                variant="ghost"
                className="btn-icon"
                onClick={() => patch({ backgroundImage: '' })}
                aria-label="Remove background image"
              >
                <X size={16} />
              </Button>
            )}
            <input
              ref={backgroundInputRef}
              type="file"
              accept="image/*"
              onChange={handleBackgroundFile}
              style={{ display: 'none' }}
            />
          </div>
          {theme.backgroundImage && (
            <div
              style={{
                height: 64,
                borderRadius: 'var(--radius)',
                backgroundImage: `url("${theme.backgroundImage}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                border: '1px solid var(--color-border)',
              }}
            />
          )}
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
            The background is dimmed behind the grid on the projector so content stays readable.
          </p>
        </div>

        <div className="stack gap-xs">
          <span className="label" style={{ marginBottom: 0 }}>
            Buzzer sound
          </span>
          <div className="row gap-sm wrap">
            <Button variant="ghost" icon={Upload} onClick={() => soundInputRef.current?.click()}>
              {theme.buzzerSoundDataUrl ? 'Replace sound' : 'Upload sound'}
            </Button>
            {theme.buzzerSoundDataUrl && (
              <Button variant="default" icon={Play} onClick={previewSound}>
                Play preview
              </Button>
            )}
            {theme.buzzerSoundDataUrl && (
              <Button
                variant="ghost"
                className="btn-icon"
                onClick={() => patch({ buzzerSoundDataUrl: '' })}
                aria-label="Remove buzzer sound"
              >
                <X size={16} />
              </Button>
            )}
            <input
              ref={soundInputRef}
              type="file"
              accept="audio/*"
              onChange={handleSoundFile}
              style={{ display: 'none' }}
            />
          </div>
          <input
            className="input"
            type="url"
            value={/^https?:\/\//i.test(theme.buzzerSoundDataUrl || '') ? theme.buzzerSoundDataUrl : ''}
            onChange={(e) => patch({ buzzerSoundDataUrl: e.target.value.trim() })}
            placeholder="Or paste an MP3/PCM audio URL"
            style={{ width: '100%' }}
          />
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
            Plays on the projector when a team buzzes. Upload an audio file or paste a direct link.
            Without one, the built-in buzzer tone is used.
          </p>
        </div>
      </div>
    </Panel>
  );
}