import {
  Zap,
  Users,
  Timer,
  Trophy,
  ArrowDown,
  Monitor,
  Radio,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { useQuiz } from '../../context/QuizContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useNavigation, VIEWS } from '../../context/NavigationContext.jsx';
import { importQuizPackage, setPendingImportedQuiz } from '../../utils/quizPackage.js';
import Button from '../common/Button.jsx';
import Panel from '../common/Panel.jsx';

const FEATURES = [
  {
    icon: Timer,
    title: 'Host control',
    body: 'Run questions, timers and rounds from one dashboard.',
  },
  {
    icon: Zap,
    title: 'Millisecond buzzer',
    body: 'A server-timestamped buzzer keeps fastest-finger rounds fair.',
  },
  {
    icon: Trophy,
    title: 'Instant leaderboard',
    body: 'Scores and rankings update on the shared screen instantly.',
  },
  {
    icon: Users,
    title: 'No accounts',
    body: 'Teams join with a 4-digit code — nothing to install or sign up for.',
  },
];

export default function Landing() {
  const { loadDemo } = useQuiz();
  const { setTheme } = useTheme();
  const { setView } = useNavigation();
  const packageInputRef = useRef(null);
  const [importError, setImportError] = useState('');

  function handleCreateQuiz() {
    setView(VIEWS.WIZARD);
  }

  function handleTryDemo() {
    loadDemo();
    setView(VIEWS.HOST);
  }

  async function handleImport(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const { quiz, theme } = await importQuizPackage(file);
      const hydratedQuiz = {
        ...quiz,
        hostPassword: quiz.hostPassword || 'imported-quiz',
        theme: theme || quiz.theme,
        timer: quiz.timer || { remaining: quiz.modes.defaultTimer, running: false },
      };
      setPendingImportedQuiz(hydratedQuiz);
      try {
        sessionStorage.setItem('qnahut:import-draft', JSON.stringify(hydratedQuiz));
      } catch {
        // Large media packages stay in the in-memory handoff instead.
      }
      if (theme) setTheme(theme);
      setImportError('');
      setView(VIEWS.WIZARD);
    } catch (error) {
      setImportError(error.message);
    }
  }

  return (
    <main className="landing-page">
      <section className="landing-hero container">
        <div className="landing-hero-copy">
          <span className="badge badge-success landing-kicker">
            <Sparkles size={13} /> QUIZ OPERATING SYSTEM
          </span>
          <h1>
            Turn every question
            <br />
            <span>into a room moment.</span>
          </h1>
          <p>
            Host fast team competitions with a shared stage, real-time buzzers, instant scoring, and
            zero account friction.
          </p>
          <div className="row gap-sm wrap landing-actions">
            <Button variant="primary" onClick={handleCreateQuiz}>
              Create a quiz
            </Button>
            <Button variant="primary" onClick={() => packageInputRef.current?.click()}>
              Import quiz
            </Button>
            <Button variant="primary" onClick={handleTryDemo}>
              Try the demo
            </Button>
            <Button variant="primary" onClick={() => setView(VIEWS.JOIN)}>
              Join a quiz
            </Button>
          </div>
          <input
            ref={packageInputRef}
            type="file"
            accept=".zip,.qnahutpkg.zip,.json,application/zip,application/json"
            onChange={handleImport}
            style={{ display: 'none' }}
          />
          {importError && (
            <p style={{ color: 'var(--color-accent-secondary)', fontSize: 13, marginTop: 10 }}>
              {importError}
            </p>
          )}
          <div className="landing-proof row gap-md wrap">
            <span>
              <ShieldCheck size={15} /> No accounts
            </span>
            <span>
              <Radio size={15} /> Instant sync
            </span>
            <span>
              <Monitor size={15} /> Projector ready
            </span>
          </div>
        </div>

        <div className="landing-stage" aria-label="Live quiz dashboard preview">
          <div className="stage-orbit stage-orbit-one" />
          <div className="stage-orbit stage-orbit-two" />
          <div className="stage-console">
            <div className="stage-console-top row">
              <span className="mono">QNAHUT / ROOM</span>
              <span className="badge badge-success">READY</span>
            </div>
            <div className="stage-question">
              <span className="mono">ROUND 02 · VISUAL</span>
              <strong>
                Which landmark
                <br />
                is on screen?
              </strong>
            </div>
            <div className="stage-controls row gap-sm">
              <span className="stage-timer mono">00:27</span>
              <span className="stage-bars">
                <i />
                <i />
                <i />
                <i />
                <i />
              </span>
              <span className="mono">12 TEAMS</span>
            </div>
          </div>
          <div className="stage-scoreboard">
            <span className="mono">SCORES</span>
            <strong>
              01&nbsp; Team Nova <b>320</b>
            </strong>
            <strong>
              02&nbsp; Team Alpha <b>280</b>
            </strong>
            <strong>
              03&nbsp; Team Vector <b>240</b>
            </strong>
          </div>
          <div className="stage-badge">
            FASTEST
            <br />
            <b>0.842s</b>
          </div>
        </div>
        <a className="landing-scroll" href="#features" aria-label="Scroll to features">
          <ArrowDown size={17} /> Scroll to explore
        </a>
      </section>

      <section className="landing-strip" id="features">
        <div className="container">
          <div className="landing-section-heading">
            <span className="mono">01 / EVERYTHING IN THE ROOM, IN SYNC</span>
            <h2>
              One control surface.
              <br />A much louder room.
            </h2>
          </div>
          <div className="landing-feature-grid">
            {FEATURES.map(({ icon: Icon, title, body }, index) => (
              <Panel key={title} className="landing-feature-card">
                <span className="landing-feature-number mono">0{index + 1}</span>
                <span className="landing-icon-tile">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <h3>{title}</h3>
                <p>{body}</p>
              </Panel>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-workflow container">
        <div className="landing-section-heading">
          <span className="mono">02 / THE RUN OF SHOW</span>
          <h2>
            From blank slate
            <br />
            to final score.
          </h2>
        </div>
        <div className="landing-steps">
          <WorkflowStep
            number="01"
            icon={Timer}
            title="Build the running order"
            body="Mix questions, media, rounds, and info slides in one clean sequence."
          />
          <WorkflowStep
            number="02"
            icon={Zap}
            title="Put the room on edge"
            body="Teams join with a code. Your projector and host desk stay in sync."
          />
          <WorkflowStep
            number="03"
            icon={Trophy}
            title="Land the finish"
            body="Reveal answers, score instantly, and let the leaderboard do the talking."
          />
        </div>
      </section>

      <section className="landing-final container">
        <div>
          <span className="mono">03 / READY WHEN YOU ARE</span>
          <h2>
            Turn curiosity
            <br />
            into a room event.
          </h2>
        </div>
        <Button variant="primary" onClick={handleCreateQuiz}>
          Start hosting <ArrowDown size={16} style={{ transform: 'rotate(-90deg)' }} />
        </Button>
      </section>
    </main>
  );
}

function WorkflowStep({ number, icon: Icon, title, body }) {
  return (
    <article className="landing-step">
      <span className="landing-step-number mono">{number}</span>
      <span className="landing-icon-tile landing-icon-tile-step">
        <Icon size={20} aria-hidden="true" />
      </span>
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  );
}
