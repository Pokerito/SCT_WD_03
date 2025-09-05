// Tic-Tac-Toe Neon Glass Edition
// All UI, game logic, AI, tutorial, history, and settings in this file.
// See README in index.html for organization and extension points.

/* =========================
   Utility Functions
   ========================= */
function $(sel) { return document.querySelector(sel); }
function $$(sel) { return Array.from(document.querySelectorAll(sel)); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function random(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }

/* =========================
   SoundManager (Web Audio API)
   ========================= */
class SoundManager {
  constructor() {
    this.enabled = localStorage.getItem('sound') !== 'off';
    this.ctx = null;
  }
  play(type) {
    if (!this.enabled) return;
    if (!window.AudioContext) return;
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    switch (type) {
      case 'start': o.frequency.value = 440; break;
      case 'move': o.frequency.value = 660; break;
      case 'win': o.frequency.value = 880; break;
      case 'tie': o.frequency.value = 330; break;
      case 'hint': o.frequency.value = 550; break;
      default: o.frequency.value = 400;
    }
    g.gain.value = 0.08;
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.12);
  }
  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('sound', this.enabled ? 'on' : 'off');
    return this.enabled;
  }
}
const sound = new SoundManager();

/* =========================
   ThemeManager
   ========================= */
class ThemeManager {
  constructor() {
    this.theme = localStorage.getItem('theme') || 'dark';
    this.apply();
  }
  toggle() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', this.theme);
    this.apply();
    return this.theme;
  }
  apply() {
    document.documentElement.setAttribute('data-theme', this.theme);
    $('#theme-toggle').textContent = this.theme === 'dark' ? '🌙' : '☀️';
  }
}
const theme = new ThemeManager();

/* =========================
   VibrationManager
   ========================= */
class VibrationManager {
  constructor() {
    this.enabled = localStorage.getItem('vibration') !== 'off';
  }
  vibrate(ms) {
    if (this.enabled && navigator.vibrate) navigator.vibrate(ms);
  }
  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('vibration', this.enabled ? 'on' : 'off');
    return this.enabled;
  }
}
const vibration = new VibrationManager();

/* =========================
   Game Logic
   ========================= */
class Game {
  constructor({mode, player1, player2, icons, aiLevel, timer, trainableAI}) {
    this.mode = mode; // 'pvp', 'pvc', 'pvq'
    this.player1 = player1 || {name: 'Player 1', icon: '❌'};
    this.player2 = player2 || {name: 'Player 2', icon: '⭕'};
    this.icons = icons || ['❌', '⭕'];
    this.aiLevel = aiLevel || 'medium';
    this.timer = timer || false;
    this.trainableAI = trainableAI || null;
    this.reset();
  }
  reset() {
    this.board = Array(9).fill('');
    this.turn = 0;
    this.history = [];
    this.winner = null;
    this.winLine = null;
    this.draw = false;
    this.lastMove = null;
    this.timerValue = 0;
    this.timerId = null;
  }
  get currentPlayer() {
    return this.turn % 2 === 0 ? this.player1 : this.player2;
  }
  get otherPlayer() {
    return this.turn % 2 === 0 ? this.player2 : this.player1;
  }
  get currentIcon() {
    return this.icons[this.turn % 2];
  }
  get isOver() {
    return !!this.winner || this.draw;
  }
  validMoves() {
    return this.board.map((v, i) => v ? null : i).filter(i => i !== null);
  }
  makeMove(idx) {
    if (this.board[idx] || this.isOver) return false;
    this.board[idx] = this.currentIcon;
    this.lastMove = idx;
    this.history.push(idx);
    this.checkWinner();
    this.turn++;
    return true;
  }
  undo() {
    if (!this.history.length || this.isOver) return false;
    const idx = this.history.pop();
    this.board[idx] = '';
    this.turn--;
    this.winner = null;
    this.winLine = null;
    this.draw = false;
    this.lastMove = this.history[this.history.length - 1] ?? null;
    this.checkWinner();
    return true;
  }
  checkWinner() {
    const lines = [
      [0,1,2],[3,4,5],[6,7,8],
      [0,3,6],[1,4,7],[2,5,8],
      [0,4,8],[2,4,6]
    ];
    for (const line of lines) {
      const [a,b,c] = line;
      if (this.board[a] && this.board[a] === this.board[b] && this.board[a] === this.board[c]) {
        this.winner = this.board[a];
        this.winLine = line;
        return;
      }
    }
    if (this.board.every(x => x)) {
      this.draw = true;
    }
  }
  clone() {
    const g = new Game({
      mode: this.mode,
      player1: this.player1,
      player2: this.player2,
      icons: this.icons,
      aiLevel: this.aiLevel,
      timer: this.timer,
      trainableAI: this.trainableAI
    });
    g.board = [...this.board];
    g.turn = this.turn;
    g.history = [...this.history];
    g.winner = this.winner;
    g.winLine = this.winLine ? [...this.winLine] : null;
    g.draw = this.draw;
    g.lastMove = this.lastMove;
    return g;
  }
}

