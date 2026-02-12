# Word Arena — Daily Rotating Word Game for Reddit

A daily word game built on Reddit's Devvit platform. Four game modes rotate on a 24-hour cycle, giving communities a fresh challenge every day.

## Game Modes

### Word Conquest
Capture territory on a 6×6 grid by unscrambling adjacent words. Start in a corner and expand outward. 3-minute time limit.

### Cipher Breaker
Decode 5 increasingly difficult word puzzles — from simple scrambles to full cryptogram substitutions. 3 hints available. Score based on stages cleared and speed.

### Word Stock Market
9 random letters, each with a daily price. Form words to earn coins — longer words pay exponentially more. 2 minutes to maximize your portfolio.

### Lexicon Dungeon
Battle through a 10-floor dungeon by spelling words. Longer words deal more damage. Floor 10 has a boss that requires 6+ letter words to hit. 5-minute time limit.

## Features

- **Daily rotation** — A new mode every day at midnight UTC
- **Same puzzle for everyone** — Seeded RNG ensures fair leaderboard competition
- **Leaderboards** — Per-mode daily rankings
- **Streaks** — Play every day to build your consecutive-day streak
- **Interactive tutorial** — Step-by-step walkthrough on first play, skipped on return visits
- **Shareable results** — Emoji-based results for posting in comments
- **Mobile-first** — Touch-optimized, responsive design

## Tech Stack

- **Frontend:** HTML5, CSS3, vanilla JavaScript
- **Backend:** TypeScript on Devvit
- **Storage:** Redis (leaderboards, stats, streaks, completion tracking)
- **Platform:** Reddit Devvit WebView interactive posts

## Architecture

```
src/                  # Devvit backend (TypeScript)
├── main.tsx          # App entry point, custom post type & menu action
├── components/
│   └── GamePost.tsx  # WebView message handler
├── handlers/
│   ├── leaderboard.ts  # Score submission & rankings
│   └── gameState.ts    # Daily completion tracking
└── types/
    └── index.ts

webroot/              # Frontend (served as WebView)
├── index.html
├── app.js            # Core app controller & navigation
├── game-conquest.js  # Word Conquest mode
├── game-cipher.js    # Cipher Breaker mode
├── game-market.js    # Word Stock Market mode
├── game-dungeon.js   # Lexicon Dungeon mode
├── seed.js           # Seeded RNG (Mulberry32)
├── words.js          # Word dictionary
└── styles.css
```

## How It Works

1. A moderator creates a Word Arena post from the subreddit menu
2. The post renders as a full-screen interactive game via Devvit WebView
3. Players see today's mode and tap Play to start
4. Scores are saved to Redis and ranked on a daily leaderboard
5. At midnight UTC the mode rotates and leaderboards reset

## Running Locally

```bash
npm install
npx devvit playtest
```

## App Link

https://developers.reddit.com/apps/word-arena-iii
