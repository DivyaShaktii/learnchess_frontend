// Audio playback layer for move classification feedback
import { speakCoachMessage } from './soundEffects';
import { Chess } from 'chess.js';
import { getRandomRoast, getRoastCategoryForMove, RoastCategoryKey } from '../data/roastDialogues';

const CATEGORY_MESSAGES: Record<string, string> = {
  Book: 'Book move.',
  Best: 'Best move.',
  'Best Move': 'Best move.',
  Brilliant: 'Brilliant move!',
  Excellent: 'Excellent move.',
  Great: 'Great move.',
  Good: 'Good move.',
  Inaccuracy: 'That is a slight inaccuracy.',
  Mistake: 'Hold on, that is a mistake. Take a moment to find a better move.',
  Blunder: 'That is a blunder.',
  'Worst Move': 'That is a serious blunder.',
  Worst: 'That is a serious blunder.',
};

export function speakMoveCategory(label: string, playAudio: boolean = true, fallbackText?: string, priority = false): void {
  if (typeof window === 'undefined') return;

  const text = fallbackText || CATEGORY_MESSAGES[label] || `${label} move.`;
  speakCoachMessage(text, undefined, playAudio, priority);
}

export function speakRefutationWarning(playAudio: boolean = true): void {
  if (typeof window === 'undefined') return;

  speakCoachMessage('Watch out! Here is their plan.', undefined, playAudio);
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

  speakCoachMessage('You win!', undefined, playAudio);
}

export function speakGameLost(playAudio: boolean = true): void {
  if (typeof window === 'undefined') return;
  speakCoachMessage('Checkmate. Your opponent wins this game.', undefined, playAudio);
}

export function speakGameDraw(isStalemate: boolean = false, playAudio: boolean = true): void {
  if (typeof window === 'undefined') return;
  speakCoachMessage(
    isStalemate ? 'Stalemate. The game is a draw.' : 'The game ends in a draw.',
    undefined,
    playAudio,
  );
}

export function speakDynamicRefutation(refutationSequence: string[], currentFen: string, playAudio: boolean = true): void {
  if (typeof window === 'undefined' || refutationSequence.length === 0) return;
  
  try {
    const chess = new Chess(currentFen);
    const lostPieces = new Set<string>();
    const lineMoves: Array<{ piece: string; to: string; san: string; captured?: string }> = [];

    for (let i = 0; i < Math.min(refutationSequence.length, 3); i++) {
      const moveUci = refutationSequence[i];
      const move = chess.move({
        from: moveUci.slice(0, 2),
        to: moveUci.slice(2, 4),
        promotion: moveUci[4] || 'q',
      });
      lineMoves.push(move);
      
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
      const pieceNames: Record<string, string> = {
        p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king',
      };
      const describe = (move: { piece: string; to: string; san: string }) => {
        if (move.san.startsWith('O-O-O')) return 'castle queenside';
        if (move.san.startsWith('O-O')) return 'castle kingside';
        return `${pieceNames[move.piece] || 'piece'} to ${move.to}`;
      };
      const opponentReply = lineMoves[0];
      const requiredResponse = lineMoves[1];
      let message: string;

      if (!opponentReply) {
        message = 'Your opponent has a stronger continuation here. Check the highlighted line before deciding.';
      } else if (opponentReply.san.includes('+') || opponentReply.san.includes('#')) {
        message = `Your opponent can play ${describe(opponentReply)} with check, forcing you to respond.`;
      } else if (requiredResponse) {
        message = `Your opponent's strongest reply is ${describe(opponentReply)}. Your best response would be ${describe(requiredResponse)}.`;
      } else {
        message = `Your opponent's strongest reply is ${describe(opponentReply)}, taking control of the position.`;
      }
      speakCoachMessage(message, undefined, playAudio);
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
  const line = 'Hold it, genius. That move deserves another look.';
  speakCoachMessage(line, undefined, playAudio, true);
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
  outcome: 'robot_wins' | 'player_wins' | 'stalemate' | 'draw',
  playAudio: boolean = true
): string {
  if (typeof window === 'undefined') return '';
  let category: RoastCategoryKey = 'CHECKMATE_ROBOT_WINS';
  if (outcome === 'player_wins') category = 'CHECKMATE_PLAYER_WINS';
  if (outcome === 'stalemate') category = 'STALEMATE';
  if (outcome === 'draw') category = 'DRAW';

  const line = getRandomRoast(category);
  speakCoachMessage(line, undefined, playAudio);
  return line;
}
