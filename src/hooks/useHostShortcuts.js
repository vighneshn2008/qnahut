import { useEffect } from 'react';
import { useQuiz } from '../context/QuizContext.jsx';

/**
 * Space: start/pause timer · N: next question · P: previous question
 * B: reset buzzer · L: jump projector to the leaderboard
 */
export function useHostShortcuts() {
  const {
    quiz,
    timerStart,
    timerPause,
    nextQuestion,
    prevQuestion,
    resetBuzzer,
    setProjectorView,
  } = useQuiz();

  useEffect(() => {
    if (!quiz) return undefined;
    function handleKeyDown(event) {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return;
      switch (event.key.toLowerCase()) {
        case ' ':
          event.preventDefault();
          quiz.timer.running ? timerPause() : timerStart();
          break;
        case 'n':
          nextQuestion();
          break;
        case 'p':
          prevQuestion();
          break;
        case 'b':
          resetBuzzer();
          break;
        case 'l':
          setProjectorView('leaderboard');
          break;
        default:
          break;
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quiz, timerStart, timerPause, nextQuestion, prevQuestion, resetBuzzer, setProjectorView]);
}
