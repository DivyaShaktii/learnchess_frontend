// Audio playback layer for move classification feedback
import { dispatchSubtitle, clearSubtitleAfter, speakCoachMessage } from './soundEffects';
import { Chess } from 'chess.js';

const BASE_PATH = "/Chess_Project_Voices";

const AUDIO_FILES: Record<string, string> = {
  Book: `${BASE_PATH}/Book.mp3`,
  Best: `${BASE_PATH}/Best Move On th Board.mp3`,
  'Best Move': `${BASE_PATH}/Best Move On th Board.mp3`,
  Brilliant: `${BASE_PATH}/Brilliant.mp3`,
  Excellent: `${BASE_PATH}/Excellent move.mp3`,
  Good: `${BASE_PATH}/Good move.mp3`,
  Inaccuracy: `${BASE_PATH}/That's a slight inaccuracy.mp3`,
  Mistake: `${BASE_PATH}/Hold on, that's a mistake. Don't rush take a moment to rethink your strategy and try to find a better move.mp3`,
  Blunder: `${BASE_PATH}/That's a blunder..mp3`,
  'Worst Move': `${BASE_PATH}/That's a serious blunder..mp3`,
  Worst: `${BASE_PATH}/That's a serious blunder..mp3`,
};

export function speakMoveCategory(label: string): void {
  if (typeof window === 'undefined') return;

  const audioPath = AUDIO_FILES[label];
  if (audioPath) {
    try {
      const cleanText = audioPath.replace(BASE_PATH + '/', '').replace('.mp3', '');
      dispatchSubtitle(cleanText);

      const audio = new Audio(audioPath);
      audio.volume = 1.0;
      audio.onended = () => clearSubtitleAfter(2000);
      audio.play().catch(e => console.warn("Audio play failed:", e));
    } catch (e) {
      console.warn("Failed to play audio", e);
    }
  }
}

export function speakRefutationWarning(): void {
  if (typeof window === 'undefined') return;

  try {
    dispatchSubtitle("Watch out! Here is their plan.");
    const audio = new Audio(`${BASE_PATH}/Watch out! Here is their plan..mp3`);
    audio.volume = 1.0;
    audio.onended = () => clearSubtitleAfter(2000);
    audio.play().catch(e => console.warn("Audio play failed:", e));
  } catch (e) {
    console.warn("Failed to play audio", e);
  }
}

export function speakRatingAnnouncement(rating: number, tier: string): void {
  if (typeof window === 'undefined') return;
  speakCoachMessage(`${tier} Mode, Rating ${rating}`);
}

export function speakPuzzleStartAnnouncement(color: string): void {
  if (typeof window === 'undefined') return;
  speakCoachMessage(`Playing as ${color}. Find the best sequence of moves!`);
}

export function speakGameWon(): void {
  if (typeof window === 'undefined') return;

  try {
    dispatchSubtitle("You win!");
    const audio = new Audio(`${BASE_PATH}/win.mp3`);
    audio.volume = 1.0;
    audio.onended = () => clearSubtitleAfter(2000);
    audio.play().catch(e => console.warn("Audio play failed:", e));
  } catch (e) {
    console.warn("Failed to play audio", e);
  }
}

export function speakDynamicRefutation(refutationSequence: string[], currentFen: string): void {
  if (typeof window === 'undefined' || refutationSequence.length === 0) return;
  
  try {
    const chess = new Chess(currentFen);
    const lostPieces = new Set<string>();

    for (let i = 0; i < Math.min(refutationSequence.length, 3); i++) {
      const moveUci = refutationSequence[i];
      const move = chess.move(moveUci);
      
      // If it's the opponent's turn (i is even) and they captured something
      if (i % 2 === 0 && move.captured) {
        let pieceName = move.captured;
        if (pieceName === 'p') pieceName = 'pawn';
        if (pieceName === 'n') pieceName = 'knight';
        if (pieceName === 'b') pieceName = 'bishop';
        if (pieceName === 'r') pieceName = 'rook';
        if (pieceName === 'q') pieceName = 'queen';
        lostPieces.add(pieceName);
      }
    }

    if (lostPieces.size > 0) {
      const piecesList = Array.from(lostPieces);
      let piecesText = piecesList[0];
      if (piecesList.length > 1) {
        piecesText = piecesList.slice(0, -1).join(', ') + ' and ' + piecesList[piecesList.length - 1];
      }
      speakCoachMessage(`Watch out! You will lose your ${piecesText} if you make this move.`);
    } else {
      speakCoachMessage(`You won't lose any pieces immediately, but you will lose your positional advantage.`);
    }
  } catch (err) {
    console.warn("Failed to generate dynamic refutation voice", err);
    speakRefutationWarning();
  }
}
