// Game state machine: rounds of 10 questions, three levels, infinite play.
// Level rule per round: 6+ correct -> level up; 0-3 -> level down; 4-5 -> stay.
// The consecutive-correct streak persists across questions/rounds and drives the gold frame.

import { LEVELS, generateRound } from "./questions.js";

const ROUND_SIZE = 10;
const LEVEL_UP_AT = 6; // correct answers needed to ascend
const LEVEL_DOWN_BELOW = 4; // fewer than this (0-3) descends
const STREAK_FRAME_AT = 6; // gold frame threshold
const RECENT_MAX = 50; // signatures remembered to avoid repeats
const STORAGE_KEY = "swtrivia.v1";

export class Game {
  constructor(data) {
    this.data = data;
    this.level = 0;
    this.streak = 0;
    this.best = { level: 0, streak: 0 };
    this.recentlyAsked = [];
    this.questions = [];
    this.index = 0;
    this.roundCorrect = 0;
    this.answered = false;
    this.load();
  }

  // --- persistence ---
  load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (saved) {
        this.level = clampLevel(saved.level ?? 0);
        this.best = saved.best ?? { level: this.level, streak: 0 };
      }
    } catch {
      /* ignore corrupt storage */
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ level: this.level, best: this.best }));
    } catch {
      /* storage may be unavailable; non-fatal */
    }
  }

  get levelName() {
    return LEVELS[this.level];
  }

  get streakActive() {
    return this.streak >= STREAK_FRAME_AT;
  }

  // --- round lifecycle ---
  startRound() {
    this.questions = generateRound(this.data, this.level, new Set(this.recentlyAsked), ROUND_SIZE);
    this.index = 0;
    this.roundCorrect = 0;
    this.answered = false;
    return this.currentQuestion;
  }

  get currentQuestion() {
    return this.questions[this.index] || null;
  }

  get progress() {
    return { current: Math.min(this.index + 1, this.questions.length), total: this.questions.length };
  }

  // Grade the selected choice. Returns { correct, answerIndex }.
  answer(choiceIndex) {
    const q = this.currentQuestion;
    if (!q || this.answered) return null;
    this.answered = true;
    const correct = choiceIndex === q.answerIndex;

    if (correct) {
      this.roundCorrect++;
      this.streak++;
      if (this.streak > this.best.streak) this.best.streak = this.streak;
    } else {
      this.streak = 0;
    }

    this.recentlyAsked.push(q.signature);
    if (this.recentlyAsked.length > RECENT_MAX) this.recentlyAsked.shift();

    return { correct, answerIndex: q.answerIndex };
  }

  // Advance to the next question; returns null when the round is over.
  next() {
    this.index++;
    this.answered = false;
    return this.currentQuestion;
  }

  get isRoundOver() {
    return this.index >= this.questions.length;
  }

  // Apply the level rule and report the transition for the summary screen.
  finishRound() {
    const correct = this.roundCorrect;
    const prevLevel = this.level;
    let outcome = "stay";

    if (correct >= LEVEL_UP_AT && this.level < LEVELS.length - 1) {
      this.level++;
      outcome = "up";
    } else if (correct >= LEVEL_UP_AT) {
      outcome = "max"; // already Jedi Master, can't go higher
    } else if (correct < LEVEL_DOWN_BELOW && this.level > 0) {
      this.level--;
      outcome = "down";
    } else if (correct < LEVEL_DOWN_BELOW) {
      outcome = "floor"; // already Padawan, can't go lower
    }

    if (this.level > this.best.level) this.best.level = this.level;
    this.save();

    return {
      correct,
      total: this.questions.length,
      outcome,
      fromLevel: LEVELS[prevLevel],
      toLevel: LEVELS[this.level],
    };
  }
}

function clampLevel(n) {
  return Math.max(0, Math.min(LEVELS.length - 1, Number(n) || 0));
}
