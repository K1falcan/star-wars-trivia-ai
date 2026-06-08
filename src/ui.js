// DOM rendering for the trivia game: HUD, question card, choice buttons, feedback, and the
// round summary. Kept free of game logic — it reads from the Game instance and reports
// clicks back via callbacks.

const $ = (id) => document.getElementById(id);

export const screens = {
  start: $("screen-start"),
  game: $("screen-game"),
  summary: $("screen-summary"),
};

export function showScreen(name) {
  for (const [key, el] of Object.entries(screens)) {
    el.classList.toggle("hidden", key !== name);
  }
}

export function renderHud(game) {
  $("hud-level").textContent = game.levelName;
  $("hud-score").textContent = String(game.roundCorrect);
  $("hud-streak").textContent = String(game.streak);
  const { current, total } = game.progress;
  $("hud-progress").textContent = `${current} / ${total}`;
  $("progress-bar").style.width = `${(current - 1) / total * 100}%`;
}

// Reflect the gold streak frame on the body.
export function renderStreakFrame(active) {
  document.body.classList.toggle("streak-active", active);
}

// Render a question and wire choice clicks to `onAnswer(choiceIndex)`.
export function renderQuestion(question, onAnswer) {
  $("question-category").textContent = question.category;
  $("question-text").textContent = question.prompt;
  $("feedback").textContent = "";
  $("feedback").className = "feedback";

  const container = $("choices");
  container.innerHTML = "";
  question.choices.forEach((choice, i) => {
    const btn = document.createElement("button");
    btn.className = "choice";
    btn.type = "button";
    btn.textContent = choice;
    btn.addEventListener("click", () => onAnswer(i), { once: true });
    container.appendChild(btn);
  });
}

// Visually mark the graded result and lock all choices.
export function revealAnswer({ correct, answerIndex }, chosenIndex) {
  const buttons = [...$("choices").querySelectorAll(".choice")];
  buttons.forEach((btn, i) => {
    btn.disabled = true;
    if (i === answerIndex) btn.classList.add("correct");
    if (i === chosenIndex && !correct) btn.classList.add("wrong");
  });
  const fb = $("feedback");
  fb.textContent = correct ? "Correct — the Force is strong." : "Incorrect. The dark side clouds everything.";
  fb.className = `feedback ${correct ? "good" : "bad"}`;
}

export function renderSummary(result) {
  $("summary-score").textContent = `You answered ${result.correct} of ${result.total} correctly.`;

  const verdicts = {
    up: `You have ascended to ${result.toLevel}.`,
    down: `You slip back to ${result.toLevel}. Train harder.`,
    stay: `You hold your rank of ${result.toLevel}.`,
    max: `You remain a ${result.toLevel} — the summit of the Order.`,
    floor: `You remain a ${result.toLevel}. Begin again, young one.`,
  };
  const titles = {
    up: "Promotion!",
    down: "Demotion",
    stay: "Round Complete",
    max: "Grand Master",
    floor: "Round Complete",
  };
  $("summary-title").textContent = titles[result.outcome];
  $("summary-verdict").textContent = verdicts[result.outcome];
}

export const els = {
  hyperspace: $("hyperspace"),
  saber: $("saber"),
  btnStart: $("btn-start"),
  btnNext: $("btn-next"),
};
