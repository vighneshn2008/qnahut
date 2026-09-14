import { useEffect, useState } from 'react';
import { useQuiz } from '../../context/QuizContext.jsx';
import { useNavigation, VIEWS } from '../../context/NavigationContext.jsx';
import {
  createEmptyQuiz,
  createTeam,
  hasDuplicateTeamIdentifiers,
} from '../../utils/quizFactory.js';
import { clearPendingImportedQuiz, getPendingImportedQuiz } from '../../utils/quizPackage.js';
import Button from '../common/Button.jsx';
import StepBasics from './StepBasics.jsx';
import StepTeams from './StepTeams.jsx';
import StepQuestions from './StepQuestions.jsx';
import StepReview from './StepReview.jsx';

function readInitialDraft() {
  try {
    const pending = getPendingImportedQuiz();
    if (pending) {
      return {
        ...createEmptyQuiz(),
        ...pending,
        teams:
          Array.isArray(pending.teams) && pending.teams.length > 0
            ? pending.teams
            : [createTeam('Team 1'), createTeam('Team 2')],
        timer: pending.timer || {
          remaining: pending.modes?.defaultTimer || 30,
          running: false,
        },
        buzzer: pending.buzzer || { locked: false, order: [], answers: {} },
      };
    }
    const raw = sessionStorage.getItem('qnahut:import-draft');
    if (!raw) return createEmptyQuiz();
    const imported = JSON.parse(raw);
    const next = {
      ...createEmptyQuiz(),
      ...imported,
      teams:
        Array.isArray(imported.teams) && imported.teams.length > 0
          ? imported.teams
          : [createTeam('Team 1'), createTeam('Team 2')],
      timer: imported.timer || { remaining: imported.modes?.defaultTimer || 30, running: false },
      buzzer: imported.buzzer || { locked: false, order: [], answers: {} },
    };
    return next;
  } catch {
    return createEmptyQuiz();
  }
}

const STEPS = [
  { key: 'basics', label: 'Basics', Component: StepBasics },
  { key: 'teams', label: 'Teams', Component: StepTeams },
  { key: 'questions', label: 'Running order', Component: StepQuestions },
  { key: 'review', label: 'Review', Component: StepReview },
];

export default function Wizard() {
  const [draft, setDraft] = useState(readInitialDraft);
  const [stepIndex, setStepIndex] = useState(0);
  const { loadQuiz } = useQuiz();
  const { setView } = useNavigation();

  useEffect(() => {
    clearPendingImportedQuiz();
    sessionStorage.removeItem('qnahut:import-draft');
  }, []);

  function updateDraft(patch) {
    setDraft((prev) => ({ ...prev, ...patch }));
  }

  const { Component } = STEPS[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;
  const hasDuplicateTeams = hasDuplicateTeamIdentifiers(draft.teams);
  const canProceed =
    stepIndex === 0 ? draft.name.trim().length > 0 && draft.hostPassword.trim().length > 0 : true;

  function handleCreate() {
    sessionStorage.removeItem('qnahut:import-draft');
    window.sessionStorage.setItem(`qnahut:host-auth:${draft.id}`, 'true');
    loadQuiz({ ...draft, timer: { remaining: draft.modes.defaultTimer, running: false } });
    setView(VIEWS.HOST);
  }

  return (
    <main className="container" style={{ maxWidth: 800 }}>
      <ol
        className="row gap-sm"
        style={{ listStyle: 'none', padding: 0, marginBottom: 24, flexWrap: 'wrap' }}
      >
        {STEPS.map((step, index) => (
          <li key={step.key}>
            <button
              onClick={() => setStepIndex(index)}
              className={`badge wizard-step ${index === stepIndex ? 'is-active' : ''}`}
            >
              {index + 1}. {step.label}
            </button>
          </li>
        ))}
      </ol>

      <div key={stepIndex} className="panel view-fade-in">
        <Component draft={draft} updateDraft={updateDraft} />
      </div>

      <div className="row" style={{ justifyContent: 'space-between', marginTop: 20 }}>
        <Button
          variant="ghost"
          onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
          disabled={isFirst}
        >
          Back
        </Button>
        {isLast ? (
          <Button
            variant="primary"
            onClick={handleCreate}
            disabled={!draft.name.trim() || hasDuplicateTeams}
          >
            Create quiz
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={() => setStepIndex((i) => Math.min(STEPS.length - 1, i + 1))}
            disabled={!canProceed}
          >
            Next
          </Button>
        )}
      </div>
    </main>
  );
}
