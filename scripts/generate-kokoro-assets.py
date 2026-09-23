"""Regenerate committed fixed coach clips from the production-compatible API."""

import json
import os
from pathlib import Path
from urllib.request import Request, urlopen

API = os.getenv("KOKORO_API_BASE", "http://localhost:8000").rstrip("/")
OUTPUT = Path(__file__).resolve().parents[1] / "public" / "coach-audio"
MESSAGES = {
    "book.wav": "Book move.", "best.wav": "Best move.",
    "brilliant.wav": "Brilliant move!", "excellent.wav": "Excellent move.",
    "great.wav": "Great move.", "only-move.wav": "Only move.", "good.wav": "Good move.",
    "inaccuracy.wav": "That is a slight inaccuracy.",
    "warning.wav": "Hold on. This move needs another look.",
    "mistake.wav": "Hold on, that is a mistake. Take a moment to find a better move.",
    "blunder.wav": "That is a blunder.", "worst.wav": "That is a serious blunder.",
    "follow-up.wav": "Watch out! Here is their plan.", "win.wav": "You win!",
    "loss.wav": "Checkmate. Your opponent wins this game.",
    "draw.wav": "The game ends in a draw.", "stalemate.wav": "Stalemate. The game is a draw.",
}

OUTPUT.mkdir(parents=True, exist_ok=True)
for filename, text in MESSAGES.items():
    body = json.dumps({"text": text, "voice": "af_bella", "speed": 1}).encode()
    request = Request(f"{API}/api/tts", data=body, headers={"Content-Type": "application/json"})
    with urlopen(request, timeout=60) as response:
        (OUTPUT / filename).write_bytes(response.read())
    print(filename)
