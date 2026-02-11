// Word Conquest — 6x6 territory grid game
class WordConquest {
  constructor(app) {
    this.app = app;
    this.rng = Seed.createModeRng('conquest');
    this.gridSize = 6;
    this.grid = []; // { word, scrambled, captured, row, col }
    this.captured = new Set();
    this.selected = null;
    this.score = 0;

    this.generateGrid();
    this.render();
  }

  generateGrid() {
    // Pick 36 words of length 4-6 for the grid
    const pool = [];
    for (let len = 4; len <= 6; len++) {
      const words = WordDict.WORDS_BY_LENGTH[len] || [];
      pool.push(...words);
    }
    const picked = Seed.seededPick(pool, this.gridSize * this.gridSize, this.rng);

    for (let r = 0; r < this.gridSize; r++) {
      this.grid[r] = [];
      for (let c = 0; c < this.gridSize; c++) {
        const idx = r * this.gridSize + c;
        const word = picked[idx] || 'word';
        this.grid[r][c] = {
          word: word,
          scrambled: this.scrambleWord(word),
          captured: false,
          row: r,
          col: c,
        };
      }
    }

    // Start from top-left corner — mark it as captured (free)
    this.grid[0][0].captured = true;
    this.captured.add('0,0');
    this.score = 1;
  }

  scrambleWord(word) {
    const letters = word.split('');
    // Ensure the scramble is different from the original
    let scrambled;
    let attempts = 0;
    do {
      scrambled = Seed.seededShuffle(letters, this.rng).join('');
      attempts++;
    } while (scrambled === word && attempts < 10);
    return scrambled;
  }

  isAvailable(r, c) {
    if (this.grid[r][c].captured) return false;
    // Check adjacency to any captured tile
    const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < this.gridSize && nc >= 0 && nc < this.gridSize) {
        if (this.grid[nr][nc].captured) return true;
      }
    }
    return false;
  }

  render() {
    const area = document.getElementById('game-area');
    area.innerHTML = '';

    // Score bar
    const scoreBar = document.createElement('div');
    scoreBar.className = 'game-score-bar';
    scoreBar.innerHTML = `
      <div><span class="label">Captured: </span><span class="value" id="conquest-count">${this.captured.size}/${this.gridSize * this.gridSize}</span></div>
      <div><span class="label">Score: </span><span class="value" id="conquest-score">${this.score}</span></div>
    `;
    area.appendChild(scoreBar);

    // Grid
    const gridEl = document.createElement('div');
    gridEl.className = 'conquest-grid';
    gridEl.id = 'conquest-grid';

    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        const tile = this.grid[r][c];
        const el = document.createElement('div');
        el.className = 'conquest-tile';
        el.dataset.row = r;
        el.dataset.col = c;

        if (tile.captured) {
          el.classList.add('captured');
          el.textContent = tile.word;
        } else if (this.isAvailable(r, c)) {
          el.classList.add('available');
          el.textContent = tile.scrambled;
          el.addEventListener('click', () => this.selectTile(r, c));
        } else {
          el.classList.add('locked');
          el.textContent = tile.scrambled;
        }

        if (this.selected && this.selected.row === r && this.selected.col === c) {
          el.classList.add('selected');
        }

        gridEl.appendChild(el);
      }
    }
    area.appendChild(gridEl);

    // Input area (shown when a tile is selected)
    if (this.selected) {
      const tile = this.grid[this.selected.row][this.selected.col];
      const inputArea = document.createElement('div');
      inputArea.style.marginTop = '10px';
      inputArea.innerHTML = `
        <div style="text-align:center;margin-bottom:8px;color:#999;font-size:13px;">
          Unscramble: <strong style="color:#f7c948;letter-spacing:2px;text-transform:uppercase;">${tile.scrambled}</strong>
        </div>
        <div class="game-input-row">
          <input class="game-input" id="conquest-input" type="text" maxlength="${tile.word.length}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="Type your answer..." />
          <button class="btn-submit" id="conquest-submit">Go</button>
        </div>
      `;
      area.appendChild(inputArea);

      const input = inputArea.querySelector('#conquest-input');
      const btn = inputArea.querySelector('#conquest-submit');
      input.focus();

      const tryAnswer = () => {
        const answer = input.value.trim().toLowerCase();
        if (answer === tile.word) {
          this.captureTile(this.selected.row, this.selected.col);
        } else {
          input.classList.add('wrong');
          input.classList.add('shake');
          setTimeout(() => {
            input.classList.remove('wrong', 'shake');
            input.value = '';
          }, 400);
        }
      };

      btn.addEventListener('click', tryAnswer);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') tryAnswer();
      });
    }
  }

  selectTile(r, c) {
    this.selected = { row: r, col: c };
    this.render();
  }

  captureTile(r, c) {
    this.grid[r][c].captured = true;
    this.captured.add(`${r},${c}`);
    this.score = this.captured.size;
    this.selected = null;

    // Check if all tiles captured
    if (this.captured.size >= this.gridSize * this.gridSize) {
      this.finishGame();
      return;
    }

    this.render();
  }

  onTimeUp() {
    this.finishGame();
  }

  finishGame() {
    this.app.stopTimer();
    const totalTiles = this.gridSize * this.gridSize;
    const timeUsed = this.app.getTimeUsed();
    const timeBonus = Math.max(0, Math.floor((this.app.currentMode.timeLimit - timeUsed) / 3));
    const finalScore = this.score + timeBonus;

    // Generate emoji grid
    let emojiGrid = '';
    for (let r = 0; r < this.gridSize; r++) {
      let row = '';
      for (let c = 0; c < this.gridSize; c++) {
        row += this.grid[r][c].captured ? '\u{1F7E9}' : '\u2B1C';
      }
      emojiGrid += row + '\n';
    }

    const timeStr = this.app.formatTime(timeUsed);
    const dayNum = Seed.getDayNumber();
    const shareText = `Word Arena #${dayNum}\nCONQUEST ${this.captured.size}/${totalTiles} \u23F1\uFE0F${timeStr}\n\n${emojiGrid}\n#WordArena`;
    const details = `${this.captured.size}/${totalTiles} tiles captured \u00B7 Time bonus: +${timeBonus}`;

    this.app.endGame(finalScore, details, shareText);
  }

  cleanup() {
    // Nothing to clean up
  }
}

window.WordConquest = WordConquest;
