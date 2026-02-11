// Cipher Breaker — 5-stage code cracking game
class CipherBreaker {
  constructor(app) {
    this.app = app;
    this.rng = Seed.createModeRng('cipher');
    this.currentStage = 0;
    this.totalStages = 5;
    this.hints = 3;
    this.stages = [];
    this.solved = [];

    this.generateStages();
    this.render();
  }

  generateStages() {
    // Stage 1: Unscramble a 4-letter word
    const word4 = Seed.seededPick(WordDict.WORDS_BY_LENGTH[4] || [], 1, this.rng)[0] || 'game';
    this.stages.push({
      type: 'scramble',
      label: 'Unscramble (4 letters)',
      puzzle: this.scramble(word4),
      answer: word4,
      hint: null,
    });

    // Stage 2: Unscramble a 6-letter word
    const word6 = Seed.seededPick(WordDict.WORDS_BY_LENGTH[6] || [], 1, this.rng)[0] || 'battle';
    this.stages.push({
      type: 'scramble',
      label: 'Unscramble (6 letters)',
      puzzle: this.scramble(word6),
      answer: word6,
      hint: null,
    });

    // Stage 3: Fill in missing vowels
    const word5a = Seed.seededPick(WordDict.WORDS_BY_LENGTH[5] || [], 1, this.rng)[0] || 'brave';
    const word5b = Seed.seededPick(WordDict.WORDS_BY_LENGTH[5] || [], 2, this.rng)[1] || 'light';
    const phrase = word5a + ' ' + word5b;
    const vowelless = phrase.replace(/[aeiou]/gi, '_');
    this.stages.push({
      type: 'vowels',
      label: 'Fill in the vowels',
      puzzle: vowelless,
      answer: phrase,
      hint: null,
    });

    // Stage 4: Caesar cipher (shift by N)
    const word7 = Seed.seededPick(WordDict.WORDS_BY_LENGTH[7] || [], 1, this.rng)[0] || 'mystery';
    const shift = Math.floor(this.rng() * 10) + 3; // shift 3-12
    const caesarEncoded = this.caesarEncode(word7, shift);
    this.stages.push({
      type: 'caesar',
      label: `Caesar Cipher (shift ${shift})`,
      puzzle: caesarEncoded,
      answer: word7,
      hint: `Shift each letter back by ${shift}`,
      shiftAmount: shift,
    });

    // Stage 5: Cryptogram (letter substitution)
    const word6b = Seed.seededPick(WordDict.WORDS_BY_LENGTH[6] || [], 2, this.rng)[1] || 'cipher';
    const cryptogram = this.makeCryptogram(word6b);
    this.stages.push({
      type: 'cryptogram',
      label: 'Cryptogram',
      puzzle: cryptogram.encoded,
      answer: word6b,
      hint: null,
      substitution: cryptogram.map,
    });

    // Pre-generate hints
    this.stages[0].hint = `First letter: ${word4[0].toUpperCase()}`;
    this.stages[1].hint = `First letter: ${word6[0].toUpperCase()}`;
    this.stages[2].hint = `First word starts with: ${word5a[0].toUpperCase()}`;
    // Stage 4 already has hint
    this.stages[4].hint = `First letter decodes to: ${word6b[0].toUpperCase()}`;
  }

  scramble(word) {
    const letters = word.split('');
    let result;
    let attempts = 0;
    do {
      result = Seed.seededShuffle(letters, this.rng).join('');
      attempts++;
    } while (result === word && attempts < 10);
    return result;
  }

  caesarEncode(word, shift) {
    return word.split('').map(c => {
      const code = c.charCodeAt(0);
      if (code >= 97 && code <= 122) {
        return String.fromCharCode(((code - 97 + shift) % 26) + 97);
      }
      return c;
    }).join('');
  }

  makeCryptogram(word) {
    // Create a random letter substitution
    const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');
    const shuffled = Seed.seededShuffle(alphabet, this.rng);
    const map = {};
    for (let i = 0; i < 26; i++) {
      map[alphabet[i]] = shuffled[i];
    }
    const encoded = word.split('').map(c => map[c] || c).join('');
    return { encoded, map };
  }

