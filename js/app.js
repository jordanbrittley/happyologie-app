/*
  Happyologie app logic.

  Content (cards, prompts, affirmation lines) is fetched from data/*.json
  at startup instead of being hardcoded here — see CONTENT.md for how to
  edit that copy. Journal entries and the shelf live in IndexedDB via
  db.js; nothing here ever sends that data anywhere.
*/

if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("sw.js").catch(function () {
      // Offline caching is a nice-to-have; the app still works without it.
    });
  });
}

var PERMISSION = [];
var STRESS = [];
var STRESS_INTRO = "";
var PROMPTS = [];
var JOY_LINES = [];
var JOY_SYMBOLS = ["♥", "✦", "☀", "♥", "✦"];
var JOY_COLORS = ["#c85a6a", "#e8c86a", "#b79ae8", "#2fbf8f", "#e85c8b"];

var LS_STRESS_INTRO_SEEN = "hpl-stress-intro-seen";

var state = {
  deck: "permission",
  pIdx: 0,
  sIdx: 0,
  flipped: false,
  joyLine: 0,
  showStressIntro: false,
  shelf: [],
  journalToday: null
};

function dayOfYear() {
  var now = new Date();
  return Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

var app = document.getElementById("app");

function joy() {
  for (var i = 0; i < 12; i++) {
    var el = document.createElement("span");
    el.className = "float-joy";
    el.textContent = JOY_SYMBOLS[Math.floor(Math.random() * JOY_SYMBOLS.length)];
    el.style.left = (8 + Math.random() * 84) + "%";
    el.style.color = JOY_COLORS[Math.floor(Math.random() * JOY_COLORS.length)];
    el.style.fontSize = (14 + Math.random() * 12) + "px";
    el.style.animationDelay = (Math.random() * 0.35) + "s";
    app.appendChild(el);
    (function (n) { setTimeout(function () { n.remove(); }, 2400); })(el);
  }
  var toast = document.getElementById("toast");
  toast.innerHTML = "";
  var pill = document.createElement("span");
  pill.textContent = JOY_LINES[state.joyLine % JOY_LINES.length];
  state.joyLine++;
  toast.appendChild(pill);
  setTimeout(function () { pill.remove(); }, 2100);
}

function joySmall() {
  var cardEl = document.getElementById("big-card");
  var rect = cardEl.getBoundingClientRect();
  var appRect = app.getBoundingClientRect();
  for (var i = 0; i < 3; i++) {
    var el = document.createElement("span");
    el.className = "float-spark";
    el.textContent = JOY_SYMBOLS[Math.floor(Math.random() * JOY_SYMBOLS.length)];
    el.style.left = (rect.left - appRect.left + 20 + Math.random() * (rect.width - 40)) + "px";
    el.style.top = (rect.top - appRect.top + rect.height - 30) + "px";
    el.style.color = JOY_COLORS[Math.floor(Math.random() * JOY_COLORS.length)];
    el.style.fontSize = (11 + Math.random() * 7) + "px";
    el.style.animationDelay = (Math.random() * 0.15) + "s";
    app.appendChild(el);
    (function (n) { setTimeout(function () { n.remove(); }, 1400); })(el);
  }
  cardEl.classList.remove("card-pop");
  void cardEl.offsetWidth;
  cardEl.classList.add("card-pop");
}

function show(name) {
  ["today", "cards", "shelf", "settings"].forEach(function (s) {
    document.getElementById("screen-" + s).classList.toggle("active", s === name);
    document.getElementById("nav-" + s).classList.toggle("on", s === name);
  });
  if (name === "shelf") renderShelf();
  if (name === "settings") renderSettings();
}

["today", "cards", "shelf", "settings"].forEach(function (s) {
  document.getElementById("nav-" + s).addEventListener("click", function () { show(s); });
});

function currentCardText() {
  if (state.deck === "permission") return PERMISSION[state.pIdx];
  var c = STRESS[state.sIdx];
  return state.flipped ? c.back : c.front;
}

function renderCard() {
  var introEl = document.getElementById("deck-intro");
  var bigCard = document.getElementById("big-card");
  var rowBtns = document.querySelector("#screen-cards .row-btns");
  var showingIntro = state.deck === "stress" && state.showStressIntro;
  var isStress = state.deck === "stress";

  // Header label, count badge, and pill highlight reflect the selected
  // deck even while the intro is showing — only the card itself waits.
  document.getElementById("deck-name").textContent = isStress ? "stress reset" : "permission cards";
  document.getElementById("deck-count").textContent = isStress ? (state.sIdx + 1) + " of " + STRESS.length : (state.pIdx + 1) + " of " + PERMISSION.length;
  document.getElementById("pill-permission").classList.toggle("on", !isStress);
  document.getElementById("pill-stress").classList.toggle("on", isStress);

  introEl.style.display = showingIntro ? "block" : "none";
  bigCard.style.display = showingIntro ? "none" : "flex";
  rowBtns.style.display = showingIntro ? "none" : "flex";
  if (showingIntro) {
    document.getElementById("flip-hint").style.display = "none";
    return;
  }

  document.getElementById("card-text").textContent = currentCardText();
  document.getElementById("flip-hint").style.display = isStress && !state.flipped ? "block" : "none";
}

document.getElementById("pill-permission").addEventListener("click", function () {
  state.deck = "permission";
  state.flipped = false;
  renderCard();
});
document.getElementById("pill-stress").addEventListener("click", function () {
  state.deck = "stress";
  state.flipped = false;
  state.showStressIntro = !localStorage.getItem(LS_STRESS_INTRO_SEEN);
  renderCard();
});
document.getElementById("deck-intro-continue").addEventListener("click", function () {
  localStorage.setItem(LS_STRESS_INTRO_SEEN, "1");
  state.showStressIntro = false;
  renderCard();
});
document.getElementById("big-card").addEventListener("click", function () {
  if (state.deck === "stress") { state.flipped = !state.flipped; renderCard(); }
});
document.getElementById("next-card").addEventListener("click", function () {
  if (state.deck === "permission") state.pIdx = (state.pIdx + 1) % PERMISSION.length;
  else { state.sIdx = (state.sIdx + 1) % STRESS.length; state.flipped = false; }
  renderCard();
  joySmall();
});
document.getElementById("save-card").addEventListener("click", function () {
  var entry = {
    deck: state.deck,
    text: state.deck === "permission" ? PERMISSION[state.pIdx] : STRESS[state.sIdx].front + " " + STRESS[state.sIdx].back,
    when: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" }).toLowerCase()
  };
  HappyDB.addShelfItem(entry).finally(function () {
    joy();
    setTimeout(function () { document.getElementById("next-card").click(); }, 700);
  });
});

function renderShelf() {
  HappyDB.getShelf().then(function (shelf) {
    state.shelf = shelf;
    var list = document.getElementById("shelf-list");
    list.innerHTML = "";
    if (!shelf.length) {
      list.innerHTML = '<div class="empty-shelf">Nothing here yet, and that’s okay too.<br>When a card feels like it was written for you, tap the heart and it will live here.</div>';
      return;
    }
    shelf.forEach(function (item) {
      var div = document.createElement("div");
      div.className = "shelf-item" + (item.deck === "stress" ? " stress" : "");
      var label = item.deck === "stress" ? '<p class="blush-label">stress reset</p>' : "";
      div.innerHTML = label + '<p style="font-size:15px; line-height:1.55; padding-right:24px;"></p><p class="when">saved ' + item.when + '</p><button class="unsave" aria-label="remove">&times;</button>';
      div.querySelector("p:nth-of-type(" + (label ? 2 : 1) + ")").textContent = item.text;
      div.querySelector(".unsave").addEventListener("click", function () {
        HappyDB.removeShelfItem(item.id).then(renderShelf);
      });
      list.appendChild(div);
    });
  });
}

function renderSettings() {
  HappyDB.getJournalCount().then(function (n) {
    document.getElementById("journal-count").textContent = n + " kept, private to you";
  });
}

document.getElementById("notif-toggle").addEventListener("click", function () {
  this.classList.toggle("on");
});

document.getElementById("journal-save").addEventListener("click", function () {
  var val = document.getElementById("journal").value.trim();
  if (!val) return;
  HappyDB.saveJournalEntry(todayKey(), val).then(function () {
    joy();
    document.getElementById("kept-note").style.display = "block";
  });
});

document.getElementById("go-cards").addEventListener("click", function () { show("cards"); });

function loadContent() {
  return Promise.all([
    fetch("data/permission-cards.json").then(function (r) { return r.json(); }),
    fetch("data/stress-cards.json").then(function (r) { return r.json(); }),
    fetch("data/daily-prompts.json").then(function (r) { return r.json(); }),
    fetch("data/joy-lines.json").then(function (r) { return r.json(); })
  ]).then(function (results) {
    PERMISSION = results[0].cards;
    STRESS = results[1].cards;
    STRESS_INTRO = results[1].intro;
    PROMPTS = results[2].prompts;
    JOY_LINES = results[3].lines;
  });
}

function renderToday() {
  var d = new Date();
  document.getElementById("today-date").textContent = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }).toLowerCase();
  var hr = d.getHours();
  document.getElementById("greeting").textContent = hr < 12 ? "good morning, beautiful brain" : hr < 17 ? "hi, beautiful brain" : "good evening, beautiful brain";
  document.getElementById("daily-prompt").textContent = PROMPTS[dayOfYear() % PROMPTS.length];
  document.getElementById("daily-card").textContent = PERMISSION[dayOfYear() % PERMISSION.length];
  document.getElementById("deck-intro-text").textContent = STRESS_INTRO;
}

function init() {
  return loadContent()
    .then(function () { return HappyDB.init(); })
    .then(function () { return HappyDB.migrateFromLocalStorage(); })
    .then(function () { return HappyDB.requestPersistence(); })
    .then(function () {
      renderToday();
      return HappyDB.getJournalEntry(todayKey());
    })
    .then(function (savedText) {
      if (savedText) {
        document.getElementById("journal").value = savedText;
        document.getElementById("kept-note").style.display = "block";
      }
      renderCard();
    })
    .catch(function (err) {
      // If content or storage fails to load, fail loud rather than silent —
      // an empty deck reads as a bug, not a quiet moment.
      console.error("Happyologie failed to start:", err);
      document.getElementById("app").innerHTML =
        '<div style="padding:40px 24px; text-align:center; color:#164a4a; font-family:\'DM Sans\',sans-serif;">' +
        'Something didn’t load right. Try closing and reopening the app.</div>';
    });
}

init();
