import { useCallback, useEffect, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { useQuiz } from '../../context/QuizContext.jsx';
import {
  readDeepLink,
  loadNetworkActiveQuizSnapshot,
  loadNetworkQuizSnapshot,
} from '../../utils/sync.js';
import Panel from '../common/Panel.jsx';
import Button from '../common/Button.jsx';

const VIEW_BUTTONS = [
  { view: 'question', label: 'Q', title: 'Question' },
  { view: 'buzzer', label: 'Buz', title: 'Buzzer' },
  { view: 'leaderboard', label: 'Lea', title: 'Leaderboard' },
  { view: 'timer', label: 'Tim', title: 'Timer' },
  { view: 'answer', label: 'Ans', title: 'Team answers' },
  { view: 'reveal', label: 'Reveal', title: 'Reveal answer' },
];

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function RemoteControl() {
  const {
    quiz,
    loadQuiz,
    timerStart,
    timerPause,
    timerReset,
    nextQuestion,
    prevQuestion,
    resetBuzzer,
    setProjectorView,
    revealProjectorQuestion,
  } = useQuiz();
  const [hostPassword, setHostPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const deepLink = readDeepLink();
  const quizId = deepLink.quizId;
  const accessToken = deepLink.accessToken;

  // Phone loads quiz from server (same flow as the Join screen).
  const loadRemoteQuiz = useCallback(async () => {
    if (quizId) {
      const targetedSnapshot = await loadNetworkQuizSnapshot(quizId, accessToken);
      if (targetedSnapshot) return targetedSnapshot;
    }
    const activeSnapshot = await loadNetworkActiveQuizSnapshot();
    return !quizId || activeSnapshot?.id === quizId ? activeSnapshot : null;
  }, [accessToken, quizId]);

  useEffect(() => {
    if (quiz && (!quizId || quiz.id === quizId)) return undefined;
    let active = true;
    loadRemoteQuiz().then((snapshot) => {
      if (active && snapshot) loadQuiz(snapshot);
    });
    return () => {
      active = false;
    };
  }, [loadRemoteQuiz, quiz, quizId, loadQuiz]);

  useEffect(() => {
    if (!quiz) return;
    setIsAuthenticated(
      !quiz.hostPassword ||
        window.sessionStorage.getItem(`qnahut:host-auth:${quiz.id}`) === 'true',
    );
  }, [quiz]);

  function handleUnlock(event) {
    event.preventDefault();
    if (hostPassword !== quiz.hostPassword) {
      setPasswordError('Incorrect password.');
      return;
    }
    window.sessionStorage.setItem(`qnahut:host-auth:${quiz.id}`, 'true');
    setPasswordError('');
    setIsAuthenticated(true);
  }

  if (!quiz) {
    return (
      <main className="container" style={{ maxWidth: 440, padding: '24px 16px' }}>
        <p>No quiz loaded.</p>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="container" style={{ maxWidth: 440, padding: '24px 16px' }}>
        <Panel title="Remote locked">
          <form className="stack gap-sm" onSubmit={handleUnlock}>
            <label className="label" htmlFor="remote-password">
              Host password
            </label>
            <input
              id="remote-password"
              className="input"
              type="password"
              value={hostPassword}
              onChange={(e) => setHostPassword(e.target.value)}
              autoFocus
              autoComplete="current-password"
            />
            {passwordError && (
              <p style={{ color: 'var(--color-accent-secondary)', fontSize: 13 }}>
                {passwordError}
              </p>
            )}
            <Button variant="primary" type="submit" block>
              Unlock
            </Button>
          </form>
        </Panel>
      </main>
    );
  }

  const question = quiz.questions[quiz.currentQuestionIndex];
  const activeView = quiz.projectorView;
  const hasQuestion = quiz.questions.length > 0;

  function handleViewSelect(view) {
    if (view === 'reveal') {
      revealProjectorQuestion();
      setProjectorView('answer');
    } else {
      setProjectorView(view);
    }
  }

  return (
    <main
      className="container"
      style={{
        maxWidth: 440,
        padding: '12px 12px calc(24px + env(safe-area-inset-bottom))',
        touchAction: 'manipulation',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <div className="stack gap-xs">
        {/* Compact status strip: timer + progress */}
        <div
          className="row"
          style={{ justifyContent: 'space-between', alignItems: 'center', padding: '2px 2px 6px' }}
        >
          <span
            className="mono"
            style={{ fontSize: 40, fontWeight: 700, lineHeight: 1, color: 'var(--color-accent-primary)' }}
          >
            {formatTime(quiz.timer.remaining)}
          </span>
          <span
            className="row gap-sm"
            style={{ fontSize: 13, color: 'var(--color-text-muted)' }}
          >
            {quiz.timer.running && (
              <span
                className="badge"
                style={{ color: 'var(--color-accent-success)', fontSize: 11 }}
              >
                running
              </span>
            )}
            <span className="mono">
              {question ? `${quiz.currentQuestionIndex + 1}/${quiz.questions.length}` : '—'}
            </span>
          </span>
        </div>

        {/* Navigation + timer transport, one tight row */}
        <div className="row gap-xs">
          <Button
            icon={ChevronLeft}
            onClick={prevQuestion}
            disabled={quiz.currentQuestionIndex === 0}
            style={{ flex: 1, minHeight: 48 }}
          >
            Prev
          </Button>
          <Button
            variant="primary"
            icon={quiz.timer.running ? Pause : Play}
            onClick={quiz.timer.running ? timerPause : timerStart}
            style={{ flex: 1, minHeight: 48, fontSize: 15 }}
          >
            {quiz.timer.running ? 'Pause' : 'Start'}
          </Button>
          <Button
            icon={RotateCcw}
            onClick={timerReset}
            style={{ flex: 1, minHeight: 48, fontSize: 15 }}
          >
            Timer
          </Button>
          <Button
            icon={ChevronRight}
            onClick={nextQuestion}
            disabled={!hasQuestion || quiz.currentQuestionIndex === quiz.questions.length - 1}
            style={{ flex: 1, minHeight: 48 }}
          >
            Next
          </Button>
        </div>

        {/* Buzz round handling */}
        <Button icon={AlertTriangle} onClick={resetBuzzer} style={{ minHeight: 44 }} block>
          Reset buzzer
        </Button>

        {/* Projector view selector */}
        <Panel
          title="Show on projector"
          style={{ padding: '12px' }}
          action={
            <span className="mono" style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
              {activeView}
            </span>
          }
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 6,
            }}
          >
            {VIEW_BUTTONS.map(({ view, label, title }) => {
              const isActive =
                view === 'reveal' ? activeView === 'answer' : activeView === view;
              return (
                <button
                  key={view}
                  onClick={() => handleViewSelect(view)}
                  title={title}
                  aria-pressed={isActive}
                  style={{
                    minHeight: 46,
                    fontSize: 14,
                    fontWeight: 600,
                    borderRadius: 'var(--radius)',
                    border: `2px solid ${isActive ? 'var(--color-accent-primary)' : 'var(--color-border)'}`,
                    background: isActive
                      ? 'color-mix(in srgb, var(--color-accent-primary) 15%, transparent)'
                      : 'var(--color-bg-raised)',
                    color: isActive ? 'var(--color-accent-primary)' : 'var(--color-text-primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2,
                    padding: '4px 2px',
                    transition: 'background 0.15s, border-color 0.15s',
                  }}
                >
                  <span>{label}</span>
                  {view === 'reveal' && (
                    <Zap size={11} style={{ color: 'var(--color-accent-warn)' }} aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
        </Panel>

        {/* Current question snippet */}
        {question && (
          <Panel style={{ padding: '12px' }}>
            <div className="stack gap-xs">
              <span
                className="badge"
                style={{ alignSelf: 'flex-start', textTransform: 'capitalize' }}
              >
                {question.type === 'image-slide'
                  ? 'image slide'
                  : question.isSlide
                    ? question.type === 'round-header'
                      ? 'round header'
                      : 'slide'
                    : question.type}
              </span>
              {question.text && (
                <p
                  style={{
                    fontSize: 14,
                    whiteSpace: 'pre-wrap',
                    color: 'var(--color-text-primary)',
                    margin: 0,
                  }}
                >
                  {question.text}
                </p>
              )}
              {question.answer && (
                <p
                  style={{
                    fontSize: 13,
                    color: 'var(--color-accent-success)',
                    margin: 0,
                  }}
                >
                  Answer: {question.answer}
                </p>
              )}
            </div>
          </Panel>
        )}

        {/* Buzzer order quick glance */}
        {quiz.buzzer.order.length > 0 && (
          <Panel style={{ padding: '12px' }}>
            <div className="row gap-xs wrap">
              {quiz.buzzer.order.map((entry, i) => {
                const team = quiz.teams.find((t) => t.id === entry.teamId);
                const firstTime = quiz.buzzer.order[0]?.time;
                const delta =
                  firstTime !== undefined && entry.time !== undefined && i > 0
                    ? `+${(entry.time - firstTime).toFixed(0)}ms`
                    : '0ms';
                return (
                  <span key={`${entry.teamId}-${entry.time}`} className="badge mono">
                    #{i + 1} {team?.name || '?'}
                    <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>
                      {' '}
                      {delta}
                    </span>
                  </span>
                );
              })}
            </div>
          </Panel>
        )}

        {/* Team scores compact */}
        {quiz.modes.leaderboard && quiz.teams.length > 0 && (
          <Panel style={{ padding: '12px' }}>
            <div className="row gap-xs wrap">
              {[...quiz.teams]
                .sort((a, b) => (b.score || 0) - (a.score || 0))
                .map((team) => (
                  <span key={team.id} className="badge mono">
                    {team.name}: {team.score}
                  </span>
                ))}
            </div>
          </Panel>
        )}
      </div>
    </main>
  );
}