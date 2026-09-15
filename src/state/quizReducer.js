import { uid } from '../utils/id.js';
import { hasDuplicateTeamIdentifiers } from '../utils/quizFactory.js';

export const initialQuizState = null;

function questionDuration(quiz, index) {
  const q = quiz.questions[index];
  return (q && q.timer) || quiz.modes.defaultTimer || 30;
}

function timerForItem(quiz, index) {
  const item = quiz.questions[index];
  return { remaining: questionDuration(quiz, index), running: Boolean(item && !item.isSlide) };
}

function nextBuzzerRevision(state) {
  return Math.max(Date.now(), (state?.buzzerRevision || 0) + 1);
}

function nextTimerRevision(state) {
  return Math.max(Date.now(), (state?.timerRevision || 0) + 1);
}

/**
 * Walks from `fromIndex` in `direction` (+1/-1), skipping any question
 * flagged as a tiebreaker. Tiebreakers are excluded from the normal
 * sequential flow — they're only reachable by clicking them directly in
 * the question nav strip (see GOTO_QUESTION, which never skips).
 */
function nextSequentialIndex(quiz, fromIndex, direction) {
  let index = fromIndex + direction;
  while (index >= 0 && index < quiz.questions.length && quiz.questions[index].tiebreaker) {
    index += direction;
  }
  if (index < 0 || index >= quiz.questions.length) return fromIndex;
  return index;
}

