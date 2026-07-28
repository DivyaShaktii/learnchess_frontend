import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Chess } from 'chess.js';
import { AlertCircle, X, RefreshCcw } from 'lucide-react';
import { ChessBoardArea } from './components/ChessBoardArea';
import { CoachOverlay } from './components/CoachOverlay';
import { MoveLog } from './components/MoveLog';
import { api } from './services/api';
import type { MoveAlternative, ThreatPreview } from './services/api';
import { getMoveSquares } from './utils/chessTranslator';
import { chessSounds } from './utils/soundEffects';
import { speakMoveCategory, speakRatingAnnouncement } from './utils/coachVoice';

export interface ToastProps {
  message: string;
  onClose: () => void;
}

function Toast({ message, onClose }: ToastProps) {
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded border border-red-800 bg-red-950 px-4 py-3 text-red-200 shadow-lg animate-in fade-in slide-in-from-top-4">
      <AlertCircle size={18} className="shrink-0" />
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 rounded p-1 transition-colors hover:bg-red-900">
        <X size={14} />
      </button>
    </div>
  );
}

export type GameMode = 'you_vs_robot' | 'puzzle_mode';

type MoveHistoryEntry = {
  san: string;
  classification: string;
  fen_before?: string;
};

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const ratingTier = (r: number) =>
  r < 1500 ? 'Beginner' : r < 1900 ? 'Club Player' : r < 2300 ? 'Strong Club Player' :
  r < 2600 ? 'Expert' : r < 2900 ? 'Master' : 'Near-Maximum (very hard)';

