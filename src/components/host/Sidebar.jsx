import { Trophy, Zap, RotateCcw, Wifi, WifiOff, Minus, Plus } from 'lucide-react';
import { useQuiz } from '../../context/QuizContext.jsx';
import { createTeam } from '../../utils/quizFactory.js';
import Button from '../common/Button.jsx';
import Panel from '../common/Panel.jsx';

export default function Sidebar() {
  const { quiz, resetBuzzer, updateTeams } = useQuiz();
  const ranked = [...quiz.teams].sort((a, b) => b.score - a.score);
  const teamById = Object.fromEntries(quiz.teams.map((t) => [t.id, t]));
  const firstBuzzTime = quiz.buzzer.order[0]?.time;

  function handleAddTeam() {
    const nextName = `Team ${quiz.teams.length + 1}`;
    updateTeams([...quiz.teams, createTeam(nextName)]);
  }

  function handleRenameTeam(teamId, name) {
    updateTeams(
      quiz.teams.map((team) =>
        team.id === teamId ? { ...team, name: name.trim() || team.name } : team,
      ),
    );
  }

  function handleUpdateTeamCode(teamId, code) {
    updateTeams(
      quiz.teams.map((team) =>
        team.id === teamId ? { ...team, code: code.trim() || team.code } : team,
      ),
    );
  }

  function handleUpdateTeamEmail(teamId, email) {
    updateTeams(
      quiz.teams.map((team) => (team.id === teamId ? { ...team, email: email.trim() } : team)),
    );
  }

  function handleRemoveTeam(teamId) {
    if (quiz.teams.length <= 1) return;
    // UPDATE_TEAMS in the reducer also prunes this team's buzzer order entry
    // and any text answer, so a single dispatch keeps every slice in sync.
    updateTeams(quiz.teams.filter((team) => team.id !== teamId));
  }

  return (
    <div className="stack gap-md">
      {quiz.modes.leaderboard && (
        <Panel title="Leaderboard">
          <ol className="stack gap-xs" style={{ listStyle: 'none', padding: 0 }}>
            {ranked.map((team, index) => (
              <li
                key={team.id}
                className="row gap-sm slide-up"
                style={{ justifyContent: 'space-between' }}
              >
                <span className="row gap-sm">
                  <span className="mono" style={{ color: 'var(--color-text-muted)' }}>
                    #{index + 1}
                  </span>
                  {index === 0 && (
                    <Trophy
                      size={14}
                      className="pulse"
                      color="var(--color-accent-warn)"
                      aria-hidden="true"
                    />
                  )}
                  <span>{team.name}</span>
                </span>
                <span className="mono">{team.score}</span>
              </li>
            ))}
          </ol>
        </Panel>
      )}

      {quiz.modes.buzzer && (
        <Panel
          title="Buzzer order"
          action={
            <Button variant="ghost" icon={RotateCcw} onClick={resetBuzzer}>
              Reset
            </Button>
          }
        >
          {quiz.buzzer.order.length === 0 ? (
            <p style={{ fontSize: 13 }}>No buzz yet.</p>
          ) : (
            <ol className="stack gap-xs" style={{ listStyle: 'none', padding: 0 }}>
              {quiz.buzzer.order.map((entry, index) => (
                <li
                  key={entry.teamId}
                  className="row gap-sm"
                  style={{ justifyContent: 'space-between' }}
                >
                  <span className="row gap-sm">
                    <Zap
                      size={14}
                      color={
                        index === 0 ? 'var(--color-accent-secondary)' : 'var(--color-text-muted)'
                      }
                      aria-hidden="true"
                    />
                    {teamById[entry.teamId]?.name}
                  </span>
                  <span className="mono" style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    +{(entry.time - firstBuzzTime).toFixed(0)}ms
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      )}

      <Panel
        title="Teams"
        action={
          <div className="row gap-xs">
            <Button
              variant="ghost"
              className="btn-icon"
              onClick={handleAddTeam}
              aria-label="Add team"
            >
              <Plus size={14} />
            </Button>
          </div>
        }
      >
        <ul className="stack gap-xs" style={{ listStyle: 'none', padding: 0 }}>
          {quiz.teams.map((team) => (
            <li
              key={team.id}
              className="stack gap-xs"
              style={{ paddingBottom: 8, borderBottom: '1px solid var(--color-border)' }}
            >
              <div className="row gap-sm" style={{ alignItems: 'center' }}>
                <input
                  className="input"
                  value={team.name}
                  onChange={(event) => handleRenameTeam(team.id, event.target.value)}
                  aria-label={`Rename ${team.name}`}
                  style={{ minWidth: 0, flex: 1 }}
                />
                <div className="row gap-xs" style={{ alignItems: 'center' }}>
                  {team.connected ? (
                    <span className="badge badge-success">
                      <Wifi size={12} aria-hidden="true" /> Connected
                    </span>
                  ) : (
                    <span className="badge">
                      <WifiOff size={12} aria-hidden="true" /> Waiting
                    </span>
                  )}
                  {quiz.teams.length > 1 && (
                    <Button
                      variant="ghost"
                      className="btn-icon"
                      onClick={() => handleRemoveTeam(team.id)}
                      aria-label={`Remove ${team.name}`}
                    >
                      <Minus size={14} />
                    </Button>
                  )}
                </div>
              </div>
              <div className="row gap-sm">
                <input
                  className="input mono"
                  value={team.code}
                  onChange={(event) => handleUpdateTeamCode(team.id, event.target.value)}
                  aria-label={`Team code for ${team.name}`}
                  style={{ maxWidth: 96, textAlign: 'center', letterSpacing: 2 }}
                />
                <input
                  className="input"
                  type="email"
                  value={team.email || ''}
                  onChange={(event) => handleUpdateTeamEmail(team.id, event.target.value)}
                  placeholder="team@email.com"
                  style={{ flex: 1 }}
                />
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
