// DevvitBridge — communication with Devvit backend
class DevvitBridge {
  constructor() {
    this.pendingCallbacks = {};
    this.callbackId = 0;
    window.addEventListener('message', (event) => {
      const msg = event.data;

      // Devvit wraps messages as { type: 'devvit-message', data: { message: <payload> } }
      if (msg && msg.type === 'devvit-message') {
        const devvitMsg = msg.data && msg.data.message;
        if (devvitMsg && devvitMsg.type) {
          this.handleResponse(devvitMsg);
        }
        return;
      }
    });
  }

  send(type, payload, timeoutMs = 5000) {
    return new Promise((resolve, reject) => {
      const id = ++this.callbackId;
      const timer = setTimeout(() => {
        delete this.pendingCallbacks[type];
        reject(new Error(`Bridge timeout: ${type}`));
      }, timeoutMs);
      this.pendingCallbacks[type] = (msg) => {
        clearTimeout(timer);
        resolve(msg);
      };
      const msg = { type };
      if (payload) msg.payload = payload;
      window.parent.postMessage(msg, '*');
    });
  }

  handleResponse(msg) {
    // Map response types to request types
    const mapping = {
      daily_modes: 'get_daily_modes',
      score_saved: 'submit_score',
      leaderboard: 'get_leaderboard',
      stats: 'get_stats',
    };

    // For error responses, resolve the most recent pending callback
    if (msg.type === 'error') {
      const keys = Object.keys(this.pendingCallbacks);
      if (keys.length > 0) {
        const lastKey = keys[keys.length - 1];
        this.pendingCallbacks[lastKey](msg);
        delete this.pendingCallbacks[lastKey];
      }
      return;
    }

    const requestType = mapping[msg.type];
    if (requestType && this.pendingCallbacks[requestType]) {
      this.pendingCallbacks[requestType](msg);
      delete this.pendingCallbacks[requestType];
    }
  }
}

// Per-mode rules for the pregame instructions screen
const MODE_RULES = {
  conquest: [
    'You\'ll see a 6x6 grid of tiles, each hiding a scrambled word',
    'You start in one corner — tap a tile next to your territory to try it',
    'Unscramble the word correctly and that tile becomes yours',
    'Keep expanding outward to capture as many tiles as you can',
    'You have <strong>3 minutes</strong> — the more tiles you capture, the higher your score',
    '<strong>Tip:</strong> Push toward the center early so you have more tiles to reach',
  ],
  cipher: [
    'You\'ll be given 5 coded words to decode, one at a time',
    'Each stage gets harder — starting with simple scrambles, then missing vowels, shifted letters, and full cryptograms',
    'Stuck? You have <strong>3 hints</strong> to reveal letters — use them wisely',
    'Your score is based on how many stages you clear and how fast you do it',
    '<strong>Tip:</strong> Save your hints for the last couple of stages — they get tricky',
  ],
  market: [
    'You\'ll get 9 random letters, each with a price that changes daily',
    'Type words using those letters — the longer the word, the bigger the payout',
    'You can reuse letters across different words, but each word can only be submitted once',
    'You have <strong>2 minutes</strong> — your final score is your total earnings',
    '<strong>Tip:</strong> Look for long words first — they\'re worth way more than short ones',
  ],
  dungeon: [
    'You\'re exploring a 10-floor dungeon — each floor has a monster blocking your path',
    'To attack, spell a word from the letters you\'re given. Longer words deal more damage',
    'Every 3 floors you\'ll find a health potion to heal up',
    'Floor 10 has a boss — you\'ll need words with <strong>6+ letters</strong> to hurt it',
    'Your score is how many floors you clear. Survive all 10 to win!',
    '<strong>Tip:</strong> Don\'t waste short words early — save your best letters for the boss',
  ],
};

