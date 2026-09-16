import { useCallback, useEffect, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Zap,
  Maximize2,
  Minimize2,
  X,
  HelpCircle,
  Trophy,
  Timer,
  MessageSquare,
  Eye,
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
  { view: 'question', Icon: HelpCircle, title: 'Question' },
  { view: 'buzzer', Icon: Zap, title: 'Buzzer' },
  { view: 'leaderboard', Icon: Trophy, title: 'Leaderboard' },
  { view: 'timer', Icon: Timer, title: 'Timer' },
  { view: 'answer', Icon: MessageSquare, title: 'Team answers' },
  { view: 'reveal', Icon: Eye, title: 'Reveal answer' },
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
  const [showFullScreenQuestion, setShowFullScreenQuestion] = useState(false);

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
            title="Previous"
            icon={ChevronLeft}
            iconSize={22}
            onClick={prevQuestion}
            disabled={quiz.currentQuestionIndex === 0}
            style={{ flex: 1, minHeight: 48 }}
          />
          <Button
            variant="primary"
            title={quiz.timer.running ? 'Pause' : 'Start timer'}
            icon={quiz.timer.running ? Pause : Play}
            iconSize={22}
            onClick={quiz.timer.running ? timerPause : timerStart}
            style={{ flex: 1, minHeight: 48 }}
          />
          <Button
            title="Reset timer"
            icon={RotateCcw}
            iconSize={22}
            onClick={timerReset}
            style={{ flex: 1, minHeight: 48 }}
          />
          <Button
            title="Next"
            icon={ChevronRight}
            iconSize={22}
            onClick={nextQuestion}
            disabled={!hasQuestion || quiz.currentQuestionIndex === quiz.questions.length - 1}
            style={{ flex: 1, minHeight: 48 }}
          />
          <Button
            title="Full screen question"
            icon={showFullScreenQuestion ? Minimize2 : Maximize2}
            iconSize={22}
            onClick={() => setShowFullScreenQuestion((value) => !value)}
            disabled={!question}
            style={{ flex: 1, minHeight: 48 }}
          />
        </div>

        {/* Buzz round handling */}
        <Button
          icon={AlertTriangle}
          title="Reset buzzer"
          onClick={resetBuzzer}
          style={{ minHeight: 44 }}
          block
        />

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
            {VIEW_BUTTONS.map(({ view, Icon, title }) => {
              const isActive =
                view === 'reveal' ? activeView === 'answer' : activeView === view;
              return (
                <button
                  key={view}
                  onClick={() => handleViewSelect(view)}
                  title={title}
                  aria-label={title}
                  aria-pressed={isActive}
                  style={{
                    minHeight: 46,
                    borderRadius: 'var(--radius)',
                    border: `2px solid ${isActive ? 'var(--color-accent-primary)' : 'var(--color-border)'}`,
                    background: isActive
                      ? 'color-mix(in srgb, var(--color-accent-primary) 15%, transparent)'
                      : 'var(--color-bg-raised)',
                    color: isActive ? 'var(--color-accent-primary)' : 'var(--color-text-primary)',
                    cursor: 'pointer',
                    display: 'grid',
                    placeItems: 'center',
                    padding: '8px 4px',
                    transition: 'background 0.15s, border-color 0.15s',
                  }}
                >
                  <Icon
                    size={20}
                    style={{ color: view === 'reveal' ? 'var(--color-accent-warn)' : undefined }}
                    aria-hidden="true"
                  />
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

      {/* Full-screen question card, styled like the projector's quiz card */}
      {showFullScreenQuestion && question && (
        <div
          role="dialog"
          aria-modal="true"
          className="projector-vignette"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--color-bg-void)',
            backgroundImage:
              'linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), repeating-linear-gradient(0deg, transparent 0, transparent 31px, color-mix(in srgb, var(--color-accent-primary) 6%, transparent) 32px), repeating-linear-gradient(90deg, transparent 0, transparent 31px, color-mix(in srgb, var(--color-accent-primary) 6%, transparent) 32px), var(--theme-background-image)',
            backgroundSize: 'auto, 32px 32px, 32px 32px, cover',
            backgroundPosition: 'center',
            color: 'var(--color-text-primary)',
            padding: 'max(24px, env(safe-area-inset-top))',
            textAlign: 'center',
          }}
        >
          <button
            type="button"
            onClick={() => setShowFullScreenQuestion(false)}
            aria-label="Close full screen question"
            title="Close"
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              width: 40,
              height: 40,
              display: 'grid',
              placeItems: 'center',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg-raised)',
              color: 'var(--color-text-primary)',
              cursor: 'pointer',
            }}
          >
            <X size={20} aria-hidden="true" />
          </button>

          <div
            className="panel-raised projector-surface--accent stack gap-md"
            style={{
              width: '100%',
              maxWidth: 900,
              minHeight: '60vh',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 32,
              overflow: 'hidden',
            }}
          >
            <span
              className="badge mono"
              style={{
                fontSize: 13,
                fontWeight: 600,
                boxShadow:
                  '0 0 14px color-mix(in srgb, var(--color-accent-primary) 20%, transparent)',
              }}
            >
              Question {quiz.currentQuestionIndex + 1} of {quiz.questions.length}
            </span>
            {question.text && (
              <h2
                style={{
                  fontSize: 'min(48px, 11vw)',
                  maxWidth: 1000,
                  lineHeight: 1.18,
                  whiteSpace: 'pre-wrap',
                  margin: 0,
                }}
              >
                {question.text}
              </h2>
            )}
            {question.answer && (
              <p style={{ fontSize: 20, color: 'var(--color-accent-success)', margin: 0 }}>
                Answer: {question.answer}
              </p>
            )}
          </div>
        </div>
      )}
    </main>
  );
}