function App() {
  const [gameMode, setGameMode] = useState<GameMode>('you_vs_robot');
  const [puzzleLevel, setPuzzleLevel] = useState(1);
  const [puzzleSessionId, setPuzzleSessionId] = useState<string | null>(null);
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
  const [learnerMode, setLearnerMode] = useState(true);
  const [coachVoiceEnabled, setCoachVoiceEnabled] = useState(true);
  const [gameId, setGameId] = useState<string | null>(null);
  const [opponentRating, setOpponentRating] = useState(1500);
  const [fen, setFen] = useState(START_FEN);
  const [history, setHistory] = useState<MoveHistoryEntry[]>([]);


  const [isThinking, setIsThinking] = useState(false);
  const [isRobotThinking, setIsRobotThinking] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [overlayVisible, setOverlayVisible] = useState(false);
  const [warningActive, setWarningActive] = useState(false);
  const [pendingMoveUci, setPendingMoveUci] = useState<string | null>(null);
  const [pendingFen, setPendingFen] = useState<string | null>(null);
  const [badMoveSquare, setBadMoveSquare] = useState<string | null>(null);
  const [hintSquare, setHintSquare] = useState<string | null>(null);
  const [classification, setClassification] = useState<string | undefined>();
  const [threat, setThreat] = useState<ThreatPreview | null>(null);
  const [alternatives, setAlternatives] = useState<MoveAlternative[]>([]);
  const [squareSuggestions, setSquareSuggestions] = useState<MoveAlternative[]>([]);
  const [followUpArrows, setFollowUpArrows] = useState<[string, string, string][]>([]);

  const previousFenRef = useRef(START_FEN);
  const lastSpokenMessageRef = useRef('');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedPreference = window.localStorage.getItem('coach-voice-enabled');
    if (savedPreference === 'false') {
      setCoachVoiceEnabled(false);
    } else {
      setCoachVoiceEnabled(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('coach-voice-enabled', String(coachVoiceEnabled));
  }, [coachVoiceEnabled]);

  useEffect(() => {
    if (!coachVoiceEnabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, [coachVoiceEnabled]);

  const isPlayerTurn = useMemo(() => {
    try {
      const chess = new Chess(fen);
      if (chess.isGameOver()) return false;

      const isWhiteTurn = chess.turn() === 'w';
      let turn = false;

      if (gameMode === 'you_vs_robot') {
        turn = playerColor === 'white' ? isWhiteTurn : !isWhiteTurn;
      } else if (gameMode === 'puzzle_mode') {
        turn = playerColor === 'white' ? isWhiteTurn : !isWhiteTurn;
      }

      return turn && !isRobotThinking;
    } catch {
      return false;
    }
  }, [fen, gameMode, playerColor, isRobotThinking]);

  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const tryStart = async (attemptsLeft: number) => {
      setIsConnecting(true);
      try {
        if (gameMode === 'puzzle_mode') {
          const res = await api.startPuzzle(puzzleLevel);
          if (!cancelled) {
            setPuzzleSessionId(res.session_id);
            setFen(res.fen);
            setPlayerColor(res.side_to_move as 'white' | 'black');
            setHistory([]);
            resetWarningState();
            previousFenRef.current = res.fen;
            setToastMessage(null);
            setGameId(null);
          }
        } else {
          const res = await api.startNewGame(undefined, opponentRating);
          if (!cancelled) {
            setGameId(res.game_id);
            setFen(res.fen);
            setHistory([]);
            resetWarningState();
            previousFenRef.current = res.fen;
            setToastMessage(null);
            setPuzzleSessionId(null);
            if (coachVoiceEnabled) {
              speakRatingAnnouncement(opponentRating, ratingTier(opponentRating));
            }
          }
        }
      } catch {
        if (!cancelled && attemptsLeft > 1) {
          // Backend might still be warming up — retry after 2 s
          setTimeout(() => { if (!cancelled) void tryStart(attemptsLeft - 1); }, 2000);
          return;
        }
        if (!cancelled) {
          setToastMessage('Coach is unreachable — check the backend is running');
        }
      } finally {
        if (!cancelled) setIsConnecting(false);
      }
    };
    void tryStart(3);
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // oxlint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!gameId || warningActive || isThinking || isRobotThinking) return;

    try {
      const chess = new Chess(fen);
      if (chess.isGameOver()) return;

      const isWhiteTurn = chess.turn() === 'w';
      const shouldRobotMove = gameMode === 'you_vs_robot' && (playerColor === 'white' ? !isWhiteTurn : isWhiteTurn);

      if (shouldRobotMove) {
        const timer = setTimeout(() => {
          void playRobotMove();
        }, 400);

        return () => clearTimeout(timer);
      }
    } catch {}
  }, [fen, gameMode, playerColor, gameId, warningActive, isThinking, isRobotThinking]);

  const handleError = (err: any) => {
    console.error(err);
    if (err?.status === 404) {
      // Game session lost on backend — restart silently, no recursive error handling
      setToastMessage('Session lost. Starting a new game...');
      void startNewGame();
    } else if (err?.name === 'ApiError' || err?.message?.includes('Failed to fetch') || err?.message?.includes('NetworkError')) {
      setToastMessage('Coach is unreachable — check the backend is running');
    }
  };

  const startNewGame = async (overrideMode?: GameMode) => {
    try {
      setIsThinking(false);
      setSquareSuggestions([]);
      lastSpokenMessageRef.current = '';
      resetWarningState();

      const activeMode = overrideMode || gameMode;

      if (activeMode === 'puzzle_mode') {
        const res = await api.startPuzzle(puzzleLevel);
        setPuzzleSessionId(res.session_id);
        setFen(res.fen);
        setPlayerColor(res.side_to_move as 'white' | 'black');
        setHistory([]);
        previousFenRef.current = res.fen;
        setToastMessage(null);
        setGameId(null);
      } else {
        const res = await api.startNewGame(undefined, opponentRating);
        setGameId(res.game_id);
        setFen(res.fen);
        setHistory([]);
        previousFenRef.current = res.fen;
        setToastMessage(null);
        setPuzzleSessionId(null);
        if (coachVoiceEnabled) {
          speakRatingAnnouncement(opponentRating, ratingTier(opponentRating));
        }
      }
    } catch (err) {
      handleError(err);
    }
  };

  const resetWarningState = () => {
    setOverlayVisible(false);
    setWarningActive(false);
    setPendingMoveUci(null);
    setPendingFen(null);
    setBadMoveSquare(null);
    setHintSquare(null);
    setFollowUpArrows([]);
    setClassification(undefined);
    setThreat(null);
    setAlternatives([]);
    lastSpokenMessageRef.current = '';
  };

  const handleUndoBadMove = async () => {
    if (!gameId || isRobotThinking) return;

    if (warningActive) {
      handleDismissWarning();
      return;
    }

    try {
      const plies = 2;
      const res = await api.undoMove(gameId, plies);
      setFen(res.fen);
      previousFenRef.current = res.fen;
      setHistory(res.move_history);
      resetWarningState();
      setCoachMessage('Move undone. Choose your next move!');
    } catch {
      if (previousFenRef.current) {
        setFen(previousFenRef.current);
      }
      resetWarningState();
    }
  };

  const refreshGameState = useCallback(async (id: string) => {
    try {
      const state = await api.getGameState(id);
      setFen(state.fen);
      setHistory(state.move_history);
      if (state.is_game_over) {
        setCoachMessage(`Game over! ${state.result || ''}`);
      }
    } catch (err) {
      // Don't call handleError here — a transient state-fetch failure
      // should not restart the game or show a disruptive toast.
      console.warn('refreshGameState failed (non-fatal):', err);
    }
  }, []);

  const handleMoveAttempt = (sourceSquare: string, targetSquare: string, piece: string) => {
    if (isThinking || isRobotThinking) return false;
    if (!gameId && !puzzleSessionId) return false;

    const chess = new Chess(fen);
    let move;

    try {
      move = chess.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: piece && piece.length >= 2 ? piece[1].toLowerCase() : 'q',
      });
    } catch {
      return false;
    }

    if (!move) return false;

    playMoveSoundForUci(fen, move.from + move.to + (move.promotion || ''));

    const moveUci = move.from + move.to + (move.promotion || '');
    const nextFen = chess.fen();

    if (gameMode === 'puzzle_mode' && puzzleSessionId) {
       void (async () => {
         try {
           setIsThinking(true);
           setOverlayVisible(false);
           setWarningActive(false);

           const res = await api.attemptPuzzle(puzzleSessionId, moveUci);
           if (!res.correct) {
              setToastMessage('Incorrect move. Try again!');
           } else {
              setFen(nextFen); 
              previousFenRef.current = nextFen;
              
              if (res.opponent_reply_uci) {
                 setTimeout(() => {
                    setFen(res.fen);
                    previousFenRef.current = res.fen;
                    playMoveSoundForUci(nextFen, res.opponent_reply_uci!);
                 }, 400);
              } else if (res.solved) {
                 setToastMessage('🎉 Puzzle Solved!');
                 setTimeout(() => {
                   void startNewGame();
                 }, 2000);
              }
           }
         } catch (err) {
           handleError(err);
         } finally {
           setIsThinking(false);
         }
       })();
       return true;
    }

    void (async () => {
      try {
        setOverlayVisible(false);
        setWarningActive(false);
        setIsThinking(true);
        setSquareSuggestions([]);
        setHintSquare(null);
        setFollowUpArrows([]);

        const preRes = await api.precheckMove(gameId!, moveUci);

        const label = preRes.label || 'Move';
        const labelMap: Record<string, string> = {
          Brilliant: 'Brilliant',
          Great: 'Great',
          'Best Move': 'Best',
          Best: 'Best',
          Excellent: 'Excellent',
          Good: 'Good',
          Book: 'Book',
          Inaccuracy: 'Inaccuracy',
          Mistake: 'Mistake',
          Blunder: 'Blunder',
          'Worst Move': 'Blunder',
        };
        const cleanLabel = labelMap[label] || label;
        setClassification(cleanLabel);
        setPendingMoveUci(moveUci);
        setPendingFen(nextFen);
        setThreat(preRes.threat_preview);
        setAlternatives(preRes.top_alternatives ?? []);

        const isBoxTier = Boolean(preRes.is_box_tier);

        if (isBoxTier) {
          if (coachVoiceEnabled) {
            speakMoveCategory(preRes.label);
          }
          setBadMoveSquare(move.to);
          setWarningActive(true);
          setOverlayVisible(true);
          setIsThinking(false);
          return;
        }

        setBadMoveSquare(null);
        setOverlayVisible(false);
        // Keep isThinking=true — commitAndFinalize's finally block clears it.
        // This prevents the robot from firing before the player's move is committed.
        await commitAndFinalize(moveUci);
      } catch (error) {
        console.error('Error in handleMoveAttempt:', error);
        setIsThinking(false);
        setOverlayVisible(false);
        setWarningActive(false);
        handleError(error);
      }
    })();

    return true;
  };

  const handleCommitWarning = async () => {
    if (pendingMoveUci && gameId) {
      setIsThinking(true);
      const moveUci = pendingMoveUci;
      const targetFen = pendingFen;
      const preMovefen = previousFenRef.current || fen;
      resetWarningState();
      try {
        // Play sound now with the original pre-move fen (before setFen updates state)
        playMoveSoundForUci(preMovefen, moveUci);
        if (targetFen) setFen(targetFen);
        await commitAndFinalize(moveUci);
      } catch (err) {
        handleError(err);
      } finally {
        setIsThinking(false);
      }
    }
  };

  const playMoveSoundForUci = (boardFen: string, moveUci: string) => {
    try {
      const chess = new Chess(boardFen);
      const moveObj = chess.move(moveUci);
      if (moveObj && (moveObj.captured || moveObj.flags.includes('c') || moveObj.flags.includes('e'))) {
        chessSounds.playCapture();
      } else {
        chessSounds.playMove();
      }
    } catch {
      chessSounds.playMove();
    }
  };

  const commitAndFinalize = async (moveUci: string) => {
    if (!gameId) return;

    try {
      const commitRes = await api.commitMove(gameId, moveUci);
      setFen(commitRes.fen);
      previousFenRef.current = commitRes.fen;
      await refreshGameState(gameId);

      const label = commitRes.classification || 'Move';
      const labelMap: Record<string, string> = {
        Brilliant: 'Brilliant',
        Great: 'Great',
        'Best Move': 'Best',
        Best: 'Best',
        Excellent: 'Excellent',
        Good: 'Good',
        Book: 'Book',
        Inaccuracy: 'Inaccuracy',
        Mistake: 'Mistake',
        Blunder: 'Blunder',
        'Worst Move': 'Blunder',
      };
      const cleanLabel = labelMap[label] || label;
      setClassification(cleanLabel);
      if (coachVoiceEnabled) {
        speakMoveCategory(cleanLabel);
      }

      setOverlayVisible(false);
      setPendingMoveUci(null);
      setPendingFen(null);
      setWarningActive(false);

      if (commitRes.is_game_over) {
        const chess = new Chess(commitRes.fen);
        let msg = '🏁 Game Over!';
        if (chess.isCheckmate()) {
          const winner = chess.turn() === 'w' ? 'Black' : 'White';
          msg = `🏆 Checkmate! ${winner} wins the game!`;
        } else if (chess.isDraw()) {
          msg = '🤝 Game Over! The game ended in a draw.';
        }
        setCoachMessage(msg);
        setOverlayVisible(true);
      }
    } catch (err) {
      handleError(err);
    } finally {
      setIsThinking(false);
    }
  };

  const executeCommit = useCallback(async (moveUci: string, preMovefen?: string) => {
    if (!gameId) return;

    try {
      playMoveSoundForUci(preMovefen ?? fen, moveUci);
      const commitRes = await api.commitMove(gameId, moveUci);
      setFen(commitRes.fen);
      previousFenRef.current = commitRes.fen;
      await refreshGameState(gameId);
      resetWarningState();

      if (commitRes.is_game_over) {
        const chess = new Chess(commitRes.fen);
        let msg = '🏁 Game Over!';
        if (chess.isCheckmate()) {
          const winner = chess.turn() === 'w' ? 'Black' : 'White';
          msg = `🏆 Checkmate! ${winner} wins the game!`;
        } else if (chess.isDraw()) {
          msg = '🤝 Game Over! The game ended in a draw.';
        }
        setCoachMessage(msg);
        setOverlayVisible(true);
      }
    } catch (err) {
      handleError(err);
    }
  }, [gameId, fen, refreshGameState]);

  const playRobotMove = useCallback(async () => {
    if (!gameId) return;

    setIsRobotThinking(true);
    try {
      const currentFen = fen;
      const res = await api.getRobotMove(gameId);
      if (res.moves && res.moves.length > 0) {
        const moveUci = res.moves[0].move;
        if (moveUci) {
          await new Promise((resolve) => setTimeout(resolve, 900));
          await executeCommit(moveUci, currentFen);
        }
      }
    } catch (err) {
      handleError(err);
    } finally {
      setIsRobotThinking(false);
    }
  }, [executeCommit, gameId, fen]);

  const handleDismissWarning = () => {
    setFen(previousFenRef.current);
    resetWarningState();
    setCoachMessage('Good call. Find a better move!');
  };



  const handleAskHint = () => {
    const bestMove = alternatives?.[0]?.move;
    if (bestMove) {
      setHintSquare(bestMove.slice(0, 2));
    }
  };

  const handleShowFollowUp = () => {
    const arrowColors = ['#22c55e', '#eab308', '#ef4444']; // green, amber, red — 1st/2nd/3rd choice
    const arrows = (alternatives ?? [])
      .slice(0, 3)
      .filter((alt) => alt.move)
      .map((alt, i) => [alt.move!.slice(0, 2), alt.move!.slice(2, 4), arrowColors[i]] as [string, string, string]);
    setFollowUpArrows(arrows);
  };

  const handlePieceSelect = async (square: string | null) => {
    if (!learnerMode || !square || !gameId || isThinking || isRobotThinking) {
      setSquareSuggestions([]);
      return;
    }

    try {
      const res = await api.getBestMoves(gameId, 3);
      setSquareSuggestions(res.moves);
    } catch {
      setSquareSuggestions([]);
    }
  };

  const handleIllegalMove = (reason: 'pinned' | 'not_your_turn' | 'blocked') => {
    if (reason === 'not_your_turn') {
      try {
        const chess = new Chess(fen);
        if (chess.isGameOver()) {
          if (chess.isCheckmate()) {
            const winner = chess.turn() === 'w' ? 'Black' : 'White';
            setToastMessage(`🏆 Game Over! Checkmate — ${winner} wins.`);
          } else if (chess.isDraw()) {
            setToastMessage('🤝 Game Over! The game ended in a draw.');
          } else {
            setToastMessage('🏁 Game Over!');
          }
          return;
        }
      } catch {}

      if (isRobotThinking) {
        setToastMessage('🤖 Wait — the robot is currently taking its turn.');
      } else if (isThinking) {
        setToastMessage('⏳ Analysing your move...');
      } else {
        setToastMessage("It's not your turn right now.");
      }
      return;
    }

    // Pinned/blocked: show a brief toast only — do NOT open the blunder overlay
    if (reason === 'pinned') {
      setToastMessage('🔒 That piece is pinned — moving it would expose your king!');
    } else {
      setToastMessage('That square is not a legal destination for this piece.');
    }
  };

  useEffect(() => {
    if (!warningActive) {
      previousFenRef.current = fen;
    }
  }, [fen, warningActive]);

  const boardArrows = useMemo<[string, string, string][]>(() => {
    // 1. Follow-up arrows requested by user via "Show Follow Up Moves" button (ALWAYS visible when pressed)
    if (followUpArrows.length > 0) return followUpArrows;

    // If Learner Mode is OFF, suppress all automatic arrows.
    // Arrows will only appear when the user explicitly clicks "Show Follow Up Moves".
    if (!learnerMode) return [];

    // 2. Warning threat/alternative arrows (shown automatically ONLY when Learner Mode is ON)
    if (warningActive) {
      const arrows: [string, string, string][] = [];
      if (threat?.opponent_best_reply_san) {
        const sq = getMoveSquares(fen, threat.opponent_best_reply_san);
        if (sq) arrows.push([sq.from, sq.to, 'rgba(239, 68, 68, 0.85)']);
      }

      alternatives.forEach((alt) => {
        const sq = getMoveSquares(fen, alt.san);
        if (sq) arrows.push([sq.from, sq.to, 'rgba(34, 197, 94, 0.85)']);
      });
      return arrows;
    }

    // 3. Piece selection hint arrows (shown ONLY when Learner Mode is ON)
    const arrows: [string, string, string][] = [];
    if (squareSuggestions.length > 0) {
      squareSuggestions.forEach((alt, idx) => {
        const sq = getMoveSquares(fen, alt.san);
        if (sq) {
          const alpha = [0.9, 0.65, 0.4][idx] ?? 0.3;
          arrows.push([sq.from, sq.to, `rgba(34, 197, 94, ${alpha})`]);
        }
      });
    }

    return arrows;
  }, [followUpArrows, warningActive, learnerMode, squareSuggestions, threat, alternatives, fen]);

  return (
    <div
      className="flex h-screen flex-col overflow-hidden text-zinc-100"
      style={{ background: '#1a1a1a', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}
    >
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}

      <div
        className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-5"
        style={{ height: '44px', background: '#111' }}
      >
        <div className="flex items-center gap-4">
          <div className="flex flex-col justify-center gap-0.5">
            <div className="flex items-center gap-2">
              <select
                value={gameMode}
                onChange={(e) => {
                  const newMode = e.target.value as GameMode;
                  setGameMode(newMode);
                  void startNewGame(newMode);
                }}
                className="cursor-pointer bg-transparent text-sm font-bold text-zinc-100 outline-none"
                style={{ appearance: 'auto' }}
              >
                <option value="you_vs_robot" className="bg-zinc-900">You Vs Robot</option>
                <option value="puzzle_mode" className="bg-zinc-900">Puzzle Mode</option>
              </select>
            </div>
            
            {gameMode === 'puzzle_mode' ? (
              <div className="flex items-center gap-1.5 pl-2 border-l border-emerald-500/40">
                <span className="text-[10px] text-zinc-400 font-medium whitespace-nowrap">
                  Level: <strong className="text-emerald-400">{puzzleLevel}</strong>
                </span>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={puzzleLevel}
                  onChange={(e) => setPuzzleLevel(Number(e.target.value))}
                  onMouseUp={() => void startNewGame()}
                  onTouchEnd={() => void startNewGame()}
                  className="w-24 cursor-pointer accent-emerald-500"
                />
              </div>
            ) : (
              <div className="flex items-center gap-1.5 pl-2 border-l border-emerald-500/40">
                <span className="text-[10px] text-zinc-400 font-medium whitespace-nowrap">
                  Rating: <strong className="text-emerald-400">{opponentRating}</strong> ({ratingTier(opponentRating)})
                </span>
                <input
                  type="range"
                  min={1320}
                  max={3190}
                  step={10}
                  value={opponentRating}
                  onChange={(e) => setOpponentRating(Number(e.target.value))}
                  onMouseUp={() => void startNewGame()}
                  onTouchEnd={() => void startNewGame()}
                  className="w-24 cursor-pointer accent-emerald-500"
                />
              </div>
            )}
          </div>

          {gameMode === 'you_vs_robot' && (
            <div className="flex items-center gap-3 text-sm border-l border-zinc-800 pl-4">
              <span className="text-zinc-500">Side:</span>
              {(['white', 'black'] as const).map((color) => (
                <label key={color} className="flex cursor-pointer items-center gap-1.5">
                  <input
                    type="radio"
                    name="side"
                    checked={playerColor === color}
                    onChange={() => {
                      setPlayerColor(color);
                      void startNewGame();
                    }}
                    className="accent-white"
                  />
                  <span className={`text-sm font-medium ${playerColor === color ? 'text-white' : 'text-zinc-500'}`}>
                    {color === 'white' ? 'White' : 'Black'}
                  </span>
                </label>
              ))}
            </div>
          )}

          <button
            onClick={() => void startNewGame()}
            className="flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-zinc-200"
          >
            <RefreshCcw size={13} />
            Restart Game
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (!('speechSynthesis' in window)) {
                setToastMessage('Coach voice is not supported in this browser.');
                return;
              }

              const nextEnabled = !coachVoiceEnabled;
              setCoachVoiceEnabled(nextEnabled);

              if (!nextEnabled) {
                window.speechSynthesis.cancel();
                lastSpokenMessageRef.current = '';
              }
            }}
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
              coachVoiceEnabled
                ? 'border-cyan-700/60 bg-cyan-900/50 text-cyan-300'
                : 'border-zinc-700 bg-zinc-800 text-zinc-400'
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${coachVoiceEnabled ? 'bg-cyan-400' : 'bg-zinc-600'}`} />
            Coach Voice: {coachVoiceEnabled ? 'ON' : 'OFF'}
          </button>

          <button
            onClick={() => {
              setLearnerMode(!learnerMode);
              if (learnerMode) setSquareSuggestions([]);
            }}
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
              learnerMode
                ? 'border-emerald-700/60 bg-emerald-900/50 text-emerald-300'
                : 'border-zinc-700 bg-zinc-800 text-zinc-500'
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${learnerMode ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
            Learner Mode: {learnerMode ? 'ON' : 'OFF'}
          </button>

          {gameMode === 'you_vs_robot' && (
            <button
              onClick={() => void handleUndoBadMove()}
              className="flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition-all hover:bg-zinc-700"
            >
              <RefreshCcw size={12} />
              Undo Move
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-hidden w-full h-full" style={{ background: '#1a1a1a' }}>
        <div className="flex h-full w-full items-center justify-center gap-4 p-2" style={{ maxHeight: 'calc(100vh - 44px)' }}>
          <div
            className="relative flex-shrink-0 flex items-center justify-center"
            style={{
              width: 'min(calc(100vh - 44px - 16px), calc(100vw - 420px - 16px))',
              height: 'min(calc(100vh - 44px - 16px), calc(100vw - 420px - 16px))',
            }}
          >
            {/* Backend connection overlay — shown when game hasn't started yet */}
            {(!gameId && !puzzleSessionId) && (
              <div
                className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 rounded"
                style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(4px)' }}
              >
                {isConnecting ? (
                  <>
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-600 border-t-cyan-400" />
                    <p className="text-sm font-semibold text-zinc-300">Connecting to coach backend...</p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl">⚠️</p>
                    <p className="text-sm font-semibold text-red-300">Backend unreachable</p>
                    <p className="text-xs text-zinc-500">Make sure the backend is running on port 8000</p>
                    <button
                      onClick={() => void startNewGame()}
                      className="mt-2 rounded-full bg-cyan-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-cyan-500"
                    >
                      🔄 Retry Connection
                    </button>
                  </>
                )}
              </div>
            )}

            {(isRobotThinking || isThinking) && (
              <div
                className="absolute top-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2.5 rounded-full px-4 py-1.5 text-sm font-semibold shadow-lg"
                style={{
                  background: isRobotThinking ? 'rgba(8,145,178,0.92)' : 'rgba(100,100,100,0.85)',
                  border: isRobotThinking ? '1px solid rgba(34,211,238,0.6)' : '1px solid rgba(180,180,180,0.3)',
                  color: '#fff',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: isRobotThinking ? '#22d3ee' : '#9ca3af', animation: 'ping 1s cubic-bezier(0,0,0.2,1) infinite' }}
                />
                {isRobotThinking ? '🤖 Robot is thinking...' : '⏳ Analysing...'}
              </div>
            )}

            <ChessBoardArea
              fen={fen}
              onMoveAttempt={handleMoveAttempt}
              onIllegalMove={handleIllegalMove}
              onPieceSelect={handlePieceSelect}
              orientation={playerColor}
              customArrows={boardArrows}
              isPlayerTurn={isPlayerTurn}
              badMoveSquare={badMoveSquare}
              hintSquare={hintSquare}
              overlay={
                <CoachOverlay
                  visible={overlayVisible}
                  isThinking={isThinking}
                  classification={classification}
                  threat={threat}
                  alternatives={alternatives}
                  fen={fen}
                  moveCount={history.filter((_, i) => (playerColor === 'white' ? i % 2 === 0 : i % 2 === 1)).length + 1}
                  onCommitWarning={handleCommitWarning}
                  onDismissWarning={handleDismissWarning}
                  onCloseOverlay={() => setOverlayVisible(false)}
                  onAskHint={handleAskHint}
                  onShowFollowUp={handleShowFollowUp}
                />
              }
            />
          </div>

          <div
            className="flex flex-shrink-0 flex-col overflow-hidden rounded-lg border border-zinc-800/60 shadow-2xl relative"
            style={{ width: '400px', height: 'min(calc(100vh - 44px - 16px), calc(100vw - 420px - 16px))', background: '#0f0f12' }}
          >
            {gameMode === 'puzzle_mode' ? (
              <div className="flex flex-col h-full w-full p-6 text-center justify-center">
                <h2 className="text-2xl font-bold text-emerald-400 mb-2">Puzzle Mode</h2>
                <p className="text-zinc-400 mb-8">Find the best sequence of moves!</p>
                {puzzleSessionId && (
                  <button
                    onClick={async () => {
                      try {
                        const res = await api.getPuzzleHint(puzzleSessionId);
                        if (res.hint_square) {
                          setHintSquare(res.hint_square);
                        }
                      } catch (e) {
                        console.error(e);
                      }
                    }}
                    className="mx-auto flex items-center justify-center gap-2 rounded-full border border-emerald-700 bg-emerald-900/50 px-6 py-3 text-sm font-semibold text-emerald-300 transition-all hover:bg-emerald-800/80"
                  >
                    💡 Get Hint
                  </button>
                )}
              </div>
            ) : (
              <MoveLog history={history} playerColor={playerColor} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