// All four modes in rotation order
const ALL_MODES = [
  { id: 'conquest', name: 'Word Conquest', icon: '\u{1F3F0}', description: 'Capture territory by unscrambling words on a 6x6 grid', timeLimit: 180 },
  { id: 'cipher', name: 'Cipher Breaker', icon: '\u{1F510}', description: 'Crack 5 increasingly difficult word codes', timeLimit: 180 },
  { id: 'market', name: 'Word Stock Market', icon: '\u{1F4C8}', description: 'Trade letters and build a word portfolio', timeLimit: 120 },
  { id: 'dungeon', name: 'Lexicon Dungeon', icon: '\u2694\uFE0F', description: 'Spell words to battle monsters across 10 floors', timeLimit: 300 },
];

// App Controller
class WordArenaApp {
  constructor() {
    this.bridge = new DevvitBridge();
    this.currentMode = null;
    this.timerInterval = null;
    this.countdownInterval = null;
    this.timeLeft = 0;
    this.gameInstance = null;
    this.completedModes = [];

    this.screens = {
      modes: document.getElementById('screen-modes'),
      pregame: document.getElementById('screen-pregame'),
      game: document.getElementById('screen-game'),
      results: document.getElementById('screen-results'),
      leaderboard: document.getElementById('screen-leaderboard'),
      stats: document.getElementById('screen-stats'),
      help: document.getElementById('screen-help'),
    };

    this.setupEventListeners();
    this.init();
  }

  // --- Daily mode helpers ---

  getTodayMode() {
    const dayNum = Seed.getDayNumber();
    return ALL_MODES[dayNum % 4];
  }

  getYesterdayMode() {
    const dayNum = Seed.getDayNumber();
    return ALL_MODES[(dayNum - 1 + 400) % 4]; // +400 to avoid negative modulo issues
  }

  getTomorrowMode() {
    const dayNum = Seed.getDayNumber();
    return ALL_MODES[(dayNum + 1) % 4];
  }

  hasSeenHelp(modeId) {
    return localStorage.getItem('wordarena_seen_help_' + modeId) === '1';
  }

  markHelpSeen(modeId) {
    localStorage.setItem('wordarena_seen_help_' + modeId, '1');
  }

  isTodayCompleted() {
    const todayMode = this.getTodayMode();
    return this.completedModes.includes(todayMode.id);
  }

  getMsUntilMidnightUTC() {
    const now = new Date();
    const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    return tomorrow.getTime() - now.getTime();
  }

