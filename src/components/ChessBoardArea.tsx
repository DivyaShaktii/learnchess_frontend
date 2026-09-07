'use client';

import { useState, useMemo, useCallback } from 'react';
import type { CSSProperties } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';

interface ChessBoardAreaProps {
  fen: string;
  onMoveAttempt: (sourceSquare: string, targetSquare: string, piece: string) => boolean;
  onIllegalMove?: (reason: 'pinned' | 'not_your_turn' | 'blocked') => void;
  onPieceSelect?: (square: string | null) => void;
  orientation?: 'white' | 'black';
  customArrows?: [string, string, string][];
  isPlayerTurn?: boolean;
  badMoveSquare?: string | null;
  hintSquare?: string | null;
  puzzleHintSquare?: string | null;
  opponentThreatSquare?: string | null;
  onInteractionAttempt?: () => boolean;
  overlay?: React.ReactNode;
  customLightSquareStyle?: CSSProperties;
  customDarkSquareStyle?: CSSProperties;
}

export function ChessBoardArea({
  fen,
  onMoveAttempt,
  onIllegalMove,
  onPieceSelect,
  orientation = 'white',
  customArrows = [],
  isPlayerTurn = true,
  badMoveSquare,
  hintSquare,
  puzzleHintSquare,
  opponentThreatSquare,
  onInteractionAttempt,
  overlay,
  customLightSquareStyle,
  customDarkSquareStyle,
}: ChessBoardAreaProps) {
  const [moveFrom, setMoveFrom] = useState<string | null>(null);
  // Square that briefly flashes red when an illegal move is attempted
  const [illegalFlashSquare, setIllegalFlashSquare] = useState<string | null>(null);

  /** Flash a square red for 500ms to signal an illegal move. */
  const flashIllegal = useCallback((square: string) => {
    setIllegalFlashSquare(square);
    setTimeout(() => setIllegalFlashSquare(null), 500);
  }, []);

  const handleSquareClick = (square: string) => {
    if (!isPlayerTurn) {
      // Robot is thinking — flash the clicked square to signal "wait"
      flashIllegal(square);
      onIllegalMove?.('not_your_turn');
      return;
    }

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
      // Clicked own piece — re-select it
      setMoveFrom(square);
      onPieceSelect?.(square);
      return;
    }

    // Check if this square is actually a legal destination for the selected piece.
    // If not, flash it red and show a hint — the piece is probably pinned.
    const legalDests = chess
      .moves({ square: moveFrom as any, verbose: true })
      .map((m: any) => m.to);

    if (!legalDests.includes(square)) {
      flashIllegal(square);
      // Determine reason: if the square has an opponent piece it looks like a
      // capture attempt, so the piece is pinned. Otherwise it's just blocked.
      const reason = targetPiece ? 'pinned' : 'blocked';
      onIllegalMove?.(reason);
      // Keep moveFrom selected so the player can choose a different target
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

    if (opponentThreatSquare) {
      styles[opponentThreatSquare] = {
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        boxShadow: 'inset 0 0 12px rgba(29, 78, 216, 0.8)',
      };
    }

    if (hintSquare) {
      styles[hintSquare] = {
        backgroundColor: 'rgba(249, 115, 22, 0.55)',
        boxShadow: 'inset 0 0 0 3px rgba(234, 88, 12, 0.95)',
        borderRadius: '4px',
      };
    }

    if (puzzleHintSquare) {
      styles[puzzleHintSquare] = {
        animation: 'pulse-glow 2s infinite ease-in-out',
        borderRadius: '4px',
      };
    }

    // Illegal-move flash: briefly highlight the target square in orange-red
    if (illegalFlashSquare) {
      styles[illegalFlashSquare] = {
        backgroundColor: 'rgba(251, 146, 60, 0.75)',
        boxShadow: 'inset 0 0 0 3px rgba(234, 88, 12, 1)',
        borderRadius: '4px',
        transition: 'background-color 0.15s ease',
      };
    }

    return styles;
  }, [moveFrom, fen, badMoveSquare, hintSquare, puzzleHintSquare, opponentThreatSquare, illegalFlashSquare]);


  // Use custom styles if provided, otherwise default to dark/light gray
  const darkSquareStyle = useMemo(() => customDarkSquareStyle || { backgroundColor: '#4a4a4a' }, [customDarkSquareStyle]);
  const lightSquareStyle = useMemo(() => customLightSquareStyle || { backgroundColor: '#8a8a8a' }, [customLightSquareStyle]);

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
        onPieceDragBegin={() => {
          if (onInteractionAttempt && !onInteractionAttempt()) return false;
        }}
        onSquareRightClick={() => { setMoveFrom(null); onPieceSelect?.(null); }}
        boardOrientation={orientation}
        customArrows={mappedArrows}
        customSquareStyles={customSquareStyles}
        animationDuration={150}
        customDarkSquareStyle={darkSquareStyle as Record<string, string>}
        customLightSquareStyle={lightSquareStyle as Record<string, string>}
        customNotationStyle={customNotationStyle}
        showBoardNotation={true}
        arePiecesDraggable={isPlayerTurn}
        areArrowsAllowed={false}
      />
      {overlay}
    </div>
  );
}
