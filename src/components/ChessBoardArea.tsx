import { useState, useMemo } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';

interface ChessBoardAreaProps {
  fen: string;
  onMoveAttempt: (sourceSquare: string, targetSquare: string, piece: string) => boolean;
  onPieceSelect?: (square: string | null) => void;
  orientation?: 'white' | 'black';
  customArrows?: [string, string, string][];
  isPlayerTurn?: boolean;
  badMoveSquare?: string | null;
}

export function ChessBoardArea({ 
  fen, 
  onMoveAttempt,
  onPieceSelect,
  orientation = 'white',
  customArrows = [],
  isPlayerTurn = true,
  badMoveSquare
}: ChessBoardAreaProps) {
  
  const [moveFrom, setMoveFrom] = useState<string | null>(null);

  const handleSquareClick = (square: string) => {
    if (!isPlayerTurn) return;

    const chess = new Chess(fen);
    const currentTurn = chess.turn();

    if (!moveFrom) {
      // No piece selected yet — try to select this square
      const piece = chess.get(square as any);
      if (piece && piece.color === currentTurn) {
        setMoveFrom(square);
        onPieceSelect?.(square);   // ← notify parent immediately
      }
      return;
    }

    // A piece is already selected
    if (moveFrom === square) {
      // Clicked same square — deselect
      setMoveFrom(null);
      onPieceSelect?.(null);
      return;
    }

    // Switching to another friendly piece
    const targetPiece = chess.get(square as any);
    if (targetPiece && targetPiece.color === currentTurn) {
      setMoveFrom(square);
      onPieceSelect?.(square);   // ← notify with new square
      return;
    }

    // Attempt the move — clear suggestions
    onPieceSelect?.(null);
    const color = currentTurn === 'w' ? 'w' : 'b';
    onMoveAttempt(moveFrom, square, color + 'q');
    setMoveFrom(null);
  };

  const handlePieceDrop = (sourceSquare: string, targetSquare: string, piece: string) => {
    if (!isPlayerTurn) return false;
    setMoveFrom(null);
    onPieceSelect?.(null);
    return onMoveAttempt(sourceSquare, targetSquare, piece);
  };

  const mappedArrows = useMemo(() => {
    return customArrows.map(arrow => [arrow[0], arrow[1], arrow[2]] as any);
  }, [customArrows]);

  const customSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};

    // Highlight the selected piece's square
    if (moveFrom) {
      styles[moveFrom] = { backgroundColor: 'rgba(255, 255, 0, 0.45)', borderRadius: '0' };

      // Compute legal destinations for the selected piece
      try {
        const chess = new Chess(fen);
        const legalMoves = chess.moves({ square: moveFrom as any, verbose: true });
        legalMoves.forEach((m: any) => {
          const isCapture = !!chess.get(m.to);
          styles[m.to] = isCapture
            ? {
                // Ring around the captured piece
                background:
                  'radial-gradient(circle, transparent 55%, rgba(34,197,94,0.55) 55%)',
                borderRadius: '0',
              }
            : {
                // Dot on empty squares
                background:
                  'radial-gradient(circle, rgba(34,197,94,0.55) 28%, transparent 28%)',
                borderRadius: '0',
              };
        });
      } catch { /* ignore */ }
    }

    // Highlight bad move square in red
    if (badMoveSquare) {
      styles[badMoveSquare] = { 
        backgroundColor: 'rgba(239, 68, 68, 0.65)', 
        boxShadow: 'inset 0 0 10px rgba(185, 28, 28, 0.8)',
        borderRadius: '0' 
      };
    }

    return styles;
  }, [moveFrom, fen, badMoveSquare]);

  const darkSquareStyle = useMemo(() => ({ backgroundColor: '#4a4a4a' }), []);
  const lightSquareStyle = useMemo(() => ({ backgroundColor: '#8a8a8a' }), []);

  const customNotationStyle = useMemo<React.CSSProperties>(() => ({
    fill: '#000000',
    color: '#000000',
    fontWeight: 'bold',
    fontSize: '14px',
  }), []);

  return (
    <div className="flex-grow flex items-center justify-center bg-zinc-900/50 p-4">
      <div className="w-full max-w-[85vh] 2xl:max-w-[88vh] aspect-square rounded-md overflow-hidden shadow-2xl ring-4 ring-zinc-800">
        <Chessboard 
          position={fen}
          onPieceDrop={handlePieceDrop}
          onSquareClick={handleSquareClick}
          onSquareRightClick={() => { setMoveFrom(null); onPieceSelect?.(null); }}
          boardOrientation={orientation}
          customArrows={mappedArrows}
          customSquareStyles={customSquareStyles}
          animationDuration={200}
          customDarkSquareStyle={darkSquareStyle}
          customLightSquareStyle={lightSquareStyle}
          customNotationStyle={customNotationStyle}
          showBoardNotation={true}
          arePiecesDraggable={isPlayerTurn}
        />
      </div>
    </div>
  );
}
