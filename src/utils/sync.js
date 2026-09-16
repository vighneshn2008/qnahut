/**
 * Lets a quiz be mirrored into a separate browser window/tab (the pop-out
 * projector) without a real backend. The host tab is the source of truth:
 * every time its quiz state changes it writes a snapshot to localStorage
 * (keyed by the quiz's unique id, so several quizzes can live side by side)
 * and broadcasts the same snapshot over a BroadcastChannel. Any other
 * window/tab open on the same quiz id picks the change up immediately.
 */

const STORAGE_PREFIX = 'qnahut:quiz:';
const CHANNEL_PREFIX = 'qnahut-quiz-';
const ACTIVE_QUIZ_KEY = 'qnahut:active-quiz';
const SESSION_ACTIVE_QUIZ_KEY = 'qnahut:session-active-quiz';
const TEAM_SESSION_KEY = 'qnahut:team-session';
const WEBSOCKET_PATH = '/__qnahut-ws';
let networkPublishQueue = Promise.resolve();
let pendingNetworkQuiz = null;
let isPublishingNetworkQuiz = false;

export function saveTeamSession(quizId, teamId) {
  if (!quizId || !teamId || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(TEAM_SESSION_KEY, JSON.stringify({ quizId, teamId }));
  } catch {
    // Ignore storage failures; the current session can still continue.
  }
}

