import { useQuiz } from '../../context/QuizContext.jsx';
import Modal from '../common/Modal.jsx';
import ItemList from '../common/ItemList.jsx';

export default function QuestionManager({ onClose }) {
  const { quiz, addQuestion, updateQuestion, deleteQuestion, moveQuestion } = useQuiz();

  return (
    <Modal title="Manage running order" onClose={onClose} width={640}>
      <ItemList
        items={quiz.questions}
        onAdd={addQuestion}
        onUpdate={(id, patch) => updateQuestion(id, patch)}
        onDelete={deleteQuestion}
        onMove={moveQuestion}
      />
    </Modal>
  );
}
