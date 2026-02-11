// Lexicon Dungeon — RPG word crawler
class LexiconDungeon {
  constructor(app) {
    this.app = app;
    this.rng = Seed.createModeRng('dungeon');
    this.totalFloors = 10;
    this.currentFloor = 1;
    this.playerHP = 100;
    this.maxPlayerHP = 100;
    this.monsterHP = 0;
    this.monsterMaxHP = 0;
    this.potions = 0; // Earned every 3 floors
    this.combatLog = [];
    this.floorLetters = [];
    this.usedWords = new Set();
    this.gameOver = false;
    this.floorsCleared = 0;

    // Monster damage per floor
    this.monsterDamage = [5, 8, 10, 12, 15, 18, 20, 22, 25, 30];
    // Monster HP per floor
    this.monsterHPTable = [30, 40, 50, 60, 70, 80, 90, 100, 120, 150];
    // Monster names
    this.monsterNames = ['Goblin', 'Skeleton', 'Orc', 'Wraith', 'Troll', 'Vampire', 'Golem', 'Hydra', 'Dragon', 'Lich King'];

    this.setupFloor();
    this.render();
  }

  setupFloor() {
    const floor = this.currentFloor;
    this.monsterMaxHP = this.monsterHPTable[floor - 1] || 50;
    this.monsterHP = this.monsterMaxHP;

    // Generate 8 random letters for this floor
    const vowels = 'aeiou'.split('');
    const consonants = 'bcdfghjklmnpqrstvwxyz'.split('');

    // Ensure at least 3 vowels and 5 consonants
    const floorVowels = Seed.seededPick(vowels, 3, this.rng);
    const floorConsonants = Seed.seededPick(consonants, 5, this.rng);
    this.floorLetters = Seed.seededShuffle([...floorVowels, ...floorConsonants], this.rng);
    this.usedWords.clear();

    // Award potion every 3 floors
    if (floor > 1 && (floor - 1) % 3 === 0) {
      this.potions++;
      this.combatLog.push({ type: 'heal', text: `Found a healing potion! (${this.potions} available)` });
    }
  }

  getWordDamage(word) {
    return word.length * 5;
  }