  formatCountdown(ms) {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  // --- Init ---

  async init() {
    try {
      const response = await this.bridge.send('get_daily_modes');
      if (response && response.data) {
        this.completedModes = response.data.completed || [];
      }
    } catch (e) {
      console.warn('Failed to fetch daily modes from backend, using local data');
      this.completedModes = [];
    }
    // Merge localStorage completions as backup
    const localKey = `wordarena_completed_${Seed.getTodayUTC()}`;
    const localCompleted = JSON.parse(localStorage.getItem(localKey) || '[]');
    this.completedModes = [...new Set([...this.completedModes, ...localCompleted])];

    // Always render UI regardless of backend status
    this.renderDailyChallenge();
    this.loadStats();
  }

  setupEventListeners() {
    document.getElementById('btn-back-game').addEventListener('click', () => {
      this.confirmQuit();
    });
    document.getElementById('btn-back-pregame').addEventListener('click', () => {
      this.showScreen('modes');
    });
    document.getElementById('btn-copy-result').addEventListener('click', () => {
      this.copyResult();
    });
    document.getElementById('btn-back-home').addEventListener('click', () => {
      this.showScreen('modes');
      this.init();
    });
    document.getElementById('btn-stats').addEventListener('click', () => {
      this.showStats();
    });
    document.getElementById('btn-leaderboard').addEventListener('click', () => {
      this.showLeaderboard(this.getTodayMode().id);
    });
    document.getElementById('btn-close-lb').addEventListener('click', () => {
      this.showScreen('modes');
    });
    document.getElementById('btn-close-stats').addEventListener('click', () => {
      this.showScreen('modes');
    });
    document.getElementById('btn-help').addEventListener('click', () => {
      this.showScreen('help');
    });
    document.getElementById('btn-close-help').addEventListener('click', () => {
      this.showScreen('modes');
    });
    document.getElementById('screen-help').addEventListener('click', (e) => {
      const header = e.target.closest('.help-mode-header');
      if (header) {
        header.parentElement.classList.toggle('expanded');
      }
    });
  }

  showScreen(name) {
    Object.values(this.screens).forEach(s => s.classList.remove('active'));
    this.screens[name].classList.add('active');
    // Stop countdown when leaving modes screen
    if (name !== 'modes') {
      this.stopCountdown();
    }
  }

  // --- Daily challenge rendering ---

  renderDailyChallenge() {
    const container = document.getElementById('daily-content');
    const todayMode = this.getTodayMode();
    const completed = this.isTodayCompleted();

    let html = `
      <div class="daily-card">
        <div class="daily-label">Today's Challenge</div>
        <div class="daily-icon">${todayMode.icon}</div>
        <div class="daily-name">${todayMode.name}</div>
        <div class="daily-desc">${todayMode.description}</div>
    `;

    if (completed) {
      html += `
        <div class="completed-badge">Completed</div>
        <div class="countdown-wrap">
          <div class="countdown-label">Next challenge in</div>
          <div class="countdown" id="countdown-timer">${this.formatCountdown(this.getMsUntilMidnightUTC())}</div>
        </div>
      `;
    } else {
      html += `
        <button class="btn-play" id="btn-play-daily">Play</button>
      `;
    }

    html += `</div>`;

    // Schedule strip
    const yesterday = this.getYesterdayMode();
    const tomorrow = this.getTomorrowMode();
    html += `
      <div class="schedule-strip">
        <div class="schedule-day">
          <div class="schedule-label">Yesterday</div>
          <div class="schedule-icon">${yesterday.icon}</div>
          <div class="schedule-mode">${yesterday.name.replace('Word ', '').replace('Lexicon ', '')}</div>
        </div>
        <div class="schedule-day today">
          <div class="schedule-label">Today</div>
          <div class="schedule-icon">${todayMode.icon}</div>
          <div class="schedule-mode">${todayMode.name.replace('Word ', '').replace('Lexicon ', '')}</div>
        </div>
        <div class="schedule-day">
          <div class="schedule-label">Tomorrow</div>
          <div class="schedule-icon">${tomorrow.icon}</div>
          <div class="schedule-mode">${tomorrow.name.replace('Word ', '').replace('Lexicon ', '')}</div>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Bind play button
    if (!completed) {
      document.getElementById('btn-play-daily').addEventListener('click', () => {
        const todayMode = this.getTodayMode();
        if (this.hasSeenHelp(todayMode.id)) {
          this.startGame();
        } else {
          this.showPregame();
        }
      });
    } else {
      this.startCountdown();
    }
  }

  showPregame() {
    const mode = this.getTodayMode();
    this.pregameRules = MODE_RULES[mode.id] || [];
    this.pregameStep = 0;

    document.getElementById('pregame-title').textContent = mode.name;
    this.showScreen('pregame');
    this.renderPregameStep();
  }

  renderPregameStep() {
    const mode = this.getTodayMode();
    const rules = this.pregameRules;
    const step = this.pregameStep;
    const total = rules.length;
    const isLast = step === total - 1;

    // Build dot indicators
    let dots = '';
    for (let i = 0; i < total; i++) {
      dots += `<div class="pregame-dot${i === step ? ' active' : i < step ? ' done' : ''}"></div>`;
    }

    const html = `
      <div class="pregame-icon">${mode.icon}</div>
      <div class="pregame-name">${mode.name}</div>
      <div class="pregame-dots">${dots}</div>
      <div class="pregame-step-card">
        <div class="pregame-step-title">Step ${step + 1} of ${total}</div>
        <div class="pregame-step-text">${rules[step]}</div>
      </div>
      <div class="pregame-actions">
        <button class="btn-play" id="btn-pregame-next">${isLast ? 'Start Game' : 'Next'}</button>
        <button class="btn-skip" id="btn-pregame-skip">Skip — let me play</button>
      </div>
    `;

    document.getElementById('pregame-body').innerHTML = html;

    document.getElementById('btn-pregame-next').addEventListener('click', () => {
      if (isLast) {
        this.markHelpSeen(mode.id);
        this.startGame();
      } else {
        this.pregameStep++;
        this.renderPregameStep();
      }
    });

    document.getElementById('btn-pregame-skip').addEventListener('click', () => {
      this.markHelpSeen(mode.id);
      this.startGame();
    });
  }

  startCountdown() {
    this.stopCountdown();
    const el = document.getElementById('countdown-timer');
    if (!el) return;
    this.countdownInterval = setInterval(() => {
      const ms = this.getMsUntilMidnightUTC();
      if (el) el.textContent = this.formatCountdown(ms);
      if (ms <= 0) {
        this.stopCountdown();
        this.init(); // Refresh for the new day
      }
    }, 1000);
  }

  stopCountdown() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  // --- Game lifecycle ---

  startGame() {
    const mode = this.getTodayMode();
    if (this.isTodayCompleted()) return;

    this.currentMode = mode;
    this.timeLeft = mode.timeLimit;
    document.getElementById('game-title').textContent = mode.name;
    document.getElementById('game-area').innerHTML = '';
    this.showScreen('game');
    this.updateTimerDisplay();
    this.startTimer();

    // Initialize the game mode
    switch (mode.id) {
      case 'conquest':
        this.gameInstance = new WordConquest(this);
        break;
      case 'cipher':
        this.gameInstance = new CipherBreaker(this);
        break;
      case 'market':
        this.gameInstance = new WordStockMarket(this);
        break;
      case 'dungeon':
        this.gameInstance = new LexiconDungeon(this);
        break;
    }
  }

  startTimer() {
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      this.timeLeft--;
      this.updateTimerDisplay();
      if (this.timeLeft <= 0) {
        this.stopTimer();
        if (this.gameInstance && this.gameInstance.onTimeUp) {
          this.gameInstance.onTimeUp();
        }
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  updateTimerDisplay() {
    const mins = Math.floor(this.timeLeft / 60);
    const secs = this.timeLeft % 60;
    const display = `${mins}:${String(secs).padStart(2, '0')}`;
    document.getElementById('game-timer').textContent = display;
    if (this.timeLeft <= 10) {
      document.getElementById('game-timer').style.color = '#e74c3c';
    } else {
      document.getElementById('game-timer').style.color = '#f7c948';
    }
  }

  getTimeUsed() {
    return this.currentMode.timeLimit - this.timeLeft;
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  }

  async endGame(score, details, shareText) {
    this.stopTimer();
    const mode = this.currentMode;

    // Show results screen
    document.getElementById('results-title').textContent = mode.name;
    document.getElementById('results-score').textContent = score;
    document.getElementById('results-details').textContent = details;
    document.getElementById('results-emoji').textContent = shareText;
    document.getElementById('results-rank').textContent = 'Saving...';
    this.showScreen('results');

    // Store share text for copying
    this._shareText = shareText;

    // Save completion locally to prevent replays
    if (!this.completedModes.includes(mode.id)) {
      this.completedModes.push(mode.id);
    }
    const localKey = `wordarena_completed_${Seed.getTodayUTC()}`;
    const localCompleted = JSON.parse(localStorage.getItem(localKey) || '[]');
    if (!localCompleted.includes(mode.id)) {
      localCompleted.push(mode.id);
      localStorage.setItem(localKey, JSON.stringify(localCompleted));
    }

    // Submit score to backend
    try {
      const response = await this.bridge.send('submit_score', {
        mode: mode.id,
        score: score,
        details: {},
        shareText: shareText,
      });
      if (response && response.data) {
        const { rank, totalPlayers } = response.data;
        document.getElementById('results-rank').textContent =
          `Rank: #${rank} of ${totalPlayers} players today`;
      }
    } catch (e) {
      document.getElementById('results-rank').textContent = '';
    }
  }

  copyResult() {
    const text = this._shareText || '';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => this.showCopyToast());
    } else {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      this.showCopyToast();
    }
  }

  showCopyToast() {
    const toast = document.getElementById('copy-toast');
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 1500);
  }

  confirmQuit() {
    this.stopTimer();
    if (this.gameInstance && this.gameInstance.cleanup) {
      this.gameInstance.cleanup();
    }
    this.gameInstance = null;
    this.showScreen('modes');
  }

  async showLeaderboard(mode) {
    this.showScreen('leaderboard');
    const tabs = document.getElementById('lb-tabs');
    tabs.innerHTML = '';
    const modeList = [
      { id: 'conquest', name: 'Conquest' },
      { id: 'cipher', name: 'Cipher' },
      { id: 'market', name: 'Market' },
      { id: 'dungeon', name: 'Dungeon' },
    ];
    modeList.forEach(m => {
      const tab = document.createElement('div');
      tab.className = 'lb-tab' + (m.id === mode ? ' active' : '');
      tab.textContent = m.name;
      tab.addEventListener('click', () => this.loadLeaderboard(m.id, tabs));
      tabs.appendChild(tab);
    });
    this.loadLeaderboard(mode, tabs);
  }

  async loadLeaderboard(mode, tabsEl) {
    // Update active tab
    if (tabsEl) {
      tabsEl.querySelectorAll('.lb-tab').forEach((t, i) => {
        t.classList.toggle('active', ['conquest', 'cipher', 'market', 'dungeon'][i] === mode);
      });
    }

    const list = document.getElementById('lb-list');
    list.innerHTML = '<div class="lb-empty">Loading...</div>';

    try {
      const response = await this.bridge.send('get_leaderboard', { mode });
      if (response && response.data && response.data.entries && response.data.entries.length) {
        list.innerHTML = '';
        response.data.entries.forEach(entry => {
          const row = document.createElement('div');
          row.className = 'lb-entry';
          const rankClass = entry.rank === 1 ? 'gold' : entry.rank === 2 ? 'silver' : entry.rank === 3 ? 'bronze' : '';
          row.innerHTML = `
            <div class="lb-rank ${rankClass}">#${entry.rank}</div>
            <div class="lb-name">${entry.username}</div>
            <div class="lb-score">${entry.score}</div>
          `;
          list.appendChild(row);
        });
      } else {
        list.innerHTML = '<div class="lb-empty">No scores yet today. Be the first!</div>';
      }
    } catch (e) {
      list.innerHTML = '<div class="lb-empty">Could not load leaderboard</div>';
    }
  }

  async loadStats() {
    try {
      const response = await this.bridge.send('get_stats');
      if (response && response.data) {
        const stats = response.data;
        if (stats.streak > 0) {
          document.getElementById('streak-badge').style.display = 'inline-block';
          document.getElementById('streak-count').textContent = stats.streak;
        }
      }
    } catch (e) { /* ignore */ }
  }

  async showStats() {
    this.showScreen('stats');
    const content = document.getElementById('stats-content');
    content.innerHTML = '<div class="lb-empty">Loading...</div>';

    try {
      const response = await this.bridge.send('get_stats');
      if (response && response.data) {
        const stats = response.data;
        const modeNames = { conquest: 'Word Conquest', cipher: 'Cipher Breaker', market: 'Stock Market', dungeon: 'Lexicon Dungeon' };
        let html = `
          <div class="stats-row">
            <span class="stats-label">Games Played</span>
            <span class="stats-value">${stats.gamesPlayed || 0}</span>
          </div>
          <div class="stats-row">
            <span class="stats-label">Current Streak</span>
            <span class="stats-value">${stats.streak || 0} days</span>
          </div>
          <div class="stats-best-title">Best Scores</div>
        `;
        const best = stats.bestScores || {};
        for (const [mode, name] of Object.entries(modeNames)) {
          html += `
            <div class="stats-best-row">
              <span class="stats-best-mode">${name}</span>
              <span class="stats-best-score">${best[mode] || '-'}</span>
            </div>
          `;
        }
        content.innerHTML = html;
      } else {
        content.innerHTML = '<div class="lb-empty">No stats yet</div>';
      }
    } catch (e) {
      content.innerHTML = '<div class="lb-empty">Could not load stats</div>';
    }
  }
}

// Initialize
const app = new WordArenaApp();
