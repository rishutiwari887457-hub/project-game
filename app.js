/* ==============================================================================
   Hangman Web Edition - Interactive Game Logic & Audio Engine
   ============================================================================== */

// 1. Word Banks
const CORE_WORDS = ["python", "computer", "college", "coding", "program"];
const EXTENDED_WORDS = [
  ...CORE_WORDS,
  "developer", "software", "database", "algorithm", 
  "variable", "function", "terminal", "keyboard", "internet"
];

// 2. SVG Body Parts mapping in exact order of 6 incorrect guesses
const HANGMAN_PARTS = [
  "part-head",
  "part-torso",
  "part-left-arm",
  "part-right-arm",
  "part-left-leg",
  "part-right-leg"
];

// 3. Game State
let activeWordBank = CORE_WORDS;
let currentWord = "";
let guessedLetters = new Set();
let incorrectGuesses = 0;
const MAX_INCORRECT = 6;
let isGameOver = false;
let soundEnabled = true;

// Stats persisted in localStorage
let stats = {
  wins: 0,
  losses: 0,
  streak: 0
};

try {
  const saved = localStorage.getItem("hangman_stats");
  if (saved) stats = JSON.parse(saved);
} catch (e) {
  console.warn("LocalStorage unavailable, using session stats.");
}

// 4. Web Audio Synthesizer (Zero External Dependencies)
class SoundFx {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  playTone(freq, type = "sine", duration = 0.12, gainValue = 0.1) {
    if (!soundEnabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(gainValue, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (err) {
      console.warn("Audio play failed:", err);
    }
  }

  correct() {
    this.playTone(523.25, "triangle", 0.1, 0.12); // C5
    setTimeout(() => this.playTone(659.25, "triangle", 0.15, 0.14), 80); // E5
  }

  wrong() {
    this.playTone(220, "sawtooth", 0.15, 0.12);
    setTimeout(() => this.playTone(164.81, "sawtooth", 0.22, 0.14), 100);
  }

  win() {
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, "triangle", 0.25, 0.15), i * 120);
    });
  }

  gameOver() {
    const notes = [329.63, 293.66, 261.63, 196.00]; // E4, D4, C4, G3
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, "sawtooth", 0.3, 0.12), i * 160);
    });
  }
}

const sfx = new SoundFx();

// 5. Canvas Confetti System
class ConfettiEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext("2d") : null;
    this.particles = [];
    this.animId = null;
    this.colors = ["#38bdf8", "#818cf8", "#a855f7", "#ec4899", "#10b981", "#f59e0b"];

    if (this.canvas) {
      window.addEventListener("resize", () => this.resize());
      this.resize();
    }
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  fire() {
    if (!this.canvas || !this.ctx) return;
    this.resize();
    this.particles = [];
    const count = 90;

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: this.canvas.width / 2,
        y: this.canvas.height / 2 + 50,
        vx: (Math.random() - 0.5) * 18,
        vy: (Math.random() - 0.8) * 20,
        size: Math.random() * 8 + 4,
        color: this.colors[Math.floor(Math.random() * this.colors.length)],
        rotation: Math.random() * 360,
        vr: (Math.random() - 0.5) * 10,
        opacity: 1
      });
    }

    if (this.animId) cancelAnimationFrame(this.animId);
    this.animate();
  }

  animate() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    let activeParticles = 0;
    this.particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.45; // Gravity
      p.rotation += p.vr;
      p.opacity -= 0.009;

      if (p.opacity > 0) {
        activeParticles++;
        this.ctx.save();
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate((p.rotation * Math.PI) / 180);
        this.ctx.globalAlpha = Math.max(0, p.opacity);
        this.ctx.fillStyle = p.color;
        this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        this.ctx.restore();
      }
    });

    if (activeParticles > 0) {
      this.animId = requestAnimationFrame(() => this.animate());
    } else {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.animId = null;
    }
  }
}

const confetti = new ConfettiEngine("confetti-canvas");

// 6. DOM Elements
const wordSlotsEl = document.getElementById("word-slots");
const wordLengthBadgeEl = document.getElementById("word-length-badge");
const toastBannerEl = document.getElementById("toast-banner");
const toastTextEl = document.getElementById("toast-text");
const heartsContainerEl = document.getElementById("hearts-container");
const attemptsNumericEl = document.getElementById("attempts-numeric");
const keyboardContainerEl = document.getElementById("keyboard-container");
const restartBtn = document.getElementById("restart-btn");
const soundBtn = document.getElementById("sound-btn");
const soundIcon = document.getElementById("sound-icon");
const modeBtn = document.getElementById("mode-btn");
const modeLabel = document.getElementById("mode-label");

// Scoreboard Elements
const statWinsEl = document.getElementById("stat-wins");
const statLossesEl = document.getElementById("stat-losses");
const statStreakEl = document.getElementById("stat-streak");