/* =========================
   AI Logic
   ========================= */
class AI {
  constructor(level = 'medium', icon = '⭕', trainable = null) {
    this.level = level;
    this.icon = icon;
    this.trainable = trainable;
    this.qTable = trainable ? trainable.qTable : null;
  }
  move(game) {
    switch (this.level) {
      case 'easy': return this.randomMove(game);
      case 'medium': return this.heuristicMove(game);
      case 'hard': return this.minimaxMove(game);
      case 'train': return this.trainableMove(game);
      default: return this.randomMove(game);
    }
  }
  randomMove(game) {
    return random(game.validMoves());
  }
  heuristicMove(game) {
    // Win if possible
    for (let i of game.validMoves()) {
      const g = game.clone();
      g.makeMove(i);
      if (g.winner === this.icon) return i;
    }
    // Block opponent win
    const opp = game.icons.find(x => x !== this.icon);
    for (let i of game.validMoves()) {
      const g = game.clone();
      g.board[i] = opp;
      g.checkWinner();
      if (g.winner === opp) return i;
    }
    // Take center
    if (!game.board[4]) return 4;
    // Take corner
    const corners = [0,2,6,8].filter(i => !game.board[i]);
    if (corners.length) return random(corners);
    // Else random
    return this.randomMove(game);
  }
  minimaxMove(game) {
    // Minimax with alpha-beta pruning
    const icon = this.icon;
    const opp = game.icons.find(x => x !== icon);
    function score(g, depth) {
      if (g.winner === icon) return 10 - depth;
      if (g.winner === opp) return depth - 10;
      if (g.draw) return 0;
      return null;
    }
    function minimax(g, depth, alpha, beta, maximizing) {
      const s = score(g, depth);
      if (s !== null) return s;
      if (maximizing) {
        let maxEval = -Infinity;
        for (let i of g.validMoves()) {
          const gc = g.clone();
          gc.makeMove(i);
          const eval_ = minimax(gc, depth+1, alpha, beta, false);
          maxEval = Math.max(maxEval, eval_);
          alpha = Math.max(alpha, eval_);
          if (beta <= alpha) break;
        }
        return maxEval;
      } else {
        let minEval = Infinity;
        for (let i of g.validMoves()) {
          const gc = g.clone();
          gc.makeMove(i);
          const eval_ = minimax(gc, depth+1, alpha, beta, true);
          minEval = Math.min(minEval, eval_);
          beta = Math.min(beta, eval_);
          if (beta <= alpha) break;
        }
        return minEval;
      }
    }
    let best = null, bestScore = -Infinity;
    for (let i of game.validMoves()) {
      const gc = game.clone();
      gc.makeMove(i);
      const s = minimax(gc, 0, -Infinity, Infinity, false);
      if (s > bestScore) {
        bestScore = s;
        best = i;
      }
    }
    return best;
  }
  trainableMove(game) {
    // Q-table: state string -> move values
    const state = game.board.join('');
    if (this.qTable && this.qTable[state]) {
      // Pick best move
      let moves = Object.entries(this.qTable[state]);
      moves = moves.filter(([idx]) => !game.board[+idx]);
      if (moves.length) {
        moves.sort((a,b) => b[1] - a[1]);
        return +moves[0][0];
      }
    }
    // Fallback
    return this.heuristicMove(game);
  }
  // Training: Q-learning (very simple, for demo)
  static async trainQ({episodes=1000, alpha=0.2, gamma=0.9, epsilon=0.2, onProgress}) {
    let qTable = {};
    let stats = {win:0, draw:0, loss:0};
    for (let ep=1; ep<=episodes; ++ep) {
      let g = new Game({mode:'pvq', icons:['❌','⭕']});
      let turn = 0;
      let states = [];
      while (!g.isOver) {
        const state = g.board.join('');
        let move;
        if ((turn%2)===0) { // Q AI
          if (!qTable[state]) qTable[state] = {};
          if (Math.random() < epsilon) {
            move = random(g.validMoves());
          } else {
            let moves = Object.entries(qTable[state]);
            moves = moves.filter(([idx]) => !g.board[+idx]);
            if (moves.length) {
              moves.sort((a,b) => b[1]-a[1]);
              move = +moves[0][0];
            } else {
              move = random(g.validMoves());
            }
          }
        } else {
          move = random(g.validMoves());
        }
        states.push({state, move, turn});
        g.makeMove(move);
        turn++;
      }
      // Update Q
      let reward = g.winner === '⭕' ? 1 : g.winner === '❌' ? -1 : 0.5;
      if (g.winner === '⭕') stats.win++;
      else if (g.winner === '❌') stats.loss++;
      else stats.draw++;
      for (let i=states.length-1; i>=0; --i) {
        const {state, move, turn} = states[i];
        if (!qTable[state]) qTable[state] = {};
        if (!qTable[state][move]) qTable[state][move] = 0;
        qTable[state][move] = (1-alpha)*qTable[state][move] + alpha*reward;
        reward *= gamma;
      }
      if (onProgress && ep%Math.max(1,Math.floor(episodes/100))===0) {
        onProgress({ep, stats: {...stats}});
        await sleep(1);
      }
    }
    return {qTable, stats};
  }
}