  render() {
    const area = document.getElementById('game-area');
    area.innerHTML = '';

    // Progress dots
    const progress = document.createElement('div');
    progress.className = 'cipher-progress';
    for (let i = 0; i < this.totalStages; i++) {
      const dot = document.createElement('div');
      dot.className = 'cipher-dot';
      if (i < this.currentStage) dot.classList.add('done');
      if (i === this.currentStage) dot.classList.add('active');
      progress.appendChild(dot);
    }
    area.appendChild(progress);

    // Score bar
    const scoreBar = document.createElement('div');
    scoreBar.className = 'game-score-bar';
    scoreBar.innerHTML = `
      <div><span class="label">Stage: </span><span class="value">${this.currentStage + 1}/${this.totalStages}</span></div>
      <div><span class="label">Hints: </span><span class="value">${'\u{1F4A1}'.repeat(this.hints)}${'  '.repeat(3 - this.hints)}</span></div>
    `;
    area.appendChild(scoreBar);

    if (this.currentStage >= this.totalStages) {
      this.finishGame();
      return;
    }

    const stage = this.stages[this.currentStage];

    // Stage card
    const card = document.createElement('div');
    card.className = 'cipher-stage';
    card.innerHTML = `
      <div class="cipher-stage-header">
        <span class="cipher-stage-num">Stage ${this.currentStage + 1}</span>
        <span class="cipher-stage-type">${stage.label}</span>
      </div>
      <div class="cipher-puzzle" id="cipher-puzzle">${stage.puzzle.toUpperCase()}</div>
      <div class="game-input-row">
        <input class="game-input" id="cipher-input" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="Type your answer..." />
        <button class="btn-submit" id="cipher-submit">Go</button>
      </div>
      <div style="display:flex;gap:8px;margin-top:8px;">
        <button class="cipher-hint-btn" id="cipher-hint" ${this.hints <= 0 ? 'disabled' : ''}>\u{1F4A1} Use Hint (${this.hints} left)</button>
        <button class="cipher-hint-btn" id="cipher-skip">Skip \u27A1\uFE0F</button>
      </div>
      <div id="cipher-hint-text" style="color:#f7c948;font-size:12px;margin-top:6px;"></div>
    `;
    area.appendChild(card);

    const input = card.querySelector('#cipher-input');
    const btn = card.querySelector('#cipher-submit');
    const hintBtn = card.querySelector('#cipher-hint');
    const skipBtn = card.querySelector('#cipher-skip');
    input.focus();

    const tryAnswer = () => {
      const answer = input.value.trim().toLowerCase();
      if (answer === stage.answer) {
        input.classList.add('correct');
        this.solved.push(this.currentStage);
        this.currentStage++;
        setTimeout(() => this.render(), 400);
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

    hintBtn.addEventListener('click', () => {
      if (this.hints > 0) {
        this.hints--;
        document.getElementById('cipher-hint-text').textContent = stage.hint || 'No additional hint';
        hintBtn.textContent = `\u{1F4A1} Use Hint (${this.hints} left)`;
        if (this.hints <= 0) hintBtn.disabled = true;
      }
    });

    skipBtn.addEventListener('click', () => {
      this.currentStage++;
      this.render();
    });
  }

  onTimeUp() {
    this.finishGame();
  }

  finishGame() {
    this.app.stopTimer();
    const stagesCompleted = this.solved.length;
    const timeUsed = this.app.getTimeUsed();
    const timeBonus = Math.max(0, Math.floor((this.app.currentMode.timeLimit - timeUsed) / 5));
    const hintBonus = this.hints * 5;
    const stageScore = stagesCompleted * 20;
    const finalScore = stageScore + timeBonus + hintBonus;

    // Generate shareable
    let progressBar = '';
    for (let i = 0; i < this.totalStages; i++) {
      progressBar += this.solved.includes(i) ? '\u{1F7E9}' : '\u{1F7E5}';
    }

    const timeStr = this.app.formatTime(timeUsed);
    const dayNum = Seed.getDayNumber();
    const shareText = `Word Arena #${dayNum}\nCIPHER ${stagesCompleted}/${this.totalStages} \u23F1\uFE0F${timeStr} \u{1F4A1}${this.hints}\n${progressBar}\n#WordArena`;
    const details = `${stagesCompleted}/${this.totalStages} stages \u00B7 Time: +${timeBonus} \u00B7 Hints: +${hintBonus}`;

    this.app.endGame(finalScore, details, shareText);
  }

  cleanup() {}
}

window.CipherBreaker = CipherBreaker;