// Modal Elements
const gameModal = document.getElementById("game-modal");
const modalTitle = document.getElementById("modal-title");
const modalIcon = document.getElementById("modal-icon");
const modalMessage = document.getElementById("modal-message");
const modalRevealedWord = document.getElementById("modal-revealed-word");
const modalPlayAgainBtn = document.getElementById("modal-play-again-btn");

// 7. Initialize Game
function initGame() {
  // Randomly select secret word
  const randomIndex = Math.floor(Math.random() * activeWordBank.length);
  currentWord = activeWordBank[randomIndex].toLowerCase();
  
  guessedLetters.clear();
  incorrectGuesses = 0;
  isGameOver = false;

  // Reset UI
  hideModal();
  updateAttemptsDisplay();
  renderWordSlots();
  renderKeyboard();
  resetHangmanSvg();
  updateStatsDisplay();

  showToast("Guess a letter using your keyboard or on-screen keys!", "normal");
}

// 8. Word Slots Rendering
function renderWordSlots() {
  wordSlotsEl.innerHTML = "";
  wordLengthBadgeEl.textContent = `${currentWord.length} letters`;

  for (let i = 0; i < currentWord.length; i++) {
    const letter = currentWord[i];
    const slot = document.createElement("div");
    slot.className = "letter-tile";
    slot.id = `slot-${i}`;

    if (guessedLetters.has(letter)) {
      slot.textContent = letter.toUpperCase();
      slot.classList.add("revealed");
    } else {
      slot.textContent = "";
    }

    wordSlotsEl.appendChild(slot);
  }
}

// 9. Virtual Keyboard Rendering
const KEYBOARD_ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"]
];

function renderKeyboard() {
  keyboardContainerEl.innerHTML = "";

  KEYBOARD_ROWS.forEach((row) => {
    const rowEl = document.createElement("div");
    rowEl.className = "keyboard-row";

    row.forEach((letter) => {
      const btn = document.createElement("button");
      btn.className = "key-btn";
      btn.textContent = letter.toUpperCase();
      btn.id = `key-${letter}`;
      btn.setAttribute("aria-label", `Letter ${letter.toUpperCase()}`);

      if (guessedLetters.has(letter)) {
        btn.disabled = true;
        if (currentWord.includes(letter)) {
          btn.classList.add("correct");
        } else {
          btn.classList.add("wrong");
        }
      }

      btn.addEventListener("click", () => handleGuess(letter));
      rowEl.appendChild(btn);
    });

    keyboardContainerEl.appendChild(rowEl);
  });
}

// 10. Update Hangman Visuals
function resetHangmanSvg() {
  HANGMAN_PARTS.forEach((partId) => {
    const el = document.getElementById(partId);
    if (el) {
      el.classList.add("part-hidden");
      el.classList.remove("part-visible");
    }
  });

  const face = document.getElementById("part-face");
  if (face) {
    face.classList.add("part-hidden");
    face.classList.remove("part-visible");
  }
}

function updateHangmanSvg() {
  for (let i = 0; i < incorrectGuesses; i++) {
    const partId = HANGMAN_PARTS[i];
    const el = document.getElementById(partId);
    if (el && el.classList.contains("part-hidden")) {
      el.classList.remove("part-hidden");
      el.classList.add("part-visible");
    }
  }

  // If reached 6 mistakes, show hurt face expression
  if (incorrectGuesses >= 6) {
    const face = document.getElementById("part-face");
    if (face) {
      face.classList.remove("part-hidden");
      face.classList.add("part-visible");
    }
  }
}

// 11. Attempts & Lives Display
function updateAttemptsDisplay() {
  const remaining = MAX_INCORRECT - incorrectGuesses;
  attemptsNumericEl.textContent = `${remaining} / ${MAX_INCORRECT} left`;

  const heartEls = heartsContainerEl.querySelectorAll(".heart");
  heartEls.forEach((heart, idx) => {
    if (idx < remaining) {
      heart.classList.remove("lost");
      heart.classList.add("active");
    } else {
      heart.classList.add("lost");
      heart.classList.remove("active");
    }
  });
}

// 12. Toast Feedback
function showToast(message, type = "normal") {
  toastTextEl.textContent = message;
  toastBannerEl.className = "toast-banner";
  
  const icon = toastBannerEl.querySelector(".toast-icon");
  if (type === "warning") {
    toastBannerEl.classList.add("warning");
    icon.textContent = "⚠️";
  } else if (type === "success") {
    toastBannerEl.classList.add("success");
    icon.textContent = "✨";
  } else if (type === "error") {
    toastBannerEl.classList.add("error");
    icon.textContent = "❌";
  } else {
    icon.textContent = "💡";
  }
}

