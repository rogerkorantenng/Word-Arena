# Word Arena — Daily Rotating Word Game for Reddit

## Tagline
Four word games. One daily challenge. Zero excuses not to play.

## App Link
https://developers.reddit.com/apps/word-arena-iii

---

## Inspiration

You know that feeling when you finish Wordle in 14 seconds and then have nothing to do for the rest of the day? Yeah, we hated that too.

Daily word games are addictive — but they all live on random websites, far away from the communities that obsess over them. Meanwhile, Reddit is *already* where people go to brag about their scores, argue about strategy, and roast their friends for losing.

So we thought: what if the game just... lived on Reddit? And what if instead of ONE game that gets old after a week, it was FOUR games that rotate every day — so you never know what's coming next?

That's Word Arena.

## What it does

Every day at midnight UTC, Word Arena drops a new challenge from a rotating pool of four completely different game modes. Same puzzle for everyone. Daily leaderboards. Bragging rights on the line.

### The Roster

**Word Conquest** — You start in the corner of a 6x6 grid. Every tile hides a scrambled word. Unscramble it, claim the tile, expand your territory. You've got 3 minutes to conquer as much of the map as you can. It's Risk, but for people who read books.

**Cipher Breaker** — Five coded words. Each one harder than the last. Stage 1 is a gentle scramble. Stage 5 is a full cryptogram that makes you question your entire vocabulary. You get 3 hints total — blow them early and you'll regret it on stage 4.

**Word Stock Market** — Nine letters, each with a daily price. Form words, get paid. A 3-letter word might net you pocket change, but a 6-letter word? That's a portfolio-defining move. You have 2 minutes to become the Wolf of Word Street.

**Lexicon Dungeon** — A 10-floor dungeon crawl where your weapon is your vocabulary. Spell words to deal damage. Longer words hit harder. Floor 10 has a boss that laughs at anything under 6 letters. Come prepared or come home in a body bag.

### What keeps players hooked

- **Daily rotation** — New mode every day. You never play the same game twice in a row
- **Fair competition** — Seeded RNG means everyone on the planet gets the exact same puzzle. No excuses
- **Leaderboards** — Daily rankings per mode. Gold, silver, bronze for the top 3. Your subreddit will have opinions about who deserves #1
- **Streaks** — Play every day, build your streak. Miss a day? Back to zero. The guilt is real
- **Interactive tutorial** — First time playing a mode? You get a slick step-by-step walkthrough. Already a pro? Skip straight to the action
- **Shareable results** — One-tap copy of your emoji scorecard. Drop it in the comments. Start arguments
- **51,000+ word dictionary** — Powered by the ENABLE word list (same one Scrabble uses). If it's a real English word, we accept it

## How we built it

Built entirely on **Reddit's Devvit platform** using **WebView interactive posts** — the game runs natively inside Reddit posts, no external links, no redirects.

**The frontend** is pure vanilla JavaScript. No React, no frameworks, no 400MB node_modules folder. Just clean HTML, CSS, and JS that loads instantly. Each of the four game modes is its own self-contained class, so adding a fifth mode someday is just dropping in a new file.

**The secret sauce** is a seeded Mulberry32 random number generator. Feed it today's date, and it spits out the same puzzle for every player on Earth. Different seed per mode, so Conquest day and Dungeon day never overlap.

**The backend** is TypeScript on Devvit with Redis handling all persistent data — leaderboards (sorted sets for instant ranking), user stats, streak tracking, and completion flags with auto-expiring TTLs to prevent replays.

**The dictionary** went through a glow-up. We started with a hand-curated list of ~2,400 words and quickly learned that players get *very* upset when the game rejects "BRAINY" as invalid. So we brought in the full ENABLE dictionary — 51,000+ words, the gold standard for competitive word games. Curated words still generate the puzzles (so they're always solvable), but the full dictionary validates your input (so you're never punished for having a good vocabulary).

## How it lives on Reddit

This isn't a game with a Reddit link. It IS a Reddit post.

- **Mods create game posts** with one click from the subreddit menu. The game loads right inside the post
- **Scores tie to Reddit accounts** — your stats, streaks, and leaderboard position follow you
- **Leaderboards are per-subreddit** — so r/wordgames and r/casualgaming have their own champions
- **Results are built for comments** — emoji grids and scorecards designed to be pasted, flexed, and debated
- **It creates daily content automatically** — no mod effort required after setup. New challenge every day, forever

## Challenges we ran into

**Balancing four completely different games** was harder than building them. A 3-minute territory conquest and a 5-minute dungeon crawl need very different scoring curves to feel equally rewarding. Lots of playtesting. Lots of spreadsheets. Lots of "this doesn't feel right yet."

**The dictionary problem** almost shipped. Our original 2,400-word list meant players were typing perfectly valid English words and getting rejected. Nothing kills a word game faster than telling someone their word isn't real. Splitting puzzle generation (curated list) from input validation (full ENABLE dictionary) solved it cleanly.

**Seeded randomness** sounds simple until you need the same seed to produce a fair Conquest grid, a solvable Cipher chain, a balanced Market economy, and a beatable Dungeon — all on the same day, for every player on the planet.

## Accomplishments we're proud of

- Four game modes that genuinely feel like four different games, not four skins on the same mechanic
- Zero external dependencies on the frontend — it loads as fast as a static page
- A tutorial system that teaches without annoying — shows up once, then gets out of your way
- The daily rotation just *works*. No curation, no manual setup. New content every day, automatically, forever

## What we learned

- If your word game doesn't accept a word that players know is real, they will hate your game. Dictionary size matters more than almost any feature
- Streaks and leaderboards aren't bonus features — they're the reason people come back on Day 2, Day 3, Day 30
- Devvit's WebView is genuinely powerful once you figure out the messaging bridge. A full interactive game running natively inside a Reddit post still feels a little like magic

## What's next

- **More modes in the rotation** — we have ideas for a word relay, a speed round, and a cooperative mode
- **Weekly and all-time leaderboards** — daily is great for competition, but people want to see who's the long-term champion
- **Community word packs** — let mods submit themed word lists (imagine a Halloween vocabulary dungeon)
- **Achievements and badges** — unlock titles for streaks, perfect games, and beating the dungeon boss
- **Difficulty tiers** — easy/medium/hard so both casual players and word nerds feel challenged

## Built With

- JavaScript
- TypeScript
- HTML5
- CSS3
- Redis
- Reddit Devvit

## Try It

https://developers.reddit.com/apps/word-arena-iii
