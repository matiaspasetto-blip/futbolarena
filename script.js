// 1. VARIABLES DE ESTADO GLOBALES
let targetWord = "";
let jugadorDelDia = {};
let currentAttempt = 0;
let currentTile = 0;
let guesses = []; // Se generará dinámicamente según el largo del nombre

// 2. INICIO DEL JUEGO Y CARGA DE DATOS
async function iniciarJuego() {
    try {
        const respuesta = await fetch('jugadores.json');
        const datos = await respuesta.json();
        
        // Selección del jugador por fecha (Cambia cada 24hs)
        const hoy = new Date().toDateString(); 
        const indice = (new Date().getDate() + new Date().getMonth()) % datos.length;
        jugadorDelDia = datos[indice];
        targetWord = jugadorDelDia.nombre.toUpperCase();
        const largoNombre = targetWord.length;

        // Generar matriz de intentos según el largo del nombre actual
        guesses = Array(6).fill().map(() => Array(largoNombre).fill(""));

        // Crear el tablero visualmente
        createBoard(largoNombre);

        // REVISAR PERSISTENCIA (LocalStorage)
        const fechaGuardada = localStorage.getItem('fechaUltimoJuego');
        const intentosGuardados = localStorage.getItem('intentosGuardados');
        const estadoJuego = localStorage.getItem('resultadoUltimoJuego');

        if (fechaGuardada === hoy && intentosGuardados) {
            guesses = JSON.parse(intentosGuardados);
            currentAttempt = parseInt(localStorage.getItem('intentoActual')) || 0;
            restaurarProgreso(largoNombre);

            if (estadoJuego) {
                actualizarMensajeFinal(estadoJuego === 'ganado');
                return; // Bloqueo total
            }
        } else if (fechaGuardada !== hoy) {
            localStorage.clear(); // Limpiar datos de días anteriores
        }

        configurarControles();
        console.log("Truco: El jugador es", targetWord);

    } catch (error) {
        console.error("Error al iniciar el juego:", error);
    }
}

// 3. GENERACIÓN DINÁMICA DEL TABLERO
function createBoard(largo) {
    const board = document.getElementById('board');
    board.innerHTML = ''; 
    
    for (let i = 0; i < 6; i++) {
        const row = document.createElement('div');
        row.className = 'row';
        for (let j = 0; j < largo; j++) {
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.id = `tile-${i}-${j}`;
            
            // Ajuste de tamaño para nombres largos (más de 6 letras)
            if (largo > 6) {
                tile.style.width = "45px";
                tile.style.height = "45px";
                tile.style.fontSize = "1.4rem";
            }
            row.appendChild(tile);
        }
        board.appendChild(row);
    }
}

// 4. RESTAURAR INTENTOS AL REFRESCAR
function restaurarProgreso(largo) {
    guesses.forEach((guess, r) => {
        guess.forEach((letter, c) => {
            if (letter) {
                const tile = document.getElementById(`tile-${r}-${c}`);
                tile.innerText = letter;
                // Si la fila ya pasó o el juego terminó, pintamos
                if (r < currentAttempt || localStorage.getItem('resultadoUltimoJuego')) {
                    pintarResultadoFila(tile, letter, c);
                }
            }
        });
    });
}

// 5. LÓGICA DE VALIDACIÓN (ENTER)
function checkGuess() {
    const guess = guesses[currentAttempt].join("");
    const largo = targetWord.length;

    if (guess.length !== largo) return;

    const tiles = document.querySelectorAll('.row')[currentAttempt].querySelectorAll('.tile');
    
    // Pintar la fila actual
    guess.split("").forEach((letra, i) => {
        pintarResultadoFila(tiles[i], letra, i);
    });

    currentAttempt++;
    
    // GUARDAR PROGRESO
    localStorage.setItem('intentosGuardados', JSON.stringify(guesses));
    localStorage.setItem('intentoActual', currentAttempt);
    localStorage.setItem('fechaUltimoJuego', new Date().toDateString());

    if (guess === targetWord) {
        actualizarMensajeFinal(true);
    } else if (currentAttempt === 6) {
        actualizarMensajeFinal(false);
    } else {
        currentTile = 0;
    }
}

function pintarResultadoFila(tile, letra, i) {
    if (letra === targetWord[i]) {
        tile.classList.add('correct');
        pintarTecla(letra, 'correct');
    } else if (targetWord.includes(letra)) {
        tile.classList.add('present');
        pintarTecla(letra, 'present');
    } else {
        tile.classList.add('absent');
        pintarTecla(letra, 'absent');
    }
}

function actualizarMensajeFinal(victoria) {
    const contenedor = document.getElementById("status-container");
    const hoy = new Date().toDateString();
    
    // GUARDAR EN EL NAVEGADOR PARA EL BLOQUEO
    localStorage.setItem('fechaUltimoJuego', hoy);
    localStorage.setItem('resultadoUltimoJuego', victoria ? 'ganado' : 'perdido');

    if (victoria) {
        contenedor.innerHTML = `
            <div class="status-main win-color" style="font-size: 1.5rem; text-transform: uppercase;">¡GOOOL!</div>
            <div class="status-player" style="font-size: 1.2rem; color: white;">
                El jugador era: <span class="win-color">${targetWord}</span>
            </div>
        `;
    } else {
        contenedor.innerHTML = `
            <div class="status-main lose-color" style="font-size: 1.5rem; text-transform: uppercase;">Fin del partido</div>
            <div class="status-player" style="font-size: 1.2rem; color: white;">
                El jugador era: <span class="lose-color">${targetWord}</span>
            </div>
        `;
    }
    
    // Bloqueamos la entrada después de mostrar el mensaje
    bloquearEntrada();
}

// 6. CONTROLES DE ENTRADA
function addLetter(l) {
    if (currentTile < targetWord.length && currentAttempt < 6) {
        document.getElementById(`tile-${currentAttempt}-${currentTile}`).innerText = l;
        guesses[currentAttempt][currentTile] = l;
        currentTile++;
    }
}

function backspace() {
    if (currentTile > 0) {
        currentTile--;
        document.getElementById(`tile-${currentAttempt}-${currentTile}`).innerText = "";
        guesses[currentAttempt][currentTile] = "";
    }
}

function pintarTecla(l, cls) {
    const t = document.querySelector(`[data-key="${l}"]`);
    if (t) {
        if (t.classList.contains('correct')) return; // No bajar de verde a amarillo
        t.classList.add(cls);
    }
}

function manejarEntradaTeclado(e) {
    const k = e.key.toUpperCase();
    if (k === "ENTER") checkGuess();
    else if (k === "BACKSPACE") backspace();
    else if (/^[A-Z]$/.test(k)) addLetter(k);
}

function configurarControles() {
    window.addEventListener('keydown', manejarEntradaTeclado);
    document.querySelectorAll('.key').forEach(t => {
        t.onclick = () => {
            const v = t.getAttribute('data-key');
            if (v === "ENTER") checkGuess();
            else if (v === "BACKSPACE") backspace();
            else addLetter(v);
        };
    });
}

// ARRANCAR MOTOR
iniciarJuego();