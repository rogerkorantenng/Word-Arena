import { Context } from '@devvit/public-api';
import type { GameMode, UserStats, LeaderboardEntry } from '../types/index.js';

const STATS_KEY = 'word_arena:stats';
const LB_KEY = 'word_arena:lb';

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}

// Get user stats
export async function getUserStats(context: Context, userId: string): Promise<UserStats> {
  const key = `${STATS_KEY}:${userId}`;
  const data = await context.redis.get(key);

  if (!data) {
    return {
      gamesPlayed: 0,
      bestScores: { conquest: 0, cipher: 0, market: 0, dungeon: 0 },
      streak: 0,
      lastPlayDate: '',
    };
  }

  try {
    return JSON.parse(data) as UserStats;
  } catch {
    return {
      gamesPlayed: 0,
      bestScores: { conquest: 0, cipher: 0, market: 0, dungeon: 0 },
      streak: 0,
      lastPlayDate: '',
    };
  }
}

// Record a score and update stats
export async function recordScore(
  context: Context,
  userId: string,
  username: string,
  mode: GameMode,
  score: number
): Promise<{ rank: number; totalPlayers: number; userStats: UserStats }> {
  const stats = await getUserStats(context, userId);
  const today = getTodayStr();

  // Update best score
  if (score > (stats.bestScores[mode] || 0)) {
    stats.bestScores[mode] = score;
  }

  // Update streak
  if (stats.lastPlayDate) {
    const lastDate = new Date(stats.lastPlayDate);
    const todayDate = new Date(today);
    const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      stats.streak++;
    } else if (diffDays > 1) {
      stats.streak = 1;
    }
    // Same day: streak stays the same
  } else {
    stats.streak = 1;
  }

  stats.gamesPlayed++;
  stats.lastPlayDate = today;

  // Save stats
  const statsKey = `${STATS_KEY}:${userId}`;
  await context.redis.set(statsKey, JSON.stringify(stats));

  // Update daily leaderboard for this mode
  const lbKey = `${LB_KEY}:${mode}:${today}`;
  await context.redis.zAdd(lbKey, {
    member: JSON.stringify({ username, odometerId: userId }),
    score: score,
  });

  // Get rank
  const rank = await context.redis.zRank(lbKey, JSON.stringify({ username, odometerId: userId }));
  const totalEntries = await context.redis.zCard(lbKey);

  // zRank returns 0-indexed from low to high; we want high scores ranked first
  const actualRank = rank !== undefined ? totalEntries - rank : totalEntries;

  return {
    rank: actualRank,
    totalPlayers: totalEntries,
    userStats: stats,
  };
}

// Get leaderboard for a mode
export async function getLeaderboard(
  context: Context,
  mode: GameMode,
  limit: number = 10
): Promise<LeaderboardEntry[]> {
  const today = getTodayStr();
  const lbKey = `${LB_KEY}:${mode}:${today}`;

  const entries = await context.redis.zRange(lbKey, 0, limit - 1, {
    reverse: true,
    by: 'rank',
  });

  const leaderboard: LeaderboardEntry[] = [];

  for (let i = 0; i < entries.length; i++) {
    try {
      const { username } = JSON.parse(entries[i].member);
      leaderboard.push({
        username,
        score: entries[i].score,
        rank: i + 1,
      });
    } catch {
      // Skip malformed entries
    }
  }

  return leaderboard;
}
