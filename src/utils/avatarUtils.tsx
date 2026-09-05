import React from 'react';

/**
 * Chess Piece SVG Avatars and Utilities.
 * Preset avatars are stored as "chess:<id>" (e.g. "chess:pawn_w") in avatar_url.
 * Uploaded photos are stored as data:image/jpeg;base64,... or https://...
 */

export function ChessPieceSvg({ id, className = "w-full h-full" }: { id: string; className?: string }) {
  switch (id) {
    case 'pawn_w':
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <path
            d="m 22.5,9 c -2.21,0 -4,1.79 -4,4 0,0.89 0.29,1.71 0.78,2.38 C 17.33,16.5 16,18.59 16,21 c 0,2.03 0.94,3.84 2.41,5.03 C 15.41,27.09 11,31.58 11,39.5 H 34 C 34,31.58 29.59,27.09 26.59,26.03 28.06,24.84 29,23.03 29,21 29,18.59 27.67,16.5 25.72,15.38 26.21,14.71 26.5,13.89 26.5,13 c 0,-2.21 -1.79,-4 -4,-4 z"
            fill="#ffffff"
            stroke="#1a1a1a"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'pawn_b':
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <path
            d="m 22.5,9 c -2.21,0 -4,1.79 -4,4 0,0.89 0.29,1.71 0.78,2.38 C 17.33,16.5 16,18.59 16,21 c 0,2.03 0.94,3.84 2.41,5.03 C 15.41,27.09 11,31.58 11,39.5 H 34 C 34,31.58 29.59,27.09 26.59,26.03 28.06,24.84 29,23.03 29,21 29,18.59 27.67,16.5 25.72,15.38 26.21,14.71 26.5,13.89 26.5,13 c 0,-2.21 -1.79,-4 -4,-4 z"
            fill="#222222"
            stroke="#e0e0e0"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'knight_w':
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <g fill="none" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 25,32.5 23,18" fill="#ffffff" stroke="#1a1a1a" />
            <path d="M 24,18 C 24.38,20.91 18.45,25.37 16,27 C 13,29 13.18,31.34 11,31 C 9.958,30.06 12.41,27.96 11,28 C 10,28 11.19,29.23 10,30 C 9,30 5.997,31 6,26 C 6,24 12,14 12,14 C 12,14 13.89,12.1 14,10.5 C 13.27,9.506 13.5,8.5 13.5,7.5 C 14.5,6.5 16.5,10 16.5,10 L 18.5,10 C 18.5,10 19.28,8.008 21,7 C 22,7 22,10 22,10" fill="#ffffff" stroke="#1a1a1a" />
            <circle cx="9" cy="25.5" r="0.75" fill="#1a1a1a" />
            <circle cx="14.5" cy="15.5" r="0.75" fill="#1a1a1a" />
          </g>
        </svg>
      );
    case 'knight_b':
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <g fill="none" stroke="#e0e0e0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 25,32.5 23,18" fill="#222222" stroke="#e0e0e0" />
            <path d="M 24,18 C 24.38,20.91 18.45,25.37 16,27 C 13,29 13.18,31.34 11,31 C 9.958,30.06 12.41,27.96 11,28 C 10,28 11.19,29.23 10,30 C 9,30 5.997,31 6,26 C 6,24 12,14 12,14 C 12,14 13.89,12.1 14,10.5 C 13.27,9.506 13.5,8.5 13.5,7.5 C 14.5,6.5 16.5,10 16.5,10 L 18.5,10 C 18.5,10 19.28,8.008 21,7 C 22,7 22,10 22,10" fill="#222222" stroke="#e0e0e0" />
            <circle cx="9" cy="25.5" r="0.75" fill="#ffffff" />
            <circle cx="14.5" cy="15.5" r="0.75" fill="#ffffff" />
            <path d="M 24.55,10.4 L 24.1,11.85 L 24.6,12 C 27.75,13 30.25,14.49 32.5,18.75 C 34.75,23.01 35.75,29.06 35.25,39 L 35.2,39.5 L 37.45,39.5 L 37.5,39 C 38,28.94 36.62,22.15 34.25,17.66 C 31.88,13.17 28.46,11.02 25.06,10.5 L 24.55,10.4 z" fill="#ffffff" stroke="none" />
          </g>
        </svg>
      );
    case 'bishop_w':
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <g fill="none" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <g fill="#ffffff" stroke="#1a1a1a" strokeLinecap="butt">
              <path d="M 9,36 C 12.39,35.03 19.11,36.43 22.5,34 C 25.89,36.43 32.61,35.03 36,36 C 36,36 37.65,36.54 39,38 C 38.32,38.97 37.35,38.99 36,38.5 C 32.61,37.53 25.89,38.96 22.5,37.5 C 19.11,38.96 12.39,37.53 9,38.5 C 7.65,38.99 6.68,38.97 6,38 C 7.35,36.54 9,36 9,36 z" />
              <path d="M 15,32 C 17.5,34.5 27.5,34.5 30,32 C 30.5,30.5 30,30 30,30 C 30,27.5 27.5,26 27.5,26 C 33,24.5 33.5,14.5 22.5,10.5 C 11.5,14.5 12,24.5 17.5,26 C 17.5,26 15,27.5 15,30 C 15,30 14.5,30.5 15,32 z" />
              <circle cx="22.5" cy="8" r="2.5" />
            </g>
            <path d="M 17.5,26 L 27.5,26 M 15,30 L 30,30 M 22.5,15.5 L 22.5,20.5 M 20,18 L 25,18" stroke="#1a1a1a" />
          </g>
        </svg>
      );
    case 'bishop_b':
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <g fill="none" stroke="#e0e0e0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <g fill="#222222" stroke="#e0e0e0" strokeLinecap="butt">
              <path d="M 9,36 C 12.39,35.03 19.11,36.43 22.5,34 C 25.89,36.43 32.61,35.03 36,36 C 36,36 37.65,36.54 39,38 C 38.32,38.97 37.35,38.99 36,38.5 C 32.61,37.53 25.89,38.96 22.5,37.5 C 19.11,38.96 12.39,37.53 9,38.5 C 7.65,38.99 6.68,38.97 6,38 C 7.35,36.54 9,36 9,36 z" />
              <path d="M 15,32 C 17.5,34.5 27.5,34.5 30,32 C 30.5,30.5 30,30 30,30 C 30,27.5 27.5,26 27.5,26 C 33,24.5 33.5,14.5 22.5,10.5 C 11.5,14.5 12,24.5 17.5,26 C 17.5,26 15,27.5 15,30 C 15,30 14.5,30.5 15,32 z" />
              <circle cx="22.5" cy="8" r="2.5" />
            </g>
            <path d="M 17.5,26 L 27.5,26 M 15,30 L 30,30 M 22.5,15.5 L 22.5,20.5 M 20,18 L 25,18" stroke="#ffffff" />
          </g>
        </svg>
      );
    case 'rook_w':
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <g fill="#ffffff" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M 9,39 L 36,39 L 36,36 L 9,36 L 9,39 z" strokeLinecap="butt" />
            <path d="M 12,36 L 12,32 L 33,32 L 33,36 L 12,36 z" strokeLinecap="butt" />
            <path d="M 11,14 L 11,9 L 15,9 L 15,11 L 20,11 L 20,9 L 25,9 L 25,11 L 30,11 L 30,9 L 34,9 L 34,14" strokeLinecap="butt" />
            <path d="M 34,14 L 31,17 L 14,17 L 11,14" />
            <path d="M 31,17 L 31,29.5 L 14,29.5 L 14,17" strokeLinecap="butt" />
            <path d="M 31,29.5 L 32.5,32 L 12.5,32 L 14,29.5" />
            <path d="M 11,14 L 34,14" fill="none" stroke="#1a1a1a" />
          </g>
        </svg>
      );
    case 'rook_b':
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <g fill="#222222" stroke="#e0e0e0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M 9,39 L 36,39 L 36,36 L 9,36 L 9,39 z" strokeLinecap="butt" />
            <path d="M 12.5,32 L 14,29.5 L 31,29.5 L 32.5,32 L 12.5,32 z" strokeLinecap="butt" />
            <path d="M 12,36 L 12,32 L 33,32 L 33,36 L 12,36 z" strokeLinecap="butt" />
            <path d="M 14,29.5 L 14,16.5 L 31,16.5 L 31,29.5 L 14,29.5 z" strokeLinecap="butt" />
            <path d="M 14,16.5 L 11,14 L 34,14 L 31,16.5 L 14,16.5 z" strokeLinecap="butt" />
            <path d="M 11,14 L 11,9 L 15,9 L 15,11 L 20,11 L 20,9 L 25,9 L 25,11 L 30,11 L 30,9 L 34,9 L 34,14 L 11,14 z" strokeLinecap="butt" />
            <path d="M 12,35.5 L 33,35.5 L 33,35.5" fill="none" stroke="#ffffff" strokeWidth="1" />
            <path d="M 13,31.5 L 32,31.5" fill="none" stroke="#ffffff" strokeWidth="1" />
            <path d="M 14,29.5 L 31,29.5" fill="none" stroke="#ffffff" strokeWidth="1" />
            <path d="M 14,16.5 L 31,16.5" fill="none" stroke="#ffffff" strokeWidth="1" />
            <path d="M 11,14 L 34,14" fill="none" stroke="#ffffff" strokeWidth="1" />
          </g>
        </svg>
      );
    case 'queen_w':
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <g fill="#ffffff" stroke="#1a1a1a" strokeWidth="1.5" strokeLinejoin="round">
            <path d="M 9,26 C 17.5,24.5 30,24.5 36,26 L 38.5,13.5 L 31,25 L 30.7,10.9 L 25.5,24.5 L 22.5,10 L 19.5,24.5 L 14.3,10.9 L 14,25 L 6.5,13.5 L 9,26 z" />
            <path d="M 9,26 C 9,28 10.5,28 11.5,30 C 12.5,31.5 12.5,31 12,33.5 C 10.5,34.5 11,36 11,36 C 9.5,37.5 11,38.5 11,38.5 C 17.5,39.5 27.5,39.5 34,38.5 C 34,38.5 35.5,37.5 34,36 C 34,36 34.5,34.5 33,33.5 C 32.5,31 32.5,31.5 33.5,30 C 34.5,28 36,28 36,26 C 27.5,24.5 17.5,24.5 9,26 z" />
            <path d="M 11.5,30 C 15,29 30,29 33.5,30" fill="none" />
            <path d="M 12,33.5 C 18,32.5 27,32.5 33,33.5" fill="none" />
            <circle cx="6" cy="12" r="2" />
            <circle cx="14" cy="9" r="2" />
            <circle cx="22.5" cy="8" r="2" />
            <circle cx="31" cy="9" r="2" />
            <circle cx="39" cy="12" r="2" />
          </g>
        </svg>
      );
    case 'queen_b':
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <g fill="#222222" stroke="#e0e0e0" strokeWidth="1.5" strokeLinejoin="round">
            <path d="M 9,26 C 17.5,24.5 30,24.5 36,26 L 38.5,13.5 L 31,25 L 30.7,10.9 L 25.5,24.5 L 22.5,10 L 19.5,24.5 L 14.3,10.9 L 14,25 L 6.5,13.5 L 9,26 z" />
            <path d="M 9,26 C 9,28 10.5,28 11.5,30 C 12.5,31.5 12.5,31 12,33.5 C 10.5,34.5 11,36 11,36 C 9.5,37.5 11,38.5 11,38.5 C 17.5,39.5 27.5,39.5 34,38.5 C 34,38.5 35.5,37.5 34,36 C 34,36 34.5,34.5 33,33.5 C 32.5,31 32.5,31.5 33.5,30 C 34.5,28 36,28 36,26 C 27.5,24.5 17.5,24.5 9,26 z" />
            <path d="M 11.5,30 C 15,29 30,29 33.5,30" fill="none" stroke="#ffffff" />
            <path d="M 12,33.5 C 18,32.5 27,32.5 33,33.5" fill="none" stroke="#ffffff" />
            <circle cx="6" cy="12" r="2" />
            <circle cx="14" cy="9" r="2" />
            <circle cx="22.5" cy="8" r="2" />
            <circle cx="31" cy="9" r="2" />
            <circle cx="39" cy="12" r="2" />
          </g>
        </svg>
      );
    case 'king_w':
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <g fill="none" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M 22.5,11.63 L 22.5,6" fill="none" stroke="#1a1a1a" />
            <path d="M 20,8 L 25,8" fill="none" stroke="#1a1a1a" />
            <path d="M 22.5,25 C 22.5,25 27,17.5 25.5,14.5 C 25.5,14.5 24.5,12 22.5,12 C 20.5,12 19.5,14.5 19.5,14.5 C 18,17.5 22.5,25 22.5,25" fill="#ffffff" stroke="#1a1a1a" />
            <path d="M 12.5,37 C 18,40.5 27,40.5 32.5,37 L 32.5,30 C 32.5,30 41.5,25.5 38.5,19.5 C 34.5,13 25,16 22.5,23.5 L 22.5,27 L 22.5,23.5 C 20,16 10.5,13 6.5,19.5 C 3.5,25.5 12.5,30 12.5,30 L 12.5,37" fill="#ffffff" stroke="#1a1a1a" />
            <path d="M 12.5,30 C 18,27 27,27 32.5,30" fill="none" stroke="#1a1a1a" />
            <path d="M 12.5,33.5 C 18,30.5 27,30.5 32.5,33.5" fill="none" stroke="#1a1a1a" />
            <path d="M 12.5,37 C 18,34 27,34 32.5,37" fill="none" stroke="#1a1a1a" />
          </g>
        </svg>
      );
    case 'king_b':
      return (
        <svg viewBox="0 0 45 45" className={className}>
          <g fill="none" stroke="#e0e0e0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M 22.5,11.63 L 22.5,6" fill="none" stroke="#e0e0e0" />
            <path d="M 20,8 L 25,8" fill="none" stroke="#e0e0e0" />
            <path d="M 22.5,25 C 22.5,25 27,17.5 25.5,14.5 C 25.5,14.5 24.5,12 22.5,12 C 20.5,12 19.5,14.5 19.5,14.5 C 18,17.5 22.5,25 22.5,25" fill="#222222" stroke="#e0e0e0" />
            <path d="M 12.5,37 C 18,40.5 27,40.5 32.5,37 L 32.5,30 C 32.5,30 41.5,25.5 38.5,19.5 C 34.5,13 25,16 22.5,23.5 L 22.5,27 L 22.5,23.5 C 20,16 10.5,13 6.5,19.5 C 3.5,25.5 12.5,30 12.5,30 L 12.5,37" fill="#222222" stroke="#e0e0e0" />
            <path d="M 12.5,30 C 18,27 27,27 32.5,30" fill="none" stroke="#ffffff" />
            <path d="M 12.5,33.5 C 18,30.5 27,30.5 32.5,33.5" fill="none" stroke="#ffffff" />
            <path d="M 12.5,37 C 18,34 27,34 32.5,37" fill="none" stroke="#ffffff" />
          </g>
        </svg>
      );
    default:
      return null;
  }
}

