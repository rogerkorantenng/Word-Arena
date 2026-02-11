// Game modes
export type GameMode = 'conquest' | 'cipher' | 'market' | 'dungeon';

export interface ModeInfo {
  id: GameMode;
  name: string;
  icon: string;
  description: string;
  timeLimit: number; // seconds
}

export const MODES: ModeInfo[] = [
  {
    id: 'conquest',
    name: 'Word Conquest',
    icon: '🏰',
    description: 'Capture territory by unscrambling words on a 6x6 grid',
    timeLimit: 180,
  },
  {
    id: 'cipher',
    name: 'Cipher Breaker',
    icon: '🔐',
    description: 'Crack 5 increasingly difficult word codes',
    timeLimit: 180,
  },
  {
    id: 'market',
    name: 'Word Stock Market',
    icon: '📈',
    description: 'Trade letters and build a word portfolio',
    timeLimit: 120,
  },
  {
    id: 'dungeon',
    name: 'Lexicon Dungeon',
    icon: '⚔️',
    description: 'Spell words to battle monsters across 10 floors',
    timeLimit: 300,
  },
];

// Score submission details per mode
export interface ConquestDetails {
  captured: number;
  total: number;
  timeUsed: number;
  grid: string; // emoji grid string
}

export interface CipherDetails {
  stagesCompleted: number;
  totalStages: number;
  timeUsed: number;
  hintsRemaining: number;
}

export interface MarketDetails {
  portfolioValue: number;
  wordsFormed: number;
  timeUsed: number;
}

export interface DungeonDetails {
  floorsCleared: number;
  totalFloors: number;
  remainingHP: number;
}

export type ModeDetails = ConquestDetails | CipherDetails | MarketDetails | DungeonDetails;

// User stats
export interface UserStats {
  gamesPlayed: number;
  bestScores: Record<GameMode, number>;
  streak: number;
  lastPlayDate: string;
}

// Leaderboard
export interface LeaderboardEntry {
  username: string;
  score: number;
  rank: number;
}

// WebView -> Devvit messages
export type WebViewMessage =
  | { type: 'get_daily_modes' }
  | { type: 'submit_score'; payload: { mode: GameMode; score: number; details: ModeDetails; shareText: string } }
  | { type: 'get_leaderboard'; payload: { mode: GameMode } }
  | { type: 'get_stats' };

// Devvit -> WebView messages
export type DevvitMessage =
  | { type: 'daily_modes'; data: { modes: ModeInfo[]; completed: string[] } }
  | { type: 'score_saved'; data: { rank: number; totalPlayers: number; userStats: UserStats } }
  | { type: 'leaderboard'; data: { entries: LeaderboardEntry[] } }
  | { type: 'stats'; data: UserStats }
  | { type: 'error'; data: { message: string } };
