import { useEffect } from 'react';
import { useQuiz } from '../context/QuizContext.jsx';

/** Ticks the shared quiz timer down once a second while it's running. */
export function useTimerTick() {
  const { quiz, timerTick } = useQuiz();
  const running = quiz?.timer?.running;

  useEffect(() => {
    if (!running) return undefined;
    const interval = setInterval(timerTick, 1000);
    return () => clearInterval(interval);
  }, [running, timerTick]);
}