export const CHESS_PRESETS: Record<string, { bg: string; label: string }> = {
  pawn_w:   { bg: "linear-gradient(135deg, #f0f0f0, #d5d5d5)", label: "White Pawn" },
  pawn_b:   { bg: "linear-gradient(135deg, #333333, #151515)", label: "Black Pawn" },
  knight_w: { bg: "linear-gradient(135deg, #faeed1, #dfcf9e)", label: "White Knight" },
  knight_b: { bg: "linear-gradient(135deg, #3a3248, #1e1927)", label: "Black Knight" },
  bishop_w: { bg: "linear-gradient(135deg, #e8f5e9, #c8e6c9)", label: "White Bishop" },
  bishop_b: { bg: "linear-gradient(135deg, #1b3320, #0d1e11)", label: "Black Bishop" },
  rook_w:   { bg: "linear-gradient(135deg, #e1f5fe, #b3e5fc)", label: "White Rook" },
  rook_b:   { bg: "linear-gradient(135deg, #102a43, #061524)", label: "Black Rook" },
  queen_w:  { bg: "linear-gradient(135deg, #fff8e1, #ffe082)", label: "White Queen" },
  queen_b:  { bg: "linear-gradient(135deg, #42163b, #20081d)", label: "Black Queen" },
  king_w:   { bg: "linear-gradient(135deg, #fff3e0, #ffcc80)", label: "White King" },
  king_b:   { bg: "linear-gradient(135deg, #3e2723, #1c100c)", label: "Black King" },
};

