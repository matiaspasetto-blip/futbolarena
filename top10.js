let selectedMode = 'normal';
let challenge = null;
let foundIndexes = new Set();
let timerId = null;
let timeLeft = 120;
let gameActive = false;

const board = document.getElementById('board');
const statusEl = document.getElementById('status');
const timerEl = document.getElementById('timer');
const titleEl = document.getElementById('challenge-title');
const guessInput = document.getElementById('guess-input');
const guessBtn = document.getElementById('guess-btn');
const overlay = document.getElementById('intro-overlay');

function normalizeText(text) {
    return text
        .toUpperCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function getDailyChallenge(challenges) {
    const now = new Date();
    const idx = (now.getDate() + now.getMonth()) % challenges.length;
    return challenges[idx];
}

function renderBoard() {
    board.innerHTML = '';
    challenge.players.forEach((player, i) => {
        const row = document.createElement('article');
        row.className = 'board-row';
        row.innerHTML = `
            <div class="pos">${i + 1}.</div>
            <div class="flag" title="${player.country}">${player.flag}</div>
            <div class="player-name" id="player-slot-${i}"></div>
        `;
        board.appendChild(row);
    });
}

function setStatus(message, isError = false) {
    statusEl.textContent = message;
    statusEl.style.color = isError ? '#ff8f8f' : '#9debc2';
}

function endGame(win) {
    gameActive = false;
    clearInterval(timerId);
    timerId = null;
    guessInput.disabled = true;
    guessBtn.disabled = true;

    if (!win) {
        challenge.players.forEach((player, i) => {
            if (!foundIndexes.has(i)) {
                const slot = document.getElementById(`player-slot-${i}`);
                slot.textContent = player.name;
                slot.classList.add('missed');
            }
        });
    }

    setStatus(win ? '¡Golazo! Completaste el Top 10.' : 'Tiempo / intentos finalizados.');
}

function updateTimerView() {
    if (selectedMode !== 'timed') {
        timerEl.textContent = '';
        return;
    }

    const minutes = String(Math.floor(timeLeft / 60)).padStart(2, '0');
    const seconds = String(timeLeft % 60).padStart(2, '0');
    timerEl.textContent = `⏱️ ${minutes}:${seconds}`;
}

function startTimer() {
    timeLeft = 120;
    updateTimerView();

    timerId = setInterval(() => {
        timeLeft -= 1;
        updateTimerView();

        if (timeLeft <= 0) {
            endGame(false);
        }
    }, 1000);
}

function startGame() {
    foundIndexes = new Set();
    gameActive = true;
    guessInput.disabled = false;
    guessBtn.disabled = false;
    guessInput.value = '';
    guessInput.focus();
    setStatus('Juego iniciado. ¡Adiviná un jugador!');

    renderBoard();
    clearInterval(timerId);
    timerId = null;

    if (selectedMode === 'timed') {
        startTimer();
    } else {
        updateTimerView();
    }
}

function handleGuess() {
    if (!gameActive) return;

    const rawGuess = guessInput.value;
    const guess = normalizeText(rawGuess);
    if (!guess) {
        setStatus('Escribí un jugador para adivinar.', true);
        return;
    }

    const index = challenge.players.findIndex((player, i) => {
        return !foundIndexes.has(i) && normalizeText(player.name) === guess;
    });

    if (index === -1) {
        setStatus('No está en este Top 10 (o ya lo adivinaste).', true);
        return;
    }

    foundIndexes.add(index);
    const slot = document.getElementById(`player-slot-${index}`);
    slot.textContent = challenge.players[index].name;
    slot.classList.add('found');

    guessInput.value = '';

    const pending = 10 - foundIndexes.size;
    setStatus(pending === 0 ? '¡Top completo!' : `¡Correcto! Te faltan ${pending}.`);

    if (pending === 0) {
        endGame(true);
    }
}

async function init() {
    const response = await fetch('top10-data.json');
    const challenges = await response.json();
    challenge = getDailyChallenge(challenges);
    titleEl.textContent = challenge.title;
}

document.querySelectorAll('.mode-btn').forEach((button) => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach((b) => b.classList.remove('active'));
        button.classList.add('active');
        selectedMode = button.dataset.mode;
    });
});

document.getElementById('start-btn').addEventListener('click', () => {
    overlay.style.display = 'none';
    startGame();
});

guessBtn.addEventListener('click', handleGuess);

guessInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        handleGuess();
    }
});

init();
