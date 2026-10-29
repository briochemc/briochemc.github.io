// Interactive CV timeline: a "snake" band of months, one row per year, that turns around
// at the end of each row so consecutive months stay contiguous. Positions are coloured
// segments along the band; clicking one opens a detail panel under the figure. Papers and
// talks can be shown as markers on the band (toggles above the figure): hovering a marker
// shows a popup, clicking it goes to that entry on the publications or talks page.
//
// Proof of concept. Plain ES module, no dependencies, so it can be imported from this site
// (Franklin copies `_libs/` to `/libs/`) or from anywhere else. `createTimeline` returns a
// DOM node; the auto-mount at the bottom replaces the static SVG fallback on the page.

const MONTH_LETTERS = "JFMAMJJASOND";
const BAND = 0.36;             // band width, in cells (a cell is one month, 1 x 1)
const LIGHT = "#e4e4e4";       // unfilled band, and the year/month labels
const MARKER_R = BAND * 0.65;  // marker radius: a little wider than the band

// Same colours as timeline.jl: seaborn's icefire gradient sampled at 16 points and picked
// by hand there, in the order the positions are listed in jobs.json (sorted by start date).
// The last one is the purple added for the Lecturer position.
const PALETTE = [
  "#5AA7CD", "#8DC6D0", "#5AA7CD", "#3885D0", "#EB753A", "#465EBE",
  "#D34936", "#444282", "#AB3043", "#782C3F", "#4A252E", "#212026",
  "#8E59BF",
];

