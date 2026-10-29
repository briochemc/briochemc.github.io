// Interactive CV timeline: a "snake" band of months, one row per year, that turns around
// at the end of each row so consecutive months stay contiguous. Positions are coloured
// bands along the snake, each ending in a point and starting with a notch, so they read as
// arrows pointing forward in time; hovering one shows its name. Papers and talks sit as
// markers just above the band (toggles in the legend below the figure): hovering a marker
// shows a popup, clicking it goes to that entry on the publications or talks page. Brackets
// on the right group the positions (education, private sector, academia).
//
// Proof of concept. Plain ES module, no dependencies, so it can be imported from this site
// (Franklin copies `_libs/` to `/libs/`) or from anywhere else. `createTimeline` returns a
// DOM node; the auto-mount at the bottom replaces the static SVG fallback on the page.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const PITCH = 0.85;            // vertical distance between year rows, in cells (a month is 1 wide)
const BAND = 0.28;             // band width, in cells
const GAP = 0.12;              // trimmed off each end of a position so neighbours stay separated
const TIP = BAND * Math.sqrt(3) / 4;  // length of the point / notch at a band's ends
const LIGHT = "#e4e4e4";       // unfilled band, and the year/month labels
const INK = "#8a8a8a";         // brackets, their labels, and marker fill
const MARKER_R = 0.15;         // marker radius, in cells

// Same colours as timeline.jl: seaborn's icefire gradient sampled at 16 points and picked
// by hand there, in the order the positions are listed in jobs.json (sorted by start date).
// The last one is the purple added for the Lecturer position.
const PALETTE = [
  "#5AA7CD", "#8DC6D0", "#5AA7CD", "#3885D0", "#EB753A", "#465EBE",
  "#D34936", "#444282", "#AB3043", "#782C3F", "#4A252E", "#212026",
  "#8E59BF",
];

// Marker kinds: which list in `items`, the legend label, the word for one of them in the
// popup, the page each entry lives on (entries carry a `key` that is the anchor on that
// page), the shape, and whether it is outlined and flagged with an exclamation mark.
const KINDS = [
  {id: "papersFirst", label: "First-author papers", one: "First-author paper", page: "/publications/#", shape: "star", flag: true},
  {id: "papersOther", label: "Other papers", one: "Paper", page: "/publications/#", shape: "star"},
  {id: "talks", label: "Talks/Posters", one: "Talk/Poster", page: "/talks/#", shape: "circle"},
];

const monthIndex = (ym, firstYear) => {
  const [y, m] = ym.split("-").map(Number);
  return (y - firstYear) * 12 + (m - 1);
};

const monthLabel = ym => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en", {month: "short", year: "numeric"});
};

const NS = "http://www.w3.org/2000/svg";
const svgEl = (name, attrs = {}, parent) => {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (parent) parent.appendChild(node);
  return node;
};
const htmlEl = (name, style, parent, text) => {
  const node = document.createElement(name);
  if (style) node.style.cssText = style;
  if (text != null) node.textContent = text;
  if (parent) parent.appendChild(node);
  return node;
};

// A marker shape centred on (cx, cy) with "radius" r, as an SVG path's d attribute.
function shapePath(shape, cx, cy, r) {
  switch (shape) {
    case "star": {
      const R = r * 1.3, ri = R * 0.45;
      return Array.from({length: 10}, (_, i) => {
        const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? ri : R;
        return `${i ? "L" : "M"}${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)}`;
      }).join("") + "Z";
    }
    case "square": {
      const h = r * 0.85;
      return `M${cx - h},${cy - h}H${cx + h}V${cy + h}H${cx - h}Z`;
    }
    default: // circle
      return `M${cx - r},${cy}A${r},${r} 0 1 0 ${cx + r},${cy}A${r},${r} 0 1 0 ${cx - r},${cy}Z`;
  }
}

// A marker (shape, plus outline and "!" for flagged kinds) centred on (cx, cy), appended
// to `parent`. Used for the figure and, scaled down, for the legend.
function marker(parent, kind, cx, cy, r) {
  svgEl("path", {
    d: shapePath(kind.shape, cx, cy, r), fill: INK,
    ...(kind.flag ? {stroke: "#000", "stroke-width": r * 0.25, "stroke-linejoin": "round"} : {}),
  }, parent);
  if (kind.flag) {
    svgEl("text", {
      x: cx + r * 1.5, y: cy, "font-size": r * 2.2, "font-weight": "700", fill: "#000",
      "dominant-baseline": "central",
    }, parent).textContent = "!";
  }
}

