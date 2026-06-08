// Template-based trivia generator. Every question is derived deterministically from the
// SWAPI dataset, so the correct answer is always provably true and there is no LLM cost or
// hallucination risk. Variety is effectively infinite via randomized subject + distractor
// selection, and a recently-asked signature set keeps questions fresh across rounds.

import { resolveName } from "./data.js";

// Difficulty tiers: 0 = Padawan, 1 = Jedi, 2 = Jedi Master.
export const LEVELS = ["Padawan", "Jedi", "Jedi Master"];

// --- small helpers ---------------------------------------------------------

const rand = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rand(arr.length)];

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// A value is usable as an answer if it isn't a placeholder. We keep "none" because for some
// fields (e.g. a bald character's hair color) it is a legitimate, gradable answer.
function usable(v) {
  if (v == null) return false;
  const s = String(v).trim().toLowerCase();
  return s !== "" && s !== "unknown" && s !== "n/a";
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
// Some fields pack multiple comma-separated values; take the first for cleaner questions.
const first = (v) => String(v).split(",")[0].trim();
const titleCase = (s) =>
  String(s)
    .split(" ")
    .map((w) => (w ? cap(w) : w))
    .join(" ");

// Characters most casual fans recognize — used to keep Padawan questions approachable.
const FAMOUS = [
  "Luke Skywalker", "Darth Vader", "Leia Organa", "Han Solo", "Obi-Wan Kenobi",
  "R2-D2", "C-3PO", "Chewbacca", "Yoda", "Palpatine", "Boba Fett", "Lando Calrissian",
  "Darth Maul", "Qui-Gon Jinn", "Padmé Amidala", "Anakin Skywalker", "Jabba Desilijic Tiure",
  "Mace Windu", "Jar Jar Binks", "Wedge Antilles",
];

const isFamous = (person) => FAMOUS.includes(person.name);

// Build a 4-option multiple-choice from a correct answer + a pool of distractor candidates.
// Returns null if there aren't 3 distinct usable distractors.
function makeChoices(answer, pool, count = 4) {
  const ansKey = String(answer).trim().toLowerCase();
  const seen = new Set([ansKey]);
  const distractors = [];
  for (const raw of shuffle(pool)) {
    if (!usable(raw)) continue;
    const key = String(raw).trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    distractors.push(String(raw).trim());
    if (distractors.length === count - 1) break;
  }
  if (distractors.length < count - 1) return null;
  const choices = shuffle([String(answer).trim(), ...distractors]);
  return { choices, answerIndex: choices.indexOf(String(answer).trim()) };
}

// Collect every value of a field across a resource list (for distractor pools).
const fieldPool = (list, field, transform = (x) => x) =>
  list.filter((e) => usable(e[field])).map((e) => transform(e[field]));

// --- templates -------------------------------------------------------------
// Each template.generate(data) returns either null (not applicable right now) or
// { prompt, answer, pool, category, signature }. The runner turns that into choices.

const templates = [
  // ---- Padawan (easy) ----
  {
    id: "homeworld",
    levels: [0, 1],
    generate(data) {
      const subjects = data.people.filter(
        (p) => isFamous(p) && resolveName(data, p.homeworld)
      );
      if (!subjects.length) return null;
      const p = pick(subjects);
      const answer = resolveName(data, p.homeworld);
      return {
        prompt: `What is the home planet of ${p.name}?`,
        answer,
        pool: data.planets.map((pl) => pl.name),
        category: "Homeworlds",
        signature: `homeworld:${p.name}`,
      };
    },
  },
  {
    id: "eye-color",
    levels: [0],
    generate(data) {
      const subjects = data.people.filter((p) => isFamous(p) && usable(p.eye_color));
      if (!subjects.length) return null;
      const p = pick(subjects);
      return {
        prompt: `What color are ${p.name}'s eyes?`,
        answer: titleCase(first(p.eye_color)),
        pool: fieldPool(data.people, "eye_color", (v) => titleCase(first(v))),
        category: "Appearances",
        signature: `eye:${p.name}`,
      };
    },
  },
  {
    id: "film-feature",
    levels: [0, 1],
    generate(data) {
      // Famous people who appear in at least one but at most three films, so there are
      // enough films they DON'T appear in to use as distractors.
      const subjects = data.people.filter((p) => {
        if (!isFamous(p)) return false;
        const n = (p.films || []).length;
        return n >= 1 && n <= data.films.length - 3;
      });
      if (!subjects.length) return null;
      const p = pick(subjects);
      const inTitles = new Set(p.films.map((u) => resolveName(data, u)).filter(Boolean));
      const answer = pick([...inTitles]);
      const distractors = data.films
        .map((f) => f.title)
        .filter((t) => !inTitles.has(t));
      return {
        prompt: `In which of these films does ${p.name} appear?`,
        answer,
        pool: distractors,
        category: "Films",
        signature: `film:${p.name}`,
      };
    },
  },

  // ---- Jedi (medium) ----
  {
    id: "planet-terrain",
    levels: [1],
    generate(data) {
      const subjects = data.planets.filter((pl) => usable(pl.terrain));
      if (!subjects.length) return null;
      const pl = pick(subjects);
      return {
        prompt: `What is the primary terrain of ${pl.name}?`,
        answer: titleCase(first(pl.terrain)),
        pool: fieldPool(data.planets, "terrain", (v) => titleCase(first(v))),
        category: "Planets",
        signature: `terrain:${pl.name}`,
      };
    },
  },
  {
    id: "planet-climate",
    levels: [1],
    generate(data) {
      const subjects = data.planets.filter((pl) => usable(pl.climate));
      if (!subjects.length) return null;
      const pl = pick(subjects);
      return {
        prompt: `What is the climate of ${pl.name}?`,
        answer: titleCase(first(pl.climate)),
        pool: fieldPool(data.planets, "climate", (v) => titleCase(first(v))),
        category: "Planets",
        signature: `climate:${pl.name}`,
      };
    },
  },
  {
    id: "char-height",
    levels: [1, 2],
    generate(data) {
      const subjects = data.people.filter((p) => usable(p.height));
      if (!subjects.length) return null;
      const p = pick(subjects);
      return {
        prompt: `How tall is ${p.name}, in centimeters?`,
        answer: `${p.height} cm`,
        pool: fieldPool(data.people, "height", (v) => `${v} cm`),
        category: "Characters",
        signature: `height:${p.name}`,
      };
    },
  },
  {
    id: "starship-class",
    levels: [1, 2],
    generate(data) {
      const subjects = data.starships.filter((s) => usable(s.starship_class));
      if (!subjects.length) return null;
      const s = pick(subjects);
      return {
        prompt: `What class of starship is the ${s.name}?`,
        answer: titleCase(s.starship_class),
        pool: fieldPool(data.starships, "starship_class", titleCase),
        category: "Starships",
        signature: `sclass:${s.name}`,
      };
    },
  },
  {
    id: "species-classification",
    levels: [1, 2],
    generate(data) {
      const subjects = data.species.filter((sp) => usable(sp.classification));
      if (!subjects.length) return null;
      const sp = pick(subjects);
      return {
        prompt: `What is the biological classification of the ${sp.name} species?`,
        answer: titleCase(sp.classification),
        pool: fieldPool(data.species, "classification", titleCase),
        category: "Species",
        signature: `class:${sp.name}`,
      };
    },
  },

  // ---- Jedi Master (hard) ----
  {
    id: "birth-year",
    levels: [2],
    generate(data) {
      const subjects = data.people.filter((p) => usable(p.birth_year));
      if (!subjects.length) return null;
      const p = pick(subjects);
      return {
        prompt: `What is the recorded birth year of ${p.name}?`,
        answer: p.birth_year,
        pool: fieldPool(data.people, "birth_year"),
        category: "Galactic Records",
        signature: `birth:${p.name}`,
      };
    },
  },
  {
    id: "starship-length",
    levels: [2],
    generate(data) {
      const subjects = data.starships.filter((s) => usable(s.length));
      if (!subjects.length) return null;
      const s = pick(subjects);
      return {
        prompt: `What is the length of the ${s.name}, in meters?`,
        answer: `${s.length} m`,
        pool: fieldPool(data.starships, "length", (v) => `${v} m`),
        category: "Starships",
        signature: `slength:${s.name}`,
      };
    },
  },
  {
    id: "vehicle-manufacturer",
    levels: [2],
    generate(data) {
      const subjects = data.vehicles.filter((v) => usable(v.manufacturer));
      if (!subjects.length) return null;
      const v = pick(subjects);
      return {
        prompt: `Who is the manufacturer of the ${v.name}?`,
        answer: first(v.manufacturer),
        pool: [...fieldPool(data.vehicles, "manufacturer", first), ...fieldPool(data.starships, "manufacturer", first)],
        category: "Vehicles",
        signature: `vmanuf:${v.name}`,
      };
    },
  },
  {
    id: "film-release",
    levels: [2],
    generate(data) {
      const subjects = data.films.filter((f) => usable(f.release_date));
      if (subjects.length < 4) return null;
      const f = pick(subjects);
      return {
        prompt: `In what year was "${f.title}" released?`,
        answer: String(f.release_date).slice(0, 4),
        pool: data.films.map((x) => String(x.release_date).slice(0, 4)),
        category: "Films",
        signature: `release:${f.title}`,
      };
    },
  },
  {
    id: "planet-population",
    levels: [2],
    generate(data) {
      const subjects = data.planets.filter((pl) => usable(pl.population) && /^\d+$/.test(pl.population));
      if (!subjects.length) return null;
      const pl = pick(subjects);
      const fmt = (n) => Number(n).toLocaleString("en-US");
      return {
        prompt: `What is the recorded population of ${pl.name}?`,
        answer: fmt(pl.population),
        pool: data.planets
          .filter((x) => /^\d+$/.test(x.population || ""))
          .map((x) => fmt(x.population)),
        category: "Planets",
        signature: `pop:${pl.name}`,
      };
    },
  },
];

// Generate one question for a difficulty level, avoiding recently-asked signatures.
// recentlyAsked is a Set of signatures; falls back gracefully if a template can't produce.
export function generateQuestion(data, difficulty, recentlyAsked = new Set()) {
  const pool = templates.filter((t) => t.levels.includes(difficulty));
  // Try a good number of times: random template + random subject, skip recent/invalid.
  for (let attempt = 0; attempt < 60; attempt++) {
    const tmpl = pick(pool.length ? pool : templates);
    const spec = tmpl.generate(data);
    if (!spec || !usable(spec.answer)) continue;
    if (recentlyAsked.has(spec.signature) && attempt < 45) continue;
    const mc = makeChoices(spec.answer, spec.pool);
    if (!mc) continue;
    return {
      prompt: spec.prompt,
      choices: mc.choices,
      answerIndex: mc.answerIndex,
      category: spec.category,
      signature: spec.signature,
      difficulty,
    };
  }
  return null;
}

// Build a full round of `count` unique questions.
export function generateRound(data, difficulty, recentlyAsked, count = 10) {
  const questions = [];
  const usedThisRound = new Set();
  let guard = 0;
  while (questions.length < count && guard++ < count * 40) {
    const q = generateQuestion(data, difficulty, new Set([...recentlyAsked, ...usedThisRound]));
    if (!q || usedThisRound.has(q.signature)) continue;
    usedThisRound.add(q.signature);
    questions.push(q);
  }
  return questions;
}