  canFormWord(word) {
    const available = [...this.floorLetters];
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

    if (this.gameOver) return;

    const floor = this.currentFloor;
    const monsterName = this.monsterNames[floor - 1] || 'Monster';

    // Floor info
    const floorInfo = document.createElement('div');
    floorInfo.className = 'dungeon-floor-info';
    floorInfo.innerHTML = `
      <div class="dungeon-floor-num">Floor ${floor}/${this.totalFloors}</div>
      <div class="dungeon-monster">${monsterName} (ATK: ${this.monsterDamage[floor - 1]})</div>
    `;
    area.appendChild(floorInfo);

    // HP bars
    const bars = document.createElement('div');
    bars.className = 'dungeon-bars';

    const playerPct = Math.max(0, (this.playerHP / this.maxPlayerHP) * 100);
    const monsterPct = Math.max(0, (this.monsterHP / this.monsterMaxHP) * 100);

    bars.innerHTML = `
      <div class="dungeon-bar">
        <div class="dungeon-bar-label">Your HP</div>
        <div class="dungeon-bar-track">
          <div class="dungeon-bar-fill hp" style="width:${playerPct}%"></div>
          <div class="dungeon-bar-text">${this.playerHP}/${this.maxPlayerHP}</div>
        </div>
      </div>
      <div class="dungeon-bar">
        <div class="dungeon-bar-label">${monsterName}</div>
        <div class="dungeon-bar-track">
          <div class="dungeon-bar-fill monster" style="width:${monsterPct}%"></div>
          <div class="dungeon-bar-text">${this.monsterHP}/${this.monsterMaxHP}</div>
        </div>
      </div>
    `;
    area.appendChild(bars);

    // Letters
    const lettersEl = document.createElement('div');
    lettersEl.className = 'dungeon-letters';
    this.floorLetters.forEach(letter => {
      const el = document.createElement('div');
      el.className = 'dungeon-letter';
      el.textContent = letter;
      lettersEl.appendChild(el);
    });
    area.appendChild(lettersEl);

    // Boss warning
    if (floor === 10) {
      const warning = document.createElement('div');
      warning.style.cssText = 'text-align:center;color:#e74c3c;font-size:11px;margin-bottom:6px;font-weight:600;';
      warning.textContent = 'BOSS: Only 6+ letter words deal damage!';
      area.appendChild(warning);
    }

    // Input
    const inputArea = document.createElement('div');
    inputArea.innerHTML = `
      <div class="game-input-row">
        <input class="game-input" id="dungeon-input" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="Spell a word to attack..." />
        <button class="btn-submit" id="dungeon-attack">ATK</button>
      </div>
      <div style="display:flex;gap:8px;margin-top:6px;">
        <button class="dungeon-potion" id="dungeon-potion" ${this.potions <= 0 ? 'disabled' : ''}>\u{1F9EA} Potion +20HP (${this.potions})</button>
      </div>
    `;
    area.appendChild(inputArea);

    const input = inputArea.querySelector('#dungeon-input');
    const atkBtn = inputArea.querySelector('#dungeon-attack');
    const potionBtn = inputArea.querySelector('#dungeon-potion');
    input.focus();

    const tryAttack = () => {
      const word = input.value.trim().toLowerCase();

      if (word.length < 3) {
        this.flashInput(input, 'wrong');
        return;
      }
      if (!WordDict.ALL_WORDS.has(word)) {
        this.flashInput(input, 'wrong');
        this.combatLog.push({ type: 'info', text: `"${word}" is not a valid word` });
        this.renderCombatLog(area);
        return;
      }
      if (!this.canFormWord(word)) {
        this.flashInput(input, 'wrong');
        this.combatLog.push({ type: 'info', text: `Can't form "${word}" from available letters` });
        this.renderCombatLog(area);
        return;
      }
      if (this.usedWords.has(word)) {
        this.flashInput(input, 'wrong');
        this.combatLog.push({ type: 'info', text: `Already used "${word}" this floor` });
        this.renderCombatLog(area);
        return;
      }

      // Boss floor: only 6+ letter words
      if (floor === 10 && word.length < 6) {
        this.combatLog.push({ type: 'info', text: `"${word}" too short for the boss! Need 6+ letters` });
        this.usedWords.add(word);
        input.value = '';
        // Monster still attacks
        this.monsterAttack();
        this.render();
        return;
      }

      this.usedWords.add(word);
      const damage = this.getWordDamage(word);
      this.monsterHP -= damage;
      this.combatLog.push({ type: 'hit', text: `"${word.toUpperCase()}" deals ${damage} damage!` });

      if (this.monsterHP <= 0) {
        this.monsterHP = 0;
        this.floorsCleared = this.currentFloor;
        this.combatLog.push({ type: 'hit', text: `${monsterName} defeated!` });

        if (this.currentFloor >= this.totalFloors) {
          // Victory!
          this.finishGame(true);
          return;
        }

        this.currentFloor++;
        this.setupFloor();
        this.render();
        return;
      }

      // Monster attacks back
      this.monsterAttack();

      if (this.playerHP <= 0) {
        this.playerHP = 0;
        this.combatLog.push({ type: 'dmg', text: 'You have fallen!' });
        this.floorsCleared = this.currentFloor - 1;
        this.finishGame(false);
        return;
      }

      input.value = '';
      this.render();
    };

    atkBtn.addEventListener('click', tryAttack);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') tryAttack();
    });

    potionBtn.addEventListener('click', () => {
      if (this.potions > 0) {
        this.potions--;
        this.playerHP = Math.min(this.maxPlayerHP, this.playerHP + 20);
        this.combatLog.push({ type: 'heal', text: 'Used potion! +20 HP' });
        this.render();
      }
    });

    // Combat log
    this.renderCombatLog(area);
  }

  monsterAttack() {
    const floor = this.currentFloor;
    const dmg = this.monsterDamage[floor - 1] || 10;
    const monsterName = this.monsterNames[floor - 1] || 'Monster';
    this.playerHP -= dmg;
    this.combatLog.push({ type: 'dmg', text: `${monsterName} attacks for ${dmg} damage!` });
  }

  renderCombatLog(area) {
    let logEl = document.getElementById('dungeon-log');
    if (!logEl) {
      logEl = document.createElement('div');
      logEl.id = 'dungeon-log';
      logEl.className = 'dungeon-combat-log';
      area.appendChild(logEl);
    }
    // Show last 6 entries
    const recent = this.combatLog.slice(-6);
    logEl.innerHTML = recent.map(e => `<div class="${e.type}">${e.text}</div>`).join('');
    logEl.scrollTop = logEl.scrollHeight;
  }

  flashInput(input, cls) {
    input.classList.add(cls, 'shake');
    setTimeout(() => {
      input.classList.remove(cls, 'shake');
      input.value = '';
    }, 400);
  }

  onTimeUp() {
    this.floorsCleared = this.currentFloor - 1;
    this.finishGame(false);
  }

  finishGame(victory) {
    this.gameOver = true;
    this.app.stopTimer();

    const floorsCleared = this.floorsCleared;
    const hp = Math.max(0, this.playerHP);
    const floorScore = floorsCleared * 10;
    const hpBonus = hp;
    const victoryBonus = victory ? 50 : 0;
    const finalScore = floorScore + hpBonus + victoryBonus;

    // Floor progress bar
    let floorBar = '';
    for (let i = 1; i <= this.totalFloors; i++) {
      if (i <= floorsCleared) floorBar += '\u{1F7E9}'; // green
      else if (i === floorsCleared + 1 && !victory) floorBar += '\u{1F480}'; // skull
      else floorBar += '\u2B1C'; // white
    }

    const dayNum = Seed.getDayNumber();
    const shareText = `Word Arena #${dayNum}\nDUNGEON Floor ${floorsCleared}/${this.totalFloors} \u2694\uFE0F${hp}HP\n${floorBar}\n#WordArena`;
    const details = `${floorsCleared}/${this.totalFloors} floors \u00B7 ${hp} HP remaining${victory ? ' \u00B7 VICTORY!' : ''}`;

    this.app.endGame(finalScore, details, shareText);
  }

  cleanup() {}
}

window.LexiconDungeon = LexiconDungeon;
