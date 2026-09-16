import { useEffect, useRef, useState } from 'react';
import {
  Trophy,
  Zap,
  Image as ImageIcon,
  Video,
  Timer as TimerIcon,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import QRCode from 'qrcode';
import { useQuiz } from '../../context/QuizContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import Confetti from '../common/Confetti.jsx';
import HtmlBlock from '../common/HtmlBlock.jsx';

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Derive displayed countdown from the absolute deadline rather than the stored
// `remaining` so every window (host and mirror) shows the same number and
// stale persisted values can never cause the display to flip-flop.
function timerSeconds(timer) {
  if (timer?.endsAt) return Math.max(0, Math.ceil((timer.endsAt - Date.now()) / 1000));
  return Math.max(0, timer?.remaining ?? 0);
}

let cachedBuzzAudio = null;

function playBuzzTone(soundDataUrl) {
  if (soundDataUrl) {
    try {
      if (!cachedBuzzAudio || cachedBuzzAudio.dataset?.src !== soundDataUrl) {
        cachedBuzzAudio = new Audio(soundDataUrl);
        cachedBuzzAudio.dataset.src = soundDataUrl;
      }
      cachedBuzzAudio.currentTime = 0;
      const playResult = cachedBuzzAudio.play();
      if (playResult) playResult.catch(() => {});
      return;
    } catch {
      // Fall through to the synthesized tone if the file can't be played.
    }
  }

  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return;

  const context = window.__qnahutBuzzAudioContext || new AudioCtor();
  window.__qnahutBuzzAudioContext = context;

  if (context.state === 'suspended') {
    context.resume().catch(() => {});
  }

  const now = context.currentTime;
  const toneA = context.createOscillator();
  const toneB = context.createOscillator();
  const gainA = context.createGain();
  const gainB = context.createGain();

  toneA.type = 'square';
  toneB.type = 'square';
  toneA.frequency.setValueAtTime(920, now);
  toneB.frequency.setValueAtTime(640, now + 0.08);

  gainA.gain.setValueAtTime(0.0001, now);
  gainA.gain.exponentialRampToValueAtTime(0.15, now + 0.01);
  gainA.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

  gainB.gain.setValueAtTime(0.0001, now + 0.08);
  gainB.gain.exponentialRampToValueAtTime(0.1, now + 0.09);
  gainB.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);

  toneA.connect(gainA).connect(context.destination);
  toneB.connect(gainB).connect(context.destination);

  toneA.start(now);
  toneA.stop(now + 0.18);
  toneB.start(now + 0.08);
  toneB.stop(now + 0.24);
}

