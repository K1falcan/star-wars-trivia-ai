// App bootstrap: wire the hyperspace background + lightsaber cursor, load SWAPI data, and
// drive the game loop (start -> rounds of 10 -> summary -> next round, forever).

import "./styles.css";
import { loadBundled, refreshLive } from "./data.js";
import { Game } from "./game.js";
import { startHyperspace } from "./hyperspace.js";
import { startSaberCursor } from "./cursor.js";
import * as ui from "./ui.js";

const FEEDBACK_DELAY = 1100; // ms to show the graded answer before advancing

async function boot() {
  // Ambient visuals first so the screen is alive while data loads.
  startHyperspace(ui.els.hyperspace);
  startSaberCursor(ui.els.saber);

  let data;
  try {
    data = await loadBundled();
  } catch (err) {
    document.getElementById("question-text").textContent =
      "Failed to load the Star Wars archives. Please refresh.";
    console.error("data load failed:", err);
    return;
  }

  // Refresh from live SWAPI in the background; swap in if it succeeds.
  refreshLive().then((live) => {
    if (live && live.people?.length) game.data = live;
  });

  const game = new Game(data);

  function syncFrame() {
    ui.renderStreakFrame(game.streakActive);
  }

  function showQuestion() {
    const q = game.currentQuestion;
    if (!q) return endRound();
    ui.renderHud(game);
    ui.renderQuestion(q, onAnswer);
  }

  function onAnswer(choiceIndex) {
    const result = game.answer(choiceIndex);
    if (!result) return;
    ui.revealAnswer(result, choiceIndex);
    ui.renderHud(game);
    syncFrame();

    setTimeout(() => {
      game.next();
      if (game.isRoundOver) endRound();
      else showQuestion();
    }, FEEDBACK_DELAY);
  }

  function endRound() {
    const result = game.finishRound();
    ui.renderSummary(result);
    ui.showScreen("summary");
  }

  function startRound() {
    game.startRound();
    syncFrame();
    ui.showScreen("game");
    showQuestion();
  }

  ui.els.btnStart.addEventListener("click", startRound);
  ui.els.btnNext.addEventListener("click", startRound);
}

boot();
