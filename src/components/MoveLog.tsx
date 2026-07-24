import { useEffect, useRef } from 'react';
import { Chess } from 'chess.js';

interface MoveRecord {
  san: string;
  classification: string;
}

interface MoveLogProps {
  history: MoveRecord[];
}

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const getClassificationBg = (classification: string | undefined) => {
  if (!classification) return 'bg-zinc-700/30 text-zinc-300 border-zinc-700/50';
  switch (classification.toLowerCase()) {
    case 'book': return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
    case 'best move': return 'bg-green-500/20 text-green-300 border-green-500/50';
    case 'brilliant': return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50';
    case 'excellent': return 'bg-green-300/20 text-green-200 border-green-300/50';
    case 'good': return 'bg-lime-300/20 text-lime-200 border-lime-300/50';
    case 'inaccuracy': return 'bg-amber-400/20 text-amber-300 border-amber-400/50';
    case 'mistake': return 'bg-orange-500/20 text-orange-300 border-orange-500/50';
    case 'blunder': return 'bg-red-500/20 text-red-300 border-red-500/50';
    case 'worst move': return 'bg-red-800/40 text-red-300 border-red-800/80';
    default: return 'bg-zinc-700/30 text-zinc-300 border-zinc-700/50';
  }
};

const pieceNames: Record<string, string> = {
  p: 'Pawn',
  n: 'Knight',
  b: 'Bishop',
  r: 'Rook',
  q: 'Queen',
  k: 'King'
};

function formatMoveWithColor(chess: Chess, san: string): { text: string; nextChess: Chess } {
  try {
    const move = chess.move(san);
    if (!move) {
      return { text: san, nextChess: chess };
    }

    const color = move.color === 'w' ? 'White' : 'Black';
    const piece = pieceNames[move.piece] || 'Piece';

    let text = `${color} ${piece} to ${move.to}`;

    if (move.flags.includes('k')) {
      text = `${color} King Castles Kingside`;
    } else if (move.flags.includes('q')) {
      text = `${color} King Castles Queenside`;
    } else if (move.flags.includes('c') || move.flags.includes('e')) {
      text = `${color} ${piece} captures ${move.to}`;
    }

    if (move.promotion) {
      text += ` (${pieceNames[move.promotion]})`;
    }

    return { text, nextChess: chess };
  } catch (e) {
    return { text: san, nextChess: chess };
  }
}

export function MoveLog({ history }: MoveLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  // Re-run history through chess.js to derive piece names and colors sequentially
  const chess = new Chess(START_FEN);
  const formattedHistory: Array<{ text: string; classification: string }> = [];

  for (const record of history) {
    const { text } = formatMoveWithColor(chess, record.san);
    formattedHistory.push({
      text,
      classification: record.classification
    });
  }

  // Group into pairs (white, black)
  const paired: { 
    white?: { text: string; classification: string }; 
    black?: { text: string; classification: string }; 
    moveNumber: number 
  }[] = [];

  for (let i = 0; i < formattedHistory.length; i += 2) {
    paired.push({
      moveNumber: Math.floor(i / 2) + 1,
      white: formattedHistory[i],
      black: formattedHistory[i + 1]
    });
  }

  return (
    <div className="flex flex-col h-full bg-zinc-900/40 rounded-xl border border-zinc-800 p-4">
      <h3 className="text-zinc-400 font-semibold mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-zinc-600"></span>
        Move Log
      </h3>
      
      <div 
        ref={scrollRef}
        className="flex-grow overflow-y-auto pr-2 space-y-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent"
      >
        {paired.length === 0 ? (
          <div className="text-center text-zinc-500 text-sm mt-10 italic">
            No moves played yet.
          </div>
        ) : (
          paired.map((pair, idx) => (
            <div key={idx} className="flex items-center text-sm gap-2 py-1.5 border-b border-zinc-800/50 last:border-0">
              <span className="w-6 text-zinc-500 text-right shrink-0 font-mono text-xs">{pair.moveNumber}.</span>
              
              <div className="flex-1 min-w-0">
                {pair.white && (
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="font-medium text-zinc-200 text-xs truncate" title={pair.white.text}>
                      {pair.white.text}
                    </span>
                    <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border shrink-0 ${getClassificationBg(pair.white.classification)}`}>
                      {pair.white.classification}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                {pair.black && (
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="font-medium text-zinc-200 text-xs truncate" title={pair.black.text}>
                      {pair.black.text}
                    </span>
                    <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border shrink-0 ${getClassificationBg(pair.black.classification)}`}>
                      {pair.black.classification}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
