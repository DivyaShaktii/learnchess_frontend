// Complete 18+ Uncensored Roast Dialogue Matrix & Non-Repeating Shuffle Engine
// Short, punchy, aggressive, and uncensored (zero emojis)

export const ROAST_CATEGORIES = {
  MAJOR_BLUNDERS: [
    "You hung your Queen, you dumb fuck.",
    "What the fuck was that?",
    "Are you brain-dead?",
    "Delete the fucking game, clown.",
    "Pure dogshit move.",
    "Did you close your fucking eyes?",
    "Holy shit, you suck.",
    "Congratulations, you just lost, idiot.",
    "Just resign, you dumbass.",
    "Absolute garbage. Give up.",
    "Worst move on the board, asshole.",
    "Bro, are you fucking blind?",
    "Nice piece donation, dipshit.",
    "What a brain-dead blunder.",
  ],

  MISTAKES: [
    "Free piece for me, idiot.",
    "Stop throwing, you dumbass.",
    "Are you trying to lose, dipshit?",
    "What a pathetic fucking mistake.",
    "Nice giveaway, clown.",
    "You just ruined your position, moron.",
    "My grandma plays better than you.",
    "You have no clue what you're doing.",
    "Thanks for the free piece, loser.",
    "Trash move, rethink your life.",
    "Did your brain just crash?",
    "Stop embarrassing yourself, dumbass.",
  ],

  INACCURACIES: [
    "Coward move. Attack something.",
    "Boring as fuck, do something.",
    "Completely useless move, idiot.",
    "Playing like a scared bitch.",
    "What a pointless waste of a turn.",
    "Passive trash. Push forward.",
    "Zero plan, just clicking random shit.",
    "Are you scared of me, loser?",
    "Stop stalling your death, dumbass.",
    "That accomplished literally nothing, clown.",
    "Mid as hell. Wake up.",
    "Soft move. Get aggressive, asshole.",
  ],

  GOOD_MOVES: [
    "Finally, a working brain cell.",
    "About damn time, idiot.",
    "Don't get cocky, asshole.",
    "Pure bullshit luck, admit it.",
    "Not totally trash for once.",
    "You still suck, don't smile.",
    "A lucky guess, dumbass.",
    "Shocked you didn't fuck that up.",
    "Enjoy it before you choke.",
    "Not bad, but you're still dead.",
    "Cute move. Now watch this.",
    "One good move won't save you.",
  ],

  BRILLIANT_MOVES: [
    "Did you open Stockfish, cheater?",
    "Who the fuck gave you permission?",
    "Disgusting move, you lucky bastard.",
    "You'll still choke this, hotshot.",
    "Who's playing for you, liar?",
    "Annoyingly good, you son of a bitch.",
    "One genius move won't save you.",
    "Stop acting like you planned that.",
    "Don't celebrate yet, dipshit.",
    "Fine move. You're still losing.",
    "Holy shit, look who woke up.",
    "Respect, but fuck you anyway.",
  ],

  OPENING_PRINCIPLES: [
    "Develop your pieces, you moron!",
    "Flank pawn bullshit? Are you stupid?",
    "Control the center, you idiot!",
    "What TikTok tutorial taught you that?",
    "Get off the back rank, dumbass.",
    "Stop pushing random pawns, clown.",
    "Boring opening, you chicken shit.",
    "Are you scared of the center?",
    "Develop knights, not your stupidity.",
    "Naked king? Suicide strategy, idiot.",
    "Absolute trash opening. Wake up!",
    "Did you forget how chess works?",
  ],

  SLOW_PLAY: [
    "Move your piece, you slow bastard!",
    "It's not rocket science, dumbass.",
    "Did you fall asleep, grandpa?",
    "Tick tock, dipshit. Play!",
    "I'm aging to dust here, asshole.",
    "Stop staring, you're still gonna blunder.",
    "Make a move today, for fuck's sake.",
    "Googling the rules, you fraud?",
    "Move already, you boring clown.",
    "My CPU is asleep. Move!",
    "Hurry the fuck up.",
    "Even grass grows faster than you.",
  ],

  UNDO_MOVE: [
    "Running away like a little bitch?",
    "Takebacks are for crying babies.",
    "Undo won't fix your dogshit chess.",
    "Coward. Face your fucking mistakes!",
    "Ctrl+Z won't save your dumb ass.",
    "Caught you being stupid, idiot.",
    "Fine, do-over granted, crybaby.",
    "Can't undo your eternal shame.",
    "Look at you begging for mercy.",
    "One free pass used, butterfingers.",
    "Stand on your business, coward!",
    "Undo again and I'll roast you harder.",
  ],

  PRE_MOVE_WARNINGS: [
    "Hold the fuck up, dumbass!",
    "Cancel this shit right now!",
    "Are you blind? Look at the board!",
    "Suicide move incoming. Stop, idiot!",
    "Don't play that, you absolute clown.",
    "Walking into a meat grinder, dipshit.",
    "Step away from the mouse, moron.",
    "Pure chess suicide. Cancel it!",
    "Look at the red arrow, dumbass!",
    "Save your dignity and cancel now.",
    "Are you trying to humiliate yourself?",
    "Stop! Put the fucking piece down.",
  ],

  CHECKMATE_ROBOT_WINS: [
    "Checkmate, dumbass! Sit the fuck down.",
    "Rest in pieces, you fucking suck.",
    "GG easy. Go cry in the shower.",
    "Total annihilation. Delete the game, loser.",
    "Wiped clean! Pack your bags, clown.",
    "Played like a clown, died like one.",
    "Checkmate! Not even close, rookie.",
    "Annihilated. Turn off your screen.",
    "Go take up knitting, you suck.",
    "Boom! King dead. Uninstall the app.",
    "Thanks for the free win, idiot.",
    "Pathetic game. Sit down, loser.",
  ],

  CHECKMATE_PLAYER_WINS: [
    "Pure fucking luck, asshole.",
    "Glitch in my code, rematch now!",
    "Enjoy the fluke, you lucky bastard.",
    "I let you win, don't get cocky.",
    "Rematch me right now, coward.",
    "You still played like trash, bitch.",
    "Lightning won't strike twice, loser.",
    "Whatever. Beginner's luck, idiot.",
    "Don't brag, you got lucky as hell.",
    "One win won't erase your blunders.",
    "Bullshit checkmate. Rematch!",
    "Enjoy your five seconds of glory.",
  ],

  STALEMATE: [
    "A stalemate?! You absolute fucking idiot.",
    "How did you choke that, clown?",
    "You had a Queen and stalemated, dumbass?",
    "Pathetic draw. You should be ashamed.",
    "Snatched a draw from winning, moron.",
    "Everyone's laughing at you, dipshit.",
    "One job: mate the king. Failed, idiot.",
    "Pure clown behavior. What a choke.",
    "Draw by total incompetence, loser.",
    "Tragic blunder. Learn how to mate.",
    "You choked so hard it's hilarious.",
    "Draw?! You should delete the game.",
  ],
};

