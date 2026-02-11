// Seeded RNG (mulberry32) for deterministic daily puzzles
function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Get today's date string in UTC for consistent global daily puzzles
function getTodayUTC() {
  const today = new Date();
  return `${today.getUTCFullYear()}-${String(today.getUTCMonth()+1).padStart(2,'0')}-${String(today.getUTCDate()).padStart(2,'0')}`;
}

// Day number since Jan 1, 2025 (Day 1)
function getDayNumber() {
  const today = new Date();
  const epoch = Date.UTC(2025, 0, 1);
  const todayUTC = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.floor((todayUTC - epoch) / (24 * 60 * 60 * 1000)) + 1;
}

// Generate a daily seed from UTC date string
function getDailySeed() {
  const dateStr = getTodayUTC();
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash;
}

// Create a seeded RNG for a specific mode
function createModeRng(mode) {
  const baseSeed = getDailySeed();
  // Mix in mode name to get different puzzles per mode
  let modeSeed = baseSeed;
  for (let i = 0; i < mode.length; i++) {
    modeSeed = ((modeSeed << 5) - modeSeed) + mode.charCodeAt(i);
    modeSeed |= 0;
  }
  return mulberry32(modeSeed);
}

// Shuffle an array with a seeded RNG
function seededShuffle(arr, rng) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Pick N random items from array
function seededPick(arr, n, rng) {
  const shuffled = seededShuffle(arr, rng);
  return shuffled.slice(0, n);
}

window.Seed = { mulberry32, getDailySeed, createModeRng, seededShuffle, seededPick, getTodayUTC, getDayNumber };
