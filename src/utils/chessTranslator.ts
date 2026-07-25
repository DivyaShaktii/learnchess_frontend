import { Chess } from 'chess.js';

const pieceNames: Record<string, string> = {
  p: 'Pawn', n: 'Knight', b: 'Bishop', r: 'Rook', q: 'Queen', k: 'King',
};

// Human-friendly column names
const fileNames: Record<string, string> = {
  a: 'left edge', b: 'second from left', c: 'third from left',
  d: 'center-left', e: 'center-right', f: 'third from right',
  g: 'second from right', h: 'right edge',
};

const rankDesc = (rank: string, color: 'w' | 'b') => {
  const r = parseInt(rank);
  if (color === 'w') {
    if (r === 3) return 'one step forward';
    if (r === 4) return 'two steps forward';
    if (r <= 5) return 'into the middle';
    if (r === 6) return 'deep into enemy territory';
    if (r === 7 || r === 8) return 'almost across the board';
  } else {
    if (r === 6) return 'one step forward';
    if (r === 5) return 'two steps forward';
    if (r >= 4) return 'into the middle';
    if (r === 3) return 'deep into enemy territory';
    if (r <= 2) return 'almost across the board';
  }
  return '';
};

function parseSanFallback(moveSan: string): string {
  if (!moveSan) return '';
  const clean = moveSan.replace(/[+#?!]/g, '').trim();
  if (clean === 'O-O') return 'Kingside Castling (King safety move)';
  if (clean === 'O-O-O') return 'Queenside Castling (King safety move)';

  const isCapture = clean.includes('x');
  const pieceChar = /^[NBRQK]/.test(clean) ? clean[0] : 'P';
  const targetSquare = clean.slice(-2);

  const pieceName = pieceNames[pieceChar.toLowerCase()] || 'Piece';
  const captureText = isCapture ? ' captures on ' : ' moves to ';

  if (pieceChar === 'P') {
    return isCapture ? `Pawn captures on ${targetSquare}` : `Pawn moves to ${targetSquare}`;
  }
  if (pieceChar === 'N') {
    return `Knight jumps to ${targetSquare} (L-shaped jump)`;
  }
  return `${pieceName}${captureText}${targetSquare}`;
}

export function translateMoveToEnglish(fen: string, moveSan: string): string {
  if (!moveSan) return '';

  try {
    let chess = new Chess(fen);
    let move = chess.move(moveSan);

    if (!move) {
      // Try flipping active turn (w <-> b) in case moveSan belongs to the opponent
      const flippedFen = fen.includes(' w ') ? fen.replace(' w ', ' b ') : fen.replace(' b ', ' w ');
      chess = new Chess(flippedFen);
      move = chess.move(moveSan);
    }

    if (!move) {
      return parseSanFallback(moveSan);
    }

    const piece = pieceNames[move.piece] ?? 'Piece';
    const color = move.color as 'w' | 'b';

    // Castling
    if (move.flags.includes('k')) return '🏰 Castle to the right (King safety move)';
    if (move.flags.includes('q')) return '🏰 Castle to the left (King safety move)';

    const isCapture = move.flags.includes('c') || move.flags.includes('e');
    const enPassant = move.flags.includes('e') ? ' (sneaky en passant capture!)' : '';
    const promotion = move.promotion
      ? ` — pawn becomes a ${pieceNames[move.promotion]}!`
      : '';

    const toFile = move.to[0];
    const toRank = move.to[1];
    const rd = rankDesc(toRank, color);

    if (isCapture) {
      return `${piece} captures on ${move.to}${enPassant}${promotion}`;
    }

    if (move.piece === 'p') {
      const steps = Math.abs(parseInt(move.to[1]) - parseInt(move.from[1]));
      const stepWord = steps === 2 ? 'two steps' : 'one step';
      const col = fileNames[toFile] ?? toFile;
      return `Pawn moves ${stepWord} forward (${col} column)${promotion}`;
    }

    if (move.piece === 'n') {
      return `Knight jumps to ${move.to} (L-shaped jump)`;
    }

    if (move.piece === 'b') {
      const dir = parseInt(move.to[0].charCodeAt(0).toString()) > parseInt(move.from[0].charCodeAt(0).toString())
        ? 'right' : 'left';
      return `Bishop slides diagonally ${dir}ward`;
    }

    if (move.piece === 'r') {
      return `Rook moves in a straight line to ${move.to}`;
    }

    if (move.piece === 'q') {
      return `Queen moves powerfully to ${move.to}`;
    }

    if (move.piece === 'k') {
      return `King steps to ${move.to} (be careful!)`;
    }

    return `${piece} moves to ${move.to}${rd ? ' — ' + rd : ''}`;
  } catch {
    return parseSanFallback(moveSan);
  }
}

export function getMoveSquares(fen: string, moveSan: string): { from: string; to: string } | null {
  try {
    let chess = new Chess(fen);
    let move = chess.move(moveSan);

    if (!move) {
      const flippedFen = fen.includes(' w ') ? fen.replace(' w ', ' b ') : fen.replace(' b ', ' w ');
      chess = new Chess(flippedFen);
      move = chess.move(moveSan);
    }

    if (!move) return null;
    return { from: move.from, to: move.to };
  } catch {
    return null;
  }
}
