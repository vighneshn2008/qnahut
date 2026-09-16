import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { createDemoQuiz } from '../data/demoQuiz.js';
import { createQuizStore, selectQuiz } from '../store/quizStore.js';
import {
  broadcastQuizSnapshot,
  broadcastTeamPresence,
  clearActiveQuiz,
  loadActiveQuizSnapshot,
  loadNetworkQuizSnapshot,
  loadQuizSnapshot,
  loadTeamSession,
  openQuizChannel,
  openQuizWebSocket,
  persistQuizSnapshot,
  publishNetworkQuizSnapshot,
  quizSnapshotsDiffer,
  readDeepLink,
  setActiveQuiz,
  ensureQuizAccessToken,
} from '../utils/sync.js';

const QuizContext = createContext(null);

function initialQuizSnapshot(deepLink) {
  const isRemoteMirror = deepLink.view === 'projector' && Boolean(deepLink.quizId);
  const isHostRoute = window.location.pathname === '/host' || window.location.pathname === '/quiz';

  if (isRemoteMirror) return ensureQuizAccessToken(loadQuizSnapshot(deepLink.quizId));
  if (deepLink.quizId)
    return ensureQuizAccessToken(loadQuizSnapshot(deepLink.quizId) || loadActiveQuizSnapshot());
  if (isHostRoute) return ensureQuizAccessToken(loadActiveQuizSnapshot());
  const teamSession = loadTeamSession();
  if (teamSession?.quizId) return ensureQuizAccessToken(loadQuizSnapshot(teamSession.quizId));
  return null;
}

