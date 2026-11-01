// A3 SOP / LOA Study: radar scope, study deck and the scenario builder.

(function () {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";
  const VIEW = window.SCOPE_VIEW;
  const SCENARIOS = Array.isArray(window.SCENARIOS) ? window.SCENARIOS : [];

  const SECTORS = [
    { id: "CRW", name: "Charleston", num: "85" },
    { id: "BLF", name: "Bluefield", num: "96" },
    { id: "BKW", name: "Beckley", num: "86" },
    { id: "BOB", name: "Bobcat", num: "79" },
    { id: "HNN", name: "Henderson", num: "95" },
  ];
  const SECTOR_IDS = SECTORS.map((s) => s.id);

  // What you can pick to study. A question shows up in every area its sector is in.
  const AREAS = [
    { id: "north", name: "North", sectors: ["BOB", "CRW", "HNN"] },
    { id: "south", name: "South", sectors: ["CRW", "BLF"] },
    { id: "combined", name: "Combined", sectors: SECTOR_IDS },
  ];

  // The live edition is study only; the dev edition also has the Build tab.
  const LIVE = document.documentElement.dataset.edition === "live";

  // Track symbol sizes, in map units. They grow on small screens so the
  // data block stays readable.
  const SYM = {
    font: 11,       // data block font size
    lh: 10.6,       // data block line pitch
    diamond: 6.4,   // half-diagonal of the position symbol
    stroke: 1.35,
    histN: 5,       // history marks trailing the target
    histGap: 2.1,
    histLen: 9,
    leaderGap: 1.8, // space between the leader line and the text
  };
  const MIN_FONT_PX = 10;
  const SNAP_TO_PLANE = 10; // how close a first route click must be to start on the plane
  const DEFAULTS = { hdg: 45, vec: 40, dbx: -58, dby: -50 };
  const AC_KEYS = ["callsign", "alt", "cid", "spd", "line4"];
  const KEY = { draft: "a3sop-draft", area: "a3sop-area", shuffle: "a3sop-shuffle" };

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } },
  };

  const $ = (id) => document.getElementById(id);
  const svg = $("radar");
  const gLines = $("g-lines");
  const gRoute = $("g-route");
  const gTrack = $("g-track");
  const gHandles = $("g-handles");

  const num = (v) => typeof v === "number" && Number.isFinite(v);
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  const round = Math.round;

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  // ---------- Scope ----------

  svg.setAttribute("viewBox", `${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`);
  const glow = $("glow");
  glow.setAttribute("x", VIEW.x - 40);
  glow.setAttribute("y", VIEW.y - 40);
  glow.setAttribute("width", VIEW.w + 80);
  glow.setAttribute("height", VIEW.h + 80);

  for (const line of window.BOUNDARIES) {
    el("polyline", { class: "bline", points: line.map((p) => p.join(",")).join(" ") }, gLines);
  }

  let symScale = 1;
  function updateScale() {
    const px = svg.getBoundingClientRect().width / VIEW.w;
    symScale = px > 0 ? Math.max(1, MIN_FONT_PX / (SYM.font * px)) : 1;
  }

  function toMap(e) {
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
    return { x: pt.x, y: pt.y };
  }

  function blockLines(p, ghost) {
    const raw = [p.callsign, p.alt, [p.cid, p.spd].filter(Boolean).join(" "), p.line4].map((t) => t || "");
    if (ghost) {
      const ph = ["CALLSIGN", "ALT", "CID SPD", "LINE4"];
      return raw.map((t, i) => (t ? { text: t } : { text: ph[i], ph: true }));
    }
    while (raw.length && !raw[raw.length - 1]) raw.pop();
    return raw.map((t) => ({ text: t }));
  }

  // Draws one aircraft: history marks, position symbol, vector line, leader
  // line and data block. Returns the data block's box.
  function drawTrack(p, ghost) {
    gTrack.textContent = "";
    if (!p) return null;
    const s = symScale;
    const g = el("g", { class: "trk", "stroke-width": SYM.stroke * s }, gTrack);

    const a = (p.hdg * Math.PI) / 180;
    const ux = Math.sin(a);
    const uy = -Math.cos(a);
    const rd = SYM.diamond * s;
    // Distance from the center to the diamond's edge along a unit direction.
    const edge = (dx, dy) => rd / (Math.abs(dx) + Math.abs(dy) || 1);
    const rim = edge(ux, uy);

    const half = (SYM.histLen * s) / 2;
    for (let i = 0; i < SYM.histN; i++) {
      const d = rim + (0.3 + i * SYM.histGap) * s;
      const cx = p.x - ux * d;
      const cy = p.y - uy * d;
      el("line", { x1: cx + uy * half, y1: cy - ux * half, x2: cx - uy * half, y2: cy + ux * half }, g);
    }

    if (p.vec > rim) {
      el("line", { x1: p.x + ux * rim, y1: p.y + uy * rim, x2: p.x + ux * p.vec, y2: p.y + uy * p.vec }, g);
    }

    el("polygon", { points: `${p.x},${p.y - rd} ${p.x + rd},${p.y} ${p.x},${p.y + rd} ${p.x - rd},${p.y}` }, g);
    el("line", { x1: p.x, y1: p.y - rd * 0.34, x2: p.x, y2: p.y + rd * 0.34 }, g);

    // Data block
    const rows = blockLines(p, ghost);
    if (!rows.length) return null;
    const lh = SYM.lh * s;
    const x0 = p.x + p.dbx;
    const y0 = p.y + p.dby;
    const tg = el("g", { "font-size": SYM.font * s }, g);
    const widths = rows.map((row, i) => {
      const t = el("text", { x: x0, y: y0 + i * lh + lh * 0.86 }, tg);
      if (row.ph) t.setAttribute("class", "ph");
      t.textContent = row.text;
      return row.text ? t.getComputedTextLength() : 0;
    });
    const h = rows.length * lh;

    // Leader line: from the symbol to the end of the nearest data block line.
    const i = clamp(Math.floor((p.y - y0) / lh), 0, rows.length - 1);
    const gap = SYM.leaderGap * s;
    let ax = null;
    let ay = y0 + (i + 0.45) * lh;
    if (p.x >= x0 + widths[i] + gap) ax = x0 + widths[i] + gap;
    else if (p.x <= x0 - gap) ax = x0 - gap;
    else if (p.y < y0) { ax = p.x; ay = y0 - gap * 0.6; }
    else if (p.y > y0 + h) { ax = p.x; ay = y0 + h + gap * 0.6; }
    if (ax !== null) {
      const dx = ax - p.x;
      const dy = ay - p.y;
      const dist = Math.hypot(dx, dy);
      const start = edge(dx / dist, dy / dist);
      if (dist > start + 1) {
        el("line", { x1: p.x + (dx / dist) * start, y1: p.y + (dy / dist) * start, x2: ax, y2: ay }, g);
      }
    }

    return { x: x0, y: y0, w: Math.max(20 * s, ...widths), h };
  }

  function drawRoute(pts, preview) {
    gRoute.textContent = "";
    if (pts.length >= 2) {
      el("polyline", { class: "route", points: pts.map((q) => `${q.x},${q.y}`).join(" ") }, gRoute);
    }
    if (preview && pts.length) {
      const last = pts[pts.length - 1];
      el("line", { class: "route preview", x1: last.x, y1: last.y, x2: preview.x, y2: preview.y }, gRoute);
    }
  }

  // ---------- State ----------

  let view = "build";
  let tool = "move";
  let draft = loadDraft();
  let hover = null; // cursor position while drawing a route
  let drag = null;

  const study = {
    area: AREAS.find((a) => a.id === store.get(KEY.area)) || AREAS[AREAS.length - 1],
    shuffle: store.get(KEY.shuffle) === "1",
    order: [],
    i: 0,
    revealed: false,
  };

  function blankDraft(sector) {
    return {
      sector: sector || SECTOR_IDS[0],
      ac: { callsign: "", alt: "", cid: "", spd: "", line4: "" },
      pos: null,
      hdg: DEFAULTS.hdg,
      vec: DEFAULTS.vec,
      dbx: DEFAULTS.dbx,
      dby: DEFAULTS.dby,
      route: [],
      routeFromPlane: false,
      question: "",
      answer: "",
    };
  }

  function loadDraft() {
    const d = blankDraft();
    let saved = null;
    try { saved = JSON.parse(store.get(KEY.draft) || "null"); } catch (e) { /* ignore */ }
    if (!saved || typeof saved !== "object") return d;
    if (SECTOR_IDS.includes(saved.sector)) d.sector = saved.sector;
    if (saved.id) d.id = String(saved.id);
    for (const k of AC_KEYS) if (saved.ac && typeof saved.ac[k] === "string") d.ac[k] = saved.ac[k];
    if (saved.pos && num(saved.pos.x) && num(saved.pos.y)) d.pos = { x: saved.pos.x, y: saved.pos.y };
    for (const k of ["hdg", "vec", "dbx", "dby"]) if (num(saved[k])) d[k] = saved[k];
    if (Array.isArray(saved.route)) {
      d.route = saved.route.filter((q) => q && num(q.x) && num(q.y)).map((q) => ({ x: q.x, y: q.y }));
    }
    d.routeFromPlane = !!saved.routeFromPlane && !!d.pos;
    if (typeof saved.question === "string") d.question = saved.question;
    if (typeof saved.answer === "string") d.answer = saved.answer;
    return d;
  }

  function saveDraft() {
    store.set(KEY.draft, JSON.stringify(draft));
  }

  // Turns a saved scenario back into an editable draft.
  function fromScenario(s) {
    const d = blankDraft(SECTOR_IDS.includes(s.sector) ? s.sector : draft.sector);
    if (s.id) d.id = String(s.id);
    const p = s.plane || {};
    for (const k of AC_KEYS) d.ac[k] = p[k] == null ? "" : String(p[k]).toUpperCase();
    if (num(p.x) && num(p.y)) d.pos = { x: p.x, y: p.y };
    for (const k of ["hdg", "vec", "dbx", "dby"]) if (num(p[k])) d[k] = p[k];
    const pts = Array.isArray(s.route)
      ? s.route.filter((q) => Array.isArray(q) && num(q[0]) && num(q[1])).map(([x, y]) => ({ x, y }))
      : [];
    if (pts.length && d.pos && Math.hypot(pts[0].x - d.pos.x, pts[0].y - d.pos.y) < 0.75) {
      d.routeFromPlane = true;
      pts.shift();
    }
    d.route = pts;
    d.question = s.question ? String(s.question) : "";
    d.answer = s.answer ? String(s.answer) : "";
    return d;
  }

  function draftPlane() {
    if (!draft.pos) return null;
    return Object.assign({ x: draft.pos.x, y: draft.pos.y, hdg: draft.hdg, vec: draft.vec, dbx: draft.dbx, dby: draft.dby }, draft.ac);
  }

  function routePoints() {
    return (draft.routeFromPlane && draft.pos ? [draft.pos] : []).concat(draft.route);
  }

  function hasWork() {
    return !!(draft.pos || draft.route.length || draft.question.trim() || draft.answer.trim());
  }

  // ---------- Rendering ----------

  const tag = $("scope-tag");

  function render() {
    updateScale();
    if (view === "build") {
      const p = draftPlane();
      const box = drawTrack(p, true);
      drawBuildRoute();
      drawHandles(p, box);
      tag.textContent = `BUILD · ${draft.sector}`;
    } else {
      const sc = currentScenario();
      drawTrack(sc ? Object.assign({}, DEFAULTS, sc.plane) : null, false);
      drawRoute(sc && Array.isArray(sc.route) ? sc.route.map(([x, y]) => ({ x, y })) : []);
      gHandles.textContent = "";
      const n = deck().length;
      tag.textContent = sc ? `${sc.sector}  ${study.i + 1}/${n}` : study.area.name.toUpperCase();
    }
  }

  function drawBuildRoute() {
    drawRoute(routePoints(), tool === "route" ? hover : null);
  }

  function drawHandles(p, box) {
    gHandles.textContent = "";
    const s = symScale;
    if (p) {
      const a = (p.hdg * Math.PI) / 180;
      const tx = p.x + Math.sin(a) * p.vec;
      const ty = p.y - Math.cos(a) * p.vec;
      if (box) {
        el("rect", {
          class: "hd hd-db", "data-h": "db",
          x: box.x - 2 * s, y: box.y - 1 * s, width: box.w + 4 * s, height: box.h + 2 * s, rx: 1.5 * s,
        }, gHandles);
      }
      el("circle", { class: "hd", "data-h": "plane", cx: p.x, cy: p.y, r: SYM.diamond * s * 1.4 }, gHandles);
      el("circle", { class: "hd-ring", cx: tx, cy: ty, r: 2.6 * s }, gHandles);
      el("circle", { class: "hd", "data-h": "vec", cx: tx, cy: ty, r: 6 * s }, gHandles);
    }
    draft.route.forEach((q, i) => {
      el("rect", { class: "hd-rv", x: q.x - 2.2 * s, y: q.y - 2.2 * s, width: 4.4 * s, height: 4.4 * s }, gHandles);
      el("circle", { class: "hd", "data-h": "rv", "data-i": i, cx: q.x, cy: q.y, r: 6 * s }, gHandles);
    });
  }

  // ---------- Builder: tools and dragging ----------

  const HINTS = {
    plane: "Click the scope to place the plane.",
    move: "Drag the plane to move it, the circle at the end of the vector to turn it (hold Shift to snap 5°), and the data block to reposition it. Double-click a route point to delete it.",
    route: "Click to add route points. Click the plane first to start the route from it. Enter or Esc when done, Backspace to undo.",
  };

  function setTool(t) {
    tool = t;
    hover = null;
    document.body.dataset.tool = t;
    for (const b of document.querySelectorAll(".tools button")) {
      b.setAttribute("aria-checked", String(b.dataset.tool === t));
    }
    const rb = $("btn-route");
    rb.textContent = t === "route" ? "Done drawing" : "Draw route";
    rb.classList.toggle("active", t === "route");
    $("hint").textContent = HINTS[t];
    render();
  }

  function clampToView(pt) {
    return { x: clamp(pt.x, VIEW.x, VIEW.x + VIEW.w), y: clamp(pt.y, VIEW.y, VIEW.y + VIEW.h) };
  }

  function addRoutePoint(pt) {
    const near = draft.pos && Math.hypot(pt.x - draft.pos.x, pt.y - draft.pos.y) <= SNAP_TO_PLANE * symScale;
    if (!draft.route.length && !draft.routeFromPlane && near) draft.routeFromPlane = true;
    else draft.route.push(clampToView(pt));
    changed();
  }

  function undoPoint() {
    if (draft.route.length) draft.route.pop();
    else draft.routeFromPlane = false;
    changed();
  }

  function startDrag(e, d) {
    drag = d;
    document.body.classList.add("dragging");
    try { svg.setPointerCapture(e.pointerId); } catch (err) { /* synthetic events */ }
    e.preventDefault();
  }

  let lastVertexTap = { i: -1, t: 0 };

  svg.addEventListener("pointerdown", (e) => {
    if (view !== "build" || e.button !== 0) return;
    const pt = toMap(e);
    const h = e.target.dataset ? e.target.dataset.h : null;

    if (h === "rv") {
      const i = +e.target.dataset.i;
      const now = performance.now();
      if (lastVertexTap.i === i && now - lastVertexTap.t < 350) {
        lastVertexTap = { i: -1, t: 0 };
        draft.route.splice(i, 1);
        changed();
        e.preventDefault();
        return;
      }
      lastVertexTap = { i, t: now };
      const q = draft.route[i];
      startDrag(e, { kind: "rv", i, ox: pt.x - q.x, oy: pt.y - q.y });
      return;
    }

    if (tool === "route") {
      addRoutePoint(pt);
      e.preventDefault();
      return;
    }

    if (h === "plane") {
      startDrag(e, { kind: "plane", ox: pt.x - draft.pos.x, oy: pt.y - draft.pos.y });
    } else if (h === "vec") {
      startDrag(e, { kind: "vec" });
    } else if (h === "db") {
      startDrag(e, { kind: "db", ox: pt.x - (draft.pos.x + draft.dbx), oy: pt.y - (draft.pos.y + draft.dby) });
    } else if (tool === "plane" || !draft.pos) {
      draft.pos = clampToView(pt);
      setTool("move");
      changed();
      startDrag(e, { kind: "plane", ox: 0, oy: 0 });
    }
  });

  svg.addEventListener("pointermove", (e) => {
    if (view !== "build") return;
    const pt = toMap(e);
    if (drag) {
      applyDrag(pt, e.shiftKey);
      render();
      syncAircraftNumbers();
    } else if (tool === "route") {
      hover = pt;
      drawBuildRoute();
    }
  });

  function endDrag() {
    if (!drag) return;
    drag = null;
    document.body.classList.remove("dragging");
    changed();
  }
  svg.addEventListener("pointerup", endDrag);
  svg.addEventListener("pointercancel", endDrag);
  svg.addEventListener("pointerleave", () => {
    if (hover && !drag) {
      hover = null;
      drawBuildRoute();
    }
  });

  function applyDrag(pt, snap) {
    const d = drag;
    if (d.kind === "plane") {
      draft.pos = clampToView({ x: pt.x - d.ox, y: pt.y - d.oy });
    } else if (d.kind === "vec") {
      const dx = pt.x - draft.pos.x;
      const dy = pt.y - draft.pos.y;
      let hdg = (Math.atan2(dx, -dy) * 180) / Math.PI;
      hdg = snap ? round(hdg / 5) * 5 : round(hdg);
      draft.hdg = ((hdg % 360) + 360) % 360;
      draft.vec = clamp(round(Math.hypot(dx, dy)), 12, 160);
    } else if (d.kind === "db") {
      draft.dbx = pt.x - d.ox - draft.pos.x;
      draft.dby = pt.y - d.oy - draft.pos.y;
    } else if (d.kind === "rv") {
      draft.route[d.i] = clampToView({ x: pt.x - d.ox, y: pt.y - d.oy });
    }
  }

  // ---------- Builder: form ----------

  const F = {
    sector: $("f-sector"),
    edit: $("f-edit"),
    hdg: $("f-hdg"),
    vec: $("f-vec"),
    question: $("f-question"),
    answer: $("f-answer"),
    output: $("output"),
  };
  for (const k of AC_KEYS) F[k] = $("f-" + k);

  for (const s of SECTORS) {
    const o = document.createElement("option");
    o.value = s.id;
    o.textContent = `${s.id} · ${s.name} (${s.num})`;
    F.sector.appendChild(o);
  }

  if (SCENARIOS.length) {
    $("edit-wrap").hidden = false;
    SCENARIOS.forEach((s, i) => {
      const o = document.createElement("option");
      o.value = String(i);
      const q = String(s.question || "").replace(/\s+/g, " ");
      o.textContent = `${s.sector} · ${q.length > 42 ? q.slice(0, 40) + "…" : q || "(no question)"}`;
      F.edit.appendChild(o);
    });
  }

  function syncAircraftNumbers() {
    if (document.activeElement !== F.hdg) F.hdg.value = draft.hdg;
    F.vec.value = draft.vec;
    $("o-vec").textContent = draft.vec;
  }

  function syncFields() {
    F.sector.value = draft.sector;
    for (const k of AC_KEYS) F[k].value = draft.ac[k];
    F.question.value = draft.question;
    F.answer.value = draft.answer;
    const idx = draft.id ? SCENARIOS.findIndex((s) => String(s.id) === draft.id) : -1;
    F.edit.value = idx >= 0 ? String(idx) : "";
    syncAircraftNumbers();
  }

  function updateRouteUI() {
    const n = routePoints().length;
    let text = n === 0 ? "No route" : n === 1 ? "1 point" : `${n} points`;
    if (draft.routeFromPlane && draft.pos) text += " · from plane";
    $("route-count").textContent = text;
    $("btn-undo").disabled = n === 0;
    $("btn-route-clear").disabled = n === 0;
  }

  function changed() {
    saveDraft();
    updateRouteUI();
    render();
  }

  F.sector.addEventListener("change", () => {
    draft.sector = F.sector.value;
    changed();
  });

  for (const k of AC_KEYS) {
    F[k].addEventListener("input", () => {
      draft.ac[k] = F[k].value.toUpperCase().trim();
      changed();
    });
  }

  F.hdg.addEventListener("input", () => {
    const n = parseInt(F.hdg.value, 10);
    if (Number.isNaN(n)) return;
    draft.hdg = ((n % 360) + 360) % 360;
    changed();
  });
  F.hdg.addEventListener("change", () => { F.hdg.value = draft.hdg; });

  F.vec.addEventListener("input", () => {
    draft.vec = +F.vec.value;
    $("o-vec").textContent = draft.vec;
    changed();
  });

  F.question.addEventListener("input", () => { draft.question = F.question.value; saveDraft(); });
  F.answer.addEventListener("input", () => { draft.answer = F.answer.value; saveDraft(); });

  for (const b of document.querySelectorAll(".tools button")) {
    b.addEventListener("click", () => setTool(b.dataset.tool));
  }
  $("btn-route").addEventListener("click", () => setTool(tool === "route" ? "move" : "route"));
  $("btn-undo").addEventListener("click", undoPoint);
  $("btn-route-clear").addEventListener("click", () => {
    draft.route = [];
    draft.routeFromPlane = false;
    changed();
  });

  F.edit.addEventListener("change", () => {
    const s = SCENARIOS[+F.edit.value];
    if (F.edit.value === "" || !s) return;
    if (hasWork() && !confirm("Replace what's on the scope with this saved scenario?")) {
      syncFields();
      return;
    }
    draft = fromScenario(s);
    F.output.value = "";
    say("");
    syncFields();
    setTool("move");
    changed();
  });

  // ---------- Builder: save / load ----------

  const msg = $("save-msg");
  function say(text, kind) {
    msg.textContent = text;
    msg.className = "msg" + (kind ? " " + kind : "");
  }

  function scenarioFromDraft() {
    const o = {};
    if (draft.id) o.id = draft.id;
    o.sector = draft.sector;
    o.question = draft.question.trim();
    o.answer = draft.answer.trim();
    o.plane = {
      x: round(draft.pos.x), y: round(draft.pos.y), hdg: draft.hdg, vec: round(draft.vec),
      callsign: draft.ac.callsign, alt: draft.ac.alt, cid: draft.ac.cid, spd: draft.ac.spd, line4: draft.ac.line4,
      dbx: round(draft.dbx), dby: round(draft.dby),
    };
    o.route = routePoints().map((q) => [round(q.x), round(q.y)]);
    return o;
  }

  // JSON, but with the plane and route each on one line.
  function formatScenario(o) {
    const J = JSON.stringify;
    const rows = Object.keys(o).map((k) => {
      let v;
      if (k === "plane") v = "{ " + Object.keys(o.plane).map((pk) => `${J(pk)}: ${J(o.plane[pk])}`).join(", ") + " }";
      else if (k === "route") v = "[" + o.route.map((q) => `[${q[0]}, ${q[1]}]`).join(", ") + "]";
      else v = J(o[k]);
      return `  ${J(k)}: ${v}`;
    });
    return "{\n" + rows.join(",\n") + "\n}";
  }

  $("btn-save").addEventListener("click", () => {
    if (!draft.pos) {
      say("Place a plane on the scope first.", "bad");
      return;
    }
    const o = scenarioFromDraft();
    F.output.value = formatScenario(o);
    const missing = [!o.question && "question", !o.answer && "answer"].filter(Boolean);
    if (missing.length) say(`Saved, but the ${missing.join(" and ")} ${missing.length > 1 ? "are" : "is"} empty.`, "warn");
    else say("Saved. Copy it and send it over to add it to the study deck.", "ok");
    F.output.scrollTop = 0;
  });

  $("btn-copy").addEventListener("click", async () => {
    if (!F.output.value.trim()) {
      say("Nothing to copy yet. Hit Save first.", "warn");
      return;
    }
    try {
      await navigator.clipboard.writeText(F.output.value);
    } catch (e) {
      F.output.focus();
      F.output.select();
      document.execCommand("copy");
    }
    say("Copied to the clipboard.", "ok");
  });

  $("btn-load").addEventListener("click", () => {
    const text = F.output.value.trim().replace(/,\s*$/, "");
    if (!text) {
      say("Paste a saved scenario into the box, then hit Load.", "warn");
      return;
    }
    let s;
    try { s = JSON.parse(text); } catch (e) { s = null; }
    if (!s || typeof s !== "object" || !s.plane) {
      say("That doesn't look like a saved scenario.", "bad");
      return;
    }
    if (hasWork() && !confirm("Replace what's on the scope with the pasted scenario?")) return;
    draft = fromScenario(s);
    syncFields();
    setTool("move");
    changed();
    say("Loaded. Edit it, then hit Save again.", "ok");
  });

  $("btn-new").addEventListener("click", () => {
    if (hasWork() && !confirm("Start a new scenario? This clears the plane, route, question and answer.")) return;
    draft = blankDraft(draft.sector);
    F.output.value = "";
    say("");
    syncFields();
    setTool("plane");
    changed();
  });

  // ---------- Study ----------

  function inArea(s, area) {
    return area.sectors.includes(s.sector);
  }

  function deck() {
    return SCENARIOS.filter((s) => inArea(s, study.area));
  }

  function currentScenario() {
    const d = deck();
    return d.length ? d[study.order[study.i]] : null;
  }

  function buildOrder() {
    const n = deck().length;
    study.order = Array.from({ length: n }, (_, i) => i);
    if (study.shuffle) {
      for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [study.order[i], study.order[j]] = [study.order[j], study.order[i]];
      }
    }
    study.i = 0;
    study.revealed = false;
  }

  const pick = $("area-pick");
  for (const area of AREAS) {
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("role", "radio");
    b.dataset.area = area.id;
    b.title = area.sectors.join(", ");
    const count = SCENARIOS.filter((s) => inArea(s, area)).length;
    b.innerHTML = `<span>${area.name}</span><i>${count}</i>`;
    b.addEventListener("click", () => {
      study.area = area;
      store.set(KEY.area, area.id);
      buildOrder();
      $("my-answer").value = "";
      renderStudy();
    });
    pick.appendChild(b);
  }

  function renderStudy() {
    const d = deck();
    const sc = currentScenario();
    for (const b of pick.children) b.setAttribute("aria-checked", String(b.dataset.area === study.area.id));
    $("study-body").hidden = !sc;
    $("study-empty").hidden = !!sc;
    $("empty-area").textContent = study.area.name;
    $("study-count").textContent = sc ? `${study.area.name} · ${study.i + 1} of ${d.length}` : `${study.area.name} · no questions`;
    if (sc) {
      const sector = SECTORS.find((s) => s.id === sc.sector);
      const chip = $("q-sector");
      chip.textContent = sc.sector;
      chip.title = sector ? `${sector.name} (${sector.num})` : "";
      $("q-text").textContent = sc.question || "";
      $("a-text").textContent = sc.answer || "";
      $("answer").hidden = !study.revealed;
      $("btn-reveal").innerHTML = (study.revealed ? "Hide answer" : "Show answer") + " <kbd>Space</kbd>";
    }
    $("btn-prev").disabled = d.length < 2;
    $("btn-next").disabled = d.length < 2;
    const sh = $("btn-shuffle");
    sh.setAttribute("aria-pressed", String(study.shuffle));
    render();
  }

  function go(step) {
    const n = deck().length;
    if (n < 2) return;
    study.i = (study.i + step + n) % n;
    study.revealed = false;
    $("my-answer").value = "";
    renderStudy();
  }

  function toggleReveal() {
    if (!currentScenario()) return;
    study.revealed = !study.revealed;
    renderStudy();
  }

  $("btn-reveal").addEventListener("click", toggleReveal);
  $("btn-prev").addEventListener("click", () => go(-1));
  $("btn-next").addEventListener("click", () => go(1));
  $("btn-shuffle").addEventListener("click", () => {
    study.shuffle = !study.shuffle;
    store.set(KEY.shuffle, study.shuffle ? "1" : "0");
    buildOrder();
    $("my-answer").value = "";
    renderStudy();
  });

  // ---------- Keyboard ----------

  document.addEventListener("keydown", (e) => {
    const t = e.target;
    const typing = t.closest && t.closest("input, textarea, select");

    if (view === "study") {
      if (typing) {
        if (t.id === "my-answer" && e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          toggleReveal();
        }
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if ((e.key === " " || e.key === "Enter") && !t.closest("button, a")) {
        e.preventDefault();
        toggleReveal();
      } else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      return;
    }

    if (typing) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && tool === "route") {
      e.preventDefault();
      undoPoint();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === "v" || k === "m") setTool("move");
    else if (k === "p") setTool("plane");
    else if (k === "r") setTool("route");
    else if (tool === "route" && (e.key === "Enter" || e.key === "Escape")) setTool("move");
    else if (tool === "route" && e.key === "Backspace") { e.preventDefault(); undoPoint(); }
  });

  // ---------- Views ----------

  function viewFromHash() {
    if (LIVE) return "study";
    const h = location.hash.slice(1);
    if (h === "study" || h === "build") return h;
    return SCENARIOS.length ? "study" : "build";
  }

  function setView(v) {
    view = v;
    document.body.dataset.view = v;
    for (const name of ["study", "build"]) {
      const a = $("tab-" + name);
      if (name === v) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    }
    drag = null;
    hover = null;
    if (v === "study") renderStudy();
    else render();
  }

  window.addEventListener("hashchange", () => setView(viewFromHash()));

  // ---------- Sizing, start ----------

  const topbar = $("topbar");
  new ResizeObserver(() => {
    document.documentElement.style.setProperty("--top-h", topbar.offsetHeight + "px");
  }).observe(topbar);

  let lastWidth = 0;
  new ResizeObserver(() => {
    const w = svg.getBoundingClientRect().width;
    if (Math.abs(w - lastWidth) < 0.5) return;
    lastWidth = w;
    render();
  }).observe(svg);

  buildOrder();
  syncFields();
  updateRouteUI();
  view = viewFromHash();
  setTool(draft.pos ? "move" : "plane");
  setView(view);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(render);
})();
