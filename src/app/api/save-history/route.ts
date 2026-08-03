import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { moveList, initialFen } = await request.json();
    
    if (!moveList || !Array.isArray(moveList)) {
      return NextResponse.json({ error: 'Invalid moveList provided.' }, { status: 400 });
    }

    // Write the moves and starting FEN to a public file so the Remotion CLI can access them
    const movesFilePath = path.join(process.cwd(), 'moves.json');
    fs.writeFileSync(movesFilePath, JSON.stringify({ moveList, initialFen }, null, 2));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Save history error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