export function loadTeamSession() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(TEAM_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function createAccessToken() {
  if (typeof crypto === 'undefined' || typeof crypto.getRandomValues !== 'function') return null;
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function ensureQuizAccessToken(quiz) {
  if (!quiz || quiz.accessToken || typeof window === 'undefined') return quiz;
  const accessToken = createAccessToken();
  return accessToken ? { ...quiz, accessToken } : quiz;
}

export function quizStorageKey(quizId) {
  return `${STORAGE_PREFIX}${quizId}`;
}

export function persistQuizSnapshot(quiz) {
  if (!quiz?.id || typeof window === 'undefined') return;
  try {
    const snapshot = {
      ...quiz,
      teams: quiz.teams?.map((team) => ({ ...team, connected: false })),
    };
    window.localStorage.setItem(quizStorageKey(quiz.id), JSON.stringify(snapshot));
  } catch {
    // Storage can fail (quota, private mode) — the tab itself still works fine.
  }
}

export function loadQuizSnapshot(quizId) {
  if (!quizId || typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(quizStorageKey(quizId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function loadActiveQuizSnapshot() {
  if (typeof window === 'undefined') return null;
  try {
    const quizId =
      window.sessionStorage.getItem(SESSION_ACTIVE_QUIZ_KEY) ||
      window.localStorage.getItem(ACTIVE_QUIZ_KEY);
    return loadQuizSnapshot(quizId);
  } catch {
    return null;
  }
}

export function setActiveQuiz(quizId) {
  if (!quizId || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ACTIVE_QUIZ_KEY, quizId);
    window.sessionStorage.setItem(SESSION_ACTIVE_QUIZ_KEY, quizId);
  } catch {
    // The current tab can still host the quiz if storage is unavailable.
  }
}

export function clearActiveQuiz() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(ACTIVE_QUIZ_KEY);
    window.sessionStorage.removeItem(SESSION_ACTIVE_QUIZ_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export function openQuizChannel(quizId) {
  if (!quizId || typeof window === 'undefined' || typeof BroadcastChannel === 'undefined')
    return null;
  return new BroadcastChannel(`${CHANNEL_PREFIX}${quizId}`);
}

export function broadcastQuizSnapshot(channel, quiz) {
  if (!channel || !quiz) return;
  try {
    channel.postMessage({ type: 'SYNC', quizId: quiz.id, quiz });
  } catch {
    // Ignore — the receiving window will still pick up localStorage on next read.
  }
}

/**
 * Whether two quiz snapshots hold different state that should be applied to a
 * mirroring window. Mirrors tick the countdown themselves from `timer.endsAt`,
 * and the host deliberately skips republishing pure timer ticks, so snapshots
 * that differ only in `timer.remaining` are treated as identical — otherwise a
 * stale persisted value would keep overwriting the local countdown and the
 * display would flip-flop between two numbers.
 */
export function quizSnapshotsDiffer(a, b) {
  if (!a || !b) return a !== b;
  const comparable = (value) => ({
    ...value,
    timer: value.timer ? { running: value.timer.running, endsAt: value.timer.endsAt } : value.timer,
  });
  return JSON.stringify(comparable(a)) !== JSON.stringify(comparable(b));
}

/**
 * Announces a team's connect/disconnect over the quiz's BroadcastChannel so
 * other windows on the same machine (host, projector) learn about it without
 * needing the WebSocket server — e.g. dev mode, where the local server that
 * relays QUIZ_PRESENCE is not started. Other devices still sync presence
 * over the WebSocket.
 */
export function broadcastTeamPresence(channel, quizId, teamId, connected) {
  if (!channel || !quizId || !teamId) return;
  try {
    channel.postMessage({ type: 'PRESENCE', quizId, teamId, connected });
  } catch {
    // Ignore — the WebSocket presence path still covers remote devices.
  }
}

export function openQuizWebSocket(quizId, accessToken, onSnapshot, onPresence, teamId) {
  if (!quizId || !accessToken || typeof window === 'undefined' || typeof WebSocket === 'undefined')
    return null;

  let socket;
  let reconnectTimer;
  let closed = false;

  function connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    socket = new WebSocket(`${protocol}//${window.location.host}${WEBSOCKET_PATH}`);
    socket.addEventListener('open', () => {
      socket.send(JSON.stringify({ type: 'SUBSCRIBE', quizId, accessToken, teamId }));
    });
    socket.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'QUIZ_SNAPSHOT' && message.quiz?.id === quizId)
          onSnapshot(message.quiz);
        if (message.type === 'QUIZ_PRESENCE') onPresence?.(message.teamIds || []);
      } catch {
        // Polling remains available when a server sends an invalid message.
      }
    });
    socket.addEventListener('close', () => {
      if (!closed) reconnectTimer = window.setTimeout(connect, 1000);
    });
  }

  connect();
  return {
    close() {
      closed = true;
      window.clearTimeout(reconnectTimer);
      socket?.close();
    },
  };
}

export function publishNetworkQuizSnapshot(quiz) {
  if (!quiz?.id || typeof window === 'undefined') return;
  pendingNetworkQuiz = quiz;
  if (isPublishingNetworkQuiz) return;

  // The host tab and the remote controller (/remote) own authoritative quiz
  // state (navigation, scoring, teams, timer). Team/join tabs are guests: the
  // server only folds their buzzer events into the host's snapshot instead of
  // overwriting it.
  const origin =
    window.location.pathname === '/host' ||
    window.location.pathname === '/quiz' ||
    window.location.pathname === '/remote'
      ? 'host'
      : 'guest';

  isPublishingNetworkQuiz = true;
  networkPublishQueue = networkPublishQueue
    .then(async () => {
      while (pendingNetworkQuiz) {
        const nextQuiz = pendingNetworkQuiz;
        pendingNetworkQuiz = null;
        const snapshot = {
          ...nextQuiz,
          teams: nextQuiz.teams?.map((team) => ({ ...team, connected: false })),
        };
        const request = {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(snapshot),
        };
        const token = encodeURIComponent(snapshot.accessToken || '');
        const params = `?token=${token}&origin=${origin}`;
        await fetch(`/__qnahut-quiz/${encodeURIComponent(snapshot.id)}${params}`, request);
        await fetch(`/__qnahut-active${params}`, request);
      }
    })
    .catch(() => {})
    .finally(() => {
      isPublishingNetworkQuiz = false;
    });
}

export async function loadNetworkActiveQuizSnapshot() {
  if (typeof window === 'undefined') return null;
  try {
    const response = await fetch('/__qnahut-active');
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export async function loadNetworkQuizSnapshot(quizId, accessToken) {
  if (!quizId || typeof window === 'undefined') return null;
  try {
    const token = accessToken ? `?token=${encodeURIComponent(accessToken)}` : '';
    const response = await fetch(`/__qnahut-quiz/${encodeURIComponent(quizId)}${token}`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

/** Builds the URL for a pop-out projector window for the given quiz. */
export function buildProjectorUrl(quizId, accessToken) {
  const url = new URL(window.location.href);
  url.search = '';
  url.searchParams.set('view', 'projector');
  url.searchParams.set('quiz', quizId);
  if (accessToken) url.searchParams.set('token', accessToken);
  return url.toString();
}

/** Reads `?view=` / `?quiz=` from the current URL, if present. */
export function readDeepLink() {
  if (typeof window === 'undefined') return { view: null, quizId: null };
  const params = new URLSearchParams(window.location.search);
  return { view: params.get('view'), quizId: params.get('quiz'), accessToken: params.get('token') };
}
