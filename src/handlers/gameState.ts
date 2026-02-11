import { Context } from '@devvit/public-api';
import type { GameMode } from '../types/index.js';

// Get today's date string (YYYY-MM-DD) for daily tracking
function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}

// Check if a user has completed a specific mode today
export async function hasCompletedMode(
  context: Context,
  userId: string,
  mode: GameMode
): Promise<boolean> {
  const date = getTodayStr();
  const key = `word_arena:done:${date}:${mode}:${userId}`;
  const val = await context.redis.get(key);
  return val === '1';
}

// Mark a mode as completed for today
export async function markModeCompleted(
  context: Context,
  userId: string,
  mode: GameMode
): Promise<void> {
  const date = getTodayStr();
  const key = `word_arena:done:${date}:${mode}:${userId}`;
  await context.redis.set(key, '1');
  // Expire after 48 hours to auto-clean
  await context.redis.expire(key, 48 * 60 * 60);
}

// Get all completed modes for a user today
export async function getCompletedModes(
  context: Context,
  userId: string
): Promise<string[]> {
  const date = getTodayStr();
  const modes: GameMode[] = ['conquest', 'cipher', 'market', 'dungeon'];
  const completed: string[] = [];

  for (const mode of modes) {
    const key = `word_arena:done:${date}:${mode}:${userId}`;
    const val = await context.redis.get(key);
    if (val === '1') {
      completed.push(mode);
    }
  }

  return completed;
}
