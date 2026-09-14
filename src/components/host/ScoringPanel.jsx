import { useEffect, useRef, useState } from 'react';
import { Undo2 } from 'lucide-react';
import { useQuiz } from '../../context/QuizContext.jsx';
import Button from '../common/Button.jsx';
import Panel from '../common/Panel.jsx';

function signed(n) {
  return n > 0 ? `+${n}` : `${n}`;
}

export default function ScoringPanel() {
  const { quiz, applyScore, undoScore } = useQuiz();
  const [customScores, setCustomScores] = useState({});
  const [popped, setPopped] = useState({});
  const prevScores = useRef({});
  const question = quiz.questions[quiz.currentQuestionIndex];

  // Flash a quick scale + colour pop whenever a team's score changes.
  useEffect(() => {
    quiz.teams.forEach((team) => {
      const prev = prevScores.current[team.id];
      if (prev !== undefined && prev !== team.score) {
        const direction = team.score > prev ? 'up' : 'down';
        setPopped((p) => ({ ...p, [team.id]: direction }));
        setTimeout(() => {
          setPopped((p) => {
            const next = { ...p };
            delete next[team.id];
            return next;
          });
        }, 550);
      }
      prevScores.current[team.id] = team.score;
    });
  }, [quiz.teams]);

  function handleCustom(teamId) {
    const value = Number(customScores[teamId]);
    if (!value) return;
    applyScore(teamId, value, 'custom');
    setCustomScores((prev) => ({ ...prev, [teamId]: '' }));
  }

  if (!question) {
    return (
      <Panel title="Scoring">
        <p>Nothing loaded yet.</p>
      </Panel>
    );
  }

  if (question.isSlide) {
    return (
      <Panel title="Scoring">
        <p>This is a slide — nothing to score. Move to the next question when ready.</p>
      </Panel>
    );
  }

  return (
    <Panel
      title="Scoring"
      action={
        <Button
          variant="ghost"
          icon={Undo2}
          onClick={undoScore}
          disabled={quiz.scoreEvents.length === 0}
        >
          Undo last
        </Button>
      }
    >
      <div className="stack gap-sm">
        {quiz.teams.map((team) => (
          <div key={team.id} className="row gap-sm wrap panel-raised" style={{ padding: 10 }}>
            <span className="grow" style={{ fontSize: 14, fontWeight: 500 }}>
              {team.name}
            </span>
            <span
              className={`mono badge ${popped[team.id] ? `score-pop score-pop-${popped[team.id]}` : ''}`}
            >
              {team.score} pts
            </span>
            <Button
              variant="primary"
              onClick={() => applyScore(team.id, question.pointsCorrect, 'correct')}
            >
              {signed(question.pointsCorrect)}
            </Button>
            {question.allowPartial && (
              <Button
                variant="warn"
                onClick={() => applyScore(team.id, question.pointsPartial, 'partial')}
              >
                {signed(question.pointsPartial)}
              </Button>
            )}
            <Button onClick={() => applyScore(team.id, 0, 'zero')}>0</Button>
            <Button
              variant="danger"
              onClick={() => applyScore(team.id, question.pointsWrong, 'wrong')}
            >
              {signed(question.pointsWrong)}
            </Button>
            <input
              type="number"
              className="input"
              placeholder="Custom"
              style={{ width: 80 }}
              value={customScores[team.id] || ''}
              onChange={(e) => setCustomScores((prev) => ({ ...prev, [team.id]: e.target.value }))}
            />
            <Button onClick={() => handleCustom(team.id)}>Apply</Button>
          </div>
        ))}
      </div>
    </Panel>
  );
}
