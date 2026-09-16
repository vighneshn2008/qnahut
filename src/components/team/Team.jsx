import { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';
import { useQuiz } from '../../context/QuizContext.jsx';
import { useNavigation, VIEWS } from '../../context/NavigationContext.jsx';
import Button from '../common/Button.jsx';
import Panel from '../common/Panel.jsx';

export default function Team() {
  const { quiz, buzz, submitTeamAnswer, connectTeam, disconnectTeam } = useQuiz();
  const { activeTeamId, setView } = useNavigation();
  const [answerDraft, setAnswerDraft] = useState('');

  const team = quiz?.teams.find((t) => t.id === activeTeamId);
  const buzzer = quiz?.buzzer || { order: [], answers: {}, locked: false };
  const myEntry = buzzer.order.find((entry) => entry.teamId === team?.id);
  const alreadyBuzzed = Boolean(myEntry);
  const hasAnswered = team ? buzzer.answers[team.id] !== undefined : false;
  const requiresTextAnswer = quiz?.modes.requireTextAnswer === true;

  useEffect(() => {
    if (!team?.id) return undefined;
    connectTeam(team.id);
    return () => disconnectTeam(team.id);
  }, [connectTeam, disconnectTeam, team?.id]);

  if (!quiz) {
    return (
      <main className="container" style={{ maxWidth: 420 }}>
        <Panel>
          <p>No quiz is running right now.</p>
        </Panel>
      </main>
    );
  }

  if (!team) {
    return (
      <main className="container" style={{ maxWidth: 420 }}>
        <Panel>
          <p>You have not joined a team yet.</p>
          <Button variant="primary" onClick={() => setView(VIEWS.JOIN)} style={{ marginTop: 12 }}>
            Enter a code
          </Button>
        </Panel>
      </main>
    );
  }

  function handleBuzz() {
    buzz(team.id, Date.now());
  }

  function handleSubmitAnswer(event) {
    event.preventDefault();
    submitTeamAnswer(team.id, answerDraft, Date.now());
  }

  return (
    <main className="container team-screen" style={{ maxWidth: 420, textAlign: 'center' }}>
      <Panel style={{ padding: 16 }}>
        <h2 style={{ fontSize: 20, marginBottom: 4 }}>{team.name}</h2>
        <p style={{ marginBottom: 14 }}>
          Score: <span className="mono">{team.score}</span>
        </p>

        {quiz.modes.buzzer || requiresTextAnswer ? (
          <>
            {!requiresTextAnswer && (
              <button
                onClick={handleBuzz}
                disabled={buzzer.locked || alreadyBuzzed}
                className={!buzzer.locked && !alreadyBuzzed ? 'pulse buzz-ready' : ''}
                style={{
                  width: 'min(200px, 60vw)',
                  height: 'min(200px, 60vw)',
                  clipPath: 'var(--clip-hexadecagon)',
                  border: 'none',
                  margin: '0 auto',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  background: buzzer.locked || alreadyBuzzed
                    ? 'var(--color-bg-raised)'
                    : 'var(--color-accent-secondary)',
                  color: buzzer.locked || alreadyBuzzed
                    ? 'var(--color-text-muted)'
                    : 'var(--color-bg-void)',
                  fontSize: 22,
                  fontWeight: 700,
                  fontFamily: 'var(--font-display)',
                  cursor: buzzer.locked || alreadyBuzzed ? 'not-allowed' : 'pointer',
                }}
              >
                <Zap size={36} aria-hidden="true" />
                BUZZ
              </button>
            )}

            <p
              style={{
                marginTop: 14,
                fontSize: 15,
                color: 'var(--color-text-primary)',
              }}
            >
              {requiresTextAnswer && !hasAnswered && 'Type your answer and submit to buzz.'}
              {!requiresTextAnswer && alreadyBuzzed && 'You buzzed — waiting for the host.'}
              {!requiresTextAnswer &&
                !alreadyBuzzed &&
                !quiz.buzzer.locked &&
                'Ready — tap when you know it.'}
              {!requiresTextAnswer && !alreadyBuzzed && buzzer.locked && 'Buzzer locked.'}
            </p>

            {requiresTextAnswer && !hasAnswered && (!buzzer.locked || myEntry) && (
              <form
                onSubmit={handleSubmitAnswer}
                className="stack gap-sm"
                style={{ marginTop: 12 }}
              >
                <input
                  className="input"
                  placeholder="Your answer"
                  value={answerDraft}
                  onChange={(e) => setAnswerDraft(e.target.value)}
                  autoFocus
                />
                <Button type="submit" variant="primary" block disabled={!answerDraft.trim()}>
                  Submit answer
                </Button>
              </form>
            )}

            {hasAnswered && (
              <p style={{ marginTop: 12, fontSize: 13, color: 'var(--color-text-muted)' }}>
                Answer submitted — waiting for the host.
              </p>
            )}
          </>
        ) : (
          <p>Buzzer mode is off for this quiz. Watch the shared screen for updates.</p>
        )}
      </Panel>
    </main>
  );
}
