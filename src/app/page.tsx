import type { Metadata } from 'next';
import ChessAppLoader from '@/components/ChessAppLoader';

export const metadata: Metadata = {
  title: 'Chess Learner — Play Chess vs a Live AI Coach',
  description:
    'Play chess against the computer while an AI coach gives real-time move feedback, hints, and follow-up threat previews to help you improve.',
};

export default function Page() {
  return (
    <>
      {/* Visually hidden but crawlable — keeps the pixel-perfect board
          layout untouched while still giving search engines real text. */}
      <h1 className="sr-only">
        Learn Chess Against a Live AI Coach — Play, Get Hints, and Improve Your Game
      </h1>
      <p className="sr-only">
        Chess Learner lets you play a full game against the computer or solve
        puzzles, with an AI coach that classifies every move (Best, Good,
        Inaccuracy, Mistake, Blunder), previews the opponent's best reply,
        and suggests stronger alternatives — all in real time.
      </p>
      <ChessAppLoader />
    </>
  );
}
