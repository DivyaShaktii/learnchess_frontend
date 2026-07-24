import { Chess } from 'chess.js';

export function translateMoveToEnglish(fen: string, moveSan: string): string {
  try {
    const chess = new Chess(fen);
    const move = chess.move(moveSan);
    
    if (!move) return moveSan;
    
    const pieceNames: Record<string, string> = {
      p: 'Pawn',
      n: 'Knight',
      b: 'Bishop',
      r: 'Rook',
      q: 'Queen',
      k: 'King'
    };
    
    const piece = pieceNames[move.piece];
    
    // Castling
    if (move.flags.includes('k')) return 'Castles Kingside';
    if (move.flags.includes('q')) return 'Castles Queenside';
    
    // Captures
    const isCapture = move.flags.includes('c') || move.flags.includes('e');
    const action = isCapture ? 'captures on' : 'to';
    
    // Promotion
    const promotion = move.promotion ? ` and promotes to ${pieceNames[move.promotion]}` : '';
    
    return `${piece} ${action} ${move.to}${promotion}`;
  } catch (e) {
    // Fallback if parsing fails
    return moveSan;
  }
}

export function getMoveSquares(fen: string, moveSan: string): { from: string, to: string } | null {
  try {
    const chess = new Chess(fen);
    const move = chess.move(moveSan);
    if (!move) return null;
    return { from: move.from, to: move.to };
  } catch (e) {
    return null;
  }
}
