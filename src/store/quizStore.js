import { configureStore } from '@reduxjs/toolkit';
import { initialQuizState, quizReducer } from '../state/quizReducer.js';

export function createQuizStore(preloadedQuiz = initialQuizState) {
  return configureStore({
    reducer: {
      quiz: quizReducer,
    },
    preloadedState: {
      quiz: preloadedQuiz,
    },
  });
}

export const selectQuiz = (state) => state.quiz;
