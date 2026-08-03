import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, Sequence, Audio, staticFile, Img } from 'remotion';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';

export const ChessVideo: React.FC<{ moveList: string[], initialFen?: string }> = ({ moveList, initialFen }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // We advance a move every 2.0 seconds (60 frames)
  const framesPerMove = Math.floor(fps * 2.0);
  const moveIndex = Math.floor(frame / framesPerMove);
  
  // Apply moves up to the current index
  const chess = new Chess(initialFen || undefined);
  let lastMove: any = null;
  for (let i = 0; i < Math.min(moveIndex, moveList.length); i++) {
    try {
      const moveStr = moveList[i];
      // If it looks like a raw UCI string (e.g. e2e4 or e7e8q)
      if (moveStr.length >= 4 && !moveStr.includes('+') && !moveStr.includes('x') && !moveStr.includes('-')) {
        const from = moveStr.substring(0, 2);
        const to = moveStr.substring(2, 4);
        const promotion = moveStr.length > 4 ? moveStr.substring(4) : undefined;
        lastMove = chess.move({ from, to, promotion });
      } else {
        lastMove = chess.move(moveStr); // fallback for SAN
      }
    } catch (e) {}
  }

  // State flags for visuals
  const isBlunder = moveIndex === 1;
  const isWinningMove = moveIndex >= moveList.length && moveList.length > 0;

  // Determine highlight styles for the last move
  const customSquareStyles: any = {};
  if (lastMove) {
    // moveIndex 1 -> index 0 (Opponent move)
    // moveIndex 2 -> index 1 (Player move)
    // moveIndex % 2 === 1 means it's the opponent's turn that just finished
    const highlightColor = moveIndex % 2 === 1 
      ? 'rgba(255, 0, 0, 0.5)'  // Red for opponent
      : 'rgba(0, 100, 255, 0.5)'; // Blue for player
    
    customSquareStyles[lastMove.from] = { backgroundColor: highlightColor, borderRadius: '4px' };
    customSquareStyles[lastMove.to] = { backgroundColor: highlightColor, borderRadius: '4px' };
  }

  // Camera Shake Effect exactly when the blunder happens
  const shakeX = isBlunder ? Math.sin(frame * 2) * 15 : 0;
  const shakeY = isBlunder ? Math.cos(frame * 2.5) * 15 : 0;
  
  // Smooth Zoom Effect on the final winning move
  const framesSinceWin = isWinningMove ? frame - (moveList.length * framesPerMove) : 0;
  const scale = isWinningMove ? Math.min(1.3, 1 + (framesSinceWin * 0.05)) : 1;

  // Dynamic Hook Text
  const hookText = isWinningMove ? "NAHHH 💀💀💀" : "Bro thought he was winning... 😭";

  return (
    <AbsoluteFill style={{ backgroundColor: '#09090b', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      {/* Top Meme Text */}
      <div style={{ height: '25%', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '90%', paddingTop: '60px' }}>
        <h1 style={{
          color: 'white', fontSize: '70px', fontWeight: 'bold', textAlign: 'center',
          fontFamily: 'sans-serif', textTransform: 'uppercase',
          textShadow: '4px 4px 0px #000, -2px -2px 0px #000, 2px -2px 0px #000, -2px 2px 0px #000',
        }}>
          {hookText}
        </h1>
      </div>

      {/* Chessboard Container */}
      <div style={{ 
        display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
        transform: `translate(${shakeX}px, ${shakeY}px) scale(${scale})`
      }}>
        <div style={{ boxShadow: '0 0 50px rgba(0,0,0,0.5)', borderRadius: '12px', overflow: 'hidden' }}>
          <Chessboard 
            position={chess.fen()} 
            boardWidth={900}
            animationDuration={0} // MUST be 0 for Remotion
            boardOrientation={initialFen && initialFen.includes(' w ') ? 'black' : 'white'}
            customDarkSquareStyle={{ backgroundColor: '#3d3d3d' }}
            customLightSquareStyle={{ backgroundColor: '#7a7a7a' }}
            customNotationStyle={{ color: 'rgba(0,0,0,0.45)', fontWeight: 700, fontSize: 11 }}
            customSquareStyles={customSquareStyles}
          />
        </div>
        
        {/* No Cat Meme anymore (removed per user request) */}
      </div>
      
      {/* Audio Logic */}
      {moveList.map((move, index) => {
        // The move visually happens when moveIndex reaches (index + 1)
        const moveFrame = (index + 1) * framesPerMove;
        
        // In puzzles: index 0 is opponent blunder. index 1 is player. index 2 is opponent. index 3 is player win.
        const isOpponentBlunder = index === 0;
        const isPlayerMove = index % 2 === 1;
        
        if (!isOpponentBlunder && !isPlayerMove) return null; // No sound for opponent's defense
        
        const isFinalWinningMove = index === moveList.length - 1;

        const soundFile = isFinalWinningMove 
          ? "Chess_Project_Voices/win.mp3"
          : isOpponentBlunder 
            ? "Chess_Project_Voices/That's a serious blunder..mp3" 
            : "Chess_Project_Voices/Good move.mp3";
          
        return (
          <Sequence key={index} from={moveFrame}>
            <Audio src={staticFile(soundFile)} volume={0.8} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
