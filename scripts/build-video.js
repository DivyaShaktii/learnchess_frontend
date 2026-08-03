const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Chess } = require('chess.js');

async function main() {
  console.log('Fetching a new puzzle from the database...');
  try {
    const res = await fetch('http://127.0.0.1:8000/api/puzzles/random?level=3');
    if (!res.ok) throw new Error(`Backend returned ${res.status}`);
    
    const data = await res.json();
    const fen = data.fen;
    const uciMoves = data.moves_uci;
    
    console.log(`Found puzzle ${data.puzzle_id} with ${uciMoves.length} moves.`);
    
    // Save to moves.json using the raw UCI strings from the database
    const movesFilePath = path.join(__dirname, '..', 'moves.json');
    fs.writeFileSync(movesFilePath, JSON.stringify({ moveList: uciMoves, initialFen: fen }, null, 2));
    
    // Ensure the output directory exists
    const outputDir = path.join(__dirname, '..', 'public', 'videos');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate a unique filename using timestamp
    const timestamp = Date.now();
    const filename = `video-${timestamp}.mp4`;
    const outputPath = path.join('public', 'videos', filename);
    console.log(`Starting video generation... Output will be saved to ${outputPath}`);

    // Run the remotion render command with the unique output path
    execSync(`npx remotion render src/remotion/Root.tsx MyChessVideo ${outputPath}`, {
      stdio: 'inherit'
    });
    console.log(`\n✅ Success! Your new puzzle video has been saved to: ${outputPath}`);
    
    // Automatically open the folder containing the video on Windows
    try {
      execSync(`start explorer "${path.resolve(__dirname, '..', 'public', 'videos')}"`);
    } catch (e) {
      // Ignore if it fails to open
    }
  } catch (error) {
    console.error('Failed to generate video:', error.message);
    process.exit(1);
  }
}

main();