export default function Projector() {
  const { quiz } = useQuiz();
  const { theme } = useTheme();
  const [buzzAnnouncement, setBuzzAnnouncement] = useState(null);
  const handledBuzzRef = useRef(null);
  const announcementTimeoutRef = useRef(null);
  const currentQuestionIndex = quiz?.currentQuestionIndex;
  const firstBuzz = quiz?.buzzer?.order?.[0];
  const firstBuzzTeamId = firstBuzz?.teamId;
  const firstBuzzTime = firstBuzz?.time;
  const previousConnectedRef = useRef(null);
  const [offlineTeam, setOfflineTeam] = useState(null);
  const offlineTimeoutRef = useRef(null);

  useEffect(() => {
    if (!quiz) return undefined;

    const question = quiz.questions[quiz.currentQuestionIndex];
    const questionKey = `${quiz.currentQuestionIndex}:${question?.id || 'empty'}`;

    if (handledBuzzRef.current?.questionKey !== questionKey) {
      handledBuzzRef.current = { questionKey, buzzKey: null };
      setBuzzAnnouncement(null);
      window.clearTimeout(announcementTimeoutRef.current);
    }

    if (!firstBuzz) return undefined;

    const buzzKey = `${questionKey}:${firstBuzz.teamId}:${firstBuzz.time}`;
    if (handledBuzzRef.current.buzzKey === buzzKey) return undefined;

    handledBuzzRef.current.buzzKey = buzzKey;
    const team = quiz.teams.find((candidate) => candidate.id === firstBuzz.teamId);
    setBuzzAnnouncement({
      teamName: team?.name || 'Team',
    });
    playBuzzTone(theme?.buzzerSoundDataUrl);
    window.clearTimeout(announcementTimeoutRef.current);
    announcementTimeoutRef.current = window.setTimeout(() => setBuzzAnnouncement(null), 1250);

    return undefined;
  }, [quiz, currentQuestionIndex, firstBuzz, firstBuzzTeamId, firstBuzzTime, theme?.buzzerSoundDataUrl]);

  useEffect(() => () => window.clearTimeout(announcementTimeoutRef.current), []);

  useEffect(() => {
    if (!quiz) return undefined;
    const connectedIds = new Set(quiz.teams.filter((team) => team.connected).map((team) => team.id));
    const previousIds = previousConnectedRef.current;
    if (previousIds) {
      const disconnectedTeam = quiz.teams.find(
        (team) => previousIds.has(team.id) && !connectedIds.has(team.id),
      );
      if (disconnectedTeam) {
        setOfflineTeam(disconnectedTeam.name);
        // Keep the dismiss timer in a ref (not an effect cleanup) so that
        // unrelated quiz updates — which re-run this effect on every snapshot
        // poll — never cancel it. The notice always disappears after 3.5s.
        window.clearTimeout(offlineTimeoutRef.current);
        offlineTimeoutRef.current = window.setTimeout(() => setOfflineTeam(null), 3500);
      }
    }
    previousConnectedRef.current = connectedIds;
    return undefined;
  }, [quiz]);

  useEffect(() => () => window.clearTimeout(offlineTimeoutRef.current), []);

  if (!quiz) {
    return <FullBleed>No quiz loaded.</FullBleed>;
  }

  let view;
  switch (quiz.projectorView) {
    case 'timer':
      view = <TimerView />;
      break;
    case 'buzzer':
      view = <BuzzerView />;
      break;
    case 'leaderboard':
      view = <LeaderboardView />;
      break;
    case 'answers':
      view = <TeamAnswersView />;
      break;
    case 'answer':
      view = <AnswerView />;
      break;
    case 'question':
    default: {
      const currentQuestion = quiz.questions[quiz.currentQuestionIndex];
      // "Reveal answer when timer ends": the projector flips to the answer
      // automatically the moment the countdown reaches zero. Display-only —
      // quiz state is left untouched; when the host restarts the timer or
      // clears it the question view comes back on its own.
      const autoRevealAnswer =
        currentQuestion?.showAnswer === 'on-timer-end' &&
        quiz.timer &&
        timerSeconds(quiz.timer) === 0;
      view = autoRevealAnswer ? <AnswerView /> : <QuestionView />;
      break;
    }
  }

  return (
    <>
      {view}
      {offlineTeam && <OfflineNotice teamName={offlineTeam} />}
      {buzzAnnouncement && <BuzzAnnouncement announcement={buzzAnnouncement} />}
      <FullscreenToggle />
    </>
  );
}

function OfflineNotice({ teamName }) {
  return (
    <div
      role="status"
      className="projector-offline"
      style={{
        position: 'fixed',
        top: 72,
        left: 24,
        zIndex: 20,
      }}
    >
      <span className="projector-offline__dot" aria-hidden="true" />
      {teamName} went offline
    </div>
  );
}

function FullscreenToggle() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    function handleChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);

  function toggle() {
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch?.(() => {});
    } else {
      document.documentElement.requestFullscreen?.().catch?.(() => {});
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="projector-fullscreen-toggle"
      aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
    >
      {isFullscreen ? (
        <Minimize2 size={16} aria-hidden="true" />
      ) : (
        <Maximize2 size={16} aria-hidden="true" />
      )}
    </button>
  );
}

function BuzzAnnouncement({ announcement }) {
  return (
    <div className="projector-buzz-overlay" role="status" aria-live="assertive">
      <div className="projector-buzz-overlay__content">
        <span className="projector-buzz-overlay__team">{announcement.teamName}</span>
        <strong className="projector-buzz-overlay__label">BUZZED!</strong>
      </div>
    </div>
  );
}

