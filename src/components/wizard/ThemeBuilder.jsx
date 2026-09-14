import { useRef, useState } from 'react';
import { ArrowLeft, Image, X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.jsx';
import { mergeTheme } from '../../utils/theme.js';
import Button from '../common/Button.jsx';

function readImageAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read that image.'));
    reader.readAsDataURL(file);
  });
}

function labelForToken(token) {
  return token.replace(/([A-Z])/g, ' $1').replace(/^./, (character) => character.toUpperCase());
}

export default function ThemeBuilder({ onClose }) {
  const { theme, setTheme } = useTheme();
  const [draft, setDraft] = useState(() => ({ ...theme, colors: { ...theme.colors } }));
  const draftRef = useRef({ ...theme, colors: { ...theme.colors } });
  const [error, setError] = useState('');
  const [themeJson, setThemeJson] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const backgroundInputRef = useRef(null);

  const promptTemplate = `Topic: ${draft.name || 'Cozy Coffee Shop'}

Generate a UI theme tailored to this topic. Return only a valid JSON object matching this schema:

{
  "name": "Theme name",
  "colors": {
    "bgVoid": "#000000",
    "bgPanel": "#111111",
    "bgRaised": "#1f1f1f",
    "border": "#444444",
    "textPrimary": "#ffffff",
    "textMuted": "#b0b0b0",
    "accentPrimary": "#ffcc00",
    "accentSecondary": "#00aaff",
    "accentWarn": "#ff9900",
    "accentSuccess": "#2ecc71"
  },
  "fonts": {
    "display": "Georgia, 'Times New Roman', serif",
    "body": "Inter, system-ui, sans-serif",
    "mono": "'Courier New', monospace"
  },
  "radius": "12px",
  "backgroundImage": "https://images.unsplash.com/photo-...?...&q=80"
}

Use a cohesive palette, readable contrast, and a matching Unsplash background image URL. Copy this prompt into Chatbotz to generate the theme.`;

  function commitDraft(nextDraft) {
    draftRef.current = nextDraft;
    setDraft(nextDraft);
    setTheme(nextDraft);
  }

  function updateDraft(patch) {
    commitDraft({ ...draftRef.current, ...patch });
  }

  function updateColor(token, value) {
    commitDraft({
      ...draftRef.current,
      colors: { ...draftRef.current.colors, [token]: value },
    });
  }

  async function handleBackgroundChange(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      updateDraft({ backgroundImage: await readImageAsDataUrl(file) });
      setError('');
    } catch (readError) {
      setError(readError.message);
    }
  }

  function handleApply() {
    commitDraft(draft);
    onClose();
  }

  function handlePasteJson() {
    try {
      const parsed = JSON.parse(themeJson);
      const merged = mergeTheme(parsed);
      commitDraft({ ...merged, colors: { ...merged.colors } });
      setThemeJson('');
      setError('');
    } catch {
      setError('Paste valid theme JSON before importing it.');
    }
  }

  async function handleCopyPrompt() {
    try {
      await navigator.clipboard.writeText(promptTemplate);
      setCopyStatus('Copied to Chatbotz prompt');
      setError('');
    } catch {
      setCopyStatus('Clipboard access was blocked');
    }
  }

  return (
    <div className="stack gap-md">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="row gap-sm">
          <Button
            variant="ghost"
            className="btn-icon"
            onClick={onClose}
            aria-label="Back to basics"
          >
            <ArrowLeft size={16} aria-hidden="true" />
          </Button>
          <div>
            <h2 style={{ fontSize: 18 }}>Theme builder</h2>
            <p style={{ fontSize: 13 }}>Shape the session look before creating your quiz.</p>
          </div>
        </div>
        <Button variant="primary" onClick={handleApply}>
          Apply theme
        </Button>
      </div>

      <div>
        <label className="label" htmlFor="theme-name">
          Theme name
        </label>
        <input
          id="theme-name"
          className="input"
          value={draft.name}
          onChange={(event) => updateDraft({ name: event.target.value })}
        />
      </div>

      <div>
        <label className="label">Colour palette</label>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 10,
          }}
        >
          {Object.entries(draft.colors).map(([token, value]) => (
            <label key={token} className="row gap-sm panel-raised" style={{ padding: 10 }}>
              <input
                type="color"
                value={value}
                onChange={(event) => updateColor(token, event.target.value)}
                aria-label={labelForToken(token)}
                style={{ width: 34, height: 30, padding: 0, border: 0, background: 'transparent' }}
              />
              <span style={{ fontSize: 12 }}>{labelForToken(token)}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="label" htmlFor="theme-radius">
          Corner radius
        </label>
        <select
          id="theme-radius"
          className="select"
          value={draft.radius}
          onChange={(event) => updateDraft({ radius: event.target.value })}
        >
          <option value="0px">Sharp</option>
          <option value="6px">Compact</option>
          <option value="10px">Soft</option>
          <option value="16px">Rounded</option>
        </select>
      </div>

      <div>
        <label className="label" htmlFor="theme-json">
          Paste theme JSON
        </label>
        <textarea
          id="theme-json"
          className="textarea mono"
          rows={5}
          value={themeJson}
          onChange={(event) => setThemeJson(event.target.value)}
          placeholder={'{\n  "name": "My Theme",\n  "colors": { ... },\n  "backgroundImage": ""\n}'}
        />
        <Button
          variant="ghost"
          onClick={handlePasteJson}
          disabled={!themeJson.trim()}
          style={{ marginTop: 8 }}
        >
          Use pasted JSON
        </Button>
      </div>

      <div>
        <label className="label">Prompt format</label>
        <textarea
          className="textarea mono"
          rows={12}
          value={promptTemplate}
          readOnly
          aria-label="Theme prompt format"
        />
        <div className="row gap-sm" style={{ marginTop: 8, alignItems: 'center' }}>
          <Button variant="primary" onClick={handleCopyPrompt}>
            Copy to Chatbotz
          </Button>
          {copyStatus && (
            <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{copyStatus}</span>
          )}
        </div>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 12, marginTop: 8 }}>
          Use this prompt format to generate a matching theme in Chatbotz and paste the returned
          JSON back into this builder.
        </p>
      </div>

      <div>
        <label className="label">Background image</label>
        <div
          className="panel-raised"
          style={{
            minHeight: 150,
            padding: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundImage: draft.backgroundImage ? `url("${draft.backgroundImage}")` : undefined,
            backgroundPosition: 'center',
            backgroundSize: 'cover',
          }}
        >
          {!draft.backgroundImage && (
            <span style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
              No background image selected
            </span>
          )}
          <div className="row gap-sm" style={{ alignSelf: 'flex-end' }}>
            <Button
              variant="ghost"
              icon={Image}
              onClick={() => backgroundInputRef.current?.click()}
            >
              {draft.backgroundImage ? 'Replace image' : 'Choose image'}
            </Button>
            {draft.backgroundImage && (
              <Button
                variant="ghost"
                className="btn-icon"
                onClick={() => updateDraft({ backgroundImage: '' })}
                aria-label="Remove background image"
              >
                <X size={16} aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
        <div className="row gap-sm" style={{ marginTop: 8 }}>
          <input
            className="input"
            type="url"
            value={
              typeof draft.backgroundImage === 'string' &&
              /^https?:\/\//i.test(draft.backgroundImage)
                ? draft.backgroundImage
                : ''
            }
            onChange={(event) => updateDraft({ backgroundImage: event.target.value.trim() || '' })}
            placeholder="Or paste a background image URL"
            style={{ flex: 1 }}
          />
        </div>
        <input
          ref={backgroundInputRef}
          type="file"
          accept="image/*"
          onChange={handleBackgroundChange}
          style={{ display: 'none' }}
        />
        {error && (
          <p style={{ color: 'var(--color-accent-secondary)', fontSize: 12, marginTop: 8 }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
