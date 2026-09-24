// Audio playback layer for move classification feedback
import { speakCoachMessage } from './soundEffects';
import { Chess } from 'chess.js';
import { getRandomRoast, getRoastCategoryForMove, RoastCategoryKey } from '../data/roastDialogues';

export const CLASSIFICATION_PROMPTS: Record<string, string[]> = {
  Book: [
    'That move follows established opening theory.', 'You are still following a recognized opening line.',
    'This is a well-known move from opening theory.', 'That move keeps you within the opening book.',
    'This position has been played many times before.', 'You chose a standard theoretical move.',
  ],
  Brilliant: [
    'Brilliant! That is a strong and well-justified sacrifice.', 'Excellent insight—you found a difficult tactical idea.',
    'Brilliant move! You gave up material for a powerful continuation.', 'That is an exceptional move with a sound sacrifice behind it.',
    'Beautifully played—you found a move that is both bold and accurate.', 'Outstanding! That sacrifice creates a strong advantage.',
  ],
  'Only Move': [
    'That was the only move that preserved your position.', 'Excellent—you found the one move that works here.',
    'This position demanded precision, and you found the only solution.', 'Every other option was significantly worse. You chose correctly.',
    'That was the critical move needed to keep the position together.', 'Well found—that was your only reliable continuation.',
  ],
  'Great Move': [
    'Great move! You found a difficult and important continuation.', 'That is a strong move that clearly stands above the alternatives.',
    'Excellent choice—this move creates the best practical chances.', 'Very well played. The other options were considerably weaker.',
    'That move shows strong understanding of the position.', 'Great find—you chose a move that was not easy to see.',
  ],
  'Best Move': [
    'Best move—you selected Stockfish’s first choice.', 'Excellent—you found the strongest move in the position.',
    'That is the engine’s preferred continuation.', 'Perfect choice. This was the strongest available move.',
    'You found the most accurate move on the board.', 'Well played—that move leads to the best continuation.',
  ],
  Excellent: [
    'Excellent move. Your choice is nearly as strong as the best move.', 'Very accurate—you preserved the strength of your position.',
    'That is an excellent continuation with no meaningful disadvantage.', 'Nicely played. This move keeps your position in excellent shape.',
    'Strong choice—there is very little separating it from the best move.', 'That move is accurate and fully supports your position.',
  ],
  Good: [
    'Good move. Your position remains healthy.', 'Nicely played—that is a sensible continuation.',
    'Good choice. You have maintained your position.', 'That move works well and does not create any serious problems.',
    'Solid move—you are still on the right track.', 'Well played. That is a practical and reliable choice.',
  ],
  Inaccuracy: [
    'Hold on. Consider the other available moves—there may be a better option.',
    'Take another look before continuing. A stronger move may be available.',
    'This move is playable, but the position offers a more accurate choice.',
    'Pause for a moment and compare this move with your alternatives.',
    'You may want to reconsider this move. There is likely a better continuation.',
    'This is a small inaccuracy. Look again and see if you can improve it.',
  ],
  Mistake: [
    'This is a mistake. Take your time and reconsider the position.',
    'Hold on—this move creates a meaningful problem. Look for another option.',
    'Take another look. There is a significantly stronger move available.',
    'This move weakens your position, so consider a different continuation.',
    'Slow down and examine the opponent’s possible response before committing.',
    'This choice gives away part of your advantage. Try to find a safer move.',
  ],
  Blunder: [
    'Careful—this is a blunder. Check the opponent’s strongest response.', 'Stop and look again. This move creates a serious problem.',
    'This move gives the opponent a major opportunity. Consider another option.',
    'That is a significant error. Examine the tactical consequences before playing it.',
    'Take your time—this move can seriously damage your position.', 'Warning: the opponent has a powerful reply to this move.',
  ],
  'Worst Move': [
    'This is the most damaging move available. Please reconsider it.', 'Stop—this move produces the worst outcome among your options.',
    'This move creates a critical problem. Look carefully for another solution.', 'The consequences of this move are severe. Check the position again.',
    'This is the weakest available choice. A much better continuation exists.',
    'Take another look—this move may completely change the game against you.',
  ],
  'Opening Pawn Warning': [
    'Be careful with that pawn move. Developing a piece may be more useful.',
    'This pawn move may lose valuable opening time. Consider development instead.',
    'Think again—an early wing-pawn move may not help control the center.',
    'Your position may benefit more from developing a knight or bishop.',
    'Before moving that pawn, consider improving your central control.',
    'This move may be too slow for the opening. Look for active development.',
  ],
  'Opening Principle': [
    'Consider developing a piece or controlling the center.', 'Your opening position may improve with faster development.',
    'Try to bring another piece into the game.', 'Castling, development, and central control are important here.',
    'Look for a move that improves your pieces and prepares your king’s safety.',
    'This is a good moment to follow the basic principles of the opening.',
  ],
};

export function coachPromptForClassification(label: string): string {
  const aliases: Record<string, string> = { Best: 'Best Move', Great: 'Great Move', Worst: 'Worst Move' };
  const prompts = CLASSIFICATION_PROMPTS[aliases[label] || label];
  if (!prompts?.length) return `${label} move.`;
  return prompts[Math.floor(Math.random() * prompts.length)];
}

export function speakMoveCategory(label: string, playAudio: boolean = true, fallbackText?: string, priority = false): void {
  if (typeof window === 'undefined') return;

  const text = fallbackText || coachPromptForClassification(label);
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