function Watermark() {
  return (
    <div
      style={{
        position: 'fixed',
        left: 16,
        bottom: 12,
        fontSize: 12,
        color: 'var(--color-text-muted)',
        opacity: 0.6,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        pointerEvents: 'none',
      }}
    >
      <Zap size={12} aria-hidden="true" />
      Powered by QNAHUT
    </div>
  );
}

function FullBleed({ children }) {
  const { quiz } = useQuiz();
  return (
    <div
      className="projector-vignette"
      style={{
        minHeight: '100vh',
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
        padding: '88px 48px 48px',
        textAlign: 'center',
        position: 'relative',
        zIndex: 0,
      }}
    >
      <ProjectorHeader quiz={quiz} />
      {children}
      <Watermark />
    </div>
  );
}

function ProjectorHeader({ quiz }) {
  return (
    <header className="projector-header">
      <div className="row gap-sm" style={{ minWidth: 0 }}>
        {quiz?.logoDataUrl && (
          <img
            src={quiz.logoDataUrl}
            alt="Quiz logo"
            className="projector-header__logo"
          />
        )}
        <div style={{ minWidth: 0 }}>
          <strong
            style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: 18 }}
          >
            {quiz?.name}
          </strong>
          {quiz?.description && (
            <span style={{ display: 'block', color: 'var(--color-text-muted)', fontSize: 13 }}>
              {quiz.description}
            </span>
          )}
        </div>
      </div>
      <span className="projector-header__live">
        <span className="projector-header__live-dot" aria-hidden="true" />
        <span className="badge badge-success" style={{ fontSize: 13 }}>LIVE</span>
      </span>
    </header>
  );
}

