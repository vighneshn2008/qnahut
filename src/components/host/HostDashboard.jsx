import { useEffect, useState } from 'react';
import { Monitor, Settings } from 'lucide-react';
import { useQuiz } from '../../context/QuizContext.jsx';
import { useHostShortcuts } from '../../hooks/useHostShortcuts.js';
import { buildProjectorUrl } from '../../utils/sync.js';
import MainPanel from './MainPanel.jsx';
import ScoringPanel from './ScoringPanel.jsx';
import Sidebar from './Sidebar.jsx';
import SharePanel from './SharePanel.jsx';
import QuestionManager from './QuestionManager.jsx';
import SettingsPanel from './SettingsPanel.jsx';
import Button from '../common/Button.jsx';
import Panel from '../common/Panel.jsx';

const PROJECTOR_VIEWS = ['question', 'timer', 'buzzer', 'leaderboard', 'answers'];

export default function HostDashboard() {
  const { quiz, setProjectorView } = useQuiz();
  const [showQuestionManager, setShowQuestionManager] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [hostPassword, setHostPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  useHostShortcuts();

  useEffect(() => {
    if (!quiz) return;
    const path = window.location.pathname;
    if (path === '/host' || path === '/quiz') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('quiz') !== quiz.id) {
        window.history.replaceState({}, '', `${path}?quiz=${encodeURIComponent(quiz.id)}`);
      }
    }
    setIsAuthenticated(
      !quiz.hostPassword || window.sessionStorage.getItem(`qnahut:host-auth:${quiz.id}`) === 'true',
    );
  }, [quiz]);

  function handleUnlock(event) {
    event.preventDefault();
    if (hostPassword !== quiz.hostPassword) {
      setPasswordError('That password is incorrect.');
      return;
    }
    window.sessionStorage.setItem(`qnahut:host-auth:${quiz.id}`, 'true');
    setPasswordError('');
    setIsAuthenticated(true);
  }

  if (!quiz) {
    return (
      <main className="container">
        <p>No quiz loaded yet. Go back and create one, or try the demo.</p>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="container" style={{ maxWidth: 480 }}>
        <Panel title="Host dashboard locked">
          <form className="stack gap-md" onSubmit={handleUnlock}>
            <p style={{ fontSize: 13 }}>Enter the host password for this quiz to continue.</p>
            <label className="label" htmlFor="host-dashboard-password">
              Host password
            </label>
            <input
              id="host-dashboard-password"
              className="input"
              type="password"
              value={hostPassword}
              onChange={(event) => setHostPassword(event.target.value)}
              autoFocus
              autoComplete="current-password"
            />
            {passwordError && (
              <p style={{ color: 'var(--color-accent-secondary)', fontSize: 13 }}>
                {passwordError}
              </p>
            )}
            <Button variant="primary" type="submit">
              Unlock dashboard
            </Button>
          </form>
        </Panel>
      </main>
    );
  }
  return (
    <main className="container" style={{ maxWidth: 1280 }}>
      <div
        className="host-dashboard-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)',
          gap: 20,
        }}
      >
        <div className="stack gap-md">
          <MainPanel onManageQuestions={() => setShowQuestionManager(true)} />
          <ScoringPanel />

          <Panel
            title="Projector view"
            action={
              <Button
                variant="ghost"
                icon={Monitor}
                onClick={() =>
                  window.open(
                    buildProjectorUrl(quiz.id, quiz.accessToken),
                    '_blank',
                    'width=1440,height=900,minWidth=960,minHeight=640,resizable=yes,scrollbars=no',
                  )
                }
              >
                Open in new window
              </Button>
            }
          >
            <div className="row gap-sm wrap">
              {PROJECTOR_VIEWS.map((v) => (
                <Button
                  key={v}
                  variant={quiz.projectorView === v ? 'primary' : 'default'}
                  onClick={() => setProjectorView(v)}
                  style={{ textTransform: 'capitalize' }}
                >
                  {v}
                </Button>
              ))}
            </div>
          </Panel>

          <Panel style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            <span className="mono">Space</span> start/pause · <span className="mono">N</span> next ·{' '}
            <span className="mono">P</span> previous · <span className="mono">B</span> reset buzzer
            · <span className="mono">L</span> leaderboard
          </Panel>
        </div>

        <div className="stack gap-md">
          <Sidebar />
          <SharePanel />
          <Button variant="ghost" icon={Settings} block onClick={() => setShowSettings(true)}>
            Quiz settings
          </Button>
        </div>
      </div>

      {showQuestionManager && <QuestionManager onClose={() => setShowQuestionManager(false)} />}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </main>
  );
}
