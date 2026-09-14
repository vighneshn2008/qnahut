export default function StepReview({ draft }) {
  const questionCount = draft.questions.filter((q) => !q.isSlide).length;
  const slideCount = draft.questions.filter((q) => q.isSlide).length;

  return (
    <div className="stack gap-md">
      <h2 style={{ fontSize: 18 }}>Review</h2>

      <div className="stack gap-sm">
        <Row label="Name" value={draft.name || '(untitled)'} />
        <Row label="Teams" value={draft.teams.map((t) => t.name).join(', ')} />
        <Row label="Questions" value={`${questionCount} question(s)`} />
        <Row label="Slides" value={`${slideCount} round header / info slide(s)`} />
        <Row label="Logo" value={draft.logoDataUrl ? 'Uploaded' : 'None'} />
      </div>

      <p style={{ fontSize: 13 }}>
        Buzzer, leaderboard, and the default timer are configured from the host dashboard&rsquo;s
        quiz settings once the quiz is running — using the exact same editor used mid-quiz.
      </p>

      <p style={{ fontSize: 13 }}>
        Click <strong style={{ color: 'var(--color-text-primary)' }}>Create quiz</strong> to open
        the host dashboard.
      </p>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div
      className="row"
      style={{
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--color-border)',
        paddingBottom: 8,
      }}
    >
      <span className="label" style={{ margin: 0 }}>
        {label}
      </span>
      <span style={{ fontSize: 14 }}>{value}</span>
    </div>
  );
}
