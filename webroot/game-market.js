// Word Stock Market — letter trading game
class WordStockMarket {
  constructor(app) {
    this.app = app;
    this.rng = Seed.createModeRng('market');
    this.letters = [];
    this.letterPrices = {};
    this.wordsFormed = [];
    this.portfolioValue = 0;

    this.generateLetters();
    this.render();
  }

  generateLetters() {
    // Letter price tiers
    const prices = {
      a: 1, e: 1, i: 1, o: 1, u: 2,
      t: 2, n: 2, s: 2, r: 2, l: 3, d: 3,
      g: 4, b: 4, c: 4, m: 4, p: 4,
      f: 5, h: 5, v: 5, w: 5, y: 5,
      k: 6, j: 8, x: 8, q: 10, z: 10,
    };

    // Add some daily variation
    this.letterPrices = {};
    for (const [letter, base] of Object.entries(prices)) {
      const variance = Math.floor(this.rng() * 3) - 1; // -1, 0, or +1
      this.letterPrices[letter] = Math.max(1, base + variance);
    }

    // Deal 9 random letters, weighted toward common letters
    const letterPool = [];
    const commonLetters = 'aaeeeiioouutnnsrrllddggbbccmmpphh'.split('');
    const rareLetters = 'fwyvkjxqz'.split('');
    letterPool.push(...commonLetters, ...commonLetters, ...rareLetters);

    const dealt = Seed.seededPick(letterPool, 9, this.rng);
    this.letters = dealt;
  }

  getWordValue(word) {
    let baseValue = 0;
    for (const ch of word) {
      baseValue += this.letterPrices[ch] || 1;
    }
    // Length multiplier
    const len = word.length;
    let multiplier = 1;
    if (len === 4) multiplier = 1.5;
    else if (len === 5) multiplier = 2;
    else if (len >= 6) multiplier = 3;

    return Math.floor(baseValue * multiplier);
  }

  canFormWord(word) {
    // Check if word can be formed from available letters
    const available = [...this.letters];
    for (const ch of word) {
      const idx = available.indexOf(ch);
      if (idx === -1) return false;
      available.splice(idx, 1);
    }
    return true;
  }

  render() {
    const area = document.getElementById('game-area');
    area.innerHTML = '';

    // Portfolio value bar
    const scoreBar = document.createElement('div');
    scoreBar.className = 'game-score-bar';
    scoreBar.innerHTML = `
      <div><span class="label">Portfolio: </span><span class="value" id="market-value">$${this.portfolioValue.toLocaleString()}</span></div>
      <div><span class="label">Words: </span><span class="value" id="market-word-count">${this.wordsFormed.length}</span></div>
    `;
    area.appendChild(scoreBar);

    // Letters display
    const lettersEl = document.createElement('div');
    lettersEl.className = 'market-letters';
    this.letters.forEach(letter => {
      const el = document.createElement('div');
      el.className = 'market-letter';
      el.innerHTML = `${letter}<span class="price">$${this.letterPrices[letter] || 1}</span>`;
      lettersEl.appendChild(el);
    });
    area.appendChild(lettersEl);

    // Input
    const inputArea = document.createElement('div');
    inputArea.innerHTML = `
      <div class="game-input-row">
        <input class="game-input" id="market-input" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="Form a word from your letters..." />
        <button class="btn-submit" id="market-submit">Sell</button>
      </div>
    `;
    area.appendChild(inputArea);

    const input = inputArea.querySelector('#market-input');
    const btn = inputArea.querySelector('#market-submit');
    input.focus();

    const tryWord = () => {
      const word = input.value.trim().toLowerCase();
      if (word.length < 3) {
        this.flashInput(input, 'wrong');
        return;
      }
      if (!WordDict.ALL_WORDS.has(word)) {
        this.flashInput(input, 'wrong');
        return;
      }
      if (!this.canFormWord(word)) {
        this.flashInput(input, 'wrong');
        return;
      }
      if (this.wordsFormed.some(w => w.word === word)) {
        this.flashInput(input, 'wrong');
        return;
      }

      const value = this.getWordValue(word);
      this.wordsFormed.push({ word, value });
      this.portfolioValue += value;
      input.value = '';
      this.render();
    };

    btn.addEventListener('click', tryWord);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') tryWord();
    });

    // Words formed list
    if (this.wordsFormed.length > 0) {
      const wordsEl = document.createElement('div');
      wordsEl.className = 'market-words';
      // Show in reverse order (newest first)
      [...this.wordsFormed].reverse().forEach(w => {
        const row = document.createElement('div');
        row.className = 'market-word';
        row.innerHTML = `<span class="word">${w.word}</span><span class="val">+$${w.value}</span>`;
        wordsEl.appendChild(row);
      });
      area.appendChild(wordsEl);
    }
  }

  flashInput(input, cls) {
    input.classList.add(cls, 'shake');
    setTimeout(() => {
      input.classList.remove(cls, 'shake');
      input.value = '';
    }, 400);
  }

  onTimeUp() {
    this.finishGame();
  }

  finishGame() {
    this.app.stopTimer();
    const timeUsed = this.app.getTimeUsed();
    const finalScore = this.portfolioValue;

    // Price tier bar (visual representation)
    const tiers = ['\u{1F7E2}', '\u{1F7E1}', '\u{1F7E0}', '\u{1F534}']; // green, yellow, orange, red
    let tierBar = '';
    this.wordsFormed.forEach(w => {
      if (w.value >= 50) tierBar += tiers[3];
      else if (w.value >= 30) tierBar += tiers[2];
      else if (w.value >= 15) tierBar += tiers[1];
      else tierBar += tiers[0];
    });
    if (!tierBar) tierBar = '-';

    const timeStr = this.app.formatTime(timeUsed);
    const trend = this.portfolioValue >= 500 ? '\u{1F4C8}' : '\u{1F4C9}';
    const dayNum = Seed.getDayNumber();
    const shareText = `Word Arena #${dayNum}\nMARKET $${this.portfolioValue.toLocaleString()} ${trend} ${this.wordsFormed.length} words\n${tierBar}\n#WordArena`;
    const details = `$${this.portfolioValue.toLocaleString()} portfolio \u00B7 ${this.wordsFormed.length} words`;

    this.app.endGame(finalScore, details, shareText);
  }

  cleanup() {}
}

window.WordStockMarket = WordStockMarket;