function QuizStateProvider({ children, deepLink, isRemoteMirror }) {
  const quiz = useSelector(selectQuiz);
  const dispatch = useDispatch();
  const isHostRoute = window.location.pathname === '/host' || window.location.pathname === '/quiz';
  const isRemoteControllerRoute = window.location.pathname === '/remote';

  const channelRef = useRef(null);
  const channelIdRef = useRef(null);
  const quizRef = useRef(quiz);
  const publishedQuizRef = useRef(null);

  quizRef.current = quiz;

  const updatePresence = useCallback((teamIds) => {
    dispatch({ type: 'SET_CONNECTIONS', payload: teamIds });
  }, [dispatch]);

  // Keep a BroadcastChannel open for whichever quiz id is currently loaded,
  // so this tab both sends (as host) and receives (as a mirrored projector
  // window) live updates for that quiz.
  useEffect(() => {
    if (!quiz?.id) return undefined;
    if (channelIdRef.current !== quiz.id) {
      channelRef.current?.close();
      channelRef.current = openQuizChannel(quiz.id);
      channelIdRef.current = quiz.id;
    }
    const channel = channelRef.current;
    if (!channel) return undefined;

    function handleMessage(event) {
      const data = event.data;
      if (!data || data.quizId !== quiz.id) return;
      if (data.type === 'SYNC' && quizSnapshotsDiffer(data.quiz, quizRef.current)) {
        dispatch({ type: 'LOAD_QUIZ', payload: data.quiz });
      } else if (data.type === 'PRESENCE' && data.teamId) {
        dispatch({
          type: data.connected ? 'TEAM_CONNECT' : 'TEAM_DISCONNECT',
          payload: data.teamId,
        });
      }
    }
    channel.addEventListener('message', handleMessage);
    return () => channel.removeEventListener('message', handleMessage);
  }, [dispatch, quiz?.id]);

  // A projector also polls its local snapshot so it keeps updating when
  // BroadcastChannel is unavailable or a browser drops a message.
  useEffect(() => {
    if (!isRemoteMirror || !deepLink.quizId) return undefined;

    async function refreshFromNetwork() {
      const snapshot =
        (await loadNetworkQuizSnapshot(deepLink.quizId, deepLink.accessToken)) ||
        loadQuizSnapshot(deepLink.quizId);
      if (!snapshot || !quizSnapshotsDiffer(snapshot, quizRef.current)) return;
      dispatch({ type: 'LOAD_QUIZ', payload: snapshot });
    }

    const socket = openQuizWebSocket(
      deepLink.quizId,
      deepLink.accessToken || quiz?.accessToken,
      (snapshot) => {
        if (quizSnapshotsDiffer(snapshot, quizRef.current)) {
          dispatch({ type: 'LOAD_QUIZ', payload: snapshot });
        }
      },
      updatePresence,
    );
    window.addEventListener('storage', refreshFromNetwork);
    refreshFromNetwork();
    const interval = window.setInterval(refreshFromNetwork, 1000);
    return () => {
      socket?.close();
      window.removeEventListener('storage', refreshFromNetwork);
      window.clearInterval(interval);
    };
  }, [deepLink.accessToken, deepLink.quizId, dispatch, isRemoteMirror, quiz?.accessToken, updatePresence]);

  // Host and join links can target a specific quiz, even when this browser
  // has a different quiz marked as active locally.
  useEffect(() => {
    if (isRemoteMirror || !deepLink.quizId) return undefined;

    let active = true;
    loadNetworkQuizSnapshot(deepLink.quizId, deepLink.accessToken).then((snapshot) => {
      if (active && snapshot && quizSnapshotsDiffer(snapshot, quizRef.current)) {
        dispatch({ type: 'LOAD_QUIZ', payload: snapshot });
      }
    });
    return () => {
      active = false;
    };
  }, [deepLink.accessToken, deepLink.quizId, dispatch, isRemoteMirror]);

  // Team screens on other devices have no BroadcastChannel connection to the
  // host, so poll the host snapshot for resets, setting changes, and scores.
  useEffect(() => {
    if (isHostRoute || isRemoteMirror || !quiz?.id) return undefined;

    let active = true;
    async function refreshGuestQuiz() {
      const snapshot = await loadNetworkQuizSnapshot(quiz.id, quiz.accessToken);
      if (active && snapshot && quizSnapshotsDiffer(snapshot, quizRef.current)) {
        dispatch({ type: 'LOAD_QUIZ', payload: snapshot });
      }
    }

    const teamId = loadTeamSession()?.teamId;
    const socket = openQuizWebSocket(quiz.id, quiz.accessToken, (snapshot) => {
      if (quizSnapshotsDiffer(snapshot, quizRef.current)) {
        dispatch({ type: 'LOAD_QUIZ', payload: snapshot });
      }
    }, updatePresence, teamId);
    const interval = window.setInterval(refreshGuestQuiz, 1000);
    return () => {
      socket?.close();
      active = false;
      window.clearInterval(interval);
    };
  }, [dispatch, isHostRoute, isRemoteMirror, quiz?.accessToken, quiz?.id, updatePresence]);

  // The host subscribes too: it needs to ingest buzzer events that team
  // phones publish to the server (the server merges those into the host's
  // own snapshot). Applying the echo of the host's own publish is harmless —
  // the content guard above stops any republish, and keepLocalTimer/-Buzzer
  // in the reducer protect transient local decisions.
  useEffect(() => {
    if (!isHostRoute || !quiz?.id) return undefined;
    const socket = openQuizWebSocket(
      quiz.id,
      quiz.accessToken,
      (snapshot) => {
        if (quizSnapshotsDiffer(snapshot, quizRef.current)) {
          dispatch({ type: 'LOAD_QUIZ', payload: snapshot });
        }
      },
      updatePresence,
    );
    return () => socket?.close();
  }, [dispatch, isHostRoute, quiz?.accessToken, quiz?.id, updatePresence]);

  // Every time the quiz changes, persist a snapshot and tell any other
  // window watching this quiz id. A remote mirror echoes what it receives
  // right back out, which is harmless (same payload, no-op for the host).
  //
  // Promotions (navigating, scoring) happen on the host once and converge
  // because the server stamps revisions; without the guard below a guest
  // that receives its own echo would re-publish forever (server → broadcast
  // → LOAD_QUIZ → publish → server…). We only publish when the *content*
  // actually changed — revision stamps and timer ticks are not content.
  useEffect(() => {
    if (!quiz || isRemoteMirror) return;
    const previousQuiz = publishedQuizRef.current;
    const comparableContent = (value) => ({
      ...value,
      syncRevision: 0,
      timerRevision: 0,
      buzzerRevision: 0,
      buzzerEpoch: 0,
      timer: null,
      teams: value.teams?.map((team) => ({ ...team, connected: false })),
    });
    // A revision-stamped echo of our own broadcast has identical content;
    // publishing it back would loop forever. Only republish when the
    // *content* actually changed. `endsAt` is the one timer property that is
    // shared with mirrors (they tick the countdown locally), so a timer
    // start/stop counts as content; steady per-second ticks do not.
    const isContentEcho =
      previousQuiz?.id === quiz.id &&
      previousQuiz.timer?.endsAt === quiz.timer?.endsAt &&
      JSON.stringify(comparableContent(previousQuiz)) === JSON.stringify(comparableContent(quiz));
    publishedQuizRef.current = quiz;
    if (isContentEcho) return;
    persistQuizSnapshot(quiz);
    publishNetworkQuizSnapshot(quiz);
    // Only host-class routes (host dashboard + /remote controller) broadcast
    // to the room's BroadcastChannel. A team guest must never push its
    // (possibly stale) snapshot into host/mirror windows on the same machine
    // — guest events reach the host via the server merge.
    if (isHostRoute || isRemoteControllerRoute) broadcastQuizSnapshot(channelRef.current, quiz);
  }, [isHostRoute, isRemoteControllerRoute, isRemoteMirror, quiz]);

  useEffect(() => () => channelRef.current?.close(), []);

  // Force-push the current snapshot to any mirrored projector window. Wired
  // up to fire on every click in the host dashboard so the projector never
  // drifts out of sync, even for state that a click affects only visually.
  const syncNow = useCallback(() => {
    if (!quiz) return;
    const comparableContent = (value) => ({
      ...value,
      syncRevision: 0,
      timerRevision: 0,
      buzzerRevision: 0,
      buzzerEpoch: 0,
      timer: null,
      teams: value.teams?.map((team) => ({ ...team, connected: false })),
    });
    const previousQuiz = publishedQuizRef.current;
    const isContentEcho =
      previousQuiz?.id === quiz.id &&
      previousQuiz.timer?.endsAt === quiz.timer?.endsAt &&
      JSON.stringify(comparableContent(previousQuiz)) === JSON.stringify(comparableContent(quiz));
    publishedQuizRef.current = quiz;
    if (isContentEcho) return;
    persistQuizSnapshot(quiz);
    if (isHostRoute || isRemoteControllerRoute) broadcastQuizSnapshot(channelRef.current, quiz);
  }, [isHostRoute, isRemoteControllerRoute, quiz]);

  const actions = useMemo(
    () => ({
      loadQuiz: (payload) => {
        const nextQuiz = ensureQuizAccessToken(payload);
        setActiveQuiz(nextQuiz.id);
        dispatch({ type: 'LOAD_QUIZ', payload: nextQuiz });
      },
      loadDemo: () => {
        const demoQuiz = ensureQuizAccessToken(createDemoQuiz());
        setActiveQuiz(demoQuiz.id);
        dispatch({ type: 'LOAD_QUIZ', payload: demoQuiz });
      },
      reset: () => {
        clearActiveQuiz();
        dispatch({ type: 'RESET' });
      },
      updateTeams: (payload) => dispatch({ type: 'UPDATE_TEAMS', payload }),
      updateMeta: (payload) => dispatch({ type: 'UPDATE_META', payload }),
      updateModes: (payload) => dispatch({ type: 'UPDATE_MODES', payload }),
      updateTheme: (payload) => dispatch({ type: 'UPDATE_THEME', payload }),
      addQuestion: (payload) => dispatch({ type: 'ADD_QUESTION', payload }),
      updateQuestion: (id, patch) => dispatch({ type: 'UPDATE_QUESTION', payload: { id, patch } }),
      deleteQuestion: (id) => dispatch({ type: 'DELETE_QUESTION', payload: id }),
      moveQuestion: (id, direction) =>
        dispatch({ type: 'MOVE_QUESTION', payload: { id, direction } }),
      gotoQuestion: (index) => dispatch({ type: 'GOTO_QUESTION', payload: index }),
      nextQuestion: () => dispatch({ type: 'NEXT_QUESTION' }),
      prevQuestion: () => dispatch({ type: 'PREV_QUESTION' }),
      timerStart: () => dispatch({ type: 'TIMER_START', payload: Date.now() }),
      timerPause: () => dispatch({ type: 'TIMER_PAUSE', payload: Date.now() }),
      timerReset: () => dispatch({ type: 'TIMER_RESET' }),
      timerTick: () => dispatch({ type: 'TIMER_TICK' }),
      setProjectorView: (payload) => dispatch({ type: 'SET_PROJECTOR_VIEW', payload }),
      revealProjectorQuestion: () => dispatch({ type: 'REVEAL_PROJECTOR_QUESTION' }),
      buzz: (teamId, time) => dispatch({ type: 'BUZZ', payload: { teamId, time } }),
      resetBuzzer: () => dispatch({ type: 'BUZZER_RESET' }),
      submitTeamAnswer: (teamId, text, time) =>
        dispatch({ type: 'SUBMIT_TEAM_ANSWER', payload: { teamId, text, time } }),
      applyScore: (teamId, delta, label) =>
        dispatch({ type: 'SCORE_APPLY', payload: { teamId, delta, label } }),
      undoScore: () => dispatch({ type: 'SCORE_UNDO' }),
      connectTeam: (teamId) => {
        dispatch({ type: 'TEAM_CONNECT', payload: teamId });
        broadcastTeamPresence(channelRef.current, quizRef.current?.id, teamId, true);
      },
      disconnectTeam: (teamId) => {
        dispatch({ type: 'TEAM_DISCONNECT', payload: teamId });
        broadcastTeamPresence(channelRef.current, quizRef.current?.id, teamId, false);
      },
    }),
    [dispatch],
  );

  const value = useMemo(
    () => ({ quiz, isRemoteMirror, syncNow, ...actions }),
    [quiz, isRemoteMirror, syncNow, actions],
  );

  return <QuizContext.Provider value={value}>{children}</QuizContext.Provider>;
}

export function QuizProvider({ children }) {
  const deepLink = useMemo(() => readDeepLink(), []);
  const isRemoteMirror = deepLink.view === 'projector' && Boolean(deepLink.quizId);
  const store = useMemo(() => createQuizStore(initialQuizSnapshot(deepLink)), [deepLink]);

  return (
    <Provider store={store}>
      <QuizStateProvider deepLink={deepLink} isRemoteMirror={isRemoteMirror}>
        {children}
      </QuizStateProvider>
    </Provider>
  );
}

export function useQuiz() {
  const ctx = useContext(QuizContext);
  if (!ctx) throw new Error('useQuiz must be used within a QuizProvider');
  return ctx;
}

/** Convenience for components that just want to find a team by its join code. */
export function useFindTeamByCode() {
  const { quiz } = useQuiz();
  return useCallback(
    (code) => quiz?.teams.find((t) => (t.code || '').trim() === (code || '').trim()),
    [quiz],
  );
}

export function useFindTeamByEmail() {
  const { quiz } = useQuiz();
  return useCallback(
    (email) =>
      quiz?.teams.find(
        (t) => (t.email || '').trim().toLowerCase() === (email || '').trim().toLowerCase(),
      ),
    [quiz],
  );
}
