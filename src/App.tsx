import { useState, useEffect, useMemo, useRef } from 'react';
import { ChessBoardArea } from './components/ChessBoardArea';
import { CoachPanel } from './components/CoachPanel';
import type { Persona } from './components/SpeechBubble';
import { getMoveSquares } from './utils/chessTranslator';
import { api } from './services/api';
import type { MoveAlternative, ThreatPreview } from './services/api';
import { Chess } from 'chess.js';
import { Settings, AlertCircle, X, RefreshCcw } from 'lucide-react';

export interface ToastProps {
  message: string;
  onClose: () => void;
}

function Toast({ message, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-red-950 border border-red-800 text-red-200 px-4 py-3 rounded shadow-lg animate-in fade-in slide-in-from-top-4">
      <AlertCircle size={18} className="shrink-0" />
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 hover:bg-red-900 rounded p-1 transition-colors">
        <X size={14} />
      </button>
    </div>
  );
}

export type GameMode = 'you_vs_robot' | 'robot_vs_robot' | 'you_vs_friend';

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function App() {
  const [gameMode, setGameMode] = useState<GameMode>('you_vs_robot');
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
  const [learnerMode, setLearnerMode] = useState<boolean>(true);
  const [gameId, setGameId] = useState<string | null>(null);
  const [fen, setFen] = useState<string>(START_FEN);
  const [history, setHistory] = useState<Array<{ san: string; classification: string }>>([]);
  
  const [persona, setPersona] = useState<Persona>('robot');
  const [isThinking, setIsThinking] = useState(false);
  const [isRobotThinking, setIsRobotThinking] = useState(false);
  const [coachMessage, setCoachMessage] = useState('');
  
  // Toast error
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Warning & highlight state
  const [warningActive, setWarningActive] = useState(false);
  const [pendingMoveUci, setPendingMoveUci] = useState<string | null>(null);
  const [pendingFen, setPendingFen] = useState<string | null>(null);
  const [badMoveSquare, setBadMoveSquare] = useState<string | null>(null);
  const [classification, setClassification] = useState<string | undefined>();
  const [threat, setThreat] = useState<ThreatPreview | null>(null);
  const [alternatives, setAlternatives] = useState<MoveAlternative[]>([]);

  // Suggestions shown when player clicks a piece (fetched from engine)
  const [squareSuggestions, setSquareSuggestions] = useState<MoveAlternative[]>([]);

  // Stores the FEN before a player's attempted move so we can roll back if they dismiss a warning
  const previousFenRef = useRef<string>(START_FEN);

  // Reactive isPlayerTurn so effects can safely depend on it
  const isPlayerTurn = useMemo(() => {
    try {
      const chess = new Chess(fen);
      if (chess.isGameOver()) return false;
      const isWhiteTurn = chess.turn() === 'w';
      let turn = false;
      if (gameMode === 'you_vs_robot') {
        turn = playerColor === 'white' ? isWhiteTurn : !isWhiteTurn;
      } else if (gameMode === 'you_vs_friend') {
        turn = true;
      } else if (gameMode === 'robot_vs_robot') {
        turn = false;
      }
      return turn && !isRobotThinking;
    } catch {
      return false;
    }
  }, [fen, gameMode, playerColor, isRobotThinking]);

  useEffect(() => {
    startNewGame();
  }, []);



  useEffect(() => {
    if (!gameId || warningActive) return; // Pause robot move while 4-button options panel is active
    
    try {
      const chess = new Chess(fen);
      if (chess.isGameOver()) return; // Stop if game is over

      const isWhiteTurn = chess.turn() === 'w';
      
      const shouldRobotMove = 
        (gameMode === 'robot_vs_robot') || 
        (gameMode === 'you_vs_robot' && (playerColor === 'white' ? !isWhiteTurn : isWhiteTurn));

      if (shouldRobotMove) {
        // Add a slight delay for better UX and realism
        const timer = setTimeout(() => {
          playRobotMove();
        }, gameMode === 'robot_vs_robot' ? 1500 : 800);
        
        return () => clearTimeout(timer);
      }
    } catch(e) {}
  }, [fen, gameMode, playerColor, gameId, warningActive]);

  const handleError = (err: any) => {
    console.error(err);
    if (err.status === 404) {
      setToastMessage('Game session lost. Starting a new game.');
      startNewGame();
    } else if (err.status !== 400) {
      setToastMessage('Coach is unreachable — check the backend is running');
    }
  };

  const startNewGame = async () => {
    try {
      setIsThinking(false);
      setIsRobotThinking(false);
      setCoachMessage('Starting a new game. Good luck!');
      setSquareSuggestions([]);
      const res = await api.startNewGame();
      setGameId(res.game_id);
      setFen(res.fen);
      setHistory([]);
      resetWarningState();
    } catch (err) {
      handleError(err);
    }
  };

  const resetWarningState = () => {
    setWarningActive(false);
    setPendingMoveUci(null);
    setPendingFen(null);
    setBadMoveSquare(null);
    setClassification(undefined);
    setThreat(null);
    setAlternatives([]);
  };

  /** Undo / Rollback player's move in both Frontend and Backend */
  const handleUndoBadMove = async () => {
    if (!gameId) return;
    try {
      const res = await api.undoMove(gameId);
      setFen(res.fen);
      setHistory(res.move_history);
      resetWarningState();
      setCoachMessage('Move undone. Choose your next move!');
    } catch (err) {
      // Fallback
      setFen(previousFenRef.current);
      resetWarningState();
    }
  };

  const refreshGameState = async (id: string) => {
    try {
      const state = await api.getGameState(id);
      setFen(state.fen);
      setHistory(state.move_history);
      if (state.is_game_over) {
        setCoachMessage(`Game over! ${state.result || ''}`);
      }
    } catch (err) {
      handleError(err);
    }
  };

  /**
   * Called when the player clicks a destination square.
   * Moves the piece immediately (optimistic), then runs a PRECHECK before committing.
   * If bad: shows warning panel so player can confirm or revert.
   * If good: auto-commits and shows a positive message.
   */
  /**
   * Called when the player moves a piece.
   * Runs PRECHECK first. Pawn does NOT move yet.
   * Coach gives feedback. Pawn only moves when player clicks 'Play Anyway'.
   */
  const handleMoveAttempt = async (sourceSquare: string, targetSquare: string, piece: string) => {
    if (isThinking || isRobotThinking || !gameId) return false;

    const chess = new Chess(fen);
    try {
      const move = chess.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: piece && piece.length >= 2 ? piece[1].toLowerCase() : 'q',
      });
      if (!move) return false;

      const moveUci = move.from + move.to + (move.promotion || '');
      const nextFen = chess.fen();

      setIsThinking(true);
      setSquareSuggestions([]);
      setCoachMessage('Analysing...');

      const preRes = await api.precheckMove(gameId, moveUci);
      const label = preRes.label || 'Move';
      const labelMap: Record<string, string> = {
        'Brilliant': 'Brilliant',
        'Great': 'Great',
        'Best Move': 'Best',
        'Best': 'Best',
        'Excellent': 'Excellent',
        'Good': 'Good',
        'Book': 'Book',
        'Inaccuracy': 'Inaccuracy',
        'Mistake': 'Mistake',
        'Blunder': 'Blunder',
        'Worst Move': 'Blunder',
      };
      
      const cleanLabel = labelMap[label] || label;
      setCoachMessage(`User - ${cleanLabel}`);
      setClassification(cleanLabel);
      setPendingMoveUci(moveUci);
      setPendingFen(nextFen); // Save target FEN for when Play Anyway is clicked
      setThreat(preRes.threat_preview);
      setAlternatives(preRes.top_alternatives ?? []);

      const isBadMove = ['Blunder', 'Mistake', 'Inaccuracy', 'Worst Move'].includes(cleanLabel);
      if (isBadMove) {
        setBadMoveSquare(move.to);
        setPendingMoveUci(moveUci);
        setPendingFen(nextFen);
        setWarningActive(true);
        setIsThinking(false);
      } else {
        // Good/Best/Book moves commit immediately for seamless gameplay!
        setBadMoveSquare(null);
        setFen(nextFen);
        await commitAndFinalize(moveUci);
      }
      return true;
    } catch (e) {
      setIsThinking(false);
      return false;
    }
  };

  /** Finalizes pending move when Play Anyway is clicked -- pawn moves now! */
  const handleCommitWarning = async () => {
    if (pendingMoveUci && gameId) {
      setIsThinking(true);
      try {
        if (pendingFen) {
          setFen(pendingFen); // Move pawn to target square now!
        }
        await commitAndFinalize(pendingMoveUci);
      } catch (err) {
        handleError(err);
      } finally {
        setIsThinking(false);
      }
    }
    resetWarningState();
  };

  /** Commits a move to the backend and refreshes game state. */
  const commitAndFinalize = async (moveUci: string) => {
    if (!gameId) return;
    try {
      const commitRes = await api.commitMove(gameId, moveUci);
      setFen(commitRes.fen);
      await refreshGameState(gameId);

      const label = commitRes.classification || 'Move';
      const labelMap: Record<string, string> = {
        'Brilliant': 'Brilliant',
        'Great': 'Great',
        'Best Move': 'Best',
        'Best': 'Best',
        'Excellent': 'Excellent',
        'Good': 'Good',
        'Book': 'Book',
        'Inaccuracy': 'Inaccuracy',
        'Mistake': 'Mistake',
        'Blunder': 'Blunder',
        'Worst Move': 'Blunder',
      };
      
      const cleanLabel = labelMap[label] || label;
      const userMessage = `User - ${cleanLabel}`;
      setCoachMessage(userMessage);
      setClassification(cleanLabel);

      const isBadMove = ['Blunder', 'Mistake', 'Inaccuracy', 'Worst Move'].includes(cleanLabel);
      if (isBadMove) {
        const targetSquare = moveUci.substring(2, 4);
        setBadMoveSquare(targetSquare);
        setWarningActive(true);
        setPendingMoveUci(moveUci);
        try {
          const preRes = await api.precheckMove(gameId, moveUci);
          setThreat(preRes.threat_preview);
          setAlternatives(preRes.top_alternatives ?? []);
        } catch { /* ignore */ }
      } else {
        resetWarningState(); // Move Controls return to Ready and opponent engine responds!
      }

      if (commitRes.is_game_over) {
        setCoachMessage(`Game over! ${commitRes.result || ''}`);
      }
    } catch (err) {
      handleError(err);
    } finally {
      setIsThinking(false);
    }
  };

  const executeCommit = async (moveUci: string) => {
    if (!gameId) return;
    try {
      const commitRes = await api.commitMove(gameId, moveUci);
      setFen(commitRes.fen);
      await refreshGameState(gameId);
      resetWarningState();
    } catch (err) {
      handleError(err);
    }
  };

  const playRobotMove = async () => {
    if (!gameId) return;
    setIsRobotThinking(true);
    try {
      const res = await api.getBestMoves(gameId, 1);
      if (res.moves && res.moves.length > 0) {
        const botMove = res.moves[0];
        const moveUci = botMove.move;
        if (moveUci) {
          await executeCommit(moveUci);
        }
      }
    } catch (err) {
      handleError(err);
    } finally {
      setIsRobotThinking(false);
    }
  };



  const handleDismissWarning = () => {
    // Revert the board — snap the piece back to where it came from
    setFen(previousFenRef.current);
    resetWarningState();
    setCoachMessage('Good call. Let\'s find a better move.');
    // Re-show suggestions so the player can pick a better one
    // (squareSuggestions are still in state from before the bad move attempt)
  };

  const handlePlayAlternative = async (moveUci: string) => {
    if (!gameId) return;
    setIsThinking(true);
    // Snap to the new square first so it feels responsive
    try {
      const chess = new Chess(previousFenRef.current);
      const m = chess.move(moveUci);
      if (m) setFen(chess.fen());
    } catch { /* ignore — executeCommit will set correct FEN */ }
    await executeCommit(moveUci);
    setCoachMessage('Playing the suggested move!');
    setIsThinking(false);
  };

  const handleAskHint = async () => {
    if (!gameId) return;
    setIsThinking(true);
    try {
      const res = await api.getBestMoves(gameId, 3);
      setCoachMessage("Here are some strong ideas.");
      setWarningActive(true); // Re-using the warning panel to display alternatives
      setClassification('best move');
      setThreat(null);
      // Map to compatible format for MoveAlternative
      setAlternatives(res.moves.map((m: any) => ({
         move: m.move,   // UCI — used when committing the move
         san: m.san,     // SAN — used for display & board arrows
         score_cp: m.score_cp,
         is_mate: m.is_mate,
         mate_in: m.mate_in,
         pv: m.pv ?? [],
      } as MoveAlternative)));
      
      // Let's adjust handlePlayAlternative to handle SAN if move is actually SAN.
      setPendingMoveUci(null); // No pending move to "commit anyway"
    } catch (err) {
      handleError(err);
    } finally {
      setIsThinking(false);
    }
  };

  /** Called when the player clicks a piece to select it. Fetches top engine suggestions if Learner Mode is ON. */
  const handlePieceSelect = async (square: string | null) => {
    if (!learnerMode || !square || !gameId || isThinking || isRobotThinking) {
      setSquareSuggestions([]);
      return;
    }
    // Debounce — fetch after a tiny delay so rapid clicks don't spam the API
    try {
      const res = await api.getBestMoves(gameId, 3);
      setSquareSuggestions(res.moves);
      setCoachMessage('⚡ Learner Mode: Top engine moves — press one to play, or choose your own:');
    } catch {
      // Silently ignore — suggestions are optional
      setSquareSuggestions([]);
    }
  };

  /** Play a suggestion move — runs the same precheck-before-commit flow as a manual move. */
  const handlePlaySuggestion = (moveUci: string) => {
    if (!gameId || isThinking || isRobotThinking) return;
    const from = moveUci.substring(0, 2);
    const to   = moveUci.substring(2, 4);
    // Use handleMoveAttempt which handles precheck, warnings, rollback, etc.
    handleMoveAttempt(from, to, 'wq');
  };

  // Board arrows: warning mode (threat + alternatives) OR piece-selection suggestions (if Learner Mode is ON)
  const boardArrows = useMemo<[string, string, string][]>(() => {
    if (!learnerMode) return [];
    const arrows: [string, string, string][] = [];
    if (warningActive) {
      if (threat && threat.opponent_best_reply_san) {
        const sq = getMoveSquares(fen, threat.opponent_best_reply_san);
        if (sq) arrows.push([sq.from, sq.to, 'rgba(239, 68, 68, 0.85)']);
      }
      alternatives.forEach(alt => {
        const sq = getMoveSquares(fen, alt.san);
        if (sq) arrows.push([sq.from, sq.to, 'rgba(34, 197, 94, 0.85)']);
      });
    } else if (learnerMode && squareSuggestions.length > 0) {
      squareSuggestions.forEach((alt, idx) => {
        const sq = getMoveSquares(fen, alt.san);
        if (sq) {
          const alpha = ([0.90, 0.65, 0.40][idx]) ?? 0.3;
          arrows.push([sq.from, sq.to, `rgba(34, 197, 94, ${alpha})`]);
        }
      });
    }
    return arrows;
  }, [warningActive, learnerMode, squareSuggestions, threat, alternatives, fen]);

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      
      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}

      {/* Settings / Mobile Header */}
      <div className="lg:hidden p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900">
        <h1 className="font-bold text-lg">Mistake Coach</h1>
        <div className="flex gap-2 items-center">
          <span className="text-sm font-semibold text-zinc-300 px-2 py-1 bg-zinc-800 rounded border border-zinc-700">
            You Vs Robot
          </span>

          {gameMode === 'you_vs_robot' && (
            <button
              onClick={() => {
                const nextColor = playerColor === 'white' ? 'black' : 'white';
                setPlayerColor(nextColor);
                startNewGame();
              }}
              className="text-xs font-semibold px-2 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded border border-zinc-700 transition-colors"
            >
              {playerColor === 'white' ? '⚪ White' : '⚫ Black'}
            </button>
          )}

          <button
            onClick={() => {
              setLearnerMode(!learnerMode);
              if (learnerMode) setSquareSuggestions([]);
            }}
            className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-1.5 rounded border transition-colors ${
              learnerMode 
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80' 
                : 'bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}
          >
            Learner: {learnerMode ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Main Board Container */}
      <div className="flex-grow flex flex-col relative overflow-hidden">
        {/* Desktop & Mobile Header Bar */}
        <div className="p-3 px-6 border-b border-zinc-800 flex flex-wrap justify-between items-center bg-zinc-950/90 backdrop-blur z-20 gap-3">
          <div className="flex gap-3 items-center">
            <Settings size={16} className="text-zinc-400 shrink-0" />
            <span className="text-sm font-bold text-zinc-100 pr-3 border-r border-zinc-700">
              You Vs Robot
            </span>
            
            {gameMode === 'you_vs_robot' && (
              <button
                onClick={() => {
                  const nextColor = playerColor === 'white' ? 'black' : 'white';
                  setPlayerColor(nextColor);
                  startNewGame();
                }}
                className="text-xs font-semibold px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded border border-zinc-700 transition-colors"
              >
                Side: {playerColor === 'white' ? '⚪ White' : '⚫ Black'}
              </button>
            )}

            <button onClick={startNewGame} className="text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors">
              Restart Game
            </button>
          </div>

          <div className="flex gap-2 items-center">
            <button
              onClick={() => {
                setLearnerMode(!learnerMode);
                if (learnerMode) setSquareSuggestions([]);
              }}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded border transition-colors ${
                learnerMode 
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80 hover:bg-emerald-900/60' 
                  : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700 hover:text-zinc-200'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${learnerMode ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
              Learner Mode: {learnerMode ? 'ON' : 'OFF'}
            </button>

            <button
              onClick={handleUndoBadMove}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-blue-400 rounded border border-zinc-700 transition-colors"
            >
              <RefreshCcw size={14} />
              Undo Move
            </button>
          </div>
        </div>
        
        <ChessBoardArea 
          fen={fen} 
          onMoveAttempt={handleMoveAttempt}
          onPieceSelect={handlePieceSelect}
          orientation={playerColor}
          customArrows={boardArrows}
          isPlayerTurn={isPlayerTurn}
          badMoveSquare={badMoveSquare}
        />
      </div>

      {/* Side Panel */}
      <div className="w-full lg:w-[350px] xl:w-[380px] shrink-0 h-[40vh] lg:h-full border-t lg:border-t-0 border-zinc-800 z-10">
        <CoachPanel 
          persona={persona}
          isThinking={isThinking || isRobotThinking}
          warningActive={warningActive}
          coachMessage={coachMessage}
          classification={classification}
          threat={threat}
          alternatives={alternatives}
          history={history}
          fen={fen}
          onCommitWarning={handleCommitWarning}
          onDismissWarning={handleUndoBadMove}
          onPlayAlternative={(moveIdentifier) => {
             try {
                const chess = new Chess(fen);
                const m = chess.move(moveIdentifier);
                if (m) {
                   handlePlayAlternative(m.from + m.to + (m.promotion || ''));
                   return;
                }
             } catch(e) {}
             handlePlayAlternative(moveIdentifier);
          }}
          onPlaySuggestion={handlePlaySuggestion}
          onAskHint={handleAskHint}
        />
      </div>
    </div>
  );
}

export default App;
