import { Chess } from 'chess.js';
import { getRandomRoast, getRoastCategoryForMove, pickRoastLine } from '../data/roastDialogues';

export interface RoastContext {
  fen: string; move: string; label: string; cpLoss?: number;
  bestMove?: string; reply?: string; recentMoves?: string[];
}
const remarks = [
  'What the fuck was the plan?', 'You absolute clown.', 'Wake up, dumbass.',
  'Try using that last brain cell.', 'Bold choice, genius.', 'You made that look difficult.',
  'Did you mean to click that?', 'Your mouse deserves better.', 'Think before you click.',
  'That is one hell of a decision.', 'You are keeping me entertained.', 'Explain that one, hotshot.',
];
const contextLines: Record<string, string> = {
  center: 'Center pawn developed. The bare minimum, and you want a damn medal.',
  knight: 'Knight toward the center. Look who finally read the instructions.',
  flank: 'An early flank pawn push. Fight for the center, you clown.',
  rim: 'Knight on the rim. Your horse is admiring the wall.',
  queen: 'Queen out early. Expect tempo attacks, hotshot.',
  king: 'King out early. Nice security policy, hotshot.',
  castle: 'Castled at last. Your king can watch the chaos from cover.',
  hungQueen: 'That reply wins your queen. What a fucking donation.',
  hungPiece: 'That reply wins material. Stop handing out free pieces.',
  missed: 'You missed a profitable capture. The gift was right there.',
  shuffle: 'Back to the same square. Your pieces are doing laps.',
};
function contextual(key: string) {
  return pickRoastLine(`context:${key}`, remarks.map(remark => `${contextLines[key]} ${remark}`));
}
export function roastForMove(context: RoastContext): string {
  const category = getRoastCategoryForMove(context.label, context.cpLoss);
  try {
    const board = new Chess(context.fen);
    const before = new Chess(context.fen);
    const move = board.move({ from: context.move.slice(0, 2), to: context.move.slice(2, 4), promotion: context.move[4] || 'q' });
    if (!move) return getRandomRoast(category);
    if (category === 'BRILLIANT_MOVES') return getRandomRoast(category);
    const bad = ['MAJOR_BLUNDERS', 'MISTAKES', 'INACCURACIES'].includes(category);
    if (bad && context.reply && (context.cpLoss ?? 0) >= 100) {
      try {
        const reply = board.move({ from: context.reply.slice(0, 2), to: context.reply.slice(2, 4), promotion: context.reply[4] || 'q' });
        if (reply?.captured === 'q' && (context.cpLoss ?? 0) > 300) return contextual('hungQueen');
        if (reply?.captured && ['r', 'n', 'b'].includes(reply.captured)) return contextual('hungPiece');
      } catch { /* An unavailable PV never prevents commentary. */ }
    }
    if (bad && context.bestMove && context.bestMove !== context.move && (context.cpLoss ?? 0) >= 100 && !move.captured) {
      const target = before.get(context.bestMove.slice(2, 4) as any);
      if (target && target.color !== move.color && target.type !== 'p') return contextual('missed');
    }
    if (category === 'MAJOR_BLUNDERS' || category === 'MISTAKES') return getRandomRoast(category);
    if (move.flags.includes('k') || move.flags.includes('q')) return contextual('castle');
    const ply = (Number(context.fen.split(' ')[5]) - 1) * 2 + (before.turn() === 'b' ? 1 : 0);
    if (ply < 6) {
      if (move.piece === 'k') return contextual('king');
      if (move.piece === 'q') return contextual('queen');
      if (move.piece === 'n') return contextual(['a', 'h'].includes(move.to[0]) ? 'rim' : 'knight');
      if (move.piece === 'p') {
        if (['a', 'h'].includes(move.to[0]) && bad) return contextual('flank');
        if (['d', 'e'].includes(move.to[0]) && !bad) return contextual('center');
      }
    }
    if (bad && context.recentMoves?.slice(-4).includes(move.san)) return contextual('shuffle');
  } catch { /* Fall back to the engine classification. */ }
  return getRandomRoast(category);
}
