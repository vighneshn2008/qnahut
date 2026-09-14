import { Minus, Plus, Trash2 } from 'lucide-react';
import { createTeam, hasDuplicateTeamIdentifiers } from '../../utils/quizFactory.js';
import Button from '../common/Button.jsx';

export default function StepTeams({ draft, updateDraft }) {
  const hasDuplicateTeams = hasDuplicateTeamIdentifiers(draft.teams);

  function setTeamCount(count) {
    const teams = [...draft.teams];
    while (teams.length < count) teams.push(createTeam(`Team ${teams.length + 1}`));
    while (teams.length > Math.max(2, count)) teams.pop();
    updateDraft({ teams });
  }

  function renameTeam(id, name) {
    updateDraft({ teams: draft.teams.map((t) => (t.id === id ? { ...t, name } : t)) });
  }

  function removeTeam(id) {
    if (draft.teams.length <= 2) return;
    updateDraft({ teams: draft.teams.filter((t) => t.id !== id) });
  }

  return (
    <div className="stack gap-md">
      <h2 style={{ fontSize: 18 }}>Teams</h2>

      <div className="row gap-sm">
        <span className="label" style={{ margin: 0 }}>
          Number of teams
        </span>
        <Button
          variant="ghost"
          className="btn-icon"
          onClick={() => setTeamCount(draft.teams.length - 1)}
        >
          <Minus size={16} />
        </Button>
        <span className="mono" style={{ minWidth: 24, textAlign: 'center' }}>
          {draft.teams.length}
        </span>
        <Button
          variant="ghost"
          className="btn-icon"
          onClick={() => setTeamCount(draft.teams.length + 1)}
        >
          <Plus size={16} />
        </Button>
      </div>

      <div className="stack gap-sm">
        {draft.teams.map((team) => (
          <div
            key={team.id}
            className="stack gap-xs"
            style={{ paddingBottom: 8, borderBottom: '1px solid var(--color-border)' }}
          >
            <div className="row gap-sm">
              <input
                className="input"
                value={team.name}
                onChange={(e) => renameTeam(team.id, e.target.value)}
                style={{ flex: 1 }}
              />
              <input
                className="input mono"
                value={team.code}
                onChange={(e) =>
                  updateDraft({
                    teams: draft.teams.map((item) =>
                      item.id === team.id ? { ...item, code: e.target.value } : item,
                    ),
                  })
                }
                style={{ maxWidth: 86, textAlign: 'center', letterSpacing: 2 }}
                aria-label={`Team code for ${team.name}`}
              />
              <Button
                variant="ghost"
                className="btn-icon"
                onClick={() => removeTeam(team.id)}
                disabled={draft.teams.length <= 2}
                aria-label={`Remove ${team.name}`}
              >
                <Trash2 size={16} />
              </Button>
            </div>
            <input
              className="input"
              type="email"
              value={team.email || ''}
              onChange={(e) =>
                updateDraft({
                  teams: draft.teams.map((item) =>
                    item.id === team.id ? { ...item, email: e.target.value } : item,
                  ),
                })
              }
              placeholder="team@email.com"
            />
          </div>
        ))}
      </div>
      {hasDuplicateTeams && (
        <p style={{ color: 'var(--color-accent-secondary)', fontSize: 13 }}>
          Team codes and email addresses must be unique.
        </p>
      )}
    </div>
  );
}