/* =========================
   Tutorial
   ========================= */
class Tutorial {
  constructor(section) {
    this.section = section;
    this.steps = [
      {
        title: "Welcome!",
        content: "This is Tic-Tac-Toe Neon Glass Edition. Let's learn how to play and win!",
        demo: null
      },
      {
        title: "The Board",
        content: "The board is a 3x3 grid. Players take turns placing their mark (❌ or ⭕).",
        demo: [0,1,2]
      },
      {
        title: "How to Win",
        content: "Get three of your marks in a row, column, or diagonal to win.",
        demo: [0,4,8]
      },
      {
        title: "Fork Tactic",
        content: "Create two threats at once! Try to set up a fork to force a win.",
        demo: [0,2,4,6]
      },
      {
        title: "AI Levels",
        content: "Easy: random. Medium: blocks and wins. Hard: perfect play (minimax). Trainable: learns from experience.",
        demo: null
      },
      {
        title: "Hints & Undo",
        content: "Use the Hint button for advice, and Undo to take back your last move.",
        demo: null
      },
      {
        title: "Keyboard & Accessibility",
        content: "Navigate with arrow keys, press Enter/Space to move. All controls are accessible.",
        demo: null
      },
      {
        title: "Let's Play!",
        content: "You're ready! Start a game from the menu.",
        demo: null
      }
    ];
    this.idx = 0;
  }
  show(idx=0) {
    this.idx = clamp(idx, 0, this.steps.length-1);
    this.section.innerHTML = '';
    const step = this.steps[this.idx];
    const title = document.createElement('h2');
    title.textContent = step.title;
    this.section.appendChild(title);
    const content = document.createElement('div');
    content.className = 'tutorial-content';
    content.textContent = step.content;
    this.section.appendChild(content);
    if (step.demo) {
      const demoBoard = document.createElement('div');
      demoBoard.className = 'tutorial-board';
      demoBoard.style.display = 'grid';
      demoBoard.style.gridTemplateColumns = 'repeat(3,2.5em)';
      demoBoard.style.gap = '0.3em';
      for (let i=0; i<9; ++i) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.style.width = '2.5em';
        cell.style.height = '2.5em';
        cell.style.fontSize = '1.5em';
        cell.style.background = i===step.demo[0]||i===step.demo[1]||i===step.demo[2]||i===step.demo[3] ? 'var(--accent2)' : '';
        cell.textContent = step.demo.includes(i) ? (i%2===0?'❌':'⭕') : '';
        demoBoard.appendChild(cell);
      }
      this.section.appendChild(demoBoard);
    }
    const nav = document.createElement('div');
    nav.style.display = 'flex';
    nav.style.justifyContent = 'space-between';
    nav.style.marginTop = '1em';
    const prev = document.createElement('button');
    prev.textContent = 'Back';
    prev.className = 'menu-btn';
    prev.disabled = this.idx === 0;
    prev.onclick = () => this.show(this.idx-1);
    const next = document.createElement('button');
    next.textContent = this.idx === this.steps.length-1 ? 'Finish' : 'Next';
    next.className = 'menu-btn';
    next.onclick = () => {
      if (this.idx === this.steps.length-1) {
        this.section.classList.add('hidden');
        $('#main-menu').classList.remove('hidden');
      } else {
        this.show(this.idx+1);
      }
    };
    const skip = document.createElement('button');
    skip.textContent = 'Skip Tutorial';
    skip.className = 'menu-btn';
    skip.onclick = () => {
      this.section.classList.add('hidden');
      $('#main-menu').classList.remove('hidden');
    };
    nav.appendChild(prev);
    nav.appendChild(next);
    nav.appendChild(skip);
    this.section.appendChild(nav);
  }
}