// 13. Handle Letter Guess
function handleGuess(letter) {
  if (isGameOver) return;

  letter = letter.toLowerCase();

  // Validate single alphabet character
  if (!/^[a-z]$/.test(letter)) {
    showToast("Please enter a valid alphabet letter (a-z).", "warning");
    return;
  }

  // Check if letter was already guessed
  if (guessedLetters.has(letter)) {
    showToast(`You already guessed '${letter.toUpperCase()}'. Try another letter!`, "warning");
    return;
  }

  // Register guess
  guessedLetters.add(letter);

  // Update on-screen key
  const keyBtn = document.getElementById(`key-${letter}`);
  if (keyBtn) keyBtn.disabled = true;

  if (currentWord.includes(letter)) {
    // Correct guess
    if (keyBtn) keyBtn.classList.add("correct");
    sfx.correct();
    showToast(`Good job! '${letter.toUpperCase()}' is in the word.`, "success");
    renderWordSlots();
    checkWinCondition();
  } else {
    // Incorrect guess
    if (keyBtn) keyBtn.classList.add("wrong");
    incorrectGuesses++;
    sfx.wrong();
    updateAttemptsDisplay();
    updateHangmanSvg();

    const remaining = MAX_INCORRECT - incorrectGuesses;
    showToast(`Oops! '${letter.toUpperCase()}' is not in the word. (${remaining} left)`, "error");
    checkLoseCondition();
  }
}

// 14. Check Win Condition
function checkWinCondition() {
  const isWon = currentWord.split("").every((letter) => guessedLetters.has(letter));
  if (isWon) {
    isGameOver = true;
    sfx.win();
    confetti.fire();

    // Update Stats
    stats.wins++;
    stats.streak++;
    saveStats();
    updateStatsDisplay();

    setTimeout(() => {
      showModal(
        "🎉",
        "You Win!",
        "Outstanding job! You cracked the secret word.",
        currentWord,
        "win"
      );
    }, 450);
  }
}

// 15. Check Lose Condition
function checkLoseCondition() {
  if (incorrectGuesses >= MAX_INCORRECT) {
    isGameOver = true;
    sfx.gameOver();

    // Reveal missing letters in slots
    for (let i = 0; i < currentWord.length; i++) {
      const slot = document.getElementById(`slot-${i}`);
      if (slot && slot.textContent === "") {
        slot.textContent = currentWord[i].toUpperCase();
        slot.style.color = "var(--color-danger)";
      }
    }

    // Update Stats
    stats.losses++;
    stats.streak = 0;
    saveStats();
    updateStatsDisplay();

    setTimeout(() => {
      showModal(
        "💀",
        "Game Over!",
        "You ran out of attempts. Better luck next time!",
        currentWord,
        "loss"
      );
    }, 500);
  }
}

// 16. Modal Management
function showModal(icon, title, message, word, stateClass) {
  modalIcon.textContent = icon;
  modalTitle.textContent = title;
  modalTitle.className = `modal-title ${stateClass}`;
  modalMessage.textContent = message;
  modalRevealedWord.textContent = word.toUpperCase();
  gameModal.classList.remove("hidden");
}

function hideModal() {
  gameModal.classList.add("hidden");
}

// 17. Stats Management
function updateStatsDisplay() {
  statWinsEl.textContent = stats.wins;
  statLossesEl.textContent = stats.losses;
  statStreakEl.textContent = stats.streak;
}

function saveStats() {
  try {
    localStorage.setItem("hangman_stats", JSON.stringify(stats));
  } catch (e) {
    // Ignore if localStorage unavailable
  }
}

// 18. Physical Keyboard Listener
window.addEventListener("keydown", (e) => {
  // If modal is open, pressing Enter or Space restarts
  if (!gameModal.classList.contains("hidden")) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      initGame();
    }
    return;
  }

  const key = e.key.toLowerCase();
  if (/^[a-z]$/.test(key)) {
    handleGuess(key);
  }
});

// 19. Action Buttons Event Listeners
restartBtn.addEventListener("click", () => {
  initGame();
});

modalPlayAgainBtn.addEventListener("click", () => {
  initGame();
});

// Toggle Word Bank Mode (Core 5 vs Extended)
modeBtn.addEventListener("click", () => {
  if (activeWordBank === CORE_WORDS) {
    activeWordBank = EXTENDED_WORDS;
    modeLabel.textContent = "Extended Pack";
    modeBtn.style.borderColor = "var(--accent-purple)";
    modeBtn.style.color = "var(--accent-purple)";
    showToast("Switched to Extended Word Pack (14 words).", "normal");
  } else {
    activeWordBank = CORE_WORDS;
    modeLabel.textContent = "Core 5 Words";
    modeBtn.style.borderColor = "";
    modeBtn.style.color = "";
    showToast("Switched to Core 5 Words (python, computer, college, coding, program).", "normal");
  }
  initGame();
});

// Sound Toggle
soundBtn.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  if (soundEnabled) {
    soundIcon.innerHTML = `
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
    `;
    soundBtn.style.color = "var(--accent-cyan)";
    showToast("Sound effects enabled.", "normal");
    sfx.correct();
  } else {
    soundIcon.innerHTML = `
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
      <line x1="23" y1="9" x2="17" y2="15"></line>
      <line x1="17" y1="9" x2="23" y2="15"></line>
    `;
    soundBtn.style.color = "var(--text-dim)";
    showToast("Sound effects muted.", "normal");
  }
});

// Start Game On Page Load
window.addEventListener("DOMContentLoaded", () => {
  initGame();
});
