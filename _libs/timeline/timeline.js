// Interactive CV timeline: a "snake" band of months, one row per year, that turns around
// at the end of each row so consecutive months stay contiguous. Positions are coloured
// segments along the band; hovering one shows its name. Papers, talks and diplomas can be
// shown as markers on the band (toggles above the figure): hovering a marker shows a popup,
// clicking a paper or talk goes to that entry on the publications or talks page.
//
// Proof of concept. Plain ES module, no dependencies, so it can be imported from this site
// (Franklin copies `_libs/` to `/libs/`) or from anywhere else. `createTimeline` returns a
// DOM node; the auto-mount at the bottom replaces the static SVG fallback on the page.

const MONTH_LETTERS = "JFMAMJJASOND";
const PITCH = 0.7;             // vertical distance between year rows, in cells (a month is 1 wide)
const BAND = 0.28;             // band width, in cells
const GAP = 0.12;              // trimmed off each end of a position so neighbours stay separated
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

// Marker kinds: which list in `items`, the toggle label, the word for one of them in the
// popup, the page each entry lives on (entries carry a `key` that is the anchor on that
// page; no page means the marker is not a link), and the shape.
const KINDS = [
  {id: "papers", label: "Papers", one: "Paper", page: "/publications/#", shape: "star"},
  {id: "talks", label: "Talks/Posters", one: "Talk/Poster", page: "/talks/#", shape: "square"},
  {id: "diplomas", label: "Diplomas", one: "Diploma", page: null, shape: "circle"},
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

export function createTimeline({firstYear, lastYear, positions, internships = [], items = {}}) {
  const nYears = lastYear - firstYear + 1;
  const nMonths = nYears * 12;

  // Geometry, in cells: rows have pitch PITCH, turns have radius PITCH / 2, the left margin
  // holds the year labels and the right margin just clears the turns.
  const LM = 2.8;
  const RM = PITCH / 2 + MARKER_R + 0.1;
  const TOP = 0.8;
  const vbWidth = 12 + LM + RM;
  const vbHeight = nYears * PITCH + TOP + MARKER_R;

  // Row k holds year firstYear + k, counted from the bottom; even rows run left to right.
  const rowOf = m => Math.floor(m / 12);
  const rowY = k => TOP + (nYears - 1 - k) * PITCH + PITCH / 2;
  const leftToRight = k => k % 2 === 0;
  // x at fraction f in [0, 1] through month m, in the travel direction.
  const cellX = (m, f) => {
    const j = m % 12;
    return LM + (leftToRight(rowOf(m)) ? j + f : 12 - j - f);
  };

  // SVG path along the band's centreline from fraction f0 through month m0 to fraction f1
  // through month m1 (defaults: the whole of both months).
  function bandPath(m0, m1, f0 = 0, f1 = 1) {
    const r0 = rowOf(m0), r1 = rowOf(m1), r = PITCH / 2;
    let d = `M${cellX(m0, f0)},${rowY(r0)}`;
    for (let k = r0; k <= r1; k++) {
      const xEnd = k === r1 ? cellX(m1, f1) : cellX(k * 12 + 11, 1);
      d += `L${xEnd},${rowY(k)}`;
      if (k < r1) {
        // Half-turn up into the next row. Rightward turns are anticlockwise on screen.
        const sweep = leftToRight(k) ? 0 : 1;
        d += `A${r},${r} 0 0 ${sweep} ${xEnd},${rowY(k + 1)}`;
      }
    }
    return d;
  }

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

  // --- DOM skeleton -------------------------------------------------------------------
  const root = htmlEl("div", "position:relative;width:100%;font-family:inherit;");
  root.className = "cv-timeline";
  // Hover feedback. No native focus rings: Chrome draws them on SVG shapes in user units,
  // which the viewBox scales into huge blobs.
  htmlEl("style", "", root,
    `.cv-timeline .cv-seg{stroke-width:${BAND};outline:none;transition:stroke-width .15s}` +
    `.cv-timeline .cv-seg:hover{stroke-width:${BAND * 1.25}}` +
    ".cv-timeline .cv-marker{outline:none}" +
    ".cv-timeline .cv-marker:hover path,.cv-timeline .cv-marker:focus path{stroke-width:0.1}");

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

  // --- Static drawing -------------------------------------------------------------------
  svgEl("path", {
    d: bandPath(0, nMonths - 1),
    fill: "none", stroke: LIGHT, "stroke-width": BAND,
  }, svg);

  for (let k = 0; k < nYears; k++) {
    svgEl("text", {
      x: LM - 1.0, y: rowY(k), "text-anchor": "end", "dominant-baseline": "central",
      "font-size": 0.38, fill: LIGHT,
    }, svg).textContent = String(firstYear + k);
  }
  const topRow = nYears - 1;
  for (let j = 0; j < 12; j++) {
    svgEl("text", {
      x: cellX(topRow * 12 + j, 0.5), y: TOP - 0.35, "text-anchor": "middle",
      "font-size": 0.34, fill: LIGHT,
    }, svg).textContent = MONTH_LETTERS[j];
  }

  for (const it of internships) {
    const p = svgEl("path", {
      d: bandPath(monthIndex(it.start, firstYear), monthIndex(it.end, firstYear)),
      fill: "none", stroke: "#bbb", "stroke-width": BAND * 0.35,
    }, svg);
    p.addEventListener("mousemove", e => {
      const rr = root.getBoundingClientRect();
      showPopup([[it.title, "font-weight:600;"], [it.at, "color:#ddd;"]], e.clientX - rr.left, e.clientY - rr.top - 12);
    });
    p.addEventListener("mouseleave", hidePopup);
  }

  // --- Positions: hover shows the name -----------------------------------------------------
  positions.forEach((p, i) => {
    const color = p.color ?? PALETTE[i % PALETTE.length];
    const {m0, m1, f0, f1} = span[i];
    const seg = svgEl("path", {
      d: bandPath(m0, m1, f0, f1),
      fill: "none", stroke: color,
      "aria-label": `${p.title}, ${p.at}`,
    }, svg);
    seg.classList.add("cv-seg");
    // A segment can span several rows, so the popup follows the pointer rather than the box.
    seg.addEventListener("mousemove", e => {
      const rr = root.getBoundingClientRect();
      showPopup([[p.title, "font-weight:600;"], [p.at, "color:#ddd;"]], e.clientX - rr.left, e.clientY - rr.top - 12);
    });
    seg.addEventListener("mouseleave", hidePopup);
  });

  // --- Markers for papers, talks and diplomas ---------------------------------------------
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

  const markerGroups = new Map(KINDS.map(k => [k.id, []]));
  for (const [m, list] of byMonth) {
    list.forEach(({kind, it}, i) => {
      const cx = cellX(m, (i + 0.5) / list.length), cy = rowY(rowOf(m));
      const link = kind.page && it.key
        ? svgEl("a", {href: kind.page + it.key, style: "cursor:pointer;"}, markerLayer)
        : svgEl("g", {}, markerLayer);
      link.classList.add("cv-marker", `cv-marker-${kind.id}`);
      svgEl("path", {
        d: shapePath(kind.shape, cx, cy, MARKER_R),
        fill: "#fff", stroke: "#222", "stroke-width": 0.05, "stroke-linejoin": "round",
      }, link);
      const lines = [
        [`${kind.one}, ${monthLabel(it.date)}`, "color:#bbb;font-size:0.85em;"],
        [it.title, "font-weight:600;"],
        [it.venue, "color:#ddd;"],
      ];
      link.addEventListener("mouseenter", () => popupAt(link, lines));
      link.addEventListener("focus", () => popupAt(link, lines));
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
    const icon = svgEl("svg", {viewBox: "-1.2 -1.2 2.4 2.4", width: "0.9em", height: "0.9em", style: "overflow:visible;"}, label);
    svgEl("path", {d: shapePath(kind.shape, 0, 0, 0.85), fill: "#fff", stroke: "#222", "stroke-width": 0.16, "stroke-linejoin": "round"}, icon);
    label.append(`${kind.label} (${markerGroups.get(kind.id).length})`);
    const apply = () => {
      for (const el of markerGroups.get(kind.id)) el.style.display = box.checked ? "" : "none";
    };
    box.addEventListener("change", apply);
    apply();
  }

  return root;
}

// Auto-mount: if the page has a #cv-timeline container, render into it, replacing whatever
// fallback it holds (the static SVG). The data files sit next to this module: jobs.json has
// the positions and diplomas, items.json the papers and talks.
const host = document.getElementById("cv-timeline");
if (host) {
  const load = f => fetch(new URL(f, import.meta.url)).then(r => r.json());
  Promise.all([load("jobs.json"), load("items.json").catch(() => ({}))])
    .then(([data, items]) => host.replaceChildren(createTimeline({...data, items: {...items, diplomas: data.diplomas}})))
    .catch(err => console.error("cv-timeline: could not render, keeping fallback", err));
}