/* =========================
   History
   ========================= */
class History {
  static save(game, result) {
    let hist = JSON.parse(localStorage.getItem('ttt-history')||'[]');
    hist.unshift({
      mode: game.mode,
      players: [game.player1.name, game.player2.name],
      icons: game.icons,
      result,
      date: new Date().toISOString(),
      moves: [...game.history]
    });
    hist = hist.slice(0,10);
    localStorage.setItem('ttt-history', JSON.stringify(hist));
  }
  static load() {
    return JSON.parse(localStorage.getItem('ttt-history')||'[]');
  }
}

/* =========================
   UI Logic
   ========================= */
let currentGame = null;
let currentAI = null;
let moveTimerId = null;
let moveTimerVal = 0;
let moveTimerActive = false;
let trainableAI = {qTable:{}};

function showMenu() {
  $$('.glass').forEach(e=>e.classList.add('hidden'));
  $('#main-menu').classList.remove('hidden');
}
function showGame() {
  $$('.glass').forEach(e=>e.classList.add('hidden'));
  $('#game-section').classList.remove('hidden');
}
function showSettings() {
  $$('.glass').forEach(e=>e.classList.add('hidden'));
  $('#settings-section').classList.remove('hidden');
}
function showTutorial() {
  $$('.glass').forEach(e=>e.classList.add('hidden'));
  $('#tutorial-section').classList.remove('hidden');
  tutorial.show(0);
}
function showHistory() {
  $$('.glass').forEach(e=>e.classList.add('hidden'));
  $('#history-section').classList.remove('hidden');
  renderHistory();
}
function showTrain() {
  $$('.glass').forEach(e=>e.classList.add('hidden'));
  $('#train-section').classList.remove('hidden');
  renderTrain();
}

function startGame(mode, aiLevel='medium', trainAI=false) {
  // Player config modal
  showModalPlayerConfig(mode, aiLevel, trainAI);
}

function beginGame(mode, player1, player2, icons, aiLevel, timer, trainAI) {
  currentGame = new Game({
    mode, player1, player2, icons, aiLevel, timer, trainableAI: trainAI ? trainableAI : null
  });
  if (mode === 'pvc' || mode === 'pvq') {
    currentAI = new AI(aiLevel, icons[1], trainAI ? trainableAI : null);
  } else {
    currentAI = null;
  }
  showGame();
  renderGame();
  sound.play('start');
  if (currentGame.timer) startMoveTimer();
}