export type RoastCategoryKey = keyof typeof ROAST_CATEGORIES;

// Non-Repeating History Buffer (remembers last 5 lines per category)
const usedHistory: Record<string, string[]> = {};

export function getRandomRoast(category: RoastCategoryKey): string {
  const lines = ROAST_CATEGORIES[category];
  if (!lines || lines.length === 0) return "What kind of move was that?!";

  if (!usedHistory[category]) {
    usedHistory[category] = [];
  }

  // Filter out recently used lines
  const available = lines.filter((line) => !usedHistory[category].includes(line));
  const candidatePool = available.length > 0 ? available : lines;

  const chosenIndex = Math.floor(Math.random() * candidatePool.length);
  const chosenLine = candidatePool[chosenIndex];

  // Update history buffer (keep max 5 recent items)
  usedHistory[category].push(chosenLine);
  if (usedHistory[category].length > 5) {
    usedHistory[category].shift();
  }

  return chosenLine;
}

/**
 * Maps standard classification labels and centipawn loss to the corresponding Roast category
 */
export function getRoastCategoryForMove(label: string, cpLoss?: number, isOpening?: boolean): RoastCategoryKey {
  if (isOpening) {
    return 'OPENING_PRINCIPLES';
  }

  const normalized = (label || '').toLowerCase();

  if (normalized.includes('blunder') || normalized.includes('worst') || (cpLoss !== undefined && cpLoss >= 300)) {
    return 'MAJOR_BLUNDERS';
  }
  if (normalized.includes('mistake') || (cpLoss !== undefined && cpLoss >= 100)) {
    return 'MISTAKES';
  }
  if (normalized.includes('inaccuracy') || normalized.includes('could be better') || (cpLoss !== undefined && cpLoss >= 25)) {
    return 'INACCURACIES';
  }
  if (normalized.includes('brilliant') || normalized.includes('best')) {
    return 'BRILLIANT_MOVES';
  }

  // Default solid move
  return 'GOOD_MOVES';
}
