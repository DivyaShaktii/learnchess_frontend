// Audio playback layer for move classification feedback
import { dispatchSubtitle, clearSubtitleAfter, speakCoachMessage } from './soundEffects';
import { Chess } from 'chess.js';
import { getRandomRoast, getRoastCategoryForMove, RoastCategoryKey } from '../data/roastDialogues';

const BASE_PATH = "/Chess_Project_Voices";

const AUDIO_FILES: Record<string, string> = {
  Book: `${BASE_PATH}/Book.mp3`,
  Best: `${BASE_PATH}/Good move.mp3`,
  'Best Move': `${BASE_PATH}/Good move.mp3`,
  Brilliant: `${BASE_PATH}/Good move.mp3`,
  Excellent: `${BASE_PATH}/Excellent move.mp3`,
  Good: `${BASE_PATH}/Good move.mp3`,
  Inaccuracy: `${BASE_PATH}/That's a slight inaccuracy.mp3`,
  Mistake: `${BASE_PATH}/Hold on, that's a mistake. Don't rush take a moment to rethink your strategy and try to find a better move.mp3`,
  Blunder: `${BASE_PATH}/That's a blunder..mp3`,
  'Worst Move': `${BASE_PATH}/That's a serious blunder..mp3`,
  Worst: `${BASE_PATH}/That's a serious blunder..mp3`,
};

export function speakMoveCategory(label: string, playAudio: boolean = true, fallbackText?: string): void {
  if (typeof window === 'undefined') return;

  if ((label === "Opening Principle" || label === "Opening Pawn Warning") && fallbackText) {
    speakCoachMessage(fallbackText, undefined, playAudio);
    return;
  }

  const audioPath = AUDIO_FILES[label];
  if (audioPath) {
    try {
      const cleanText = audioPath.replace(BASE_PATH + '/', '').replace('.mp3', '');
      dispatchSubtitle(cleanText);

      if (playAudio) {
        const audio = new Audio(audioPath);
        audio.volume = 1.0;
        audio.onended = () => clearSubtitleAfter(2000);
        audio.play().catch(e => console.warn("Audio play failed:", e));
      } else {
        clearSubtitleAfter(5000);
      }
    } catch (e) {
      console.warn("Failed to play audio", e);
    }
  }
}

export function speakRefutationWarning(playAudio: boolean = true): void {
  if (typeof window === 'undefined') return;

  try {
    dispatchSubtitle("Watch out! Here is their plan.");
    if (playAudio) {
      const audio = new Audio(`${BASE_PATH}/Watch out! Here is their plan..mp3`);
      audio.volume = 1.0;
      audio.onended = () => clearSubtitleAfter(2000);
      audio.play().catch(e => console.warn("Audio play failed:", e));
    } else {
      clearSubtitleAfter(5000);
    }
  } catch (e) {
    console.warn("Failed to play audio", e);
  }
}

export function speakRatingAnnouncement(rating: number, tier: string, playAudio: boolean = true): void {
  if (typeof window === 'undefined') return;
  speakCoachMessage(`${tier} Mode, Rating ${rating}`, undefined, playAudio);
}

export function speakPuzzleStartAnnouncement(color: string, playAudio: boolean = true): void {
  if (typeof window === 'undefined') return;
  speakCoachMessage(`Playing as ${color}. Find the best sequence of moves!`, undefined, playAudio);
}

export function speakGameWon(playAudio: boolean = true): void {
  if (typeof window === 'undefined') return;

  try {
    dispatchSubtitle("You win!");
    if (playAudio) {
      const audio = new Audio(`${BASE_PATH}/win.mp3`);
      audio.volume = 1.0;
      audio.onended = () => clearSubtitleAfter(2000);
      audio.play().catch(e => console.warn("Audio play failed:", e));
    } else {
      clearSubtitleAfter(5000);
    }
  } catch (e) {
    console.warn("Failed to play audio", e);
  }
}

export function speakDynamicRefutation(refutationSequence: string[], currentFen: string, playAudio: boolean = true): void {
  if (typeof window === 'undefined' || refutationSequence.length === 0) return;
  
  try {
    const chess = new Chess(currentFen);
    const lostPieces = new Set<string>();

    for (let i = 0; i < Math.min(refutationSequence.length, 3); i++) {
      const moveUci = refutationSequence[i];
      const move = chess.move(moveUci);
      
      // If it's the opponent's turn (i is even) and they captured something
      if (i % 2 === 0 && move.captured) {
        let pieceName: string = move.captured;
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
      speakCoachMessage(`Watch out! You will lose your ${piecesText} if you make this move.`, undefined, playAudio);
    } else {
      speakCoachMessage(`You won't lose any pieces immediately, but you will lose your positional advantage.`, undefined, playAudio);
    }
  } catch (err) {
    console.warn("Failed to generate dynamic refutation voice", err);
    speakRefutationWarning(playAudio);
  }
}

// -------------------------------------------------------------
// 🔥 Roast Mode (18+) Voice Functions
// -------------------------------------------------------------

export function speakRoastMoveCategory(
  label: string,
  cpLoss?: number,
  isOpening?: boolean,
  playAudio: boolean = true
): string {
  if (typeof window === 'undefined') return '';
  const category = getRoastCategoryForMove(label, cpLoss, isOpening);
  const line = getRandomRoast(category);
  speakCoachMessage(line, undefined, playAudio);
  return line;
}

export function speakRoastPreMoveWarning(playAudio: boolean = true): string {
  if (typeof window === 'undefined') return '';
  const line = getRandomRoast('PRE_MOVE_WARNINGS');
  speakCoachMessage(line, undefined, playAudio);
  return line;
}

export function speakRoastUndo(playAudio: boolean = true): string {
  if (typeof window === 'undefined') return '';
  const line = getRandomRoast('UNDO_MOVE');
  speakCoachMessage(line, undefined, playAudio);
  return line;
}

export function speakRoastSlowPlay(playAudio: boolean = true): string {
  if (typeof window === 'undefined') return '';
  const line = getRandomRoast('SLOW_PLAY');
  speakCoachMessage(line, undefined, playAudio);
  return line;
}

export function speakRoastGameOver(
  outcome: 'robot_wins' | 'player_wins' | 'stalemate',
  playAudio: boolean = true
): string {
  if (typeof window === 'undefined') return '';
  let category: RoastCategoryKey = 'CHECKMATE_ROBOT_WINS';
  if (outcome === 'player_wins') category = 'CHECKMATE_PLAYER_WINS';
  if (outcome === 'stalemate') category = 'STALEMATE';

  const line = getRandomRoast(category);
  speakCoachMessage(line, undefined, playAudio);
  return line;
}