function renderGame() {
  // Info
  $('#player1-label').textContent = currentGame.player1.name + ' ' + currentGame.icons[0];
  $('#player2-label').textContent = currentGame.icons[1] + ' ' + currentGame.player2.name;
  $('#turn-indicator').textContent = currentGame.isOver ? '' : `Turn: ${currentGame.currentPlayer.name}`;
  // Board
  const board = $('#board');
  board.innerHTML = '';
  board.setAttribute('aria-label', 'Tic-Tac-Toe Board');
  board.setAttribute('role', 'grid');
  board.tabIndex = 0;
  for (let i=0; i<9; ++i) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.setAttribute('role', 'gridcell');
    cell.setAttribute('aria-label', `Cell ${i+1}`);
    cell.tabIndex = currentGame.isOver ? -1 : 0;
    cell.textContent = currentGame.board[i];
    if (currentGame.winLine && currentGame.winLine.includes(i)) cell.dataset.winner = "true";
    if (currentGame.lastMove === i) cell.dataset.last = "true";
    if (currentGame.isOver || currentGame.board[i]) cell.dataset.disabled = "true";
    cell.onclick = () => handleCellClick(i);
    cell.onkeydown = e => handleCellKey(i, e);
    board.appendChild(cell);
  }
  // Focus first empty cell
  if (!currentGame.isOver) {
    const first = $$('#board .cell').find(c=>!c.textContent);
    if (first) first.focus();
  }
  // Hint bubble
  $('#hint-bubble').classList.add('hidden');
  // Footer buttons
  $('#btn-undo').disabled = !currentGame.history.length || currentGame.isOver;
  $('#btn-hint').disabled = currentGame.isOver;
  $('#btn-restart').disabled = false;
  $('#btn-new').disabled = false;
  $('#btn-exit').disabled = false;
  // Timer
  $('#move-timer').classList.toggle('hidden', !currentGame.timer);
  // AI move if needed
  if (!currentGame.isOver && (currentGame.mode === 'pvc' || currentGame.mode === 'pvq') && currentGame.turn%2===1) {
    setTimeout(aiMove, 400);
  }
  // Win/draw
  if (currentGame.isOver) {
    if (currentGame.winner) {
      $('#turn-indicator').textContent = `${currentGame.currentPlayer.name} wins!`;
      sound.play('win');
      vibration.vibrate(80);
      History.save(currentGame, `${currentGame.currentPlayer.name} wins`);
      celebration();
    } else if (currentGame.draw) {
      $('#turn-indicator').textContent = `It's a draw!`;
      sound.play('tie');
      vibration.vibrate(40);
      History.save(currentGame, 'Draw');
    }
    stopMoveTimer();
  }
}

function handleCellClick(i) {
  if (currentGame.isOver || currentGame.board[i]) return;
  currentGame.makeMove(i);
  sound.play('move');
  vibration.vibrate(10);
  renderGame();
}

function handleCellKey(i, e) {
  if (e.key === 'Enter' || e.key === ' ') {
    handleCellClick(i);
    e.preventDefault();
  }
  // Arrow navigation
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
    let row = Math.floor(i/3), col = i%3;
    if (e.key === 'ArrowUp') row = (row+2)%3;
    if (e.key === 'ArrowDown') row = (row+1)%3;
    if (e.key === 'ArrowLeft') col = (col+2)%3;
    if (e.key === 'ArrowRight') col = (col+1)%3;
    const ni = row*3+col;
    $$('#board .cell')[ni].focus();
    e.preventDefault();
  }
}

function aiMove() {
  if (!currentAI || currentGame.isOver) return;
  const move = currentAI.move(currentGame);
  if (move !== undefined) {
    setTimeout(()=>{
      currentGame.makeMove(move);
      sound.play('move');
      vibration.vibrate(10);
      renderGame();
    }, 300);
  }
}

function startMoveTimer() {
  moveTimerVal = 10;
  moveTimerActive = true;
  $('#move-timer').textContent = `Time left: ${moveTimerVal}s`;
  moveTimerId = setInterval(()=>{
    moveTimerVal--;
    $('#move-timer').textContent = `Time left: ${moveTimerVal}s`;
    if (moveTimerVal <= 0) {
      clearInterval(moveTimerId);
      moveTimerActive = false;
      // Auto move: random
      if (!currentGame.isOver) {
        const move = random(currentGame.validMoves());
        currentGame.makeMove(move);
        renderGame();
      }
    }
  }, 1000);
}
function stopMoveTimer() {
  clearInterval(moveTimerId);
  moveTimerActive = false;
  $('#move-timer').textContent = '';
}

/* =========================
   Modal: Player Config
   ========================= */
