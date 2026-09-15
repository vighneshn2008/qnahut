import { useRef, useState } from 'react';
import { Download, Upload, X, Settings as SettingsIcon } from 'lucide-react';
import { useQuiz } from '../../context/QuizContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { exportQuizPackage, importQuizPackage } from '../../utils/quizPackage.js';
import Modal from '../common/Modal.jsx';
import Button from '../common/Button.jsx';
import Panel from '../common/Panel.jsx';
import ThemePanel from './ThemePanel.jsx';

export default function SettingsPanel({ onClose }) {
  const { quiz, updateMeta, updateModes, loadQuiz } = useQuiz();
  const { theme, setTheme } = useTheme();
  const logoInputRef = useRef(null);
  const packageInputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleLogoFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateMeta({ logoDataUrl: reader.result });
    reader.readAsDataURL(file);
  }

  async function handleExport() {
    setBusy(true);
    try {
      await exportQuizPackage(quiz, theme);
    } finally {
      setBusy(false);
    }
  }

  async function handleImportFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const { quiz: importedQuiz, theme: importedTheme } = await importQuizPackage(file);
      loadQuiz({ ...importedQuiz, theme: importedTheme || importedQuiz.theme });
      if (importedTheme) setTheme(importedTheme);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Quiz settings" onClose={onClose} width={560}>
      <div className="stack gap-md">
        <Panel title="Modes">
          <div className="stack gap-sm">
            <label className="row gap-sm" style={{ cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={quiz.modes.leaderboard}
                onChange={(e) => updateModes({ leaderboard: e.target.checked })}
              />
              Show the live leaderboard
            </label>
            <label className="row gap-sm" style={{ cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={quiz.modes.buzzer}
                onChange={(e) => updateModes({ buzzer: e.target.checked })}
              />
              Enable buzzer mode
            </label>
            <label className="row gap-sm" style={{ cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={quiz.modes.requireTextAnswer === true}
                onChange={(e) => updateModes({ requireTextAnswer: e.target.checked })}
              />
              Require a text answer instead of a buzzer button
            </label>
            <label className="row gap-sm" style={{ cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={quiz.modes.allowMultipleBuzzes === true}
                onChange={(e) => updateModes({ allowMultipleBuzzes: e.target.checked })}
              />
              Allow multiple teams to buzz
            </label>
            <div className="stack gap-sm" style={{ marginTop: 6 }}>
              <span className="label" style={{ marginBottom: 0 }}>
                Projector widgets
              </span>
              <label className="row gap-sm" style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={quiz.modes.projectorTimer !== false}
                  onChange={(e) => updateModes({ projectorTimer: e.target.checked })}
                />
                Show timer on projector
              </label>
              <label className="row gap-sm" style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={quiz.modes.projectorLeaderboard !== false}
                  onChange={(e) => updateModes({ projectorLeaderboard: e.target.checked })}
                />
                Show leaderboard on projector
              </label>
              <label className="row gap-sm" style={{ cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={quiz.modes.hideQuestionAfterBuzz === true}
                  onChange={(e) => updateModes({ hideQuestionAfterBuzz: e.target.checked })}
                />
                Hide question after first buzz
              </label>
            </div>
            <div style={{ maxWidth: 220 }}>
              <label className="label" htmlFor="default-timer">
                Default question timer (seconds)
              </label>
              <input
                id="default-timer"
                type="number"
                className="input"
                min={5}
                value={quiz.modes.defaultTimer}
                onChange={(e) => updateModes({ defaultTimer: Number(e.target.value) })}
              />
            </div>
          </div>
        </Panel>

        <ThemePanel />

        <Panel title="Quiz logo">
          <div className="row gap-sm">
            {quiz.logoDataUrl && (
              <img
                src={quiz.logoDataUrl}
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
              {quiz.logoDataUrl ? 'Replace logo' : 'Upload logo'}
            </Button>
            {quiz.logoDataUrl && (
              <Button
                variant="ghost"
                className="btn-icon"
                onClick={() => updateMeta({ logoDataUrl: null })}
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
                typeof quiz.logoDataUrl === 'string' && /^https?:\/\//i.test(quiz.logoDataUrl)
                  ? quiz.logoDataUrl
                  : ''
              }
              onChange={(e) => updateMeta({ logoDataUrl: e.target.value.trim() || null })}
              placeholder="Or paste logo image URL"
              style={{ flex: 1 }}
            />
          </div>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            onChange={handleLogoFile}
            style={{ display: 'none' }}
          />
        </Panel>

        <Panel title="Quiz package">
          <p style={{ fontSize: 13, marginBottom: 10 }}>
            Export everything — questions, slides, settings, theme, and every uploaded image/video —
            as one .zip you can back up or move to another server. Import one to load it here.
          </p>
          <div className="row gap-sm wrap">
            <Button icon={Download} onClick={handleExport} disabled={busy}>
              Export package
            </Button>
            <Button
              variant="ghost"
              icon={Upload}
              onClick={() => packageInputRef.current?.click()}
              disabled={busy}
            >
              Import package
            </Button>
          </div>
          <input
            ref={packageInputRef}
            type="file"
            accept=".zip,.qnahutpkg.zip,.json,application/zip,application/json"
            onChange={handleImportFile}
            style={{ display: 'none' }}
          />
          {error && (
            <p style={{ color: 'var(--color-accent-secondary)', fontSize: 13, marginTop: 8 }}>
              {error}
            </p>
          )}
        </Panel>

        <Panel style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
          <span className="row gap-sm">
            <SettingsIcon size={14} aria-hidden="true" />
            Quiz ID: <span className="mono">{quiz.id}</span> — unique per quiz, so several can be
            hosted from the same server at once.
          </span>
        </Panel>
      </div>
    </Modal>
  );
}