function QuestionView() {
  const { quiz } = useQuiz();
  const question = quiz.questions[quiz.currentQuestionIndex];
  const buzzer = quiz.buzzer || { order: [], answers: {}, locked: false };
  const firstBuzzTeam = quiz.teams.find((team) => team.id === buzzer.order[0]?.teamId);
  const hideQuestionAfterBuzz =
    quiz.modes.hideQuestionAfterBuzz === true &&
    buzzer.order.length > 0 &&
    quiz.projectorQuestionRevealed !== true;
  const hideQuestionAfterTimer = question.hideAfterTimer === true && timerSeconds(quiz.timer) === 0;

  if (!question) return <FullBleed>Waiting for the host to load a question…</FullBleed>;

  if (question.type === 'image-slide') {
    return (
      <FullBleed>
        <div key={question.id} className="question-enter">
          <MediaBlock
            type="image"
            src={question.mediaData}
            label={question.mediaLabel}
            fit={question.imageFit}
            fullBleed
            fullScreen
          />
        </div>
      </FullBleed>
    );
  }

  if (question.isSlide) {
    return (
      <FullBleed>
        <div
          key={question.id}
          className="question-enter stack gap-md"
          style={{ alignItems: 'center' }}
        >
          <h1
            style={{
              fontSize: 52,
              maxWidth: 900,
              lineHeight: 1.15,
              whiteSpace: 'pre-wrap',
              textAlign: 'center',
            }}
          >
            {question.text}
          </h1>
          {question.body && (
            <p
              style={{
                fontSize: 22,
                maxWidth: 760,
                color: 'var(--color-text-primary)',
                opacity: 0.85,
                whiteSpace: 'pre-wrap',
                textAlign: 'center',
              }}
            >
              {question.body}
            </p>
          )}
        </div>
      </FullBleed>
    );
  }

  if (question.type === 'html' && question.fullscreenMedia) {
    return (
      <FullBleed>
        <HtmlBlock
          key={question.id}
          html={question.htmlContent}
          className="question-enter projector-fullscreen-content"
          style={{ fontSize: 28, maxWidth: 960 }}
        />
      </FullBleed>
    );
  }

  const isVideoOnly = question.type === 'video-only';
  const hasMedia = ['image', 'video', 'image-only', 'video-only'].includes(question.type);

  if (hasMedia && question.fullscreenMedia) {
    return (
      <FullBleed>
        <div key={question.id} className="question-enter">
          <MediaBlock
            type={isVideoOnly || question.type === 'video' ? 'video' : 'image'}
            src={question.mediaData}
            label={question.mediaLabel}
            fit={question.imageFit}
            fullBleed
            fullScreen
          />
        </div>
      </FullBleed>
    );
  }

  return (
    <FullBleed>
      <div
        className="question-enter projector-question-layout"
        style={{
          width: '100%',
          maxWidth: 1400,
          height: 'calc(100vh - 136px)',
          minHeight: 420,
          display: 'grid',
          gridTemplateRows: 'minmax(0, 1fr) auto',
          gap: 12,
        }}
      >
        <div
          className="panel-raised projector-surface projector-surface--accent stack gap-md"
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            padding: 32,
            overflow: 'hidden',
          }}
        >
          {hideQuestionAfterBuzz ? (
            <>
              <span className="badge mono" style={{ fontSize: 15, fontWeight: 600 }}>
                First buzz
              </span>
              <h1
                className="projector-question-title"
                style={{ fontSize: 44, maxWidth: 1000, lineHeight: 1.15, textShadow: '0 0 40px color-mix(in srgb, var(--color-accent-primary) 40%, transparent)' }}
              >
                {firstBuzzTeam?.name || 'Team'} buzzed
              </h1>
            </>
          ) : hideQuestionAfterTimer ? (
            <>
              <span className="badge mono" style={{ fontSize: 15, fontWeight: 600 }}>
                Timer ended
              </span>
              <h1
                className="projector-question-title"
                style={{ fontSize: 44, maxWidth: 1000, lineHeight: 1.15, textShadow: '0 0 40px color-mix(in srgb, var(--color-accent-secondary) 40%, transparent)' }}
              >
                Time&apos;s up
              </h1>
            </>
          ) : (
            <>
              <span
                className="badge mono"
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  boxShadow: '0 0 14px color-mix(in srgb, var(--color-accent-primary) 20%, transparent)',
                }}
              >
                Question {quiz.currentQuestionIndex + 1}
              </span>
              {question.type === 'html' ? (
                <HtmlBlock
                  html={question.htmlContent}
                  className="projector-question-title"
                  style={{ fontSize: 28, maxWidth: 1000, whiteSpace: 'pre-wrap' }}
                />
              ) : (
                question.text && (
                  <h1
                    className="projector-question-title"
                    style={{
                      fontSize: 50,
                      maxWidth: 1000,
                      lineHeight: 1.18,
                      whiteSpace: 'pre-wrap',
                      textShadow: '0 0 48px color-mix(in srgb, var(--color-accent-primary) 35%, transparent)',
                    }}
                  >
                    {question.text}
                  </h1>
                )
              )}
              {hasMedia && (
                <MediaBlock
                  type={question.type === 'image' ? 'image' : 'video'}
                  src={question.mediaData}
                  label={question.mediaLabel}
                  fit={question.imageFit}
                  fullScreen={question.fullscreenMedia}
                />
              )}
            </>
          )}
        </div>
        <div className="projector-widgets">
          <ProjectorWidgets quiz={quiz} />
        </div>
      </div>
    </FullBleed>
  );
}