// Marker kinds: which list in items.json, the label on the toggle, the page each entry
// lives on (entries carry a `key` that is the anchor id on that page), and the shape.
const KINDS = [
  {id: "papers", label: "Papers", page: "/publications/#", shape: "circle"},
  {id: "talks", label: "Talks and posters", page: "/talks/#", shape: "diamond"},
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

export function createTimeline({firstYear, lastYear, positions, internships = [], items = {}}) {
  const nYears = lastYear - firstYear + 1;
  const nMonths = nYears * 12;

  // Geometry, in cells: rows have pitch 1, turns have radius 0.5, the left margin holds
  // the year labels and the right margin just clears the turns.
  const LM = 2.5;
  const RM = 0.5 + MARKER_R + 0.1;
  const TOP = 1.0;
  const vbWidth = 12 + LM + RM;
  const vbHeight = nYears + TOP + MARKER_R;

  // Row k holds year firstYear + k, counted from the bottom; even rows run left to right.
  const rowOf = m => Math.floor(m / 12);
  const rowY = k => TOP + (nYears - 1 - k) + 0.5;
  const leftToRight = k => k % 2 === 0;
  // x at fraction f in [0, 1] through month m, in the travel direction.
  const cellX = (m, f) => {
    const j = m % 12;
    return LM + (leftToRight(rowOf(m)) ? j + f : 12 - j - f);
  };

  // SVG path along the band's centreline from the start of month m0 to the end of m1.
  function bandPath(m0, m1) {
    const r0 = rowOf(m0), r1 = rowOf(m1);
    let d = `M${cellX(m0, 0)},${rowY(r0)}`;
    for (let k = r0; k <= r1; k++) {
      const xEnd = k === r1 ? cellX(m1, 1) : cellX(k * 12 + 11, 1);
      d += `L${xEnd},${rowY(k)}`;
      if (k < r1) {
        // Half-turn up into the next row. Rightward turns are anticlockwise on screen.
        const sweep = leftToRight(k) ? 0 : 1;
        d += `A0.5,0.5 0 0 ${sweep} ${xEnd},${rowY(k + 1)}`;
      }
    }
    return d;
  }

  // --- DOM skeleton -------------------------------------------------------------------
  const root = htmlEl("div", "position:relative;width:100%;font-family:inherit;");
  root.className = "cv-timeline";
  // Markers: no native focus ring (see the note on segments), a bolder stroke instead.
  htmlEl("style", "", root,
    ".cv-timeline .cv-marker{outline:none}" +
    ".cv-timeline .cv-marker:hover circle,.cv-timeline .cv-marker:hover path," +
    ".cv-timeline .cv-marker:focus circle,.cv-timeline .cv-marker:focus path{stroke-width:0.1}");

  const toggles = htmlEl("div",
    "display:flex;gap:1.2em;flex-wrap:wrap;font-size:0.85em;color:#555;margin:0 0 0.4em;", root);

  const svg = svgEl("svg", {
    viewBox: `0 0 ${vbWidth} ${vbHeight}`,
    width: "100%",
    style: "display:block;height:auto;overflow:visible;",
    role: "img",
    "aria-label": "Timeline of positions and studies, one row per year",
  }, root);

  const popup = htmlEl("div",
    "display:none;position:absolute;max-width:22em;padding:0.4em 0.6em;background:#222;color:#fff;" +
    "border-radius:4px;font-size:0.8em;line-height:1.3;pointer-events:none;z-index:2;" +
    "box-shadow:0 2px 8px rgba(0,0,0,.25);", root);

  const panel = htmlEl("div",
    "display:none;margin:0.6rem 0 0;padding:0.6rem 0.9rem;border-left:3px solid #ccc;" +
    "background:#f7f7f7;border-radius:4px;font-size:0.9em;line-height:1.35;", root);
  panel.className = "cv-timeline-detail";

  // --- Static drawing -------------------------------------------------------------------
  svgEl("path", {
    d: bandPath(0, nMonths - 1),
    fill: "none", stroke: LIGHT, "stroke-width": BAND,
  }, svg);

  for (let k = 0; k < nYears; k++) {
    svgEl("text", {
      x: LM - 0.7, y: rowY(k), "text-anchor": "end", "dominant-baseline": "central",
      "font-size": 0.45, fill: LIGHT,
    }, svg).textContent = String(firstYear + k);
  }
  const topRow = nYears - 1;
  for (let j = 0; j < 12; j++) {
    svgEl("text", {
      x: cellX(topRow * 12 + j, 0.5), y: TOP - 0.35, "text-anchor": "middle",
      "font-size": 0.4, fill: LIGHT,
    }, svg).textContent = MONTH_LETTERS[j];
  }

  for (const it of internships) {
    const p = svgEl("path", {
      d: bandPath(monthIndex(it.start, firstYear), monthIndex(it.end, firstYear)),
      fill: "none", stroke: "#bbb", "stroke-width": BAND * 0.35,
    }, svg);
    svgEl("title", {}, p).textContent =
      `${it.title}, ${it.at} (${monthLabel(it.start)} – ${monthLabel(it.end)})`;
  }

  // --- Positions and their detail panel ---------------------------------------------------
  let selected = null;

  function showDetail(p, color) {
    const m0 = monthIndex(p.start, firstYear), m1 = monthIndex(p.end, firstYear);
    const months = m1 - m0 + 1;
    const dur = months >= 12
      ? `${Math.floor(months / 12)} yr${months >= 24 ? "s" : ""}${months % 12 ? ` ${months % 12} mo` : ""}`
      : `${months} mo`;
    panel.style.borderLeftColor = color;
    panel.replaceChildren();
    htmlEl("div", "font-weight:600;", panel, `${p.title} · ${p.at}`);
    htmlEl("div", "color:#666;font-size:0.92em;", panel,
      `${monthLabel(p.start)} – ${monthLabel(p.end)} · ${dur}`);
    htmlEl("div", "margin-top:0.4em;color:#444;font-size:0.92em;", panel,
      "Placeholder for more about this period (diplomas, software, links).");
    panel.style.display = "block";
  }

  function deselect() {
    if (selected) selected.setAttribute("stroke-width", BAND);
    selected = null;
    panel.style.display = "none";
  }

  const segments = positions.map((p, i) => {
    const color = p.color ?? PALETTE[i % PALETTE.length];
    const seg = svgEl("path", {
      d: bandPath(monthIndex(p.start, firstYear), monthIndex(p.end, firstYear)),
      fill: "none", stroke: color, "stroke-width": BAND,
      // outline:none because Chrome draws its focus ring on SVG shapes in user units, which
      // the viewBox scales into a huge blob; the thicker stroke marks the selection instead.
      style: "cursor:pointer;transition:stroke-width .15s;outline:none;",
      tabindex: 0, role: "button",
      "aria-label": `${p.title}, ${p.at}`,
    }, svg);
    svgEl("title", {}, seg).textContent =
      `${p.title}, ${p.at} (${monthLabel(p.start)} – ${monthLabel(p.end)})`;
    const select = () => {
      if (selected === seg) return deselect();
      deselect();
      selected = seg;
      seg.setAttribute("stroke-width", BAND * 1.3);
      showDetail(p, color);
    };
    seg.addEventListener("click", select);
    seg.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(); }
    });
    return seg;
  });

  // --- Markers for papers and talks ---------------------------------------------------------
  // All markers live in one layer above the positions. Entries that share a month are
  // spread evenly across that month's cell so they do not sit on top of each other.
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

  function showPopup(markerEl, kind, it) {
    popup.replaceChildren();
    htmlEl("div", "color:#bbb;font-size:0.85em;", popup, `${kind.label} · ${monthLabel(it.date)}`);
    htmlEl("div", "font-weight:600;", popup, it.title);
    if (it.venue) htmlEl("div", "color:#ddd;", popup, it.venue);
    popup.style.display = "block";
    const rr = root.getBoundingClientRect(), mr = markerEl.getBoundingClientRect();
    const cx = mr.left + mr.width / 2 - rr.left;
    const left = Math.max(0, Math.min(rr.width - popup.offsetWidth, cx - popup.offsetWidth / 2));
    popup.style.left = `${left}px`;
    popup.style.top = `${mr.top - rr.top - popup.offsetHeight - 8}px`;
  }
  const hidePopup = () => { popup.style.display = "none"; };

  const markerGroups = new Map(KINDS.map(k => [k.id, []]));
  for (const [m, list] of byMonth) {
    list.forEach(({kind, it}, i) => {
      const cx = cellX(m, (i + 0.5) / list.length), cy = rowY(rowOf(m));
      const link = svgEl("a", {href: kind.page + it.key, style: "cursor:pointer;"}, markerLayer);
      link.classList.add("cv-marker", `cv-marker-${kind.id}`);
      const common = {fill: "#fff", stroke: "#222", "stroke-width": 0.05};
      if (kind.shape === "circle") {
        svgEl("circle", {cx, cy, r: MARKER_R, ...common}, link);
      } else {
        const r = MARKER_R * 1.15;
        svgEl("path", {d: `M${cx},${cy - r}L${cx + r},${cy}L${cx},${cy + r}L${cx - r},${cy}Z`, ...common}, link);
      }
      svgEl("title", {}, link).textContent = `${it.title} (${monthLabel(it.date)})`;
      link.addEventListener("mouseenter", () => showPopup(link, kind, it));
      link.addEventListener("focus", () => showPopup(link, kind, it));
      link.addEventListener("mouseleave", hidePopup);
      link.addEventListener("blur", hidePopup);
      markerGroups.get(kind.id).push(link);
    });
  }

  for (const kind of KINDS) {
    const label = htmlEl("label", "display:flex;align-items:center;gap:0.35em;cursor:pointer;", toggles);
    const box = htmlEl("input", "margin:0;", label);
    box.type = "checkbox";
    box.checked = true;
    box.dataset.kind = kind.id;
    const n = markerGroups.get(kind.id).length;
    const icon = svgEl("svg", {viewBox: "-1 -1 2 2", width: "0.8em", height: "0.8em", style: "overflow:visible;"}, label);
    if (kind.shape === "circle") svgEl("circle", {r: 0.85, fill: "#fff", stroke: "#222", "stroke-width": 0.18}, icon);
    else svgEl("path", {d: "M0,-1L1,0L0,1L-1,0Z", fill: "#fff", stroke: "#222", "stroke-width": 0.18}, icon);
    label.append(`${kind.label} (${n})`);
    const apply = () => {
      for (const el of markerGroups.get(kind.id)) el.style.display = box.checked ? "" : "none";
    };
    box.addEventListener("change", apply);
    apply();
  }

  return root;
}

// Auto-mount: if the page has a #cv-timeline container, render into it, replacing whatever
// fallback it holds (the static SVG). The data files sit next to this module.
const host = document.getElementById("cv-timeline");
if (host) {
  const load = f => fetch(new URL(f, import.meta.url)).then(r => r.json());
  Promise.all([load("jobs.json"), load("items.json").catch(() => ({}))])
    .then(([data, items]) => host.replaceChildren(createTimeline({...data, items})))
    .catch(err => console.error("cv-timeline: could not render, keeping fallback", err));
}
