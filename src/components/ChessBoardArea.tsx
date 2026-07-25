import { useState, useMemo } from 'react';
import type { CSSProperties } from 'react';
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
  overlay?: React.ReactNode;
}

export function ChessBoardArea({
  fen,
  onMoveAttempt,
  onPieceSelect,
  orientation = 'white',
  customArrows = [],
  isPlayerTurn = true,
  badMoveSquare,
  overlay,
}: ChessBoardAreaProps) {
  const [moveFrom, setMoveFrom] = useState<string | null>(null);

  const handleSquareClick = (square: string) => {
    if (!isPlayerTurn) return;

    const chess = new Chess(fen);
    const currentTurn = chess.turn();

    if (!moveFrom) {
      const piece = chess.get(square as any);
      if (piece && piece.color === currentTurn) {
        setMoveFrom(square);
        onPieceSelect?.(square);
      }
      return;
    }

    if (moveFrom === square) {
      setMoveFrom(null);
      onPieceSelect?.(null);
      return;
    }

    const targetPiece = chess.get(square as any);
    if (targetPiece && targetPiece.color === currentTurn) {
      setMoveFrom(square);
      onPieceSelect?.(square);
      return;
    }

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
    const styles: Record<string, CSSProperties> = {};

    if (moveFrom) {
      styles[moveFrom] = {
        backgroundColor: 'rgba(234, 179, 8, 0.45)',
        boxShadow: 'inset 0 0 0 2px rgba(234, 179, 8, 0.9)',
      };
      try {
        const chess = new Chess(fen);
        const legalMoves = chess.moves({ square: moveFrom as any, verbose: true });
        legalMoves.forEach((m: any) => {
          const isCapture = m.captured || m.flags.includes('c') || m.flags.includes('e') || !!chess.get(m.to);
          styles[m.to] = isCapture
            ? {
                background: 'radial-gradient(circle, rgba(239, 68, 68, 0.45) 0%, rgba(220, 38, 38, 0.75) 100%)',
                boxShadow: 'inset 0 0 0 3px rgba(239, 68, 68, 0.95)',
                borderRadius: '6px',
              }
            : {
                background: 'radial-gradient(circle, rgba(34, 197, 94, 0.75) 28%, transparent 28%)',
              };
        });
      } catch { /* ignore */ }
    }

    if (badMoveSquare) {
      styles[badMoveSquare] = {
        backgroundColor: 'rgba(239, 68, 68, 0.5)',
        boxShadow: 'inset 0 0 12px rgba(185, 28, 28, 0.8)',
      };
    }

    return styles;
  }, [moveFrom, fen, badMoveSquare]);

  // Original dark/light gray squares
  const darkSquareStyle = useMemo(() => ({ backgroundColor: '#4a4a4a' }), []);
  const lightSquareStyle = useMemo(() => ({ backgroundColor: '#8a8a8a' }), []);


  const customNotationStyle = useMemo<Record<string, string | number>>(() => ({
    color: 'rgba(0,0,0,0.45)',
    fontWeight: 700,
    fontSize: 11,
  }), []);

  return (
    // Fill entire parent — no centering, no padding waste
    <div className="relative w-full h-full">
      <Chessboard
        position={fen}
        onPieceDrop={handlePieceDrop}
        onSquareClick={handleSquareClick}
        onSquareRightClick={() => { setMoveFrom(null); onPieceSelect?.(null); }}
        boardOrientation={orientation}
        customArrows={mappedArrows}
        customSquareStyles={customSquareStyles}
        animationDuration={150}
        customDarkSquareStyle={darkSquareStyle}
        customLightSquareStyle={lightSquareStyle}
        customNotationStyle={customNotationStyle}
        showBoardNotation={true}
        arePiecesDraggable={isPlayerTurn}
      />
      {overlay}
    </div>
  );
}
