import { useCallback, useEffect, useState } from 'react';
import {
  loadNetworkActiveQuizSnapshot,
  loadNetworkQuizSnapshot,
  readDeepLink,
  saveTeamSession,
} from '../../utils/sync.js';
import { useQuiz } from '../../context/QuizContext.jsx';
import { useNavigation, VIEWS } from '../../context/NavigationContext.jsx';
import Button from '../common/Button.jsx';
import Panel from '../common/Panel.jsx';

export default function Join() {
  const { quiz, connectTeam, loadQuiz } = useQuiz();
  const { setActiveTeamId, setView } = useNavigation();
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState('');
  const deepLink = readDeepLink();
  const quizId = deepLink.quizId;
  const accessToken = deepLink.accessToken;

  const loadJoinQuiz = useCallback(async () => {
    if (quizId) {
      const targetedSnapshot = await loadNetworkQuizSnapshot(quizId, accessToken);
      if (targetedSnapshot) return targetedSnapshot;
    }
    const activeSnapshot = await loadNetworkActiveQuizSnapshot();
    return !quizId || activeSnapshot?.id === quizId ? activeSnapshot : null;
  }, [accessToken, quizId]);

  useEffect(() => {
    if (quiz && (!quizId || quiz.id === quizId)) return undefined;
    let active = true;
    loadJoinQuiz().then((snapshot) => {
      if (active && snapshot) loadQuiz(snapshot);
    });
    return () => {
      active = false;
    };
  }, [loadJoinQuiz, quiz, quizId, loadQuiz]);

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmed = identifier.trim();
    setError('');
    const latestQuiz = await loadJoinQuiz();
    const teamSource = latestQuiz || quiz;
    const team = teamSource?.teams.find((candidate) => {
      const codeMatches = (candidate.code || '').trim() === trimmed;
      const emailMatches =
        trimmed.includes('@') &&
        (candidate.email || '').trim().toLowerCase() === trimmed.toLowerCase();
      return codeMatches || emailMatches;
    });

    if (!team) {
      setError("That code or email doesn't match a team.");
      return;
    }

    if (latestQuiz) loadQuiz(latestQuiz);
    saveTeamSession(teamSource.id, team.id);
    connectTeam(team.id);
    setActiveTeamId(team.id);
    setView(VIEWS.TEAM);
  }

  return (
    <main className="container" style={{ maxWidth: 420 }}>
      <Panel title="Join a quiz">
        <form onSubmit={handleSubmit} className="stack gap-md">
          <div>
            <label className="label" htmlFor="team-identifier">
              Team code or email
            </label>
            <input
              id="team-identifier"
              className="input"
              style={{ fontSize: 18, textAlign: 'center' }}
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="e.g. 1234 or team@example.com"
              autoFocus
            />
          </div>
          {!quiz && <p style={{ fontSize: 13 }}>Enter the code or email shown by the host.</p>}
          {error && <p style={{ color: 'var(--color-accent-secondary)', fontSize: 13 }}>{error}</p>}
          <Button type="submit" variant="primary" block disabled={!identifier.trim()}>
            Join
          </Button>
        </form>
      </Panel>
    </main>
  );
}
