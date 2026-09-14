import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { loadTeamSession } from '../utils/sync.js';

export const VIEWS = {
  LANDING: 'landing',
  WIZARD: 'wizard',
  HOST: 'host',
  PROJECTOR: 'projector',
  JOIN: 'join',
  TEAM: 'team',
};

const NavigationContext = createContext(null);

function viewForPath(pathname, search = '') {
  if (pathname === '/quiz' || pathname === '/host') return VIEWS.HOST;
  if (pathname === '/team' && new URLSearchParams(search).get('joined') === '1') return VIEWS.TEAM;
  if (pathname === '/team' || pathname === '/join') return VIEWS.JOIN;
  return VIEWS.LANDING;
}

function pathForView(view) {
  if (view === VIEWS.JOIN) return '/team';
  if (view === VIEWS.TEAM) {
    const params = new URLSearchParams(window.location.search);
    const quizId = params.get('quiz');
    const accessToken = params.get('token');
    const query = new URLSearchParams({ joined: '1' });
    if (quizId) query.set('quiz', quizId);
    if (accessToken) query.set('token', accessToken);
    return `/team?${query}`;
  }
  if (view !== VIEWS.HOST) return '/';
  const activeQuizId =
    window.sessionStorage.getItem('qnahut:session-active-quiz') ||
    window.localStorage.getItem('qnahut:active-quiz');
  return activeQuizId ? `/quiz?quiz=${encodeURIComponent(activeQuizId)}` : '/quiz';
}

export function NavigationProvider({ children }) {
  const [view, setViewState] = useState(() =>
    viewForPath(window.location.pathname, window.location.search),
  );
  const [activeTeamId, setActiveTeamId] = useState(() => loadTeamSession()?.teamId || null);

  useEffect(() => {
    function handlePopState() {
      setViewState(viewForPath(window.location.pathname, window.location.search));
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  function setView(nextView) {
    setViewState(nextView);
    const nextPath = pathForView(nextView);
    const currentPath = `${window.location.pathname}${window.location.search}`;
    if (currentPath !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
  }

  const value = useMemo(
    () => ({ view, setView, activeTeamId, setActiveTeamId }),
    [view, activeTeamId],
  );

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useNavigation() {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error('useNavigation must be used within a NavigationProvider');
  return ctx;
}
