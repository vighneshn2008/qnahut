import { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import Button from '../common/Button.jsx';
import ThemeControls from '../common/ThemeControls.jsx';
import ThemeBuilder from './ThemeBuilder.jsx';

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.readAsDataURL(file);
  });
}

export default function StepBasics({ draft, updateDraft }) {
  const logoInputRef = useRef(null);
  const [showThemeBuilder, setShowThemeBuilder] = useState(false);

  async function handleLogoChange(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    updateDraft({ logoDataUrl: dataUrl });
  }

  if (showThemeBuilder) {
    return <ThemeBuilder onClose={() => setShowThemeBuilder(false)} />;
  }

  return (
    <div className="stack gap-md">
      <h2 style={{ fontSize: 18 }}>Basics</h2>
      <div>
        <label className="label" htmlFor="quiz-name">
          Quiz name
        </label>
        <input
          id="quiz-name"
          className="input"
          placeholder="Inter-college quiz night"
          value={draft.name}
          onChange={(e) => updateDraft({ name: e.target.value })}
        />
      </div>
      <div>
        <label className="label" htmlFor="quiz-description">
          Description
        </label>
        <textarea
          id="quiz-description"
          className="textarea"
          rows={3}
          placeholder="A short description shown to teams before the quiz starts."
          value={draft.description}
          onChange={(e) => updateDraft({ description: e.target.value })}
        />
      </div>

      <div>
        <label className="label" htmlFor="host-password">
          Host password
        </label>
        <input
          id="host-password"
          className="input"
          type="password"
          placeholder="Choose a password for the host dashboard"
          value={draft.hostPassword}
          onChange={(e) => updateDraft({ hostPassword: e.target.value })}
          autoComplete="new-password"
        />
      </div>

      <div>
        <label className="label">Quiz logo</label>
        <div className="row gap-sm">
          {draft.logoDataUrl && (
            <img
              src={draft.logoDataUrl}
              alt="Quiz logo"
              style={{
                width: 40,
                height: 40,
                objectFit: 'contain',
                borderRadius: 8,
                border: '1px solid var(--color-border)',
              }}
            />
          )}
          <Button variant="ghost" icon={Upload} onClick={() => logoInputRef.current?.click()}>
            {draft.logoDataUrl ? 'Replace logo' : 'Upload logo'}
          </Button>
          {draft.logoDataUrl && (
            <Button
              variant="ghost"
              className="btn-icon"
              onClick={() => updateDraft({ logoDataUrl: null })}
              aria-label="Remove logo"
            >
              <X size={16} />
            </Button>
          )}
        </div>
        <div className="row gap-sm" style={{ marginTop: 8 }}>
          <input
            className="input"
            type="url"
            value={
              draft.logoDataUrl && /^https?:\/\//i.test(draft.logoDataUrl) ? draft.logoDataUrl : ''
            }
            onChange={(e) => updateDraft({ logoDataUrl: e.target.value.trim() || null })}
            placeholder="Or paste logo image URL"
            style={{ flex: 1 }}
          />
        </div>
        <input
          ref={logoInputRef}
          type="file"
          accept="image/*"
          onChange={handleLogoChange}
          style={{ display: 'none' }}
        />
      </div>

      <div>
        <label className="label">Theme</label>
        <ThemeControls onBuildTheme={() => setShowThemeBuilder(true)} />
      </div>
    </div>
  );
}