function ProjectorWidgets({ quiz }) {
  const widgets = [];
  if (quiz.modes.projectorTimer !== false) {
    widgets.push(
      <div
        key="timer"
        className="panel-raised projector-surface projector-widget-timer stack gap-xs"
        style={{
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '14px 20px',
          minHeight: 104,
        }}
      >
        <span className="row gap-xs" style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
          <TimerIcon size={14} aria-hidden="true" /> TIME
        </span>
        <strong
          className="mono"
          style={{
            fontSize: 36,
            color: 'var(--color-accent-primary)',
            textShadow: '0 0 20px color-mix(in srgb, var(--color-accent-primary) 35%, transparent)',
          }}
        >
          {formatTime(timerSeconds(quiz.timer))}
        </strong>
      </div>,
    );
  }
  if (quiz.modes.leaderboard !== false && quiz.modes.projectorLeaderboard !== false) {
    const leaders = [...quiz.teams].sort((first, second) => second.score - first.score).slice(0, 3);
    widgets.push(
      <div
        key="leaderboard"
        className="panel-raised projector-surface stack gap-xs"
        style={{
          justifyContent: 'center',
          alignItems: 'stretch',
          padding: '14px 20px',
          minHeight: 104,
        }}
      >
        <span className="row gap-xs" style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
          <Trophy size={14} aria-hidden="true" /> LIVE SCORES
        </span>
        {leaders.slice(0, 3).map((team, index) => (
          <div
            key={team.id}
            className="row"
            style={{ justifyContent: 'space-between', fontSize: 14, alignItems: 'center' }}
          >
            <span className="row gap-xs" style={{ alignItems: 'center', minWidth: 0 }}>
              <span
                className="mono"
                style={{
                  color: index === 0 ? 'var(--color-accent-warn)' : 'var(--color-text-muted)',
                  fontWeight: 600,
                  fontSize: 12,
                  width: 16,
                  flexShrink: 0,
                }}
              >
                {index + 1}
              </span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {team.name}
              </span>
            </span>
            <strong
              className="mono"
              style={{
                color: index === 0 ? 'var(--color-accent-warn)' : 'var(--color-text-primary)',
                fontSize: 14,
                flexShrink: 0,
                marginLeft: 12,
              }}
            >
              {team.score}
            </strong>
          </div>
        ))}
      </div>,
    );
  }
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.max(widgets.length, 1)}, minmax(0, 1fr))`,
        gap: 12,
        alignItems: 'stretch',
        maxHeight: 150,
      }}
    >
      {widgets}
    </div>
  );
}

function AnswerView() {
  const { quiz } = useQuiz();
  const question = quiz.questions[quiz.currentQuestionIndex];

  return (
    <FullBleed>
      <div className="question-enter stack gap-md" style={{ width: 'min(1100px, 100%)', alignItems: 'center' }}>
        <span
          className="badge mono"
          style={{
            fontSize: 14,
            fontWeight: 600,
            boxShadow: '0 0 14px color-mix(in srgb, var(--color-accent-success) 25%, transparent)',
          }}
        >
          ANSWER
        </span>
        {question?.text && (
          <p
            style={{
              fontSize: 24,
              color: 'var(--color-text-primary)',
              opacity: 0.8,
              whiteSpace: 'pre-wrap',
            }}
          >
            {question.text}
          </p>
        )}
        <h1
          className="projector-answer-text"
          style={{
            fontSize: 'clamp(48px, 8vw, 120px)',
            lineHeight: 1.05,
            overflowWrap: 'anywhere',
          }}
        >
          {question?.answer || 'No answer entered'}
        </h1>
      </div>
    </FullBleed>
  );
}

function MediaBlock({ type, src, label, fit = 'contain', fullBleed = false, fullScreen = false }) {
  const dimensions = { width: fullBleed ? '90vw' : 640, height: fullBleed ? '70vh' : 320 };
  const mediaClassName = fullScreen ? 'projector-fullscreen-media' : undefined;

  if (src) {
    return type === 'video' ? (
      <video
        className={`question-media ${mediaClassName || ''}`}
        src={src}
        controls
        autoPlay
        style={{ ...dimensions, objectFit: fit }}
      />
    ) : (
      <img
        className={`question-media ${mediaClassName || ''}`}
        src={src}
        alt={label}
        style={{ ...dimensions, objectFit: fit }}
      />
    );
  }

  const Icon = type === 'video' ? Video : ImageIcon;
  return (
    <div
      className="row question-media"
      style={{
        justifyContent: 'center',
        gap: 16,
        ...dimensions,
        border: '1px dashed var(--color-border)',
        borderRadius: 'var(--radius)',
        color: 'var(--color-text-muted)',
      }}
    >
      <Icon size={32} aria-hidden="true" />
      <span style={{ fontSize: 20 }}>{label || 'Media'}</span>
    </div>
  );
}

function TimerView() {
  const { quiz } = useQuiz();
  const remaining = timerSeconds(quiz.timer);
  const critical = remaining <= 3 && remaining > 0;
  return (
    <FullBleed>
      <span
        className={critical ? 'projector-timer projector-timer--critical' : 'projector-timer'}
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 160,
          fontWeight: 700,
          display: 'inline-block',
        }}
      >
        {formatTime(remaining)}
      </span>
    </FullBleed>
  );
}

function BuzzerView() {
  const { quiz } = useQuiz();
  const buzzer = quiz.buzzer || { order: [], answers: {}, locked: false };
  const teamById = Object.fromEntries(quiz.teams.map((t) => [t.id, t]));
  const firstBuzzTime = buzzer.order[0]?.time;
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [shareOrigin, setShareOrigin] = useState(() => window.location.origin);

  useEffect(() => {
    let active = true;
    fetch('/__qnahut-host')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!active || !data?.host) return;
        const port = window.location.port ? `:${window.location.port}` : '';
        setShareOrigin(`${window.location.protocol}//${data.host}${port}`);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const joinLink = `${shareOrigin}/join?quiz=${encodeURIComponent(quiz.id)}&token=${encodeURIComponent(quiz.accessToken || '')}`;
    let active = true;
    QRCode.toDataURL(joinLink, {
      width: 280,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#FFFFFF' },
    })
      .then((dataUrl) => {
        if (active) setQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (active) setQrDataUrl('');
      });
    return () => {
      active = false;
    };
  }, [quiz.accessToken, quiz.id, shareOrigin]);

  if (buzzer.order.length === 0) {
    return (
      <FullBleed>
        <ConnectedTeams quiz={quiz} />
        {qrDataUrl && (
          <div className="projector-qr-frame question-enter">
            <img
              src={qrDataUrl}
              alt="Scan to join this quiz"
              width="240"
              height="240"
            />
            <span
              style={{
                fontSize: 13,
                color: 'var(--color-text-muted)',
                letterSpacing: '0.04em',
                fontWeight: 500,
              }}
            >
              Scan to join
            </span>
          </div>
        )}
      </FullBleed>
    );
  }

  const winner = teamById[buzzer.order[0].teamId];

  return (
    <FullBleed>
      <ConnectedTeams quiz={quiz} />
      <div className="question-enter stack" style={{ alignItems: 'center' }}>
        <span className="pulse badge badge-danger" style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>
          FIRST BUZZ
        </span>
        <h1
          className="projector-winner"
          style={{
            fontSize: 60,
            marginBottom: 36,
            lineHeight: 1.1,
          }}
        >
          {winner?.name}
        </h1>
        <div className="stack gap-sm" style={{ width: 400 }}>
          {buzzer.order.map((entry, index) => (
            <div
              key={entry.teamId}
              className="panel-raised row"
              style={{
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 17,
                padding: '12px 18px',
                gap: 12,
              }}
            >
              <span className="row gap-sm" style={{ alignItems: 'center', minWidth: 0 }}>
                <span className={index === 0 ? 'projector-rank projector-rank--gold' : 'projector-rank'}>
                  #{index + 1}
                </span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {teamById[entry.teamId]?.name}
                </span>
              </span>
              <span className="mono" style={{ color: 'var(--color-text-muted)', fontSize: 14, flexShrink: 0 }}>
                +{(entry.time - firstBuzzTime).toFixed(0)}ms
              </span>
            </div>
          ))}
        </div>
      </div>
    </FullBleed>
  );
}

