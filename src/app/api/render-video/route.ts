import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

export async function POST(request: Request) {
  try {
    const { moveList } = await request.json();
    
    if (!moveList || !Array.isArray(moveList)) {
      return NextResponse.json({ error: 'Invalid moveList provided.' }, { status: 400 });
    }

    // Ensure the public/videos directory exists
    const videosDir = path.join(process.cwd(), 'public', 'videos');
    if (!fs.existsSync(videosDir)) {
      fs.mkdirSync(videosDir, { recursive: true });
    }
    
    // Create a unique output filename using a timestamp so every video is separately stored
    const timestamp = Date.now();
    const outputFilename = `video-${timestamp}.mp4`;
    const outputPath = path.join(videosDir, outputFilename);
    
    // Prepare the props to pass to Remotion
    const props = JSON.stringify({ moveList });
    
    // Command to run the Remotion CLI with our dynamic props
    // We quote the props string to handle spaces/quotes properly
    const command = `npx remotion render src/remotion/Root.tsx MyChessVideo "${outputPath}" --props='${props}'`;

    return new Promise<NextResponse>((resolve) => {
      exec(command, { cwd: process.cwd() }, (error, stdout, stderr) => {
        if (error) {
          console.error('Error rendering video:', error);
          console.error('stderr:', stderr);
          resolve(NextResponse.json({ error: 'Failed to render video.' }, { status: 500 }));
        } else {
          // Return the URL path to the newly generated video
          resolve(NextResponse.json({ success: true, url: `/videos/${outputFilename}` }));
        }
      });
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
