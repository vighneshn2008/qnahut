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
import Confetti from '../common/Confetti.jsx';

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function playBuzzTone() {
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
    playBuzzTone();
    window.clearTimeout(announcementTimeoutRef.current);
    announcementTimeoutRef.current = window.setTimeout(() => setBuzzAnnouncement(null), 1250);

    return undefined;
  }, [quiz, currentQuestionIndex, firstBuzz, firstBuzzTeamId, firstBuzzTime]);

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
    default:
      view = <QuestionView />;
      break;
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
      style={{
        position: 'fixed',
        top: 18,
        left: 24,
        zIndex: 20,
        padding: '10px 14px',
        border: '1px solid var(--color-accent-warn)',
        borderRadius: 'var(--radius)',
        background: 'var(--color-bg-panel)',
        color: 'var(--color-accent-warn)',
        fontSize: 13,
        fontWeight: 600,
      }}
    >
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
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-bg-void)',
        backgroundImage:
          'linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), repeating-linear-gradient(0deg, transparent 0, transparent 31px, color-mix(in srgb, var(--color-accent-primary) 8%, transparent) 32px), repeating-linear-gradient(90deg, transparent 0, transparent 31px, color-mix(in srgb, var(--color-accent-primary) 8%, transparent) 32px), var(--theme-background-image)',
        backgroundSize: 'auto, 32px 32px, 32px 32px, cover',
        backgroundPosition: 'center',
        color: 'var(--color-text-primary)',
        padding: '88px 48px 48px',
        textAlign: 'center',
        position: 'relative',
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
    <header
      className="row"
      style={{
        position: 'absolute',
        top: 18,
        left: 24,
        right: 24,
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        textAlign: 'left',
      }}
    >
      <div className="row gap-sm" style={{ minWidth: 0 }}>
        {quiz?.logoDataUrl && (
          <img
            src={quiz.logoDataUrl}
            alt="Quiz logo"
            style={{
              width: 42,
              height: 42,
              objectFit: 'cover',
              clipPath: 'var(--clip-hexadecagon)',
              border: '2px solid var(--color-accent-primary)',
            }}
          />
        )}
        <div style={{ minWidth: 0 }}>
          <strong style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: 16 }}>
            {quiz?.name}
          </strong>
          {quiz?.description && (
            <span style={{ display: 'block', color: 'var(--color-text-muted)', fontSize: 12 }}>
              {quiz.description}
            </span>
          )}
        </div>
      </div>
      <span className="badge badge-success" style={{ flexShrink: 0 }}>
        LIVE
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
  const hideQuestionAfterTimer = question.hideAfterTimer === true && quiz.timer.remaining === 0;

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
        <div
          key={question.id}
          className="question-enter projector-fullscreen-content"
          style={{ fontSize: 28, maxWidth: 960 }}
          dangerouslySetInnerHTML={{ __html: question.htmlContent }}
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
          className="panel-raised projector-surface stack gap-md"
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            padding: 32,
            overflow: 'hidden',
          }}
        >
          {hideQuestionAfterBuzz ? (
            <>
              <span className="badge mono" style={{ fontSize: 14 }}>
                First buzz
              </span>
              <h1
                className="projector-question-title"
                style={{ fontSize: 42, maxWidth: 1000, lineHeight: 1.2 }}
              >
                {firstBuzzTeam?.name || 'Team'} buzzed
              </h1>
            </>
          ) : hideQuestionAfterTimer ? (
            <>
              <span className="badge mono" style={{ fontSize: 14 }}>
                Timer ended
              </span>
              <h1
                className="projector-question-title"
                style={{ fontSize: 42, maxWidth: 1000, lineHeight: 1.2 }}
              >
                Time&apos;s up
              </h1>
            </>
          ) : (
            <>
              <span className="badge mono" style={{ fontSize: 14 }}>
                Question {quiz.currentQuestionIndex + 1}
              </span>
              {question.type === 'html' ? (
                <div
                  className="projector-question-title"
                  style={{ fontSize: 28, maxWidth: 1000, whiteSpace: 'pre-wrap' }}
                  dangerouslySetInnerHTML={{ __html: question.htmlContent }}
                />
              ) : (
                question.text && (
                  <h1
                    className="projector-question-title"
                    style={{
                      fontSize: 48,
                      maxWidth: 1000,
                      lineHeight: 1.2,
                      whiteSpace: 'pre-wrap',
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
        className="panel-raised projector-surface stack gap-xs"
        style={{
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '14px 18px',
          minHeight: 104,
        }}
      >
        <span className="row gap-xs" style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>
          <TimerIcon size={14} aria-hidden="true" /> TIME
        </span>
        <strong className="mono" style={{ fontSize: 34, color: 'var(--color-accent-primary)' }}>
          {formatTime(quiz.timer.remaining)}
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
          padding: '14px 18px',
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
            style={{ justifyContent: 'space-between', fontSize: 13 }}
          >
            <span>
              <span className="mono" style={{ color: 'var(--color-text-muted)' }}>
                0{index + 1}
              </span>{' '}
              {team.name}
            </span>
            <strong className="mono">{team.score}</strong>
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
      <div className="stack gap-md" style={{ width: 'min(1100px, 100%)', alignItems: 'center' }}>
        <span className="badge mono">ANSWER</span>
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
  const remaining = quiz.timer.remaining;
  const low = remaining <= 5 && remaining > 3;
  const critical = remaining <= 3 && remaining > 0;
  return (
    <FullBleed>
      <span
        className={critical ? 'shake' : low ? 'pulse' : ''}
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 160,
          fontWeight: 700,
          display: 'inline-block',
          color: 'var(--color-accent-primary)',
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
          <img
            src={qrDataUrl}
            alt="Scan to join this quiz"
            width="280"
            height="280"
            style={{ background: '#fff', padding: 10, borderRadius: 14 }}
          />
        )}
      </FullBleed>
    );
  }

  const winner = teamById[buzzer.order[0].teamId];

  return (
    <FullBleed>
      <ConnectedTeams quiz={quiz} />
      <span className="pulse badge badge-danger" style={{ fontSize: 16, marginBottom: 16 }}>
        FIRST BUZZ
      </span>
      <h1 style={{ fontSize: 56, marginBottom: 32 }}>{winner?.name}</h1>
      <div className="stack gap-sm" style={{ width: 360 }}>
        {buzzer.order.map((entry, index) => (
          <div
            key={entry.teamId}
            className="row"
            style={{ justifyContent: 'space-between', fontSize: 18 }}
          >
            <span>
              #{index + 1} {teamById[entry.teamId]?.name}
            </span>
            <span className="mono" style={{ color: 'var(--color-text-muted)' }}>
              +{(entry.time - firstBuzzTime).toFixed(0)}ms
            </span>
          </div>
        ))}
      </div>
    </FullBleed>
  );
}

function ConnectedTeams({ quiz }) {
  const connectedTeams = quiz.teams.filter((team) => team.connected);
  return (
    <div
      className="panel-raised"
      style={{
        position: 'absolute',
        left: 24,
        bottom: 24,
        padding: '12px 16px',
        textAlign: 'left',
        minWidth: 220,
      }}
    >
      <strong style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>CONNECTED TEAMS</strong>
      <div className="stack gap-xs" style={{ marginTop: 8 }}>
        {connectedTeams.length === 0 ? (
          <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>None yet</span>
        ) : (
          connectedTeams.map((team) => (
            <span key={team.id} style={{ fontSize: 14 }}>
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
      <h1 style={{ fontSize: 36, marginBottom: 32 }}>Leaderboard</h1>
      <div className="stack gap-sm" style={{ width: 480 }}>
        {ranked.map((team, index) => (
          <div
            key={team.id}
            className={`row slide-up panel-raised ${index === 0 ? 'leader-glow' : ''}`}
            style={{
              justifyContent: 'space-between',
              padding: '16px 24px',
              animationDelay: index === 0 ? undefined : `${(ranked.length - index) * 0.08}s`,
            }}
          >
            <span className="row gap-sm" style={{ fontSize: 22 }}>
              {index === 0 && (
                <Trophy size={20} color="var(--color-accent-warn)" aria-hidden="true" />
              )}
              #{index + 1} {team.name}
            </span>
            <span className="mono" style={{ fontSize: 22 }}>
              {team.score}
            </span>
          </div>
        ))}
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
      <div className="stack gap-md" style={{ width: 'min(900px, 100%)', textAlign: 'left' }}>
        <div>
          <span className="badge mono">TEAM ANSWERS</span>
          <h1 style={{ fontSize: 42, marginTop: 10 }}>Submitted answers</h1>
          <p>Question {quiz.currentQuestionIndex + 1}</p>
        </div>
        {answers.length === 0 ? (
          <div className="panel-raised" style={{ padding: 24, textAlign: 'center' }}>
            <p>No answers submitted yet.</p>
          </div>
        ) : (
          <div className="stack gap-sm">
            {answers.map(([teamId, answer], index) => (
              <div
                key={teamId}
                className="panel-raised row"
                style={{ justifyContent: 'space-between', gap: 20, padding: '18px 22px' }}
              >
                <span className="row gap-sm">
                  <strong className="mono" style={{ color: 'var(--color-accent-primary)' }}>
                    0{index + 1}
                  </strong>
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