/** True when avatar_url is a chess preset token like 'chess:pawn_w' */
export function isChessPreset(url: string | null | undefined): boolean {
  return typeof url === 'string' && url.startsWith("chess:");
}

/** Extract preset id from 'chess:pawn_w' */
export function getPresetId(url: string): string {
  return url.slice(6);
}

/** Returns fallback ui-avatars URL */
export function fallbackAvatarUrl(name: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "U")}&background=22c55e&color=fff&bold=true`;
}

interface AvatarImgProps {
  avatarUrl?: string | null;
  fallbackName?: string;
  className?: string;
  size?: number;
}

/**
 * Universal Avatar Component:
 * - Chess SVG Preset if url is 'chess:<piece>'
 * - Uploaded image if url is base64 or https
 * - Fallback initial avatar if null/empty
 */
export function AvatarImg({ avatarUrl, fallbackName = "U", className = "", size }: AvatarImgProps) {
  if (isChessPreset(avatarUrl)) {
    const id = getPresetId(avatarUrl!);
    const preset = CHESS_PRESETS[id];
    if (preset) {
      const dimensionStyle = size ? { width: size, height: size } : {};
      return (
        <div
          className={`rounded-full flex items-center justify-center p-1.5 shadow-md overflow-hidden select-none shrink-0 ${className}`}
          style={{
            background: preset.bg,
            ...dimensionStyle,
          }}
          title={preset.label}
        >
          <div className="w-full h-full flex items-center justify-center">
            <ChessPieceSvg id={id} className="w-[82%] h-[82%] drop-shadow-sm" />
          </div>
        </div>
      );
    }
  }

  const src = avatarUrl && avatarUrl.trim() !== "" ? avatarUrl : fallbackAvatarUrl(fallbackName);
  const dimensionStyle = size ? { width: size, height: size } : {};

  return (
    <img
      src={src}
      alt="Avatar"
      className={`rounded-full object-cover shrink-0 ${className}`}
      style={dimensionStyle}
      onError={(e) => {
        // If image fails to load (e.g. broken link or malformed url), fallback safely
        (e.currentTarget as HTMLImageElement).src = fallbackAvatarUrl(fallbackName);
      }}
    />
  );
}
