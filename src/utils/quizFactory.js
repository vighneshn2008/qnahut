import { uid, generateTeamCode } from './id.js';

/** Real question types — things a team answers and can be scored on. */
export const QUESTION_TYPES = ['text', 'image', 'video', 'image-only', 'video-only', 'html'];

/** Non-question "slide" types — shown to the room but never scored or timed. */
export const SLIDE_TYPES = ['round-header', 'info', 'image-slide'];

/** Every type that can appear in the running order (questions + slides). */
export const ITEM_TYPES = [...QUESTION_TYPES, ...SLIDE_TYPES];

export function createTeam(name, code = generateTeamCode(), email = '') {
  return {
    id: uid('team'),
    name,
    code,
    email,
    score: 0,
    connected: false,
  };
}

export function hasDuplicateTeamIdentifiers(teams = []) {
  const codes = new Set();
  const emails = new Set();

  return teams.some((team) => {
    const code = String(team.code || '').trim();
    const email = String(team.email || '')
      .trim()
      .toLowerCase();
    if (code && codes.has(code)) return true;
    if (email && emails.has(email)) return true;
    if (code) codes.add(code);
    if (email) emails.add(email);
    return false;
  });
}

/**
 * A single item in the running order. `isSlide: true` marks a non-question
 * slide (round header / info) — those ignore timer, marks and answer.
 */
export function createQuestion(overrides = {}) {
  const isSlide = SLIDE_TYPES.includes(overrides.type);
  return {
    id: uid('q'),
    type: 'text',
    isSlide,
    text: '',
    body: '', // long-form text for info/round-header slides
    htmlContent: '', // raw markup for the 'html' question type
    mediaLabel: '',
    mediaData: null, // base64 data URL for an uploaded image/video, if any
    imageFit: 'contain',
    fullscreenMedia: false,
    round: 1,
    roundName: '',
    tiebreaker: false,
    answer: '',
    showAnswer: 'after-scoring',
    hideAfterTimer: false,
    timer: 30,
    // Per-question scoring — there is no quiz-wide scoring config anymore.
    pointsCorrect: 10,
    pointsWrong: -5,
    allowPartial: true,
    pointsPartial: 5,
    ...overrides,
  };
}

/** Convenience factory for a round-header / info slide. */
export function createSlide(slideType = 'round-header', overrides = {}) {
  return createQuestion({
    type: slideType,
    text: slideType === 'round-header' ? 'Round' : slideType === 'image-slide' ? '' : 'Info',
    fullscreenMedia: slideType === 'image-slide',
    ...overrides,
  });
}

/** A brand-new, empty quiz — the starting point for the setup wizard. */
export function createEmptyQuiz() {
  return {
    id: uid('quiz'),
    name: '',
    description: '',
    hostPassword: '',
    logoDataUrl: null,
    teams: [createTeam('Team 1'), createTeam('Team 2')],
    // Buzzer/leaderboard/timer defaults — edited from the host dashboard's
    // quiz settings panel, not the setup wizard.
    modes: {
      leaderboard: true,
      buzzer: true,
      requireTextAnswer: false,
      allowMultipleBuzzes: false,
      defaultTimer: 30,
      projectorTimer: true,
      projectorBuzzer: true,
      projectorLeaderboard: true,
      hideQuestionAfterBuzz: false,
    },
    questions: [],
    currentQuestionIndex: 0,
    timer: { remaining: 30, running: false },
    buzzer: { locked: false, order: [], answers: {} },
    scoreEvents: [],
    projectorView: 'question',
    projectorQuestionRevealed: false,
  };
}