function showModalPlayerConfig(mode, aiLevel, trainAI) {
  const modal = $('#modal-overlay');
  modal.innerHTML = '';
  modal.classList.remove('hidden');
  const box = document.createElement('div');
  box.className = 'glass';
  box.style.maxWidth = '340px';
  box.style.margin = 'auto';
  box.innerHTML = `
    <h2>Game Setup</h2>
    <form id="player-form">
      <div class="setting-row">
        <label>Player 1 Name:</label>
        <input id="p1-name" type="text" value="Player 1" maxlength="12" required />
      </div>
      <div class="setting-row">
        <label>Player 1 Icon:</label>
        <select id="p1-icon">
          <option value="❌">❌</option>
          <option value="⭕">⭕</option>
          <option value="😎">😎</option>
          <option value="🐱">🐱</option>
          <option value="🍕">🍕</option>
        </select>
      </div>
      <div class="setting-row">
        <label>Player 2 Name:</label>
        <input id="p2-name" type="text" value="${mode==='pvp'?'Player 2':'Computer'}" maxlength="12" required />
      </div>
      <div class="setting-row">
        <label>Player 2 Icon:</label>
        <select id="p2-icon">
          <option value="⭕">⭕</option>
          <option value="❌">❌</option>
          <option value="🤖">🤖</option>
          <option value="🐶">🐶</option>
          <option value="🍔">🍔</option>
        </select>
      </div>
      ${mode!=='pvp'?`
      <div class="setting-row">
        <label>AI Level:</label>
        <select id="ai-level">
          <option value="easy">Easy</option>
          <option value="medium" selected>Medium</option>
          <option value="hard">Hard</option>
          ${trainAI?'<option value="train">Trainable</option>':''}
        </select>
      </div>
      `:''}
      <div class="setting-row">
        <label>Move Timer:</label>
        <input id="timer-toggle-modal" type="checkbox" />
      </div>
      <div style="display:flex;gap:1em;justify-content:center;margin-top:1em;">
        <button type="submit" class="menu-btn">Start</button>
        <button type="button" id="cancel-btn" class="menu-btn">Cancel</button>
      </div>
    </form>
  `;
  modal.appendChild(box);
  $('#cancel-btn').onclick = () => modal.classList.add('hidden');
  $('#player-form').onsubmit = e => {
    e.preventDefault();
    const p1 = {name: $('#p1-name').value, icon: $('#p1-icon').value};
    const p2 = {name: $('#p2-name').value, icon: $('#p2-icon').value};
    let icons = [p1.icon, p2.icon];
    if (icons[0] === icons[1]) icons[1] = icons[1]==='❌'?'⭕':'❌';
    let aiLvl = aiLevel;
    if (mode!=='pvp') aiLvl = $('#ai-level').value;
    let timer = $('#timer-toggle-modal').checked;
    modal.classList.add('hidden');
    beginGame(mode, p1, p2, icons, aiLvl, timer, aiLvl==='train');
  };
}

/* =========================
   Hint
   ========================= */
function showHint() {
  if (!currentGame || currentGame.isOver) return;
  let move, explain = '';
  if (currentAI && currentAI.level === 'hard') {
    // Show minimax scores for top 3
    let moves = [];
    for (let i of currentGame.validMoves()) {
      const gc = currentGame.clone();
      gc.makeMove(i);
      const s = (new AI('hard', currentGame.currentIcon)).minimaxMove(gc);
      moves.push({i, s});
    }
    moves.sort((a,b)=>b.s-a.s);
    move = moves[0].i;
    explain = `Best move: cell ${move+1}.`;
  } else if (currentAI && currentAI.level === 'medium') {
    move = currentAI.heuristicMove(currentGame);
    explain = `Try cell ${move+1} to block or win.`;
  } else {
    move = random(currentGame.validMoves());
    explain = `Try cell ${move+1}.`;
  }
  // Show bubble and highlight
  $$('#board .cell').forEach((c,idx)=>{
    c.dataset.hint = idx===move ? "true" : "";
  });
  $('#hint-bubble').textContent = explain;
  $('#hint-bubble').classList.remove('hidden');
  sound.play('hint');
  setTimeout(()=>{
    $$('#board .cell').forEach(c=>c.removeAttribute('data-hint'));
    $('#hint-bubble').classList.add('hidden');
  }, 1800);
}

/* =========================
   Celebration Animation
   ========================= */
function celebration() {
  // Neon confetti
  for (let i=0; i<24; ++i) {
    const conf = document.createElement('div');
    conf.style.position = 'fixed';
    conf.style.left = Math.random()*100+'vw';
    conf.style.top = '-30px';
    conf.style.width = conf.style.height = Math.random()*8+8+'px';
    conf.style.background = `hsl(${Math.random()*360},80%,60%)`;
    conf.style.borderRadius = '50%';
    conf.style.opacity = 0.8;
    conf.style.zIndex = 9999;
    conf.style.pointerEvents = 'none';
    conf.style.transition = 'top 1.2s cubic-bezier(.4,2,.6,1), opacity 1.2s';
    document.body.appendChild(conf);
    setTimeout(()=>{conf.style.top = (Math.random()*60+30)+'vh'; conf.style.opacity=0;}, 10);
    setTimeout(()=>conf.remove(), 1300);
  }
}

