/*
 * Skin — a paper skin for Claude and ChatGPT.
 *
 * Privacy model:
 * - Reads only chat links that the site has already rendered on the page
 *   (sidebar, Recents). It never calls the site's API and makes no network
 *   requests of its own.
 * - Stores chat titles, links and your folder settings in chrome.storage.local.
 *   Nothing is sent anywhere.
 */
(() => {
  if (window.__skinLoaded) return;
  window.__skinLoaded = true;

  /* ---------------- sites ---------------- */
  const SITES = {
    claude: {
      label: "Claude",
      host: "claude.ai",
      match: [[/^\/chat\/([0-9a-f-]{36})/i, "chat"], [/^\/code\/([\w-]{6,})/i, "code"]],
      home: ["/new", "/"],
      chatUrl: "https://claude.ai/new",
      codeUrl: "https://claude.ai/code",
      codeLabel: "claude code",
      recents: "https://claude.ai/recents",
      titleSuffix: /\s*[-–|]\s*Claude\s*$/,
    },
    chatgpt: {
      label: "ChatGPT",
      host: "chatgpt.com",
      match: [[/^\/c\/([\w-]{8,})/i, "chat"], [/^\/codex\/tasks\/([\w-]{6,})/i, "code"]],
      home: ["/"],
      chatUrl: "https://chatgpt.com/",
      codeUrl: "https://chatgpt.com/codex",
      codeLabel: "codex",
      recents: null,
      titleSuffix: /\s*[-–|]\s*ChatGPT\s*$/,
    },
  };
  const SITE = location.hostname.endsWith("chatgpt.com") ? "chatgpt" : "claude";
  const site = SITES[SITE];

  /* ---------------- palettes ---------------- */
  const PRESETS = {
    kraft:  { note: "poster stock",  bg: "#0c0c0b", colors: ["#3D8FE0", "#B88B58", "#E2623D", "#6B7FA6", "#6D7B5B", "#7B4B36", "#F1C92E"] },
    neon:   { note: "bright on black", bg: "#0b0b0a", colors: ["#F6A3CB", "#FFC31F", "#5FE68C", "#20AEFF", "#FF6B35", "#F3F0E8", "#B9A8FF"] },
    fold:   { note: "soft pastel",   bg: "#141413", colors: ["#F7A77B", "#3F8EA5", "#3E9B78", "#F08878", "#C7B39F", "#BEE5DC", "#C4553A"] },
    vellum: { note: "almost white",  bg: "#0a0a0a", colors: ["#ECE9E2", "#D9D5CC", "#BEB9AE", "#9A958B", "#5E5B55", "#E5DDC9", "#F1C92E"] },
  };

  /* Keyword stems, matched at the start of a word (English + Ukrainian). */
  const DEFAULT_FOLDERS = [
    { id: "visa",     name: "visa",     ci: 0, showName: false, hideTitles: true,  keywords: "visa, віза, візу, passport, паспорт, embassy, посольств, consulate, консульств, immigration, імміграц, residence permit, посвідк" },
    { id: "health",   name: "health",   ci: 2, showName: true,  hideTitles: true,  keywords: "health, здоров, doctor, лікар, sleep, сон, symptom, симптом, medic, медич, blood, кров, therapy, терап, vitamin, вітамін" },
    { id: "taxes",    name: "taxes",    ci: 4, showName: false, hideTitles: true,  keywords: "tax, податк, invoice, інвойс, рахун, budget, бюджет, bank, банк, фоп, accounting, бухгалт, salary, зарплат" },
    { id: "work",     name: "work",     ci: 1, showName: true,  hideTitles: false, keywords: "work, робот, job, cv, resume, резюме, cover letter, interview, співбесід, portfolio, портфоліо, client, клієнт, meeting, зустріч, email" },
    { id: "design",   name: "design",   ci: 3, showName: true,  hideTitles: false, keywords: "design, дизайн, figma, ux, ui design, logo, лого, font, шрифт, color, колір, typograph, типограф, mockup, макет" },
    { id: "code",     name: "code",     ci: 5, showName: true,  hideTitles: false, keywords: "code, код, python, javascript, typescript, react, api, bug, баг, git, sql, css, html, script, скрипт, deploy, extension, розширен" },
    { id: "learning", name: "learning", ci: 6, showName: true,  hideTitles: false, keywords: "learn, вивч, english, англій, course, курс, translate, переклад, explain, поясн, grammar, граматик" },
    { id: "travel",   name: "travel",   ci: 0, showName: true,  hideTitles: false, keywords: "travel, trip, подорож, flight, рейс, hotel, готел, itinerary, маршрут, packing, відпуст, vacation" },
    { id: "cooking",  name: "cooking",  ci: 2, showName: true,  hideTitles: false, keywords: "recipe, рецепт, cook, готуван, bake, випік, dinner, вечер, soup, суп" },
    { id: "ideas",    name: "ideas",    ci: 4, showName: true,  hideTitles: false, keywords: "idea, ідея, ідеї, startup, стартап, brainstorm, name, назв, concept, концепц" },
  ];

  const DEFAULT_STATE = {
    preset: "kraft", grain: 0.4, tilt: true, openOnHome: true,
    folders: DEFAULT_FOLDERS,
    chats: {},          // key "site:id" -> {site, kind, id, title, path, seen, folder?}
  };

  /* ---------------- state ---------------- */
  let S = structuredClone(DEFAULT_STATE);
  const store = chrome.storage.local;
  let saveTimer;
  const save = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => store.set({ skin: S }), 250);
  };

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

  /* ---------------- reading chats from the page ---------------- */
  function parseLink(href) {
    let u;
    try { u = new URL(href, location.href); } catch { return null; }
    if (u.host !== location.host) return null;
    for (const [re, kind] of site.match) {
      const m = u.pathname.match(re);
      if (m) return { id: m[1], kind, path: u.pathname };
    }
    return null;
  }
  function cleanTitle(t) {
    return (t || "").replace(/\s+/g, " ").trim().slice(0, 140);
  }
  function scan() {
    let changed = false;
    const now = Date.now();
    const found = [];
    for (const a of document.querySelectorAll("a[href]")) {
      if (a.closest("#skin-root")) continue;
      const p = parseLink(a.getAttribute("href"));
      if (!p) continue;
      const title = cleanTitle(a.getAttribute("title") || a.getAttribute("aria-label") || a.textContent);
      if (title) found.push({ ...p, title });
    }
    // the chat that is open right now — tab title is only a fallback, never overrides the sidebar
    const here = parseLink(location.href);
    if (here && !found.some((c) => c.id === here.id)) {
      const t = cleanTitle(document.title.replace(site.titleSuffix, ""));
      if (t && !/^(claude|chatgpt|new chat)$/i.test(t)) found.push({ ...here, title: t, weak: true });
    }
    for (const c of found) {
      const key = SITE + ":" + c.id;
      const old = S.chats[key];
      if (!old) { S.chats[key] = { site: SITE, kind: c.kind, id: c.id, title: c.title, path: c.path, seen: now }; changed = true; }
      else if (!c.weak && old.title !== c.title) { old.title = c.title; changed = true; }
    }
    if (changed) { save(); if (isOpen()) render(); }
  }

  /* ---------------- sorting ---------------- */
  const matcherCache = new Map();
  function matcher(f) {
    const src = f.keywords || "";
    if (matcherCache.get(f.id)?.src === src) return matcherCache.get(f.id).re;
    const words = src.split(",").map((w) => w.trim()).filter(Boolean).map(reEsc);
    const re = words.length ? new RegExp("(^|[^\\p{L}\\p{N}])(" + words.join("|") + ")", "iu") : null;
    matcherCache.set(f.id, { src, re });
    return re;
  }
  function folderIdFor(c) {
    if (c.folder && S.folders.some((f) => f.id === c.folder)) return c.folder;
    if (c.kind === "code" && S.folders.some((f) => f.id === "code")) return "code";
    for (const f of S.folders) { const re = matcher(f); if (re && re.test(c.title)) return f.id; }
    return "unsorted";
  }
  function grouped() {
    const g = Object.fromEntries(S.folders.map((f) => [f.id, []]));
    g.unsorted = [];
    const list = Object.entries(S.chats).map(([key, c]) => ({ key, ...c })).sort((a, b) => b.seen - a.seen);
    for (const c of list) (g[folderIdFor(c)] ||= []).push(c);
    return g;
  }

  /* ---------------- UI shell (shadow DOM keeps styles isolated) ---------------- */
  const host = document.createElement("div");
  host.id = "skin-root";
  host.style.cssText = "all:initial;position:fixed;inset:0;z-index:2147483000;pointer-events:none;";
  const root = host.attachShadow({ mode: "open" });
  document.documentElement.appendChild(host);
  const assets = { grain: chrome.runtime.getURL("assets/grain.png"), fiber: chrome.runtime.getURL("assets/fiber.png") };

  root.innerHTML = `<style>${CSS()}</style>
    <button class="tab" part="tab" title="Skin (Alt+Shift+S)"><span>skin</span></button>
    <div class="overlay" hidden></div>`;
  const $ = (s) => root.querySelector(s);
  const overlay = $(".overlay");
  $(".tab").onclick = () => toggle(true);

  let view = { name: "board" };
  let panel = null; // "settings" | null
  const isOpen = () => !overlay.hidden;
  function toggle(open = !isOpen()) {
    overlay.hidden = !open;
    host.style.pointerEvents = open ? "auto" : "none";
    $(".tab").style.display = open ? "none" : "";
    document.documentElement.style.overflow = open ? "hidden" : "";
    if (open) { scan(); render(); }
  }

  function applyVars() {
    overlay.style.setProperty("--bg", palette().bg);
    overlay.style.setProperty("--grain", S.grain);
    overlay.style.setProperty("--tilt", S.tilt ? 1 : 0);
    overlay.style.setProperty("--noise", `url("${assets.grain}")`);
    overlay.style.setProperty("--fiber", `url("${assets.fiber}")`);
  }

  /* ---------------- render ---------------- */
  function render() {
    applyVars();
    const g = grouped();
    const total = Object.keys(S.chats).length;
    const here = Object.values(S.chats).filter((c) => c.site === SITE).length;
    const onCode = location.pathname.startsWith(new URL(site.codeUrl).pathname) && new URL(site.codeUrl).pathname !== "/";
    overlay.innerHTML = `
      <header class="bar">
        <div class="brand"><div class="mark">${"<i></i>".repeat(9)}</div>
          <div class="meta"><b>skin</b> · ${esc(site.label)}<br>${total} chats on this device${total !== here ? ` · ${here} here` : ""}</div></div>
        <div class="switches">
          <div class="seg" role="tablist" aria-label="Mode">
            <button data-go="chat" class="${onCode ? "" : "on"}">chat</button>
            <button data-go="code" class="${onCode ? "on" : ""}">${esc(site.codeLabel)}</button>
          </div>
        </div>
        <div class="right">
          <button class="pill" data-settings>settings</button>
          <button class="x" data-close aria-label="Close skin">×</button>
        </div>
      </header>
      ${view.name === "folder" ? folderView(g) : boardView(g, total)}
      ${panel === "settings" ? settingsView() : ""}`;
    wire();
  }

  function tile(f, chats, i) {
    const c = colorOf(f), fg = fgFor(c);
    return `<div class="wrap" style="--c:${c};--fg:${fg};--r:${rot(f.id)}deg;--i:${i}">
      <button class="sheet" data-open="${esc(f.id)}" aria-label="${esc(f.showName ? f.name : "folder")}">
        <div class="tex"></div>
        ${f.showName ? `<div class="name">${esc(f.name)}</div>` : ""}
        <div class="count">${String(chats.length).padStart(2, "0")}</div>
        <div class="foot"><span>${chats.length} ${chats.length === 1 ? "chat" : "chats"}</span><span>${f.hideTitles ? "titles hidden" : ""}</span></div>
        <div class="corner"></div>
      </button></div>`;
  }
  function boardView(g, total) {
    const folders = S.folders.filter((f) => g[f.id].length);
    const empty = S.folders.filter((f) => !g[f.id].length);
    const loose = g.unsorted;
    return `<main class="board">
      ${folders.map((f, i) => tile(f, g[f.id], i)).join("")}
      ${loose.length ? `<div class="wrap loose" style="--r:-1.5deg;--i:${folders.length}"><button class="sheet plain" data-open="unsorted"><div class="tex"></div><div class="name">unsorted</div><div class="count">${String(loose.length).padStart(2, "0")}</div><div class="foot"><span>${loose.length} to sort</span></div><div class="corner"></div></button></div>` : ""}
    </main>
    <footer class="hint">
      ${total ? `${empty.length ? `${empty.length} empty folder${empty.length === 1 ? "" : "s"} hidden · ` : ""}` : "No chats found yet. "}
      Skin only sees chats the page has shown.
      ${site.recents ? `<a href="${site.recents}" data-nav>Open Recents</a> and scroll to collect older ones.` : "Scroll the sidebar to collect older ones."}
    </footer>`;
  }
  function folderView(g) {
    const f = S.folders.find((x) => x.id === view.fid) || { id: "unsorted", name: "unsorted", ci: 3, showName: true, hideTitles: false, custom: "#2a2926" };
    const list = g[f.id] || [];
    const c = colorOf(f), fg = fgFor(c);
    const opts = (cur) => `<option value="">move to…</option>` + S.folders.map((x) => `<option value="${esc(x.id)}" ${x.id === cur ? "disabled" : ""}>${esc(x.name)}</option>`).join("") + `<option value="__auto">auto-sort</option>`;
    return `<main class="room">
      <aside class="strip" style="--c:${c};--fg:${fg}">
        <div class="tex"></div>
        <button class="back" data-back>← board</button>
        <h1>${f.showName ? esc(f.name) : "&nbsp;"}</h1>
        <ol class="${f.hideTitles ? "veiled" : ""}">
          ${list.map((x, i) => `<li>
            <a href="${esc(x.path)}" data-chat="${esc(x.key)}"><span class="n">${list.length - i}</span>
              <span class="t">${esc(x.title)}</span>
              ${x.site !== SITE ? `<span class="site">${esc(SITES[x.site].label)}</span>` : x.kind === "code" ? `<span class="site">${esc(site.codeLabel)}</span>` : ""}</a>
            <select data-move="${esc(x.key)}" aria-label="Move chat">${opts(f.id)}</select>
          </li>`).join("") || `<li class="none">empty</li>`}
        </ol>
      </aside>
    </main>`;
  }
  function settingsView() {
    const P = palette();
    return `<aside class="drawer" role="dialog" aria-label="Settings">
      <header><h3>settings</h3><button class="x" data-settings-close aria-label="Close settings">×</button></header>
      <div class="body">
        <section><h4>skin</h4><div class="presets">
          ${Object.entries(PRESETS).map(([k, p]) => `<button class="preset ${k === S.preset ? "on" : ""}" data-preset="${k}">
            <div class="sw">${p.colors.map((c) => `<i style="background:${c}"></i>`).join("")}</div><span>${k}</span><small>${p.note}</small></button>`).join("")}
        </div></section>
        <section><h4>paper</h4>
          <label class="row">grain <input type="range" min="0" max=".8" step=".02" value="${S.grain}" data-grain></label>
          <label class="row">tilted sheets <input type="checkbox" ${S.tilt ? "checked" : ""} data-tilt></label>
          <label class="row">open the board on the home page <input type="checkbox" ${S.openOnHome ? "checked" : ""} data-home></label>
        </section>
        <section><h4>folders</h4>
          ${S.folders.map((f) => `<details class="fold" data-f="${esc(f.id)}" ${view.edit === f.id ? "open" : ""}>
            <summary><span class="chip" style="background:${colorOf(f)}"></span><span class="fn">${esc(f.name)}</span><span class="pv">${f.showName ? "" : "name hidden"}</span></summary>
            <div class="inner">
              <input type="text" value="${esc(f.name)}" data-k="name" aria-label="Folder name">
              <label class="row">show name on the board <input type="checkbox" ${f.showName ? "checked" : ""} data-k="showName"></label>
              <label class="row">blur chat titles <input type="checkbox" ${f.hideTitles ? "checked" : ""} data-k="hideTitles"></label>
              <div class="swatches">${P.colors.map((c, i) => `<button style="background:${c}" class="${!f.custom && f.ci % P.colors.length === i ? "on" : ""}" data-ci="${i}" aria-label="Color ${i + 1}"></button>`).join("")}
                <label class="custom" title="Custom color" style="${f.custom ? `background:${f.custom}` : ""}">${f.custom ? "" : "+"}<input type="color" value="${f.custom || colorOf(f)}" data-k="custom"></label></div>
              <label class="small">auto-sort words (comma separated, matched at word start)</label>
              <textarea rows="3" data-k="keywords">${esc(f.keywords)}</textarea>
              <button class="link danger" data-del>delete folder</button>
            </div></details>`).join("")}
          <button class="pill" data-add>+ new folder</button>
        </section>
        <section><h4>privacy</h4>
          <p class="small">Skin reads only chat titles and links already shown on this page. It never calls ${esc(site.label)}'s API, and sends nothing anywhere. Everything is kept in this browser.</p>
          <div class="row"><span class="small">${Object.keys(S.chats).length} chats remembered</span><button class="pill" data-forget>forget all chats</button></div>
        </section>
      </div></aside>`;
  }

  /* ---------------- events ---------------- */
  function navigate(path) {
    const u = new URL(path, location.href);
    if (u.host !== location.host) { location.assign(u.href); return; }
    // prefer the site's own link so the single-page app navigates without a reload
    const a = [...document.querySelectorAll("a[href]")].find((x) => !x.closest("#skin-root") && new URL(x.href, location.href).pathname === u.pathname);
    toggle(false);
    if (a) a.click(); else location.assign(u.href);
  }
  function wire() {
    const q = (s) => overlay.querySelectorAll(s);
    q("[data-close]").forEach((b) => (b.onclick = () => toggle(false)));
    q("[data-go]").forEach((b) => (b.onclick = () => navigate(b.dataset.go === "code" ? site.codeUrl : site.chatUrl)));
    q("[data-open]").forEach((b) => (b.onclick = () => { view = { name: "folder", fid: b.dataset.open }; render(); }));
    q("[data-back]").forEach((b) => (b.onclick = () => { view = { name: "board" }; render(); }));
    q("[data-nav]").forEach((a) => (a.onclick = (e) => { e.preventDefault(); navigate(a.getAttribute("href")); }));
    q("[data-chat]").forEach((a) => (a.onclick = (e) => {
      const c = S.chats[a.dataset.chat];
      if (c.site !== SITE) return; // another site: let the link open normally
      e.preventDefault(); navigate(c.path);
    }));
    q("[data-chat]").forEach((a) => {
      const c = S.chats[a.dataset.chat];
      if (c.site !== SITE) { a.href = `https://${SITES[c.site].host}${c.path}`; a.target = "_blank"; a.rel = "noopener"; }
    });
    q("[data-move]").forEach((s) => (s.onchange = () => {
      const c = S.chats[s.dataset.move];
      if (s.value === "__auto") delete c.folder; else if (s.value) c.folder = s.value;
      save(); render();
    }));
    q("[data-settings]").forEach((b) => (b.onclick = () => { panel = panel ? null : "settings"; render(); }));
    q("[data-settings-close]").forEach((b) => (b.onclick = () => { panel = null; render(); }));
    if (panel === "settings") wireSettings();
  }
  function wireSettings() {
    const d = overlay.querySelector(".drawer");
    const commit = (edit) => { view.edit = edit; save(); const top = d.querySelector(".body").scrollTop; render(); overlay.querySelector(".drawer .body").scrollTop = top; };
    d.querySelectorAll("[data-preset]").forEach((b) => (b.onclick = () => { S.preset = b.dataset.preset; commit(); }));
    d.querySelector("[data-grain]").oninput = (e) => { S.grain = +e.target.value; applyVars(); save(); };
    d.querySelector("[data-tilt]").onchange = (e) => { S.tilt = e.target.checked; commit(); };
    d.querySelector("[data-home]").onchange = (e) => { S.openOnHome = e.target.checked; save(); };
    d.querySelector("[data-forget]").onclick = () => { if (confirm("Forget all remembered chats? Folders and colors stay.")) { S.chats = {}; commit(); } };
    d.querySelector("[data-add]").onclick = () => {
      const id = "f" + Date.now().toString(36);
      S.folders.push({ id, name: "new folder", ci: S.folders.length, showName: true, hideTitles: false, keywords: "" });
      commit(id);
    };
    d.querySelectorAll(".fold").forEach((el) => {
      const f = S.folders.find((x) => x.id === el.dataset.f);
      el.querySelector("[data-k=name]").onchange = (e) => { f.name = e.target.value.trim() || "untitled"; commit(f.id); };
      el.querySelector("[data-k=showName]").onchange = (e) => { f.showName = e.target.checked; commit(f.id); };
      el.querySelector("[data-k=hideTitles]").onchange = (e) => { f.hideTitles = e.target.checked; commit(f.id); };
      el.querySelector("[data-k=keywords]").onchange = (e) => { f.keywords = e.target.value; commit(f.id); };
      el.querySelector("[data-k=custom]").onchange = (e) => { f.custom = e.target.value; commit(f.id); };
      el.querySelectorAll("[data-ci]").forEach((b) => (b.onclick = () => { f.ci = +b.dataset.ci; delete f.custom; commit(f.id); }));
      el.querySelector("[data-del]").onclick = () => {
        if (!confirm(`Delete “${f.name}”? Its chats go back to auto-sort.`)) return;
        S.folders = S.folders.filter((x) => x !== f);
        for (const c of Object.values(S.chats)) if (c.folder === f.id) delete c.folder;
        commit();
      };
    });
  }
  addEventListener("keydown", (e) => {
    if (e.altKey && e.shiftKey && e.code === "KeyS") { e.preventDefault(); toggle(); }
    else if (e.key === "Escape" && isOpen()) { if (panel) { panel = null; render(); } else toggle(false); }
  }, true);

  /* ---------------- lifecycle ---------------- */
  const isHome = () => site.home.includes(location.pathname);
  let lastUrl = location.href;
  function onUrl() {
    scan();
    if (S.openOnHome && isHome() && !isOpen()) toggle(true);
  }
  new MutationObserver(() => { clearTimeout(scan.t); scan.t = setTimeout(scan, 400); })
    .observe(document.body, { childList: true, subtree: true });
  setInterval(() => { if (location.href !== lastUrl) { lastUrl = location.href; onUrl(); } }, 600);
  chrome.storage.onChanged.addListener((ch, area) => {
    if (area === "local" && ch.skin?.newValue && JSON.stringify(ch.skin.newValue) !== JSON.stringify(S)) {
      S = ch.skin.newValue; if (isOpen()) render();
    }
  });
  store.get("skin").then((r) => {
    if (r.skin) S = { ...structuredClone(DEFAULT_STATE), ...r.skin };
    setTimeout(onUrl, 800); // let the site render its sidebar first
  });

  /* ---------------- styles ---------------- */
  function CSS() {
    return `
:host{all:initial}
*{box-sizing:border-box;margin:0;padding:0}
button,input,select,textarea{font:inherit;color:inherit}
button{cursor:pointer;background:none;border:0}
[hidden]{display:none!important}
.overlay{
  --mono:"SF Mono",ui-monospace,Menlo,monospace; --sans:"Helvetica Neue",-apple-system,Helvetica,Arial,sans-serif;
  --paper:#ECE9E2; --ink:#131311; --muted:#8b877f; --line:rgba(255,255,255,.1);
  position:fixed;inset:0;overflow:auto;background:var(--bg);color:#e9e5dc;font:14px/1.4 var(--sans);-webkit-font-smoothing:antialiased;
  animation:fade .25s both;
}
.overlay::before{content:"";position:fixed;inset:0;pointer-events:none;background-image:var(--noise);opacity:calc(var(--grain)*.7);mix-blend-mode:overlay;z-index:5}
@keyframes fade{from{opacity:0}}
@keyframes drop{from{opacity:0;transform:translateY(24px) rotate(calc(var(--r)*var(--tilt)*3))}}
@keyframes rise{from{opacity:0;transform:translateY(24px)}}

.tab{
  pointer-events:auto;position:fixed;right:0;top:50%;transform:translateY(-50%);
  writing-mode:vertical-rl;padding:14px 7px;background:#ECE9E2;color:#131311;
  font:500 11px/1 "SF Mono",ui-monospace,Menlo,monospace;letter-spacing:.08em;
  box-shadow:-4px 6px 14px rgba(0,0,0,.28);transition:padding .2s;
}
.tab:hover{padding-right:11px}

.bar{position:sticky;top:0;z-index:4;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:16px;padding:20px 32px;background:linear-gradient(var(--bg) 65%,transparent)}
.brand{display:flex;gap:14px;align-items:flex-start}
.mark{width:14px;height:14px;display:grid;grid-template-columns:repeat(3,1fr);gap:1px;margin-top:2px}
.mark i{background:#e9e5dc;opacity:.85}.mark i:nth-child(2n){opacity:.25}
.meta{font-size:10.5px;line-height:1.4;color:var(--muted)}.meta b{color:#e9e5dc;font-weight:500}
.seg{display:flex;border:1px solid rgba(255,255,255,.22);border-radius:999px;padding:3px}
.seg button{font:12px var(--mono);padding:6px 14px;border-radius:999px;color:var(--muted)}
.seg button.on{background:#e9e5dc;color:#111}
.right{display:flex;justify-content:flex-end;align-items:center;gap:10px}
.pill{font:12px var(--mono);padding:7px 14px;border:1px solid rgba(255,255,255,.22);border-radius:999px}
.pill:hover{background:#e9e5dc;color:#111}
.x{font-size:24px;line-height:1;color:var(--muted);padding:0 4px}.x:hover{color:#fff}

.board{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:44px 34px;padding:20px 48px 60px;max-width:1300px;margin:0 auto}
.wrap{--r:0deg;transform:rotate(calc(var(--r)*var(--tilt)));filter:drop-shadow(0 18px 22px rgba(0,0,0,.55)) drop-shadow(0 2px 3px rgba(0,0,0,.5));
  transition:transform .45s cubic-bezier(.2,.8,.2,1),filter .45s;animation:drop .7s cubic-bezier(.2,.8,.2,1) both;animation-delay:calc(var(--i)*50ms)}
.wrap:hover{transform:rotate(0) translateY(-8px) scale(1.02)}
.loose{--c:#2a2926;--fg:#d8d3c8}
.sheet{--fold:28px;position:relative;display:block;width:100%;aspect-ratio:1/1.3;background:var(--c);color:var(--fg);text-align:left;overflow:hidden;
  clip-path:polygon(0 0,100% 0,100% calc(100% - var(--fold)),calc(100% - var(--fold)) 100%,0 100%)}
.sheet.plain{border:1px dashed rgba(255,255,255,.25)}
.sheet::before{content:"";position:absolute;inset:0;z-index:2;pointer-events:none;background:radial-gradient(120% 70% at 85% 0%,rgba(255,255,255,.16),transparent 55%),linear-gradient(165deg,transparent 55%,rgba(0,0,0,.14))}
.tex{position:absolute;inset:0;z-index:3;pointer-events:none;background-image:var(--noise),var(--fiber);opacity:calc(var(--grain)*1.5);mix-blend-mode:soft-light}
.corner{position:absolute;right:0;bottom:0;width:var(--fold);height:var(--fold);z-index:4;clip-path:polygon(0 0,100% 0,0 100%);
  background:linear-gradient(135deg,color-mix(in srgb,var(--c) 70%,#fff),color-mix(in srgb,var(--c) 78%,#000))}
.name{position:absolute;left:14px;right:14px;top:12px;z-index:5;font:400 clamp(22px,2.2vw,29px)/.95 var(--mono);letter-spacing:-.05em;text-transform:lowercase;word-break:break-word}
.count{position:absolute;right:14px;top:50%;z-index:5;font:11px var(--mono);opacity:.7}
.foot{position:absolute;left:14px;right:40px;bottom:12px;z-index:5;display:flex;justify-content:space-between;font-size:9.5px;opacity:.8}
.hint{text-align:center;color:var(--muted);font-size:11px;padding:0 24px 40px}
.hint a{color:#e9e5dc}

.room{padding:8px 32px 48px;max-width:760px;margin:0 auto}
.strip{position:relative;background:var(--c);color:var(--fg);padding:18px 20px 26px;box-shadow:0 24px 44px rgba(0,0,0,.55);animation:rise .5s cubic-bezier(.2,.8,.2,1) both}
.strip > *{position:relative;z-index:4}
.strip .tex{z-index:1}
.back{font:11px var(--mono);opacity:.75;margin-bottom:12px}
.strip h1{font:400 44px/.9 var(--mono);letter-spacing:-.05em;text-transform:lowercase;margin-bottom:16px;min-height:36px}
.strip ol{list-style:none}
.strip li{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;border-top:1px solid color-mix(in srgb,var(--fg) 28%,transparent)}
.strip li a{display:grid;grid-template-columns:30px 1fr auto;gap:10px;align-items:baseline;padding:11px 0;color:inherit;text-decoration:none}
.strip li a:hover .t{text-decoration:underline;text-underline-offset:3px}
.n{font:16px var(--mono)}
.t{font-weight:600;font-size:13.5px;line-height:1.3}
.site{font:9.5px var(--mono);text-transform:uppercase;letter-spacing:.06em;opacity:.7;border:1px solid currentColor;padding:2px 5px}
.veiled .t{filter:blur(5px);transition:filter .2s}
.veiled li:hover .t{filter:none}
.strip select{font:11px var(--mono);background:transparent;border:1px solid color-mix(in srgb,var(--fg) 35%,transparent);color:inherit;padding:4px 6px;max-width:120px}
.strip select option{color:#111}
.none{padding:14px 0;opacity:.7;font:12px var(--mono)}

.drawer{position:fixed;top:0;right:0;bottom:0;width:min(420px,100%);z-index:6;background:#161614;border-left:1px solid var(--line);display:flex;flex-direction:column;animation:slide .35s cubic-bezier(.2,.8,.2,1) both}
@keyframes slide{from{transform:translateX(100%)}}
.drawer header{display:flex;justify-content:space-between;align-items:center;padding:20px 22px;border-bottom:1px solid var(--line)}
.drawer h3{font:400 20px var(--mono);letter-spacing:-.03em}
.drawer .body{overflow:auto;padding:4px 22px 40px}
.drawer section{padding:16px 0;border-bottom:1px solid var(--line)}
.drawer h4{font-size:10.5px;letter-spacing:.09em;text-transform:uppercase;color:var(--muted);font-weight:500;margin-bottom:10px}
.presets{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.preset{padding:8px;border:1px solid var(--line);text-align:left}.preset.on{border-color:#e9e5dc}
.preset .sw{display:flex;height:28px;margin-bottom:6px}.preset .sw i{flex:1}
.preset span{font:12px var(--mono)}.preset small{display:block;font-size:10px;color:var(--muted)}
.row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:6px 0;font-size:13px}
input[type=range]{accent-color:#e9e5dc;width:140px}
input[type=checkbox]{accent-color:#8fbf7a;width:16px;height:16px}
.fold{border:1px solid var(--line);margin-bottom:8px}
.fold summary{display:flex;align-items:center;gap:10px;padding:9px 11px;cursor:pointer;list-style:none}
.fold summary::-webkit-details-marker{display:none}
.chip{width:20px;height:26px;flex:none;box-shadow:0 2px 4px rgba(0,0,0,.4)}
.fn{flex:1;font:13px var(--mono)}.pv{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}
.inner{padding:4px 11px 12px;display:flex;flex-direction:column;gap:8px}
.inner input[type=text],.inner textarea{width:100%;background:#0f0f0e;border:1px solid var(--line);padding:7px 9px;font-size:12.5px;outline:none;resize:vertical}
.inner textarea{font:11.5px/1.5 var(--mono)}
.swatches{display:flex;flex-wrap:wrap;gap:6px}
.swatches button,.swatches .custom{width:24px;height:24px;border:2px solid transparent;outline:1px solid rgba(255,255,255,.12)}
.swatches button.on{border-color:#e9e5dc}
.custom{display:grid;place-items:center;position:relative;cursor:pointer;color:var(--muted);font-size:14px;border:1px dashed rgba(255,255,255,.35)!important}
.custom input{position:absolute;inset:0;opacity:0;cursor:pointer}
.small{font-size:11px;color:var(--muted);line-height:1.45}
.link{font-size:11px;text-decoration:underline;text-align:left;color:var(--muted)}.danger:hover{color:#E2623D}

@media (max-width:760px){.bar{grid-template-columns:1fr auto;padding:14px 16px}.switches{grid-column:1/-1;order:3}.board{padding:12px 16px 40px;gap:26px 16px;grid-template-columns:repeat(auto-fill,minmax(140px,1fr))}.room{padding:8px 16px 40px}}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
`;
  }
})();