function ConnectedTeams({ quiz }) {
  const connectedTeams = quiz.teams.filter((team) => team.connected);
  return (
    <div
      className="projector-connected"
      style={{
        position: 'absolute',
        left: 24,
        bottom: 24,
        minWidth: 220,
        maxWidth: 300,
      }}
    >
      <span
        className="row gap-xs"
        style={{ fontSize: 11, color: 'var(--color-text-muted)', letterSpacing: '0.08em' }}
      >
        <span className="projector-connected__count">{connectedTeams.length}</span>
        <strong>CONNECTED TEAMS</strong>
      </span>
      <div className="stack gap-xs" style={{ marginTop: 8 }}>
        {connectedTeams.length === 0 ? (
          <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>None yet</span>
        ) : (
          connectedTeams.map((team) => (
            <span key={team.id} className="projector-connected__team">
              <span className="projector-connected__dot" aria-hidden="true" />
              {team.name}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

function LeaderboardView() {
  const { quiz } = useQuiz();
  const ranked = [...quiz.teams].sort((a, b) => b.score - a.score);
  const leaderId = ranked[0]?.id;
  const prevLeader = useRef();
  const [confettiKey, setConfettiKey] = useState(0);

  // Burst once when the leaderboard first appears, and again whenever the lead changes hands.
  useEffect(() => {
    setConfettiKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (prevLeader.current !== undefined && prevLeader.current !== leaderId) {
      setConfettiKey((k) => k + 1);
    }
    prevLeader.current = leaderId;
  }, [leaderId]);

  return (
    <FullBleed>
      <Confetti triggerKey={confettiKey} />
      <div className="question-enter stack" style={{ alignItems: 'center' }}>
        <h1
          className="projector-winner"
          style={{
            fontSize: 34,
            marginBottom: 32,
            letterSpacing: '0.01em',
            fontFamily: 'var(--font-display)',
          }}
        >
          Leaderboard
        </h1>
        <div className="stack gap-sm" style={{ width: 520 }}>
          {ranked.map((team, index) => (
            <div
              key={team.id}
              className={`row slide-up ${index === 0 ? 'projector-leader-row projector-leader-row--first' : 'projector-leader-row'}`}
              style={{
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 20px',
                animationDelay: index === 0 ? undefined : `${(ranked.length - index) * 0.08}s`,
              }}
            >
              <span className="row gap-sm" style={{ alignItems: 'center', fontSize: 22 }}>
                <span
                  className={
                    index === 0
                      ? 'projector-medal projector-medal--gold'
                      : index === 1
                        ? 'projector-medal projector-medal--silver'
                        : index === 2
                          ? 'projector-medal projector-medal--bronze'
                          : 'projector-medal'
                  }
                >
                  {index + 1}
                </span>
                {index === 0 && (
                  <Trophy size={18} color="var(--color-accent-warn)" aria-hidden="true" />
                )}
                <span style={{ whiteSpace: 'nowrap' }}>{team.name}</span>
              </span>
              <span
                className="mono"
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: index === 0 ? 'var(--color-accent-warn)' : 'var(--color-text-primary)',
                  marginLeft: 16,
                  flexShrink: 0,
                }}
              >
                {team.score}
              </span>
            </div>
          ))}
        </div>
      </div>
    </FullBleed>
  );
}

function TeamAnswersView() {
  const { quiz } = useQuiz();
  const teamById = Object.fromEntries(quiz.teams.map((team) => [team.id, team]));
  const answers = Object.entries(quiz.buzzer?.answers || {});

  return (
    <FullBleed>
      <div className="question-enter stack" style={{ width: 'min(900px, 100%)', textAlign: 'left' }}>
        <div>
          <span className="badge mono" style={{ fontSize: 14, fontWeight: 600 }}>
            TEAM ANSWERS
          </span>
          <h1 style={{ fontSize: 42, marginTop: 10, fontFamily: 'var(--font-display)' }}>
            Submitted answers
          </h1>
          <p style={{ color: 'var(--color-text-muted)' }}>Question {quiz.currentQuestionIndex + 1}</p>
        </div>
        {answers.length === 0 ? (
          <div
            className="panel-raised projector-surface"
            style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}
          >
            <p>No answers submitted yet.</p>
          </div>
        ) : (
          <div className="stack gap-sm">
            {answers.map(([teamId, answer], index) => (
              <div
                key={teamId}
                className="panel-raised projector-surface row"
                style={{ justifyContent: 'space-between', gap: 20, padding: '18px 22px' }}
              >
                <span className="row gap-sm" style={{ alignItems: 'center' }}>
                  <span className="projector-rank">0{index + 1}</span>
                  <strong>{teamById[teamId]?.name || 'Unknown team'}</strong>
                </span>
                <span style={{ color: 'var(--color-text-primary)', textAlign: 'right' }}>
                  {answer}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </FullBleed>
  );
}
