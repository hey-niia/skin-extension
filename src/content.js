/*
 * Skin — a paper skin for Claude and ChatGPT.
 *
 * Privacy model:
 * - Reads only chat links that the site has already rendered on the page
 *   (sidebar, Recents). It never calls the site's API and makes no network
 *   requests of its own. Fonts, textures and images load from the extension itself.
 * - Stores chat titles, links and your folder settings in chrome.storage.local.
 *   Nothing is sent anywhere.
 */
(() => {
  if (window.__skinLoaded) return;
  window.__skinLoaded = true;

  /* ---------------- sites ---------------- */
  const SITES = {
    claude: {
      label: "Claude", host: "claude.ai",
      match: [[/^\/chat\/([0-9a-f-]{36})/i, "chat"], [/^\/code\/([\w-]{6,})/i, "code"]],
      home: ["/new", "/"], chatUrl: "https://claude.ai/new", codeUrl: "https://claude.ai/code",
      codeLabel: "claude code", recents: "https://claude.ai/recents", titleSuffix: /\s*[-–|]\s*Claude\s*$/,
    },
    chatgpt: {
      label: "ChatGPT", host: "chatgpt.com",
      match: [[/^\/c\/([\w-]{8,})/i, "chat"], [/^\/codex\/tasks\/([\w-]{6,})/i, "code"]],
      home: ["/"], chatUrl: "https://chatgpt.com/", codeUrl: "https://chatgpt.com/codex",
      codeLabel: "codex", recents: null, titleSuffix: /\s*[-–|]\s*ChatGPT\s*$/,
    },
  };
  const SITE = location.hostname.endsWith("chatgpt.com") ? "chatgpt" : "claude";
  const site = SITES[SITE];

  /* ---------------- palettes (same as the prototype) ---------------- */
  const PRESETS = {
    neon:   { note: "flat & bright on black", bg: "#0b0b0a", colors: ["#F6A3CB", "#FFC31F", "#5FE68C", "#20AEFF", "#FF6B35", "#F3F0E8", "#B9A8FF"] },
    kraft:  { note: "risograph poster stock", bg: "#0c0c0b", colors: ["#3D8FE0", "#B88B58", "#E2623D", "#6B7FA6", "#6D7B5B", "#7B4B36", "#F1C92E"] },
    fold:   { note: "soft pastel, folded",    bg: "#141413", colors: ["#F7A77B", "#3F8EA5", "#3E9B78", "#F08878", "#C7B39F", "#BEE5DC", "#C4553A"] },
    vellum: { note: "quiet, almost white",    bg: "#0a0a0a", colors: ["#ECE9E2", "#D9D5CC", "#BEB9AE", "#9A958B", "#5E5B55", "#E5DDC9", "#F1C92E"] },
  };

  /* Word stems matched at the start of a word — English, Ukrainian, Russian. */
  const F = (id, name, ci, kw, priv = false) => ({ id, name, ci, showName: !priv, hideTitles: priv, envelope: priv, keywords: kw });
  const DEFAULT_FOLDERS = [
    F("visa", "visa", 0, "visa, віз, виз, passport, паспорт, embassy, посольств, consulate, консульств, immigra, імміграц, иммиграц, residence permit, посвідк, внж, green card, uscis, relocation, релокац", true),
    F("health", "health", 2, "health, здоров, doctor, лікар, врач, sleep, сон, symptom, симптом, medic, медич, медиц, blood, кров, therap, терап, vitamin, вітамін, витамин, pain, біль, боль, diet, дієт, диет, workout, тренуван, трениров, fitness", true),
    F("taxes", "money", 4, "tax, податк, налог, invoice, інвойс, инвойс, рахун, счет, budget, бюджет, bank, банк, фоп, accounting, бухгалт, salary, зарплат, financ, фінанс, финанс, money, грош, деньг, payment, оплат, pension, пенсі", true),
    F("work", "work", 1, "work, робот, работ, job, ваканс, cv, resume, резюме, cover letter, interview, співбесід, собеседов, portfolio, портфоліо, портфолио, client, клієнт, клиент, meeting, зустріч, встреч, email, linkedin, hiring, recruit, рекрут, offer, оффер, career, кар'єр, карьер"),
    F("design", "design", 3, "design, дизайн, figma, фігм, фигм, ux, ui, logo, лого, font, шрифт, color, colour, колір, кольор, цвет, typograph, типограф, mockup, макет, brand, бренд, icon, іконк, иконк, layout, prototype, прототип, illustrat, ілюстрац, иллюстрац, poster, постер, animation, анімац, анимац, grain, texture, текстур"),
    F("code", "code", 5, "code, код, python, javascript, typescript, react, api, bug, баг, git, sql, css, html, script, скрипт, deploy, extension, розширен, расширен, npm, node, swift, bash, terminal, термінал, терминал, error, помилк, ошибк, function, функці, database, mcp, regex, json, app, додат, приложен"),
    F("learning", "learning", 6, "learn, вивч, изуч, english, англій, англий, course, курс, translate, переклад, перевод, explain, поясн, объясн, grammar, граматик, грамматик, lesson, урок, what is, що таке, что такое, history, історі, истори"),
    F("writing", "writing", 1, "write, writing, пиш, напис, letter, лист, письм, post, пост, text, текст, article, статт, стать, essay, есе, эссе, story, rewrite, переписа, edit, редаг, редакт, caption, підпис, message, повідомл, сообщен"),
    F("travel", "travel", 0, "travel, trip, подорож, путешеств, flight, рейс, hotel, готел, отел, itinerary, маршрут, packing, відпуст, отпуск, vacation, airbnb, train, поїзд, поезд, visit, weekend, вихідн, выходн"),
    F("life", "life", 2, "relationship, стосунк, отношен, family, сім, семь, friend, друз, psycholog, психолог, emotion, емоці, эмоци, feel, почутт, чувств, advice, порад, совет, gift, подарун, подар, home, дім, квартир, apartment, moving, переїзд, переезд"),
    F("cooking", "cooking", 4, "recipe, рецепт, cook, готув, готов, bake, випік, выпеч, dinner, вечер, soup, суп, meal, страв, блюд, breakfast, сніданок, завтрак"),
    F("ideas", "ideas", 3, "idea, ідея, ідеї, идея, идеи, startup, стартап, brainstorm, мозков, name, назв, назван, concept, концепц, side project, pet project"),
  ];

  const DEFAULT_STATE = {
    v: 2, preset: "kraft", grain: 0.38, tilt: true, envelopes: true, openOnHome: true,
    folders: DEFAULT_FOLDERS,
    chats: {}, // "site:id" -> {site, kind, id, title, path, seen, folder?}
  };

  /* ---------------- state + storage ---------------- */
  let S = structuredClone(DEFAULT_STATE);
  const store = chrome.storage.local;
  const myRev = Math.random().toString(36).slice(2);
  let saveTimer;
  const save = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => { S.rev = myRev + Date.now(); store.set({ skin: S }); }, 300); };

  /* ---------------- helpers ---------------- */
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const reEsc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const palette = () => PRESETS[S.preset] || PRESETS.kraft;
  const colorOf = (f) => f.custom || palette().colors[f.ci % palette().colors.length];
  function fgFor(hex) {
    const n = parseInt(hex.slice(1), 16);
    const L = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * L[0] + 0.7152 * L[1] + 0.0722 * L[2] > 0.28 ? "#141412" : "#F3F0E8";
  }
  const rot = (id) => { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0; return ((h % 7) - 3) * 0.8; };
  const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const day = (t) => { const d = new Date(t); return `${d.getDate()} ${MONTHS[d.getMonth()]}`; };
  const idle = (fn) => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 2000 }) : setTimeout(fn, 50));

  /* ---------------- reading chats from the page ---------------- */
  function parseLink(href) {
    let u;
    try { u = new URL(href, location.href); } catch { return null; }
    if (u.host !== location.host) return null;
    for (const [re, kind] of site.match) { const m = u.pathname.match(re); if (m) return { id: m[1], kind, path: u.pathname }; }
    return null;
  }
  const cleanTitle = (t) => (t || "").replace(/\s+/g, " ").trim().slice(0, 140);
  let lastSig = "";
  function scan() {
    const found = [];
    for (const a of document.querySelectorAll('a[href*="/chat/"], a[href*="/code/"], a[href*="/c/"], a[href*="/codex/"]')) {
      const p = parseLink(a.getAttribute("href"));
      if (!p) continue;
      const title = cleanTitle(a.getAttribute("title") || a.getAttribute("aria-label") || a.textContent);
      if (title) found.push({ ...p, title });
    }
    // the open chat — tab title is only a fallback, never overrides the sidebar
    const here = parseLink(location.href);
    if (here && !found.some((c) => c.id === here.id)) {
      const t = cleanTitle(document.title.replace(site.titleSuffix, ""));
      if (t && !/^(claude|chatgpt|new chat)$/i.test(t)) found.push({ ...here, title: t, weak: true });
    }
    const sig = found.map((c) => c.id + c.title).join("|");
    if (sig === lastSig) return; // nothing new on the page — skip all work
    lastSig = sig;
    let changed = false;
    const now = Date.now();
    for (const c of found) {
      const key = SITE + ":" + c.id, old = S.chats[key];
      if (!old) { S.chats[key] = { site: SITE, kind: c.kind, id: c.id, title: c.title, path: c.path, seen: now }; changed = true; }
      else if (!c.weak && old.title !== c.title) { old.title = c.title; changed = true; }
    }
    if (changed) { invalidate(); save(); if (isOpen()) renderView(); }
  }
  let scanTimer;
  const scheduleScan = () => { clearTimeout(scanTimer); scanTimer = setTimeout(() => idle(scan), 1200); };

  /* ---------------- sorting ----------------
   * 1. a folder you picked by hand
   * 2. a keyword from the folder's word list
   * 3. a guess learned from chats already in folders (word overlap, weighted by rarity)
   * 4. unsorted
   */
  const STOP = new Set("the and for with how what why can you your from into about this that are was not but use using new help make best про для как что это або але щоб яка який які чи при від".split(" "));
  const stem = (w) => (w.length > 6 ? w.slice(0, 6) : w);
  const words = (t) => (t.toLowerCase().match(/[\p{L}\p{N}]+/gu) || []).filter((w) => w.length > 2 && !STOP.has(w));
  const tokens = (t) => [...new Set(words(t).map(stem))];
  const matcherCache = new Map();
  function matcher(f) {
    const src = f.keywords || "";
    const hit = matcherCache.get(f.id);
    if (hit?.src === src) return hit.re;
    const list = src.split(",").map((w) => w.trim()).filter(Boolean).map(reEsc);
    const re = list.length ? new RegExp("(^|[^\\p{L}\\p{N}])(" + list.join("|") + ")", "iu") : null;
    matcherCache.set(f.id, { src, re });
    return re;
  }
  let sorted = null; // cache, cleared whenever chats or folders change
  const invalidate = () => { sorted = null; };
  function sort() {
    if (sorted) return sorted;
    const ids = new Set(S.folders.map((f) => f.id));
    const list = Object.entries(S.chats).map(([key, c]) => ({ key, ...c })).sort((a, b) => b.seen - a.seen);
    const how = {}, where = {};
    for (const c of list) {
      if (c.folder && ids.has(c.folder)) { where[c.key] = c.folder; how[c.key] = "hand"; continue; }
      if (c.kind === "code" && ids.has("code")) { where[c.key] = "code"; how[c.key] = "word"; continue; }
      for (const f of S.folders) { const re = matcher(f); if (re && re.test(c.title)) { where[c.key] = f.id; how[c.key] = "word"; break; } }
    }
    // learn word profiles from everything placed so far (hand-placed counts triple)
    const df = {}, prof = {};
    for (const c of list) for (const t of tokens(c.title)) df[t] = (df[t] || 0) + 1;
    for (const c of list) {
      const fid = where[c.key]; if (!fid) continue;
      const w = how[c.key] === "hand" ? 3 : 1;
      const p = (prof[fid] ||= {});
      for (const t of tokens(c.title)) p[t] = (p[t] || 0) + w;
    }
    const N = list.length || 1;
    for (const c of list) {
      if (where[c.key]) continue;
      let best = null, bestS = 0, second = 0;
      for (const [fid, p] of Object.entries(prof)) {
        let s = 0;
        for (const t of tokens(c.title)) if (p[t]) s += Math.log(1 + N / df[t]) * Math.log(1 + p[t]);
        if (s > bestS) { second = bestS; bestS = s; best = fid; } else if (s > second) second = s;
      }
      if (best && bestS >= 1.6 && bestS >= second * 1.4) { where[c.key] = best; how[c.key] = "guess"; }
    }
    const groups = Object.fromEntries(S.folders.map((f) => [f.id, []]));
    groups.unsorted = [];
    for (const c of list) groups[where[c.key] || "unsorted"].push(c);
    // suggest new folders from words that repeat among unsorted chats
    const freq = {}, sample = {};
    for (const c of groups.unsorted) for (const w of new Set(words(c.title).filter((w) => w.length > 3))) {
      const t = stem(w);
      freq[t] = (freq[t] || 0) + 1; (sample[t] ||= {})[w] = (sample[t][w] || 0) + 1;
    }
    const ideas = Object.entries(freq).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 6)
      .map(([s, n]) => ({ stem: s, n, word: Object.entries(sample[s]).sort((a, b) => b[1] - a[1])[0][0] }));
    return (sorted = { groups, how, ideas });
  }

  /* ---------------- fonts (bundled, so the page's CSP can't block them) ---------------- */
  const FONTS = [["Skin Mono", "fonts/spline-sans-mono.woff2", "300 500"], ["Skin Sans", "fonts/instrument-sans.woff2", "400 600"]];
  for (const [family, file, weight] of FONTS) {
    try { const ff = new FontFace(family, `url("${chrome.runtime.getURL(file)}")`, { weight }); document.fonts.add(ff); ff.load().catch(() => {}); } catch {}
  }

  /* ---------------- shell (shadow DOM isolates styles from the site) ---------------- */
  const host = document.createElement("div");
  host.id = "skin-root";
  host.style.cssText = "all:initial;position:fixed;inset:0;z-index:2147483000;pointer-events:none;";
  const root = host.attachShadow({ mode: "open" });
  document.documentElement.appendChild(host);
  const asset = (p) => chrome.runtime.getURL(p);
  root.innerHTML = `<style>${CSS()}</style>
    <button class="tab" title="Skin (Alt+Shift+S)"><span>skin</span></button>
    <div class="overlay" hidden>
      <div class="grainlayer"></div>
      <header class="bar"></header>
      <div class="view"></div>
      <div class="scrim"></div>
      <aside class="drawer" aria-label="Settings"></aside>
    </div>`;
  const $ = (s) => root.querySelector(s);
  const overlay = $(".overlay"), bar = $(".bar"), viewEl = $(".view"), drawer = $(".drawer"), scrim = $(".scrim");
  $(".tab").onclick = () => toggle(true);
  scrim.onclick = () => setDrawer(false);

  let view = { name: "board" };
  const isOpen = () => !overlay.hidden;
  function toggle(open = !isOpen()) {
    overlay.hidden = !open;
    host.style.pointerEvents = open ? "auto" : "none";
    $(".tab").style.display = open ? "none" : "";
    document.documentElement.style.overflow = open ? "hidden" : "";
    if (open) { scan(); applyVars(); renderView(true); } else setDrawer(false);
  }
  function setDrawer(open) {
    drawer.classList.toggle("open", open); scrim.classList.toggle("open", open);
    if (open) renderDrawer();
  }
  function applyVars() {
    const s = overlay.style;
    s.setProperty("--bg", palette().bg); s.setProperty("--grain", S.grain); s.setProperty("--tilt", S.tilt ? 1 : 0);
    s.setProperty("--noise", `url("${asset("assets/grain.png")}")`); s.setProperty("--fiber", `url("${asset("assets/fiber.png")}")`);
  }

  /* ---------------- header ---------------- */
  function renderBar() {
    const total = Object.keys(S.chats).length;
    const f = view.name === "folder" ? S.folders.find((x) => x.id === view.fid) : null;
    const codePath = new URL(site.codeUrl).pathname;
    const onCode = codePath !== "/" && location.pathname.startsWith(codePath);
    bar.innerHTML = `
      <div class="brand"><div class="mark">${"<i></i>".repeat(9)}</div>
        ${view.name === "folder"
          ? `<div class="crumbs"><button data-back>← board</button><span>/</span><span>${f ? (f.showName ? esc(f.name) : "●●●") : "unsorted"}</span></div>`
          : `<div class="meta"><b>skin</b><br>your conversations,<br>on paper</div>`}</div>
      <div class="seg" role="tablist" aria-label="Mode">
        <button data-go="chat" class="${onCode ? "" : "on"}">chat</button>
        <button data-go="code" class="${onCode ? "on" : ""}">${esc(site.codeLabel)}</button>
      </div>
      <div class="right">
        <div class="meta hide-sm"><b>${S.folders.length} folders</b><br>${total} conversations<br>stored on this device</div>
        <button class="pill" data-settings>settings</button>
        <button class="x" data-close aria-label="Close">×</button>
      </div>`;
    bar.querySelector("[data-back]")?.addEventListener("click", () => go({ name: "board" }));
    bar.querySelector("[data-close]").onclick = () => toggle(false);
    bar.querySelector("[data-settings]").onclick = () => setDrawer(!drawer.classList.contains("open"));
    bar.querySelectorAll("[data-go]").forEach((b) => (b.onclick = () => navigate(b.dataset.go === "code" ? site.codeUrl : site.chatUrl)));
  }

  /* ---------------- board ---------------- */
  function tileHTML(f, chats, i) {
    const c = colorOf(f), fg = fgFor(c), style = `--c:${c};--fg:${fg};--r:${rot(f.id)}deg;--i:${i}`;
    const last = chats[0] ? day(chats[0].seen) : "—";
    if (S.envelopes && f.envelope) {
      return `<div class="wrap" style="${style}"><div class="shadow"></div>
        <button class="env" data-open="${esc(f.id)}" aria-label="${esc(f.showName ? f.name : "private folder")}">
          <div class="inside"></div><div class="vellum"></div>
          <svg viewBox="0 0 100 130" preserveAspectRatio="none"><path d="M0 0 L50 70 L100 0" fill="rgba(255,255,255,.18)" stroke="rgba(0,0,0,.14)" stroke-width=".35"/><path d="M0 130 L42 64 M100 130 L58 64" stroke="rgba(0,0,0,.07)" stroke-width=".35" fill="none"/></svg>
          <div class="flaptab"></div>
          ${f.showName ? `<div class="ename">${esc(f.name)}</div>` : ""}
          <div class="lock">private · ${chats.length}</div>
        </button></div>`;
    }
    return `<div class="wrap" style="${style}"><div class="shadow"></div>
      <button class="sheet" data-open="${esc(f.id)}" aria-label="${esc(f.showName ? f.name : "folder")}">
        ${f.image ? `<canvas class="img" data-img="${esc(f.id)}"></canvas>` : ""}
        <div class="tex"></div>
        ${f.showName ? `<div class="name">${esc(f.name)}</div>` : ""}
        <div class="count">${String(chats.length).padStart(2, "0")}</div>
        <div class="foot"><span>${chats.length} ${chats.length === 1 ? "thread" : "threads"}<br>last ${esc(last)}</span><span>${f.hideTitles ? "private" : ""}</span></div>
        <div class="corner"></div>
      </button></div>`;
  }
  function boardHTML() {
    const { groups } = sort();
    const shown = S.folders.filter((f) => groups[f.id].length);
    const loose = groups.unsorted;
    const total = Object.keys(S.chats).length;
    return `<section class="board">
      ${shown.map((f, i) => tileHTML(f, groups[f.id], i)).join("")}
      ${loose.length ? `<div class="wrap" style="--c:#2a2926;--fg:#d8d3c8;--r:-1.2deg;--i:${shown.length}"><div class="shadow"></div>
        <button class="sheet loose" data-open="unsorted"><div class="tex"></div><div class="name">unsorted</div>
        <div class="count">${String(loose.length).padStart(2, "0")}</div>
        <div class="foot"><span>${loose.length} to sort<br>tap to sort</span><span></span></div><div class="corner"></div></button></div>` : ""}
      <div class="wrap flat" style="--i:${shown.length + 1}"><button class="new-sheet" data-add>+ new folder</button></div>
    </section>
    <p class="hint">${total ? "" : "No chats found yet. "}Skin only sees chats the page has shown.
      ${site.recents ? `<a href="${site.recents}" data-nav>Open Recents</a> and scroll down to collect older ones.` : "Scroll the sidebar to collect older ones."}</p>`;
  }

  /* ---------------- folder ---------------- */
  function folderHTML() {
    const { groups, how, ideas } = sort();
    const f = S.folders.find((x) => x.id === view.fid);
    const isLoose = !f;
    const list = groups[f ? f.id : "unsorted"] || [];
    const c = f ? colorOf(f) : "#2a2926", fg = f ? fgFor(c) : "#d8d3c8";
    const card = isLoose
      ? `${list.length} chats didn't match any folder. Move a few by hand — Skin learns from your moves and sorts similar chats the same way.`
      : f.hideTitles ? "Titles stay blurred until you hover. Stored only in this browser." : `Sorted by words in the title and by chats you've moved here yourself. <b>≈</b> marks a guess.`;
    const opts = (cur) => `<option value="">move…</option>` + S.folders.map((x) => `<option value="${esc(x.id)}" ${x.id === cur ? "disabled" : ""}>${esc(x.name)}</option>`).join("") + `<option value="__auto">auto</option>`;
    return `<section class="room">
      <aside class="strip" style="--c:${c};--fg:${fg}">
        <div class="tex"></div>
        <h1>${!f ? "unsorted" : f.showName ? esc(f.name) : "&nbsp;"}</h1>
        <div class="label-card">${card}</div>
        ${isLoose && ideas.length ? `<div class="ideas"><span>new folder?</span>${ideas.map((d) => `<button data-idea="${esc(d.stem)}" data-word="${esc(d.word)}">+ ${esc(d.word)} <i>${d.n}</i></button>`).join("")}</div>` : ""}
        <ol class="${f?.hideTitles ? "veiled" : ""}">
          ${list.map((x, i) => `<li>
            <a href="${esc(x.path)}" data-chat="${esc(x.key)}"><span class="n">${list.length - i}</span>
              <span><span class="t">${esc(x.title)}</span><span class="d">${esc(day(x.seen))}${x.site !== SITE ? ` · ${esc(SITES[x.site].label)}` : x.kind === "code" ? ` · ${esc(site.codeLabel)}` : ""}${how[x.key] === "guess" ? " · ≈ guess" : ""}</span></span></a>
            ${how[x.key] === "guess" ? `<button class="ok" data-keep="${esc(x.key)}" data-to="${esc(f.id)}" title="Yes, it belongs here">✓</button>` : "<span></span>"}
            <select data-move="${esc(x.key)}" aria-label="Move chat">${opts(f?.id)}</select>
          </li>`).join("") || `<li class="none">empty</li>`}
        </ol>
      </aside>
    </section>`;
  }

  /* ---------------- render ---------------- */
  function renderView(enter = false) {
    renderBar();
    viewEl.classList.toggle("enter", enter);
    viewEl.innerHTML = view.name === "folder" ? folderHTML() : boardHTML();
    wireView();
    paintImages();
  }
  function go(v) { view = v; renderView(false); overlay.scrollTop = 0; }

  function wireView() {
    const q = (s) => viewEl.querySelectorAll(s);
    q("[data-open]").forEach((b) => (b.onclick = () => go({ name: "folder", fid: b.dataset.open })));
    q("[data-nav]").forEach((a) => (a.onclick = (e) => { e.preventDefault(); navigate(a.getAttribute("href")); }));
    q("[data-add]").forEach((b) => (b.onclick = () => addFolder()));
    q("[data-chat]").forEach((a) => {
      const c = S.chats[a.dataset.chat];
      if (c.site !== SITE) { a.href = `https://${SITES[c.site].host}${c.path}`; a.target = "_blank"; a.rel = "noopener"; return; }
      a.onclick = (e) => { e.preventDefault(); navigate(c.path); };
    });
    q("[data-move]").forEach((s) => (s.onchange = () => {
      const c = S.chats[s.dataset.move];
      if (s.value === "__auto") delete c.folder; else if (s.value) c.folder = s.value;
      invalidate(); save(); renderView();
    }));
    q("[data-keep]").forEach((b) => (b.onclick = () => { S.chats[b.dataset.keep].folder = b.dataset.to; invalidate(); save(); renderView(); }));
    q("[data-idea]").forEach((b) => (b.onclick = () => addFolder(b.dataset.word, b.dataset.idea)));
  }
  function addFolder(name = "new folder", kw = "") {
    const id = "f" + Date.now().toString(36);
    S.folders.push({ id, name, ci: S.folders.length, showName: true, hideTitles: false, envelope: false, keywords: kw });
    invalidate(); save(); renderView();
    if (!kw) { setDrawer(true); openFold(id); }
  }
  function navigate(path) {
    const u = new URL(path, location.href);
    if (u.host !== location.host) { location.assign(u.href); return; }
    // use the site's own link when it exists, so the app navigates without a reload
    const a = [...document.querySelectorAll("a[href]")].find((x) => { try { return !root.contains(x) && new URL(x.href).pathname === u.pathname; } catch { return false; } });
    toggle(false);
    if (a) a.click(); else location.assign(u.href);
  }

  /* images: drawn onto a canvas from bytes, so no image URL is ever loaded */
  const bitmaps = new Map();
  async function bitmapFor(f) {
    const hit = bitmaps.get(f.id);
    if (hit?.src === f.image) return hit.bmp;
    const bin = atob(f.image.split(",")[1]); const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    const bmp = await createImageBitmap(new Blob([buf], { type: "image/jpeg" }));
    bitmaps.set(f.id, { src: f.image, bmp });
    return bmp;
  }
  function paintImages() {
    viewEl.querySelectorAll("canvas[data-img]").forEach(async (cv) => {
      const f = S.folders.find((x) => x.id === cv.dataset.img); if (!f?.image) return;
      try {
        const bmp = await bitmapFor(f);
        const r = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
        cv.width = Math.max(1, r.width * dpr); cv.height = Math.max(1, r.height * dpr);
        const ctx = cv.getContext("2d");
        ctx.filter = "grayscale(1) contrast(1.25)";
        const s = Math.max(cv.width / bmp.width, cv.height / bmp.height);
        ctx.drawImage(bmp, (cv.width - bmp.width * s) / 2, (cv.height - bmp.height * s) / 2, bmp.width * s, bmp.height * s);
      } catch {}
    });
  }

  /* ---------------- settings ---------------- */
  const sw = (on, attr) => `<button class="switch" role="switch" aria-checked="${!!on}" ${attr}></button>`;
  const cssEsc = (s) => (window.CSS?.escape ? CSS.escape(s) : s);
  function openFold(id) { const el = drawer.querySelector(`.fold[data-f="${cssEsc(id)}"]`); if (el) { el.open = true; el.scrollIntoView({ block: "nearest" }); } }
  function renderDrawer() {
    const P = palette();
    const openIds = new Set([...drawer.querySelectorAll(".fold[open]")].map((d) => d.dataset.f));
    const scroll = drawer.querySelector(".body")?.scrollTop || 0;
    const hand = Object.values(S.chats).filter((c) => c.folder).length;
    drawer.innerHTML = `
      <header><h3>settings</h3><button class="x" data-close aria-label="Close settings">×</button></header>
      <div class="body">
        <div class="sec"><h4>skin</h4><div class="presets">
          ${Object.entries(PRESETS).map(([k, p]) => `<button class="preset ${k === S.preset ? "on" : ""}" data-preset="${k}">
            <div class="sw">${p.colors.map((c) => `<i style="background:${c}"></i>`).join("")}</div><span>${k}</span><small>${p.note}</small></button>`).join("")}
        </div></div>
        <div class="sec"><h4>paper</h4>
          <div class="row">grain <input type="range" min="0" max=".8" step=".02" value="${S.grain}" data-grain></div>
          <div class="row">loose, tilted sheets ${sw(S.tilt, "data-tilt")}</div>
          <div class="row">vellum envelopes for private folders ${sw(S.envelopes, "data-envs")}</div>
          <div class="row">open the board on the home page ${sw(S.openOnHome, "data-home")}</div>
        </div>
        <div class="sec"><h4>folders</h4>
          ${S.folders.map((f) => `<details class="fold" data-f="${esc(f.id)}" ${openIds.has(f.id) ? "open" : ""}>
            <summary><span class="chip" style="background:${colorOf(f)}"></span><span class="fn">${esc(f.name)}</span><span class="pv">${f.envelope ? "envelope" : f.showName ? "" : "name hidden"}</span></summary>
            <div class="inner">
              <input type="text" value="${esc(f.name)}" data-k="name" aria-label="Folder name">
              <div class="row">show name on the board ${sw(f.showName, 'data-k="showName"')}</div>
              <div class="row">blur chat titles ${sw(f.hideTitles, 'data-k="hideTitles"')}</div>
              <div class="row">vellum envelope ${sw(f.envelope, 'data-k="envelope"')}</div>
              <div class="swatches">${P.colors.map((c, i) => `<button style="background:${c}" class="${!f.custom && f.ci % P.colors.length === i ? "on" : ""}" data-ci="${i}" aria-label="Color ${i + 1}"></button>`).join("")}
                <label title="custom color" style="${f.custom ? `background:${f.custom};border-style:solid` : ""}">${f.custom ? "" : "+"}<input type="color" value="${f.custom || colorOf(f)}" data-k="custom"></label></div>
              <div class="imgrow"><label>${f.image ? "replace image" : "add image"}<input type="file" accept="image/*" data-k="image"></label>${f.image ? `<button data-k="noimg">remove</button>` : ""}</div>
              <label class="small">auto-sort words — comma separated, matched at the start of a word</label>
              <textarea rows="3" data-k="keywords">${esc(f.keywords)}</textarea>
              <button class="link danger" data-del>delete folder</button>
            </div></details>`).join("")}
          <button class="pill" data-add>+ new folder</button>
        </div>
        <div class="sec"><h4>sorting</h4>
          <p class="small">Words first, then your moves: ${hand} chat${hand === 1 ? "" : "s"} placed by hand teach Skin where similar ones go. Everything runs in this browser.</p>
        </div>
        <div class="sec"><h4>privacy</h4>
          <p class="small">Skin reads only chat titles and links already shown on this page. It never calls ${esc(site.label)}'s API and sends nothing anywhere.</p>
          <div class="row"><span class="small">${Object.keys(S.chats).length} chats remembered</span><button class="pill" data-forget>forget chats</button></div>
        </div>
      </div>`;
    drawer.querySelector(".body").scrollTop = scroll;
    wireDrawer();
  }
  function commit() { invalidate(); save(); applyVars(); renderView(); renderDrawer(); }
  function wireDrawer() {
    const d = drawer;
    d.querySelector("[data-close]").onclick = () => setDrawer(false);
    d.querySelectorAll("[data-preset]").forEach((b) => (b.onclick = () => { S.preset = b.dataset.preset; commit(); }));
    d.querySelector("[data-grain]").oninput = (e) => { S.grain = +e.target.value; applyVars(); save(); };
    d.querySelector("[data-tilt]").onclick = () => { S.tilt = !S.tilt; commit(); };
    d.querySelector("[data-envs]").onclick = () => { S.envelopes = !S.envelopes; commit(); };
    d.querySelector("[data-home]").onclick = () => { S.openOnHome = !S.openOnHome; save(); renderDrawer(); };
    d.querySelector("[data-add]").onclick = () => addFolder();
    d.querySelector("[data-forget]").onclick = () => { if (confirm("Forget all remembered chats? Folders and colors stay.")) { S.chats = {}; lastSig = ""; commit(); } };
    d.querySelectorAll(".fold").forEach((el) => {
      const f = S.folders.find((x) => x.id === el.dataset.f);
      const k = (name) => el.querySelector(`[data-k="${name}"]`);
      k("name").onchange = (e) => { f.name = e.target.value.trim() || "untitled"; commit(); };
      k("showName").onclick = () => { f.showName = !f.showName; commit(); };
      k("hideTitles").onclick = () => { f.hideTitles = !f.hideTitles; commit(); };
      k("envelope").onclick = () => { f.envelope = !f.envelope; commit(); };
      k("keywords").onchange = (e) => { f.keywords = e.target.value; commit(); };
      k("custom").onchange = (e) => { f.custom = e.target.value; commit(); };
      el.querySelectorAll("[data-ci]").forEach((b) => (b.onclick = () => { f.ci = +b.dataset.ci; delete f.custom; commit(); }));
      k("image").onchange = async (e) => {
        const file = e.target.files[0]; if (!file) return;
        try {
          const bmp = await createImageBitmap(file), s = Math.min(1, 480 / Math.max(bmp.width, bmp.height));
          const cv = document.createElement("canvas"); cv.width = bmp.width * s; cv.height = bmp.height * s;
          cv.getContext("2d").drawImage(bmp, 0, 0, cv.width, cv.height);
          f.image = cv.toDataURL("image/jpeg", 0.8); commit();
        } catch { alert("Couldn't read that image."); }
      };
      k("noimg")?.addEventListener("click", () => { delete f.image; commit(); });
      el.querySelector("[data-del]").onclick = () => {
        if (!confirm(`Delete “${f.name}”? Its chats go back to auto-sort.`)) return;
        S.folders = S.folders.filter((x) => x !== f);
        for (const c of Object.values(S.chats)) if (c.folder === f.id) delete c.folder;
        if (view.fid === f.id) view = { name: "board" };
        commit();
      };
    });
  }

  addEventListener("keydown", (e) => {
    if (e.altKey && e.shiftKey && e.code === "KeyS") { e.preventDefault(); toggle(); }
    else if (e.key === "Escape" && isOpen()) {
      if (drawer.classList.contains("open")) setDrawer(false);
      else if (view.name === "folder") go({ name: "board" });
      else toggle(false);
    }
  }, true);

  /* ---------------- lifecycle ---------------- */
  const isHome = () => site.home.includes(location.pathname);
  let lastUrl = location.href;
  function onUrl() { scan(); if (S.openOnHome && isHome() && !isOpen()) toggle(true); }
  new MutationObserver(scheduleScan).observe(document.body, { childList: true, subtree: true });
  setInterval(() => { if (location.href !== lastUrl) { lastUrl = location.href; onUrl(); } }, 700);
  chrome.storage.onChanged.addListener((ch, area) => {
    const nv = ch.skin?.newValue;
    if (area !== "local" || !nv || nv.rev?.startsWith(myRev)) return; // ignore our own writes
    S = { ...structuredClone(DEFAULT_STATE), ...nv }; invalidate();
    if (isOpen()) { applyVars(); renderView(); if (drawer.classList.contains("open")) renderDrawer(); }
  });
  // v0.1 → v0.2: new word lists, envelopes and folders; keeps chats, moves and colors
  function migrate(s) {
    if ((s.v || 1) >= 2) return s;
    const byId = Object.fromEntries(s.folders.map((f) => [f.id, f]));
    for (const d of DEFAULT_FOLDERS) {
      const f = byId[d.id];
      if (f) { f.keywords = d.keywords; f.envelope ??= d.envelope; }
      else s.folders.push(structuredClone(d));
    }
    s.v = 2;
    return s;
  }
  store.get("skin").then((r) => {
    if (r.skin) { S = migrate({ ...structuredClone(DEFAULT_STATE), ...r.skin, v: r.skin.v || 1 }); save(); }
    setTimeout(onUrl, 800); // let the site render its sidebar first
  });

  /* ---------------- styles (mirrors prototype/index.html in the skin repo) ---------------- */
  function CSS() {
    return `
:host{all:initial}
*{box-sizing:border-box;margin:0;padding:0}
button,input,select,textarea{font:inherit;color:inherit}
button{cursor:pointer;background:none;border:0}
[hidden]{display:none!important}
.overlay{
  --mono:"Skin Mono","Spline Sans Mono",ui-monospace,Menlo,monospace; --sans:"Skin Sans","Instrument Sans","Helvetica Neue",sans-serif;
  --ink:#131311; --paper:#ECE9E2; --muted:#8b877f; --line:rgba(255,255,255,.09);
  position:fixed;inset:0;overflow:auto;background:var(--bg);color:#e9e5dc;font:14px/1.4 var(--sans);-webkit-font-smoothing:antialiased;
  animation:fade .2s both;overscroll-behavior:contain;
}
.grainlayer{position:fixed;inset:0;pointer-events:none;z-index:40;background-image:var(--noise);opacity:calc(var(--grain)*.45)}
@keyframes fade{from{opacity:0}}
@keyframes drop{from{opacity:0;transform:translateY(24px) rotate(calc(var(--r)*var(--tilt)*3))}}
@keyframes rise{from{opacity:0;transform:translateY(30px)}}

.tab{pointer-events:auto;position:fixed;right:0;top:50%;transform:translateY(-50%);writing-mode:vertical-rl;padding:14px 7px;
  background:#ECE9E2;color:#131311;font:500 11px/1 "Skin Mono",ui-monospace,Menlo,monospace;letter-spacing:.08em;box-shadow:-4px 6px 14px rgba(0,0,0,.28);transition:padding .2s}
.tab:hover{padding-right:11px}

/* top bar */
.bar{position:sticky;top:0;z-index:20;display:grid;grid-template-columns:1fr auto 1fr;align-items:flex-start;gap:16px;padding:22px 32px 18px;background:linear-gradient(var(--bg) 60%,transparent)}
.brand{display:flex;gap:18px;align-items:flex-start}
.mark{width:14px;height:14px;display:grid;grid-template-columns:repeat(3,1fr);gap:1px;margin-top:3px}
.mark i{background:#e9e5dc;opacity:.85}.mark i:nth-child(2n){opacity:.25}
.meta{font-size:10.5px;line-height:1.35;color:var(--muted);letter-spacing:.01em}.meta b{color:#e9e5dc;font-weight:500}
.crumbs{font:12px var(--mono);color:var(--muted);display:flex;gap:8px;align-items:center}
.crumbs button{color:var(--muted)}.crumbs button:hover{color:#fff}
.seg{display:flex;border:1px solid rgba(255,255,255,.22);border-radius:999px;padding:3px}
.seg button{font:12px var(--mono);padding:6px 14px;border-radius:999px;color:var(--muted)}
.seg button.on{background:#e9e5dc;color:#111}
.right{display:flex;justify-content:flex-end;align-items:flex-start;gap:14px}
.pill{font:12px var(--mono);letter-spacing:.02em;padding:8px 14px;border:1px solid rgba(255,255,255,.22);border-radius:999px;transition:background .2s,color .2s}
.pill:hover{background:#e9e5dc;color:#111}
.x{font-size:22px;line-height:1;color:var(--muted);padding:4px}.x:hover{color:#fff}

/* board */
.board{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:44px 36px;padding:26px 48px 40px;max-width:1320px;margin:0 auto}
.wrap{--r:0deg;position:relative;transform:rotate(calc(var(--r)*var(--tilt)));transition:transform .45s cubic-bezier(.2,.8,.2,1)}
.enter .wrap{animation:drop .7s cubic-bezier(.2,.8,.2,1) both;animation-delay:calc(var(--i)*55ms)}
.wrap:hover{transform:rotate(0) translateY(-8px) scale(1.02)}
.wrap.flat:hover{transform:none}
/* cheap shadow: a plain box under the sheet instead of a filter on a clipped shape */
.shadow{position:absolute;inset:0;box-shadow:0 18px 26px rgba(0,0,0,.5),0 2px 3px rgba(0,0,0,.45);transition:box-shadow .45s}
.wrap:hover .shadow{box-shadow:0 30px 38px rgba(0,0,0,.55),0 3px 4px rgba(0,0,0,.4)}

.sheet{--fold:30px;position:relative;display:block;width:100%;aspect-ratio:1/1.3;background:var(--c);color:var(--fg);text-align:left;overflow:hidden;
  clip-path:polygon(0 0,100% 0,100% calc(100% - var(--fold)),calc(100% - var(--fold)) 100%,0 100%)}
.sheet::before{content:"";position:absolute;inset:0;pointer-events:none;z-index:2;background:radial-gradient(120% 70% at 85% 0%,rgba(255,255,255,.16),transparent 55%),linear-gradient(165deg,transparent 55%,rgba(0,0,0,.14))}
.tex{position:absolute;inset:0;pointer-events:none;z-index:3;background-image:var(--noise),var(--fiber);opacity:calc(var(--grain)*1.6);mix-blend-mode:soft-light}
.corner{position:absolute;right:0;bottom:0;width:var(--fold);height:var(--fold);z-index:4;clip-path:polygon(0 0,100% 0,0 100%);
  background:linear-gradient(135deg,color-mix(in srgb,var(--c) 70%,#fff) 0%,color-mix(in srgb,var(--c) 78%,#000) 100%)}
.corner::after{content:"";position:absolute;inset:0;background:linear-gradient(135deg,transparent 45%,rgba(0,0,0,.18))}
.img{position:absolute;left:0;top:0;width:100%;height:52%;z-index:1;mix-blend-mode:multiply;opacity:.9}
.name{position:absolute;left:14px;right:14px;top:12px;z-index:5;font:400 clamp(22px,2.3vw,30px)/.95 var(--mono);letter-spacing:-.045em;text-transform:lowercase;word-break:break-word}
.foot{position:absolute;left:14px;right:38px;bottom:12px;z-index:5;display:flex;justify-content:space-between;gap:8px;font-size:9.5px;line-height:1.3;opacity:.8}
.count{position:absolute;right:14px;top:50%;z-index:5;font:11px var(--mono);opacity:.7}
.loose{outline:1px dashed rgba(255,255,255,.18);outline-offset:-1px}

/* vellum envelope */
.env{position:relative;display:block;width:100%;aspect-ratio:1/1.3;text-align:left}
.env .inside{position:absolute;left:12%;right:12%;top:20%;bottom:16%;background:var(--c);opacity:.75}
.env .vellum{position:absolute;inset:0;background:rgba(226,226,222,.8);box-shadow:inset 0 0 0 1px rgba(255,255,255,.35)}
.env .vellum::after{content:"";position:absolute;inset:0;background-image:var(--noise);opacity:calc(var(--grain)*1.3);mix-blend-mode:soft-light}
.env svg{position:absolute;inset:0;width:100%;height:100%}
.flaptab{position:absolute;left:50%;top:50%;width:22%;aspect-ratio:1/1.05;transform:translate(-50%,-6%);background:var(--c);z-index:3;box-shadow:0 1px 2px rgba(0,0,0,.15)}
.flaptab::after{content:"";position:absolute;inset:0;background-image:var(--noise);opacity:calc(var(--grain)*1.6);mix-blend-mode:soft-light}
.ename{position:absolute;left:14px;bottom:12px;z-index:4;color:#2b2b29;font:13px var(--mono);letter-spacing:-.02em;text-transform:lowercase;opacity:.75}
.lock{position:absolute;right:12px;bottom:12px;z-index:4;color:#3a3a37;font-size:9.5px;letter-spacing:.06em;text-transform:uppercase;opacity:.7}

.new-sheet{display:flex;align-items:center;justify-content:center;aspect-ratio:1/1.3;width:100%;border:1px dashed rgba(255,255,255,.2);color:var(--muted);font:12px var(--mono);transition:border-color .2s,color .2s}
.new-sheet:hover{border-color:rgba(255,255,255,.5);color:#fff}
.hint{text-align:center;color:var(--muted);font-size:10.5px;padding:0 24px 48px}.hint a{color:#e9e5dc}

/* folder */
.room{padding:14px 32px 60px;max-width:760px;margin:0 auto}
.strip{position:relative;background:var(--c);color:var(--fg);padding:22px 18px 30px;box-shadow:0 24px 40px rgba(0,0,0,.55);animation:rise .45s cubic-bezier(.2,.8,.2,1) both}
.strip .tex{z-index:0}
.strip > :not(.tex){position:relative;z-index:1}
.strip h1{font:400 42px/.9 var(--mono);letter-spacing:-.05em;text-transform:lowercase;margin-bottom:18px;word-break:break-word;min-height:38px}
.label-card{background:#f4f2ec;color:#161614;padding:12px 14px;font-size:12px;line-height:1.45;margin:0 -18px 14px}
.ideas{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 14px;font-size:11px}
.ideas span{opacity:.75;margin-right:4px}
.ideas button{font:11px var(--mono);padding:4px 9px;border:1px dashed currentColor}
.ideas button:hover{background:var(--fg);color:var(--c)}
.ideas i{font-style:normal;opacity:.6;margin-left:3px}
.strip ol{list-style:none}
.strip li{display:grid;grid-template-columns:1fr auto auto;gap:10px;align-items:center;border-top:1px solid color-mix(in srgb,var(--fg) 30%,transparent)}
.strip li a{display:grid;grid-template-columns:28px 1fr;gap:10px;padding:12px 0;color:inherit;text-decoration:none}
.strip li a:hover .t{text-decoration:underline;text-underline-offset:3px}
.n{font:18px/1 var(--mono);width:24px;height:24px;display:grid;place-items:center}
.t{display:block;font-weight:600;font-size:13px;line-height:1.25}
.d{display:block;font-size:10.5px;opacity:.75;margin-top:3px}
.veiled .t{filter:blur(5px);transition:filter .2s}.veiled li:hover .t{filter:none}
.ok{font:12px var(--mono);width:24px;height:24px;border:1px solid currentColor;opacity:.75}.ok:hover{opacity:1;background:var(--fg);color:var(--c)}
.strip select{font:11px var(--mono);background:transparent;border:1px solid color-mix(in srgb,var(--fg) 35%,transparent);color:inherit;padding:4px 6px;max-width:110px}
.strip select option{color:#111}
.none{padding:14px 0;opacity:.7;font:12px var(--mono)}

/* settings drawer */
.scrim{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:50;opacity:0;pointer-events:none;transition:opacity .3s}
.scrim.open{opacity:1;pointer-events:auto}
.drawer{position:fixed;top:0;right:0;bottom:0;width:min(440px,100%);z-index:60;background:#161614;border-left:1px solid var(--line);
  transform:translateX(100%);transition:transform .45s cubic-bezier(.2,.8,.2,1);display:flex;flex-direction:column}
.drawer.open{transform:none}
.drawer header{display:flex;justify-content:space-between;align-items:center;padding:22px 24px;border-bottom:1px solid var(--line)}
.drawer h3{font:400 20px var(--mono);letter-spacing:-.03em}
.drawer .body{overflow:auto;padding:8px 24px 40px}
.sec{padding:18px 0;border-bottom:1px solid var(--line)}
.sec h4{font-size:10.5px;letter-spacing:.09em;text-transform:uppercase;color:var(--muted);font-weight:500;margin-bottom:12px}
.presets{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.preset{padding:10px;border:1px solid var(--line);text-align:left;transition:border-color .2s}.preset.on{border-color:#e9e5dc}
.preset .sw{display:flex;height:34px;margin-bottom:8px}.preset .sw i{flex:1}
.preset span{font:12px var(--mono)}.preset small{display:block;font-size:10px;color:var(--muted);margin-top:2px}
.row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:6px 0;font-size:13px}
input[type=range]{accent-color:#e9e5dc;width:150px}
.switch{width:34px;height:20px;border-radius:999px;background:#3a3935;position:relative;transition:background .2s;flex:none}
.switch::after{content:"";position:absolute;top:3px;left:3px;width:14px;height:14px;border-radius:50%;background:#e9e5dc;transition:transform .2s}
.switch[aria-checked=true]{background:#8fbf7a}.switch[aria-checked=true]::after{transform:translateX(14px)}
.fold{border:1px solid var(--line);margin-bottom:10px}
.fold summary{display:flex;align-items:center;gap:12px;padding:10px 12px;cursor:pointer;list-style:none}
.fold summary::-webkit-details-marker{display:none}
.chip{width:22px;height:28px;flex:none;box-shadow:0 2px 4px rgba(0,0,0,.4)}
.fn{flex:1;font:13px var(--mono)}.pv{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}
.inner{padding:4px 12px 14px;display:flex;flex-direction:column;gap:10px}
.inner input[type=text],.inner textarea{width:100%;background:#0f0f0e;border:1px solid var(--line);padding:8px 10px;font-size:13px;outline:none;resize:vertical}
.inner textarea{font:11.5px/1.5 var(--mono)}
.swatches{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.swatches button{width:24px;height:24px;border:2px solid transparent;outline:1px solid rgba(255,255,255,.1)}
.swatches button.on{border-color:#e9e5dc}
.swatches label{width:24px;height:24px;display:grid;place-items:center;border:1px dashed rgba(255,255,255,.35);font-size:14px;color:var(--muted);cursor:pointer;position:relative;overflow:hidden}
.swatches label input{position:absolute;inset:0;opacity:0;cursor:pointer}
.imgrow{display:flex;gap:8px;align-items:center}
.imgrow label,.imgrow button{font-size:11px;padding:6px 10px;border:1px solid var(--line);cursor:pointer;color:var(--muted)}
.imgrow input{display:none}
.small{font-size:11px;color:var(--muted);line-height:1.45}
.link{font-size:11px;text-decoration:underline;text-align:left;color:var(--muted)}.danger:hover{color:#E2623D}

@media (max-width:760px){.bar{grid-template-columns:1fr auto;padding:16px}.seg{grid-column:1/-1;order:3;justify-self:start}.hide-sm{display:none}
  .board{padding:16px 16px 40px;gap:28px 18px;grid-template-columns:repeat(auto-fill,minmax(140px,1fr))}.room{padding:8px 16px 40px}}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
`;
  }
})();
