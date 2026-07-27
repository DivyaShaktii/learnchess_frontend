const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

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
    throw new ApiError(res.status, `HTTP Error ${res.status}`);
  }
  return res.json();
}

export const api = {
  async startNewGame(startingFen?: string): Promise<StartGameResponse> {
    return fetchWithCheck(`${API_BASE}/api/game/new`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ starting_fen: startingFen }),
    });
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
};