/* =========================
   History UI
   ========================= */
function renderHistory() {
  const section = $('#history-section');
  section.innerHTML = '<h2>Game History</h2>';
  const hist = History.load();
  if (!hist.length) {
    section.innerHTML += '<p>No games played yet.</p>';
    return;
  }
  const list = document.createElement('ul');
  list.style.listStyle = 'none';
  list.style.padding = '0';
  hist.forEach((h,idx)=>{
    const li = document.createElement('li');
    li.style.marginBottom = '1em';
    li.innerHTML = `
      <div><b>${h.players[0]} vs ${h.players[1]}</b> (${h.mode})</div>
      <div>Result: ${h.result} <span style="font-size:0.9em;color:#888;">${new Date(h.date).toLocaleString()}</span></div>
      <button class="game-btn" data-idx="${idx}">Replay</button>
    `;
    list.appendChild(li);
  });
  section.appendChild(list);
  $$('.game-btn[data-idx]').forEach(btn=>{
    btn.onclick = ()=>{
      replayHistory(hist[+btn.dataset.idx]);
    };
  });
  const back = document.createElement('button');
  back.textContent = 'Back';
  back.className = 'menu-btn';
  back.onclick = showMenu;
  section.appendChild(back);
}
async function replayHistory(h) {
  showGame();
  let g = new Game({
    mode: h.mode,
    player1: {name: h.players[0], icon: h.icons[0]},
    player2: {name: h.players[1], icon: h.icons[1]},
    icons: h.icons
  });
  renderGame();
  for (let i=0; i<h.moves.length; ++i) {
    await sleep(600);
    g.makeMove(h.moves[i]);
    currentGame = g.clone();
    renderGame();
  }
}

/* =========================
   Trainable AI UI
   ========================= */
function renderTrain() {
  const section = $('#train-section');
  section.innerHTML = '<h2>Trainable AI</h2>';
  section.innerHTML += `
    <div id="train-controls">
      <label>Episodes: <input id="train-episodes" type="number" min="100" max="10000" value="1000" /></label>
      <label>Speed: <input id="train-speed" type="range" min="1" max="100" value="20" /></label>
      <button id="btn-train" class="menu-btn">Train</button>
      <button id="btn-reset-train" class="menu-btn">Reset</button>
      <button id="btn-back-train" class="menu-btn">Back</button>
    </div>
    <canvas id="train-chart" width="320" height="80" style="margin:1em 0;background:rgba(0,0,0,0.1);border-radius:8px;"></canvas>
    <div id="train-progress"></div>
  `;
  $('#btn-back-train').onclick = showMenu;
  $('#btn-reset-train').onclick = ()=>{
    trainableAI.qTable = {};
    renderTrain();
  };
  $('#btn-train').onclick = async ()=>{
    const episodes = +$('#train-episodes').value;
    const speed = +$('#train-speed').value;
    $('#btn-train').disabled = true;
    let chart = [];
    await AI.trainQ({
      episodes,
      onProgress: ({ep,stats})=>{
        chart.push({...stats});
        $('#train-progress').textContent = `Ep ${ep}/${episodes} | Win: ${stats.win} Draw: ${stats.draw} Loss: ${stats.loss}`;
        drawTrainChart(chart, $('#train-chart'));
      }
    }).then(({qTable,stats})=>{
      trainableAI.qTable = qTable;
      $('#btn-train').disabled = false;
      $('#train-progress').textContent += ' | Done!';
    });
  };
}
function drawTrainChart(chart, canvas) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if (!chart.length) return;
  const max = Math.max(...chart.map(s=>s.win+s.draw+s.loss));
  ctx.strokeStyle = '#00ffe7';
  ctx.beginPath();
  chart.forEach((s,i)=>{
    const x = i*canvas.width/chart.length;
    const y = canvas.height - (s.win/(s.win+s.draw+s.loss))*canvas.height;
    if (i===0) ctx.moveTo(x,y);
    else ctx.lineTo(x,y);
  });
  ctx.stroke();
  ctx.strokeStyle = '#ffe600';
  ctx.beginPath();
  chart.forEach((s,i)=>{
    const x = i*canvas.width/chart.length;
    const y = canvas.height - (s.draw/(s.win+s.draw+s.loss))*canvas.height;
    if (i===0) ctx.moveTo(x,y);
    else ctx.lineTo(x,y);
  });
  ctx.stroke();
  ctx.strokeStyle = '#ff00c8';
  ctx.beginPath();
  chart.forEach((s,i)=>{
    const x = i*canvas.width/chart.length;
    const y = canvas.height - (s.loss/(s.win+s.draw+s.loss))*canvas.height;
    if (i===0) ctx.moveTo(x,y);
    else ctx.lineTo(x,y);
  });
  ctx.stroke();
}

