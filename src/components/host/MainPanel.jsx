import {
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Settings,
  Eye,
  ClipboardList,
  Image as ImageIcon,
  Video,
  Zap,
  Flag,
  Info as InfoIcon,
  Maximize2,
} from 'lucide-react';
import { useQuiz } from '../../context/QuizContext.jsx';
import Button from '../common/Button.jsx';
import Panel from '../common/Panel.jsx';

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function MainPanel({ onManageQuestions }) {
  const {
    quiz,
    timerStart,
    timerPause,
    timerReset,
    nextQuestion,
    prevQuestion,
    gotoQuestion,
    revealProjectorQuestion,
    setProjectorView,
    updateQuestion,
  } = useQuiz();
  const question = quiz.questions[quiz.currentQuestionIndex];
  const isSlide = question?.isSlide;
  const supportsFullscreen = ['image', 'video', 'image-only', 'video-only', 'html'].includes(
    question?.type,
  );

  return (
    <Panel
      title={`Item ${quiz.currentQuestionIndex + 1} of ${quiz.questions.length || 0}`}
      action={
        <Button variant="ghost" onClick={onManageQuestions} icon={Settings}>
          Manage running order
        </Button>
      }
    >
      {!question ? (
        <p>Nothing in the running order yet — add questions or slides from the manager.</p>
      ) : isSlide ? (
        <div key={question.id} className="question-enter stack gap-sm" style={{ marginBottom: 16 }}>
          {question.type === 'image-slide' ? (
            <MediaPreview
              type="image"
              src={question.mediaData}
              label={question.mediaLabel || 'Image'}
              fit={question.imageFit}
            />
          ) : (
            <>
              <h2 style={{ fontSize: 22, whiteSpace: 'pre-wrap' }}>{question.text}</h2>
              {question.body && <p style={{ whiteSpace: 'pre-wrap' }}>{question.body}</p>}
            </>
          )}
          <p style={{ fontSize: 12 }}>
            This slide is not timed or scored — use Next when ready to move on.
          </p>
        </div>
      ) : (
        <>
          <div
            key={question.id}
            className="question-enter stack gap-sm"
            style={{ marginBottom: 16 }}
          >
            {question.type === 'html' ? (
              <div dangerouslySetInnerHTML={{ __html: question.htmlContent }} />
            ) : (
              question.text && (
                <h2 style={{ fontSize: 22, whiteSpace: 'pre-wrap' }}>{question.text}</h2>
              )
            )}
            {['image', 'image-only'].includes(question.type) && (
              <MediaPreview
                type="image"
                src={question.mediaData}
                label={question.mediaLabel || 'Image'}
                fit={question.imageFit}
              />
            )}
            {['video', 'video-only'].includes(question.type) && (
              <MediaPreview
                type="video"
                src={question.mediaData}
                label={question.mediaLabel || 'Video'}
              />
            )}
            <div className="row gap-sm">
              <span className="badge">+{question.pointsCorrect} pts</span>
              <span className="badge">
                Round {question.round}
                {question.roundName ? `: ${question.roundName}` : ''}
              </span>
              {question.tiebreaker && (
                <span className="badge badge-success">
                  <Zap size={11} aria-hidden="true" /> Tiebreaker
                </span>
              )}
            </div>
          </div>

          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
            <span
              className="mono"
              style={{
                fontSize: 40,
                fontWeight: 700,
                display: 'inline-block',
                color: 'var(--color-accent-primary)',
              }}
            >
              {formatTime(quiz.timer.remaining)}
            </span>
            <div className="row gap-sm">
              <Button
                variant="primary"
                icon={quiz.timer.running ? Pause : Play}
                onClick={quiz.timer.running ? timerPause : timerStart}
              >
                {quiz.timer.running ? 'Pause' : 'Start'}
              </Button>
              <Button icon={RotateCcw} onClick={timerReset}>
                Reset
              </Button>
            </div>
          </div>
        </>
      )}

      {question && (
        <div
          className="row gap-sm wrap"
          style={{ justifyContent: 'space-between', marginBottom: 12 }}
        >
          <Button
            icon={ChevronLeft}
            onClick={prevQuestion}
            disabled={quiz.currentQuestionIndex === 0}
          >
            Previous
          </Button>
          <div className="row gap-xs wrap">
            {quiz.modes.hideQuestionAfterBuzz === true &&
              quiz.buzzer.order.length > 0 &&
              quiz.projectorQuestionRevealed !== true && (
                <Button variant="ghost" icon={Eye} onClick={revealProjectorQuestion}>
                  Display question
                </Button>
              )}
            {Object.keys(quiz.buzzer.answers).length > 0 && (
              <Button
                variant="ghost"
                icon={ClipboardList}
                onClick={() => setProjectorView('answers')}
              >
                Display answers
              </Button>
            )}
            {question.answer?.trim() && !isSlide && (
              <Button
                variant="ghost"
                icon={Eye}
                onClick={() =>
                  setProjectorView(quiz.projectorView === 'answer' ? 'question' : 'answer')
                }
              >
                {quiz.projectorView === 'answer' ? 'Hide answer' : 'Display answer'}
              </Button>
            )}
            {supportsFullscreen && (
              <Button
                variant={question.fullscreenMedia ? 'primary' : 'ghost'}
                icon={Maximize2}
                onClick={() =>
                  updateQuestion(question.id, { fullscreenMedia: !question.fullscreenMedia })
                }
              >
                {question.fullscreenMedia ? 'Exit projector fullscreen' : 'Projector fullscreen'}
              </Button>
            )}
          </div>
          <Button
            icon={ChevronRight}
            onClick={nextQuestion}
            disabled={quiz.currentQuestionIndex === quiz.questions.length - 1}
          >
            Next
          </Button>
        </div>
      )}

      {quiz.questions.length > 0 && (
        <div className="row gap-xs wrap">
          {quiz.questions.map((q, index) => (
            <button
              key={q.id}
              onClick={() => gotoQuestion(index)}
              className="badge mono"
              title={
                q.tiebreaker
                  ? 'Tiebreaker — skipped by Next/Previous, jump here directly'
                  : undefined
              }
              style={{
                cursor: 'pointer',
                borderColor:
                  index === quiz.currentQuestionIndex
                    ? 'var(--color-accent-primary)'
                    : q.tiebreaker
                      ? 'var(--color-accent-warn)'
                      : undefined,
                color:
                  index === quiz.currentQuestionIndex
                    ? 'var(--color-accent-primary)'
                    : q.tiebreaker
                      ? 'var(--color-accent-warn)'
                      : undefined,
              }}
            >
              {q.isSlide ? (
                q.type === 'round-header' ? (
                  <Flag size={11} />
                ) : (
                  <InfoIcon size={11} />
                )
              ) : (
                index + 1
              )}
              {q.tiebreaker && <Zap size={11} aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </Panel>
  );
}

function MediaPreview({ type, src, label, fit = 'contain' }) {
  if (src) {
    return type === 'video' ? (
      <video
        className="question-media"
        src={src}
        controls
        style={{ width: '100%', maxHeight: 260 }}
      />
    ) : (
      <img
        className="question-media"
        src={src}
        alt={label}
        style={{
          width: '100%',
          maxHeight: 260,
          objectFit: fit,
          borderRadius: 'var(--radius)',
          background: 'var(--color-bg-void)',
        }}
      />
    );
  }
  const Icon = type === 'video' ? Video : ImageIcon;
  return (
    <div
      className="row question-media"
      style={{
        justifyContent: 'center',
        gap: 10,
        height: 160,
        borderRadius: 'var(--radius)',
        border: '1px dashed var(--color-border)',
        background: 'var(--color-bg-void)',
        color: 'var(--color-text-muted)',
      }}
    >
      <Icon size={22} aria-hidden="true" />
      <span style={{ fontSize: 13 }}>{label}</span>
    </div>
  );
}