export function createTimeline({firstYear, lastYear, positions, groups = {}, items = {}}) {
  const nYears = lastYear - firstYear + 1;
  const nMonths = nYears * 12;
  const B = BAND / 2;

  // Geometry, in cells: rows have pitch PITCH, turns have radius PITCH / 2. The left
  // margin holds the year labels, the right margin clears the turns, and the annotation
  // area beyond it holds the group brackets.
  const LM = 2.8;
  const RM = PITCH / 2 + TIP + 0.1;
  const RA = 2.8;
  const TOP = 0.3;
  const BOTTOM = 0.4;            // room for the month labels under the bottom row
  const vbWidth = LM + 12 + RM + RA;
  const vbHeight = nYears * PITCH + TOP + BOTTOM;

  // Row k holds year firstYear + k, counted from the bottom; even rows run left to right.
  const rowOf = m => Math.floor(m / 12);
  const rowY = k => TOP + (nYears - 1 - k) * PITCH + PITCH / 2;
  const leftToRight = k => k % 2 === 0;
  // x at fraction f in [0, 1] through month m, in the travel direction.
  const cellX = (m, f) => {
    const j = m % 12;
    return LM + (leftToRight(rowOf(m)) ? j + f : 12 - j - f);
  };

  // Outline of a band from fraction f0 through month m0 to fraction f1 through month m1
  // (defaults: the whole of both months), as a closed SVG path to be filled. It runs
  // forward along the left-hand side of the centreline, across the end cap, back along the
  // right-hand side, and across the start cap. Each cap has an extra vertex in its middle,
  // pushed TIP forward in time, so the band ends in a point and starts with a notch.
  // Through a turn the left-hand side keeps radius r - dB and the right-hand side r + dB,
  // where d is the row's direction: the sides swap between inner and outer at each turn.
  function bandOutline(m0, m1, f0 = 0, f1 = 1) {
    const r0 = rowOf(m0), r1 = rowOf(m1), r = PITCH / 2;
    const dir = k => leftToRight(k) ? 1 : -1;
    const xs = k => k === r0 ? cellX(m0, f0) : cellX(k * 12, 0);       // row start (travel order)
    const xe = k => k === r1 ? cellX(m1, f1) : cellX(k * 12 + 11, 1);  // row end
    let d = `M${xs(r0)},${rowY(r0) - dir(r0) * B}`;
    for (let k = r0; k <= r1; k++) {
      const dk = dir(k);
      d += `L${xe(k)},${rowY(k) - dk * B}`;
      if (k < r1) {
        const rho = r - dk * B, sweep = dk > 0 ? 0 : 1;
        d += `A${rho},${rho} 0 0 ${sweep} ${xe(k)},${rowY(k + 1) + dk * B}`;
      }
    }
    const d1 = dir(r1);
    d += `L${xe(r1) + d1 * TIP},${rowY(r1)}L${xe(r1)},${rowY(r1) + d1 * B}`;
    for (let k = r1; k >= r0; k--) {
      const dk = dir(k);
      d += `L${xs(k)},${rowY(k) + dk * B}`;
      if (k > r0) {
        const dp = dir(k - 1), rho = r + dp * B, sweep = dp > 0 ? 1 : 0;
        d += `A${rho},${rho} 0 0 ${sweep} ${xe(k - 1)},${rowY(k - 1) + dp * B}`;
      }
    }
    const d0 = dir(r0);
    return d + `L${xs(r0) + d0 * TIP},${rowY(r0)}Z`;
  }

  // --- DOM skeleton -------------------------------------------------------------------
  const root = htmlEl("div", "position:relative;width:100%;font-family:inherit;");
  root.className = "cv-timeline";
  // Hover feedback. No native focus rings: Chrome draws them on SVG shapes in user units,
  // which the viewBox scales into huge blobs.
  htmlEl("style", "", root,
    ".cv-timeline .cv-seg{stroke-width:0;outline:none;transition:stroke-width .15s}" +
    `.cv-timeline .cv-seg:hover{stroke-width:${BAND * 0.25}}` +
    ".cv-timeline .cv-marker{outline:none}" +
    ".cv-timeline .cv-marker:hover path,.cv-timeline .cv-marker:focus path{fill:#000}");

  const svg = svgEl("svg", {
    viewBox: `0 0 ${vbWidth} ${vbHeight}`,
    width: "100%",
    style: "display:block;height:auto;overflow:visible;",
    role: "img",
    "aria-label": "Timeline of positions and studies, one row per year",
  }, root);

  const legend = htmlEl("div",
    "display:flex;gap:1.2em;flex-wrap:wrap;font-size:0.85em;color:#555;margin:0.6em 0 0;", root);

  const popup = htmlEl("div",
    "display:none;position:absolute;max-width:24em;padding:0.4em 0.6em;background:#222;color:#fff;" +
    "border-radius:4px;font-size:0.8em;line-height:1.3;pointer-events:none;z-index:2;" +
    "box-shadow:0 2px 8px rgba(0,0,0,.25);", root);

  // Popup with the given lines, horizontally centred on x and sitting above y (root px).
  function showPopup(lines, x, y) {
    popup.replaceChildren();
    for (const [text, style] of lines) if (text) htmlEl("div", style, popup, text);
    popup.style.display = "block";
    const rw = root.getBoundingClientRect().width;
    popup.style.left = `${Math.max(0, Math.min(rw - popup.offsetWidth, x - popup.offsetWidth / 2))}px`;
    popup.style.top = `${y - popup.offsetHeight - 8}px`;
  }
  const hidePopup = () => { popup.style.display = "none"; };
  // Popup anchored to an element's box.
  function popupAt(el, lines) {
    const rr = root.getBoundingClientRect(), er = el.getBoundingClientRect();
    showPopup(lines, er.left + er.width / 2 - rr.left, er.top - rr.top);
  }
  // Popup following the pointer (for bands, which can span several rows).
  const popupAtPointer = lines => e => {
    const rr = root.getBoundingClientRect();
    showPopup(lines, e.clientX - rr.left, e.clientY - rr.top - 12);
  };

  // --- Static drawing -------------------------------------------------------------------
  svgEl("path", {d: bandOutline(0, nMonths - 1), fill: LIGHT}, svg);

  for (let k = 0; k < nYears; k++) {
    svgEl("text", {
      x: LM - 1.0, y: rowY(k), "text-anchor": "end", "dominant-baseline": "central",
      "font-size": 0.38, fill: LIGHT,
    }, svg).textContent = String(firstYear + k);
    // Month names tucked under every row, following each row's direction.
    for (let j = 0; j < 12; j++) {
      svgEl("text", {
        x: cellX(k * 12 + j, 0.5), y: rowY(k) + B + 0.19, "text-anchor": "middle",
        "font-size": 0.2, fill: LIGHT,
      }, svg).textContent = MONTHS[j];
    }
  }

  // --- Positions ------------------------------------------------------------------------
  // Where each position's band starts and ends within its first and last month. Two
  // positions that overlap by exactly one month split it in half; then every position is
  // trimmed by GAP at both ends so neighbours are separated by a sliver of gray. Longer
  // overlaps are left alone (the later one is simply drawn on top).
  const span = positions.map(p => ({
    m0: monthIndex(p.start, firstYear), m1: monthIndex(p.end, firstYear), f0: 0, f1: 1,
  }));
  for (const a of span) for (const b of span) {
    if (a !== b && a.m1 === b.m0 && a.m0 < b.m0) { a.f1 = 0.5; b.f0 = 0.5; }
  }
  for (const s of span) {
    if (s.m1 > s.m0 || s.f1 - s.f0 > 3 * GAP) { s.f0 += GAP; s.f1 -= GAP; }
  }

  positions.forEach((p, i) => {
    const color = p.color ?? PALETTE[i % PALETTE.length];
    const {m0, m1, f0, f1} = span[i];
    const seg = svgEl("path", {
      d: bandOutline(m0, m1, f0, f1), fill: color, stroke: color,
      "aria-label": `${p.title}, ${p.at}`,
    }, svg);
    seg.classList.add("cv-seg");
    seg.addEventListener("mousemove", popupAtPointer([[p.title, "font-weight:600;"], [p.at, "color:#ddd;"]]));
    seg.addEventListener("mouseleave", hidePopup);
  });

  // --- Group brackets on the right ----------------------------------------------------------
  // One bracket per group spanning its first to last position (in months, using the
  // trimmed ends). Groups whose spans overlap go in separate columns. When a group ends in
  // the same row another begins, the brackets stop short of that row's centre on each side.
  const extents = new Map();
  positions.forEach((p, i) => {
    if (!p.group) return;
    const s = span[i], g = extents.get(p.group) ?? {id: p.group, start: Infinity, end: -Infinity};
    g.start = Math.min(g.start, s.m0 + s.f0);
    g.end = Math.max(g.end, s.m1 + s.f1);
    extents.set(p.group, g);
  });
  const brackets = [...extents.values()].sort((a, b) => a.start - b.start);
  const colEnd = [];
  for (const g of brackets) {
    g.startRow = rowOf(Math.floor(g.start));
    g.endRow = rowOf(Math.min(nMonths - 1, Math.floor(g.end)));
    let c = colEnd.findIndex(e => e < g.start);
    if (c < 0) { c = colEnd.length; colEnd.push(0); }
    colEnd[c] = g.end;
    g.col = c;
  }
  for (const g of brackets) {
    const before = brackets.some(o => o !== g && o.endRow === g.startRow && o.end <= g.start);
    const after = brackets.some(o => o !== g && o.startRow === g.endRow && o.start >= g.end);
    const y0 = rowY(g.startRow) + (before ? -0.08 : B);   // bottom end (earlier)
    const y1 = rowY(g.endRow) - (after ? -0.08 : B);      // top end (later)
    const x = LM + 12 + RM + 0.15 + g.col * 1.05, tick = 0.15;
    svgEl("path", {
      d: `M${x - tick},${y0}L${x},${y0}L${x},${y1}L${x - tick},${y1}`,
      fill: "none", stroke: INK, "stroke-width": 0.04,
    }, svg);
    const tx = x + 0.3, ty = (y0 + y1) / 2;
    svgEl("text", {
      x: tx, y: ty, transform: `rotate(-90 ${tx} ${ty})`, "text-anchor": "middle",
      "dominant-baseline": "central", "font-size": 0.36, fill: INK,
    }, svg).textContent = groups[g.id] ?? g.id;
  }

  // --- Markers for papers and talks ---------------------------------------------------------
  // Markers sit just above the band. Entries that share a month are spread evenly across
  // that month's cell so they do not sit on top of each other.
  const markerLayer = svgEl("g", {}, svg);
  const byMonth = new Map();
  for (const kind of KINDS) {
    for (const it of items[kind.id] ?? []) {
      const m = monthIndex(it.date, firstYear);
      if (m < 0 || m >= nMonths) continue;
      if (!byMonth.has(m)) byMonth.set(m, []);
      byMonth.get(m).push({kind, it});
    }
  }

  const markerGroups = new Map(KINDS.map(k => [k.id, []]));
  for (const [m, list] of byMonth) {
    list.forEach(({kind, it}, i) => {
      const cx = cellX(m, (i + 0.5) / list.length), cy = rowY(rowOf(m)) - B - 0.04 - MARKER_R;
      const link = kind.page && it.key
        ? svgEl("a", {href: kind.page + it.key, style: "cursor:pointer;"}, markerLayer)
        : svgEl("g", {}, markerLayer);
      link.classList.add("cv-marker", `cv-marker-${kind.id}`);
      marker(link, kind, cx, cy, MARKER_R);
      const lines = [
        [`${kind.one}, ${monthLabel(it.date)}`, "color:#bbb;font-size:0.85em;"],
        [it.title, "font-weight:600;"],
        [(it.authors ?? []).join(", "), "color:#ddd;font-size:0.92em;"],
        [it.venue, "color:#ddd;"],
      ];
      link.addEventListener("mouseenter", () => popupAt(link, lines));
      link.addEventListener("focus", () => popupAt(link, lines));
      link.addEventListener("mouseleave", hidePopup);
      link.addEventListener("blur", hidePopup);
      markerGroups.get(kind.id).push(link);
    });
  }

  // --- Legend (with toggles) under the figure ---------------------------------------------------
  for (const kind of KINDS) {
    const label = htmlEl("label", "display:flex;align-items:center;gap:0.35em;cursor:pointer;", legend);
    const box = htmlEl("input", "margin:0;", label);
    box.type = "checkbox";
    box.checked = true;
    box.dataset.kind = kind.id;
    const w = kind.flag ? 3.4 : 2.4;
    const icon = svgEl("svg", {viewBox: `-1.2 -1.2 ${w} 2.4`, width: `${w / 2.4 * 0.9}em`, height: "0.9em", style: "overflow:visible;"}, label);
    marker(icon, kind, 0, 0, 0.75);
    label.append(`${kind.label} (${markerGroups.get(kind.id).length})`);
    // The site's CSS hides checkboxes (it uses one for the mobile menu), so the label's
    // opacity shows the state instead.
    const apply = () => {
      for (const el of markerGroups.get(kind.id)) el.style.display = box.checked ? "" : "none";
      label.style.opacity = box.checked ? "1" : "0.4";
    };
    box.addEventListener("change", apply);
    apply();
  }

  return root;
}

// Auto-mount: if the page has a #cv-timeline container, render into it, replacing whatever
// fallback it holds (the static SVG). The data files sit next to this module: jobs.json has
// the positions and groups, items.json the papers and talks (split here by first authorship).
const host = document.getElementById("cv-timeline");
if (host) {
  const load = f => fetch(new URL(f, import.meta.url)).then(r => r.json());
  Promise.all([load("jobs.json"), load("items.json").catch(() => ({}))])
    .then(([data, {papers = [], talks = []}]) => host.replaceChildren(createTimeline({
      ...data,
      items: {papersFirst: papers.filter(p => p.first), papersOther: papers.filter(p => !p.first), talks},
    })))
    .catch(err => console.error("cv-timeline: could not render, keeping fallback", err));
}
