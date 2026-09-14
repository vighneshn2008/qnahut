import ItemList from '../common/ItemList.jsx';

export default function StepQuestions({ draft, updateDraft }) {
  function addItem(item) {
    updateDraft({ questions: [...draft.questions, item] });
  }

  function updateItem(id, patch) {
    updateDraft({ questions: draft.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)) });
  }

  function removeItem(id) {
    updateDraft({ questions: draft.questions.filter((q) => q.id !== id) });
  }

  function move(id, direction) {
    const index = draft.questions.findIndex((q) => q.id === id);
    const target = index + direction;
    if (target < 0 || target >= draft.questions.length) return;
    const questions = [...draft.questions];
    [questions[index], questions[target]] = [questions[target], questions[index]];
    updateDraft({ questions });
  }

  return (
    <div className="stack gap-md">
      <h2 style={{ fontSize: 18 }}>Running order</h2>
      <ItemList
        items={draft.questions}
        onAdd={addItem}
        onUpdate={updateItem}
        onDelete={removeItem}
        onMove={move}
      />
    </div>
  );
}
