const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export interface ThreatPreview {
  opponent_best_reply: string;
  opponent_best_reply_san: string;
  resulting_pv: string[];
  score_after_reply_cp: number | null;
  is_mate_threat: boolean;
  mate_in: number | null;
}

export interface MoveAlternative {
  move: string;
  san: string;
  score_cp: number | null;
  is_mate: boolean;
  mate_in: number | null;
  pv: string[];
  cp_loss?: number | null;
  is_safe?: boolean;
}

export interface PreMoveCheckResponse {
  label: string;
  cp_loss: number | null;
  explanation: string;
  played_eval_cp: number | null;
  best_eval_cp: number | null;
  best_move_uci: string;
  best_move_san: string;
  top_alternatives: MoveAlternative[];
  threat_preview: ThreatPreview | null;
  refutation_sequence?: string[];
  should_warn: boolean;
  is_box_tier: boolean;
  warning_message: string;
}

export interface CommitMoveResponse {
  fen: string;
  san: string;
  classification: string;
  is_game_over: boolean;
  result: string | null;
}

export interface GameStateResponse {
  game_id: string;
  fen: string;
  pgn: string;
  turn: string;
  is_game_over: boolean;
  result: string | null;
  move_history: Array<{
    san: string;
    classification: string;
    fen_before?: string;
  }>;
}

export interface StartGameResponse {
  game_id: string;
  fen: string;
}

export interface BestMovesResponse {
  moves: Array<{
    move: string;
    san: string;
    score_cp: number | null;
    is_mate: boolean;
    mate_in: number | null;
    pv: string[];
  }>;
}

export interface StartPuzzleResponse {
  session_id: string;
  fen: string;
  side_to_move: string;
  first_move_source?: string;
}

export interface PuzzleAttemptResponse {
  correct: boolean;
  opponent_reply_uci: string | null;
  solved: boolean;
  fen: string;
}

export interface PuzzleHintResponse {
  hint_square: string | null;
}

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function fetchWithCheck(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  if (!res.ok) {
    let msg = `HTTP Error ${res.status}`;
    try {
      const data = await res.json();
      if (data.detail) msg = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
    } catch (e) {}
    throw new ApiError(res.status, msg);
  }
  return res.json();
}

export const api = {
  async startNewGame(startingFen?: string, opponentRating?: number, userId?: string): Promise<StartGameResponse> {
    return fetchWithCheck(`${API_BASE}/api/game/new`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ starting_fen: startingFen, opponent_rating: opponentRating, user_id: userId }),
    });
  },

  async resumeGame(userId: string): Promise<GameStateResponse> {
    return fetchWithCheck(`${API_BASE}/api/game/resume?user_id=${userId}`);
  },

  async precheckMove(gameId: string, moveUci: string): Promise<PreMoveCheckResponse> {
    return fetchWithCheck(`${API_BASE}/api/move/precheck`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game_id: gameId, move_uci: moveUci }),
    });
  },

  async commitMove(gameId: string, moveUci: string): Promise<CommitMoveResponse> {
    return fetchWithCheck(`${API_BASE}/api/move/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game_id: gameId, move_uci: moveUci }),
    });
  },

  async getGameState(gameId: string): Promise<GameStateResponse> {
    return fetchWithCheck(`${API_BASE}/api/game/${gameId}/state`);
  },

  async undoMove(gameId: string, plies: number = 2): Promise<GameStateResponse> {
    return fetchWithCheck(`${API_BASE}/api/game/${gameId}/undo?plies=${plies}`, { method: 'POST' });
  },

  async getBestMoves(gameId: string, n: number = 3): Promise<BestMovesResponse> {
    return fetchWithCheck(`${API_BASE}/api/engine/best-moves/${gameId}?n=${n}`);
  },

  async getRobotMove(gameId: string): Promise<BestMovesResponse> {
    return fetchWithCheck(`${API_BASE}/api/engine/robot-move/${gameId}`);
  },

  async startPuzzle(level: number): Promise<StartPuzzleResponse> {
    return fetchWithCheck(`${API_BASE}/api/puzzles/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level }),
    });
  },

  async attemptPuzzle(sessionId: string, moveUci: string): Promise<PuzzleAttemptResponse> {
    return fetchWithCheck(`${API_BASE}/api/puzzles/attempt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, move_uci: moveUci }),
    });
  },

  async getPuzzleHint(sessionId: string): Promise<PuzzleHintResponse> {
    return fetchWithCheck(`${API_BASE}/api/puzzles/hint/${sessionId}`);
  },

  async createRazorpayOrder(userId: string): Promise<{ order_id: string; amount: number; currency: string }> {
    return fetchWithCheck(`${API_BASE}/api/payment/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    });
  },

  async verifyRazorpayPayment(orderId: string, paymentId: string, signature: string, userId: string): Promise<{ status: string }> {
    return fetchWithCheck(`${API_BASE}/api/payment/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
        user_id: userId,
      }),
    });
  },

  async getUserGames(userId: string): Promise<{ games: Array<{ id: string; status: string; opponent_rating: number; created_at: string }> }> {
    return fetchWithCheck(`${API_BASE}/api/user/games?user_id=${userId}`);
  },
};