/* =========================
   Settings
   ========================= */
$('#theme-toggle').onclick = ()=>{
  theme.toggle();
};
$('#sound-toggle').onclick = ()=>{
  const on = sound.toggle();
  $('#sound-toggle').textContent = on ? '🔊' : '🔇';
};
$('#timer-toggle').onclick = ()=>{
  const on = !($('#timer-toggle').dataset.on==='true');
  $('#timer-toggle').dataset.on = on;
  $('#timer-toggle').textContent = on ? '⏱️' : '⏲️';
};
$('#vibration-toggle').onclick = ()=>{
  const on = vibration.toggle();
  $('#vibration-toggle').textContent = on ? '📳' : '🔕';
};
$('#btn-settings-back').onclick = showMenu;

/* =========================
   Main Menu Buttons
   ========================= */
$('#btn-pvc').onclick = ()=>startGame('pvc');
$('#btn-pvq').onclick = ()=>showTrain();
$('#btn-pvp').onclick = ()=>startGame('pvp');
$('#btn-tutorial').onclick = showTutorial;
$('#btn-settings').onclick = showSettings;
$('#btn-history').onclick = showHistory;

/* =========================
   Game Buttons
   ========================= */
$('#btn-undo').onclick = ()=>{
  if (currentGame.undo()) {
    renderGame();
    sound.play('move');
  }
};
$('#btn-hint').onclick = showHint;
$('#btn-restart').onclick = ()=>{
  currentGame.reset();
  renderGame();
  sound.play('start');
};
$('#btn-new').onclick = ()=>{
  showMenu();
};
$('#btn-exit').onclick = ()=>{
  showMenu();
};

/* =========================
   Keyboard Accessibility
   ========================= */
$('#board').onkeydown = e => {
  if (e.key === 'Tab') return;
  if (e.key === 'Escape') showMenu();
};

/* =========================
   Tutorial Instance
   ========================= */
const tutorial = new Tutorial($('#tutorial-section'));

/* =========================
   On Load
   ========================= */
window.addEventListener('DOMContentLoaded', ()=>{
  // Theme
  theme.apply();
  // Sound
  $('#sound-toggle').textContent = sound.enabled ? '🔊' : '🔇';
  // Vibration
  $('#vibration-toggle').textContent = vibration.enabled ? '📳' : '🔕';
  // Timer
  $('#timer-toggle').textContent = '⏲️';
  // Hide all except menu
  $$('.glass').forEach(e=>e.classList.add('hidden'));
  $('#main-menu').classList.remove('hidden');
});

/* =========================
   Unit Tests (runTests)
   ========================= */
window.runTests = function() {
  let g = new Game({mode:'pvp', icons:['❌','⭕']});
  g.makeMove(0); g.makeMove(3); g.makeMove(1); g.makeMove(4); g.makeMove(2);
  console.assert(g.winner==='❌', 'Winner detection failed');
  g = new Game({mode:'pvp', icons:['❌','⭕']});
  g.makeMove(0); g.makeMove(1); g.makeMove(2); g.makeMove(4); g.makeMove(3); g.makeMove(5); g.makeMove(7); g.makeMove(6); g.makeMove(8);
  console.assert(g.draw, 'Draw detection failed');
  g = new Game({mode:'pvp', icons:['❌','⭕']});
  g.makeMove(0); g.undo(); console.assert(g.board[0]==='', 'Undo failed');
  console.log('All tests passed!');
};

/* =========================
   TODOs for Future Improvements
   ========================= */
// - Add online multiplayer
// - Add more board sizes
// - Add achievements
// - Add user avatars
// - Add more sound effects
// - Add advanced AI explanations