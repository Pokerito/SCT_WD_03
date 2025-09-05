const board = document.getElementById('board');
const status = document.getElementById('status');
const resetBtn = document.getElementById('reset');
const startBtn = document.getElementById('start-game');
let cells = [];
let currentPlayer = 'X';
let gameActive = false;
let playerChoice = null;

// Hide board, status, and reset until game starts
board.style.display = 'none';
status.style.display = 'none';
resetBtn.style.display = 'none';

function showChoiceModal() {
    const modal = document.createElement('div');
    modal.id = 'choice-modal';
    modal.style.position = 'fixed';
    modal.style.top = 0;
    modal.style.left = 0;
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(0,0,0,0.4)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = 10000;

    modal.innerHTML = `
        <div style="
            background: #fff;
            padding: 32px 40px;
            border-radius: 16px;
            box-shadow: 0 8px 32px #0003;
            text-align: center;
            min-width: 260px;
        ">
            <h2 style="margin-bottom:18px;">Choose your symbol</h2>
            <button id="choose-x" style="
                font-size:2em;
                margin: 0 18px;
                padding: 12px 32px;
                border-radius: 8px;
                border: none;
                background: linear-gradient(90deg,#ff5252,#ffb74d);
                color: #fff;
                cursor:pointer;
                transition:transform 0.2s;
            ">X</button>
            <button id="choose-o" style="
                font-size:2em;
                margin: 0 18px;
                padding: 12px 32px;
                border-radius: 8px;
                border: none;
                background: linear-gradient(90deg,#1976d2,#64b5f6);
                color: #fff;
                cursor:pointer;
                transition:transform 0.2s;
            ">O</button>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('choose-x').onclick = () => {
        currentPlayer = 'X';
        playerChoice = 'X';
        startGame();
        modal.remove();
    };
    document.getElementById('choose-o').onclick = () => {
        currentPlayer = 'O';
        playerChoice = 'O';
        startGame();
        modal.remove();
    };
}

function startGame() {
    gameActive = true;
    status.innerHTML = `Player <span style="color:${currentPlayer === 'X' ? '#ff5252' : '#1976d2'}">${currentPlayer}</span>'s turn`;
    createBoard();
    board.style.display = '';
    status.style.display = '';
    resetBtn.style.display = '';
    startBtn.style.display = 'none';
}

function createBoard() {
    board.innerHTML = '';
    cells = [];
    for (let i = 0; i < 9; i++) {
        const cell = document.createElement('div');
        cell.classList.add('cell');
        cell.dataset.index = i;
        cell.addEventListener('click', handleCellClick);
        board.appendChild(cell);
        cells.push(cell);
    }
}

function handleCellClick(e) {
    const cell = e.target;
    if (cell.textContent || !gameActive) return;
    cell.textContent = currentPlayer;
    cell.classList.add(currentPlayer.toLowerCase());
    if (checkWinner()) {
        status.innerHTML = `<b>🎉 Player ${currentPlayer} wins! 🎉</b>`;
        highlightWinner();
        gameActive = false;
        confetti();
    } else if (isDraw()) {
        status.innerHTML = "<b>🤝 It's a draw!</b>";
        gameActive = false;
    } else {
        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
        status.innerHTML = `Player <span style="color:${currentPlayer === 'X' ? '#ff5252' : '#1976d2'}">${currentPlayer}</span>'s turn`;
    }
}

function checkWinner() {
    const winPatterns = [
        [0,1,2], [3,4,5], [6,7,8], // rows
        [0,3,6], [1,4,7], [2,5,8], // cols
        [0,4,8], [2,4,6]           // diags
    ];
    return winPatterns.some(pattern => {
        const [a, b, c] = pattern;
        return cells[a].textContent &&
               cells[a].textContent === cells[b].textContent &&
               cells[a].textContent === cells[c].textContent;
    });
}

function highlightWinner() {
    const winPatterns = [
        [0,1,2], [3,4,5], [6,7,8],
        [0,3,6], [1,4,7], [2,5,8],
        [0,4,8], [2,4,6]
    ];
    winPatterns.forEach(pattern => {
        const [a, b, c] = pattern;
        if (
            cells[a].textContent &&
            cells[a].textContent === cells[b].textContent &&
            cells[a].textContent === cells[c].textContent
        ) {
            cells[a].classList.add('win');
            cells[b].classList.add('win');
            cells[c].classList.add('win');
        }
    });
}

function isDraw() {
    return cells.every(cell => cell.textContent);
}

resetBtn.addEventListener('click', () => {
    gameActive = false;
    board.style.display = 'none';
    status.style.display = 'none';
    resetBtn.style.display = 'none';
    startBtn.style.display = '';
    status.innerHTML = '';
    board.innerHTML = '';
});

startBtn.addEventListener('click', () => {
    showChoiceModal();
});

// Confetti animation for win (simple, unique)
function confetti() {
    for (let i = 0; i < 30; i++) {
        const conf = document.createElement('div');
        conf.style.position = 'fixed';
        conf.style.left = Math.random() * 100 + 'vw';
        conf.style.top = '-30px';
        conf.style.width = conf.style.height = Math.random() * 8 + 8 + 'px';
        conf.style.background = `hsl(${Math.random()*360},80%,60%)`;
        conf.style.borderRadius = '50%';
        conf.style.opacity = 0.8;
        conf.style.zIndex = 9999;
        conf.style.pointerEvents = 'none';
        conf.style.transition = 'top 1.2s cubic-bezier(.4,2,.6,1), opacity 1.2s';
        document.body.appendChild(conf);
        setTimeout(() => {
            conf.style.top = (Math.random() * 60 + 30) + 'vh';
            conf.style.opacity = 0;
        }, 10);
        setTimeout(() => conf.remove(), 1300);
    }
}