export function quizReducer(state = initialQuizState, action) {
  switch (action.type) {
    case 'LOAD_QUIZ': {
      const incomingBuzzer = {
        locked: false,
        order: [],
        answers: {},
        ...(action.payload.buzzer || {}),
      };
      const incomingBuzzerRevision = action.payload.buzzerRevision || 0;
      const localBuzzerRevision = state?.buzzerRevision || 0;
      const sameQuestion =
        state?.currentQuestionIndex === action.payload.currentQuestionIndex;
      const incomingTimerRevision = action.payload.timerRevision || 0;
      const localTimerRevision = state?.timerRevision || 0;
      const incomingSyncRevision = action.payload.syncRevision || 0;
      const localSyncRevision = state?.syncRevision || 0;
      const incomingBuzzerEpoch = action.payload.buzzerEpoch || 0;
      const localBuzzerEpoch = state?.buzzerEpoch || 0;
      const keepLocalTimer =
        sameQuestion &&
        state &&
        (incomingSyncRevision < localSyncRevision ||
          (incomingSyncRevision === localSyncRevision && incomingTimerRevision < localTimerRevision));
      const keepLocalBuzzer =
        sameQuestion &&
        state &&
        (incomingBuzzerEpoch < localBuzzerEpoch ||
          (incomingBuzzerEpoch === localBuzzerEpoch && incomingBuzzerRevision < localBuzzerRevision));
      const sameTimerDeadline =
        state?.timer?.endsAt && state.timer.endsAt === action.payload.timer?.endsAt;
      // Server snapshots always carry `connected: false` (the presence list is
      // delivered separately via QUIZ_PRESENCE → SET_CONNECTIONS). Preserve the
      // connection status from the current state so a snapshot load doesn't
      // clobber the projector's connected-teams list.
      const connectedMap = new Map(
        (state?.teams || []).map((team) => [team.id, Boolean(team.connected)]),
      );
      const incomingTeams = (action.payload.teams || []).map((team) => ({
        ...team,
        connected: connectedMap.get(team.id) === true,
      }));
      return {
        ...action.payload,
        teams: incomingTeams,
        buzzerRevision: Math.max(localBuzzerRevision, incomingBuzzerRevision),
        timerRevision: Math.max(localTimerRevision, incomingTimerRevision),
        syncRevision: Math.max(localSyncRevision, incomingSyncRevision),
        buzzerEpoch: Math.max(localBuzzerEpoch, incomingBuzzerEpoch),
        buzzer: keepLocalBuzzer ? state.buzzer : { ...incomingBuzzer },
        timer:
          keepLocalTimer ||
          (sameTimerDeadline && (state.timer.running || state.timer.remaining <= 0))
            ? state.timer
            : action.payload.timer ||
              timerForItem(action.payload, action.payload.currentQuestionIndex || 0),
      };
    }

    case 'RESET':
      return null;

    case 'UPDATE_TEAMS': {
      const nextTeams = action.payload;
      if (hasDuplicateTeamIdentifiers(nextTeams)) return state;
      const remainingIds = new Set(nextTeams.map((team) => team.id));
      const nextBuzzerOrder = state.buzzer.order.filter((entry) => remainingIds.has(entry.teamId));
      const nextAnswers = Object.fromEntries(
        Object.entries(state.buzzer.answers).filter(([teamId]) => remainingIds.has(teamId)),
      );

      return {
        ...state,
        teams: nextTeams,
        buzzer: {
          ...state.buzzer,
          order: nextBuzzerOrder,
          answers: nextAnswers,
        },
      };
    }

    case 'UPDATE_META':
      return { ...state, ...action.payload };

    case 'UPDATE_MODES':
      return { ...state, modes: { ...state.modes, ...action.payload } };

    case 'UPDATE_THEME':
      return state ? { ...state, theme: action.payload } : state;

    case 'ADD_QUESTION':
      return { ...state, questions: [...state.questions, action.payload] };

    case 'UPDATE_QUESTION':
      return {
        ...state,
        questions: state.questions.map((q) =>
          q.id === action.payload.id ? { ...q, ...action.payload.patch } : q,
        ),
      };

    case 'DELETE_QUESTION': {
      const questions = state.questions.filter((q) => q.id !== action.payload);
      const currentQuestionIndex = Math.min(
        state.currentQuestionIndex,
        Math.max(questions.length - 1, 0),
      );
      return { ...state, questions, currentQuestionIndex };
    }

    case 'MOVE_QUESTION': {
      const { id, direction } = action.payload;
      const index = state.questions.findIndex((q) => q.id === id);
      const swapWith = index + direction;
      if (index < 0 || swapWith < 0 || swapWith >= state.questions.length) return state;
      const questions = [...state.questions];
      [questions[index], questions[swapWith]] = [questions[swapWith], questions[index]];
      return { ...state, questions };
    }

    case 'GOTO_QUESTION': {
      const index = Math.max(0, Math.min(action.payload, state.questions.length - 1));
      return {
        ...state,
        currentQuestionIndex: index,
        buzzerEpoch: (state.buzzerEpoch || 0) + 1,
        buzzerRevision: nextBuzzerRevision(state),
        timerRevision: nextTimerRevision(state),
        timer: timerForItem(state, index),
        buzzer: { locked: false, order: [], answers: {} },
        projectorQuestionRevealed: false,
      };
    }

    case 'NEXT_QUESTION':
    case 'PREV_QUESTION': {
      const delta = action.type === 'NEXT_QUESTION' ? 1 : -1;
      const index = nextSequentialIndex(state, state.currentQuestionIndex, delta);
      return {
        ...state,
        currentQuestionIndex: index,
        buzzerEpoch: (state.buzzerEpoch || 0) + 1,
        buzzerRevision: nextBuzzerRevision(state),
        timerRevision: nextTimerRevision(state),
        timer: timerForItem(state, index),
        buzzer: { locked: false, order: [], answers: {} },
        projectorQuestionRevealed: false,
      };
    }

    case 'TIMER_START':
      return {
        ...state,
        timerRevision: nextTimerRevision(state),
        timer: {
          ...state.timer,
          running: true,
          endsAt: Date.now() + state.timer.remaining * 1000,
        },
      };

    case 'TIMER_PAUSE': {
      const remaining = state.timer.endsAt
        ? Math.max(0, Math.ceil((state.timer.endsAt - Date.now()) / 1000))
        : state.timer.remaining;
      return {
        ...state,
        timerRevision: nextTimerRevision(state),
        timer: { remaining, running: false, endsAt: null },
      };
    }

    case 'TIMER_RESET':
      return {
        ...state,
        timerRevision: nextTimerRevision(state),
        timer: {
          remaining: questionDuration(state, state.currentQuestionIndex),
          running: false,
          endsAt: null,
        },
      };

    case 'TIMER_TICK': {
      const remaining = state.timer.endsAt
        ? Math.max(0, Math.ceil((state.timer.endsAt - Date.now()) / 1000))
        : Math.max(0, state.timer.remaining - 1);
      return {
        ...state,
        timer: { ...state.timer, remaining, running: remaining > 0 },
      };
    }

    case 'SET_PROJECTOR_VIEW':
      return { ...state, projectorView: action.payload };

    case 'REVEAL_PROJECTOR_QUESTION':
      return { ...state, projectorQuestionRevealed: true, projectorView: 'question' };

    case 'BUZZ': {
      const { teamId, time } = action.payload;
      if (state.buzzer.order.some((entry) => entry.teamId === teamId)) return state;
      if (state.buzzer.locked && state.modes.allowMultipleBuzzes !== true) return state;
      const order = [...state.buzzer.order, { teamId, time }];
      return {
        ...state,
        buzzerRevision: nextBuzzerRevision(state),
        buzzer: { ...state.buzzer, order, locked: state.modes.allowMultipleBuzzes !== true },
      };
    }

    case 'BUZZER_RESET':
      return {
        ...state,
        buzzerEpoch: (state.buzzerEpoch || 0) + 1,
        buzzerRevision: nextBuzzerRevision(state),
        buzzer: { locked: false, order: [], answers: {} },
      };

    case 'SUBMIT_TEAM_ANSWER': {
      const { teamId, text, time } = action.payload;
      if (state.buzzer.answers[teamId] !== undefined) return state;
      if (
        state.modes.requireTextAnswer === true &&
        !state.buzzer.order.some((entry) => entry.teamId === teamId)
      ) {
        if (state.buzzer.locked && state.modes.allowMultipleBuzzes !== true) return state;
        const order = [...state.buzzer.order, { teamId, time }];
        return {
          ...state,
            buzzerRevision: nextBuzzerRevision(state),
          buzzer: {
            ...state.buzzer,
            order,
            locked: state.modes.allowMultipleBuzzes !== true,
            answers: { ...state.buzzer.answers, [teamId]: text },
          },
        };
      }
      return {
        ...state,
        buzzerRevision: nextBuzzerRevision(state),
        buzzer: { ...state.buzzer, answers: { ...state.buzzer.answers, [teamId]: text } },
      };
    }

    case 'SCORE_APPLY': {
      const { teamId, delta, label } = action.payload;
      const teams = state.teams.map((t) =>
        t.id === teamId ? { ...t, score: t.score + delta } : t,
      );
      const event = {
        id: uid('evt'),
        teamId,
        delta,
        label,
        questionId: state.questions[state.currentQuestionIndex]?.id,
      };
      return { ...state, teams, scoreEvents: [...state.scoreEvents, event] };
    }

    case 'SCORE_UNDO': {
      if (state.scoreEvents.length === 0) return state;
      const events = [...state.scoreEvents];
      const last = events.pop();
      const teams = state.teams.map((t) =>
        t.id === last.teamId ? { ...t, score: t.score - last.delta } : t,
      );
      return { ...state, teams, scoreEvents: events };
    }

    case 'TEAM_CONNECT':
      return {
        ...state,
        teams: state.teams.map((t) => (t.id === action.payload ? { ...t, connected: true } : t)),
      };

    case 'TEAM_DISCONNECT':
      return {
        ...state,
        teams: state.teams.map((t) => (t.id === action.payload ? { ...t, connected: false } : t)),
      };

    case 'SET_CONNECTIONS': {
      const connectedIds = new Set(action.payload || []);
      return {
        ...state,
        teams: state.teams.map((team) => ({
          ...team,
          connected: connectedIds.has(team.id),
        })),
      };
    }

    default:
      return state;
  }
}
