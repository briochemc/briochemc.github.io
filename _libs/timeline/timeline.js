// Interactive CV timeline: a "snake" band of months, one row per year, that turns around
// at the end of each row so consecutive months stay contiguous. Positions are coloured
// bands along the snake, each ending in a point and starting with a notch, so they read as
// arrows pointing forward in time; hovering one shows its name. Papers and talks sit as
// markers just above the band (toggles in the legend below the figure); hovering a marker
// shows a popup. Clicking (or tapping) a position or a marker pins its popup until the next
// click anywhere, so the details can also be read on a touch screen.
//
// Proof of concept. Plain ES module, no dependencies, so it can be imported from this site
// (Franklin copies `_libs/` to `/libs/`) or from anywhere else. `createTimeline` returns a
// DOM node; the auto-mount at the bottom replaces the static SVG fallback on the page.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const PITCH = 0.62;            // vertical distance between year rows, in cells (a month is 1 wide)
const BAND = 0.224;            // band width, in cells
const DARK = "#333";           // markers, and the popup background
const GAP = 0.09;              // trimmed off each end of a position so neighbours stay separated
const TIP = BAND * Math.sqrt(3) / 4;  // length of the point / notch at a band's ends
const LIGHT = "#e4e4e4";       // unfilled band
const LABEL = "#c4c4c4";       // year labels, and the month names inside the band
const SHOW_MONTHS = false;     // month names centred inside the band on every row
const MARKER_R = 0.075;        // marker radius, in cells
const ME = "rgb(214, 81, 8)";  // the colour of my name on the publications page (names.jl)
const ME_NAME = "Pasquier";    // last name to paint with ME in the author lists

// Position colours follow Crameri's managua colormap (as in ColorSchemes.jl) from the
// first study to the latest academic job: education takes the first half (yellow to dark
// purple, sampled evenly from 0 to 0.45), academic jobs the second half (dark purple to
// cyan, sampled evenly from 0.55 to 1), each in chronological order. The centre is skipped
// on both sides so the last study and the first job do not share the same dark purple.
// Private-sector jobs are black.
const COLORS = {
  education: ["#FFCF67", "#DC9955", "#B96B46", "#91443B", "#652A3D"],
  academic: ["#4F305B", "#4C4B87", "#556EAD", "#6292C9", "#71BAE4", "#81E7FF"],
  private: ["#000"],
};

// Marker kinds: which list in `items`, the legend label, the word for one of them in the
// popup, the shape, and whether it is flagged (painted in ME instead of black).
const KINDS = [
  {id: "papersOther", label: "Papers", one: "Paper", shape: "star"},
  {id: "papersFirst", label: "First-author papers", one: "Paper", shape: "star", flag: true},
  {id: "talks", label: "Talks/Posters", one: "Talk/Poster", shape: "circle"},
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
      const R = r * 1.5, ri = R * 0.45;
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

// A marker (filled shape, black or ME for flagged kinds) centred on (cx, cy), appended to
// `parent`. Used for the figure and the legend.
function marker(parent, kind, cx, cy, r) {
  svgEl("path", {d: shapePath(kind.shape, cx, cy, r), fill: kind.flag ? ME : DARK}, parent);
}

// Black or white, whichever reads better on a fill given as #rgb, #rrggbb or rgb(r, g, b).
function contrast(fill) {
  let r, g, b;
  const m = fill.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (m) [r, g, b] = m.slice(1).map(Number);
  else {
    const h = fill.length === 4 ? [...fill.slice(1)].map(c => c + c).join("") : fill.slice(1);
    [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
  }
  const lin = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b) > 0.3 ? "#000" : "#fff";
}

export function createTimeline({firstYear, lastYear, positions, groups = {}, items = {}}) {
  const nYears = lastYear - firstYear + 1;
  const nMonths = nYears * 12;
  const B = BAND / 2;

  // Geometry, in cells: rows have pitch PITCH, turns have radius PITCH / 2. The left
  // margin holds the year labels and the right margin clears the turns; the same blank
  // EDGE on both sides keeps years + snake centred. The top holds the title and the name.
  const EDGE = 0.9;
  const LM = EDGE + 1.7;
  const RM = PITCH / 2 + TIP + 0.1;
  const TOP = 1.1;
  const BOTTOM = 0.2;
  const vbWidth = LM + 12 + RM + EDGE;
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
    ".cv-timeline .cv-seg{stroke-width:0;outline:none;cursor:pointer;transition:stroke-width .15s}" +
    `.cv-timeline .cv-seg:hover,.cv-timeline .cv-seg.cv-pinned{stroke-width:${BAND * 0.25}}` +
    ".cv-timeline .cv-marker{outline:none;cursor:pointer}" +
    ".cv-timeline .cv-marker:hover path,.cv-timeline .cv-marker:focus path," +
    ".cv-timeline .cv-marker.cv-pinned path{fill:#000}");

  const svg = svgEl("svg", {
    viewBox: `0 0 ${vbWidth} ${vbHeight}`,
    width: "100%",
    style: "display:block;height:auto;overflow:visible;",
    role: "img",
    "aria-label": "Timeline of positions and studies, one row per year",
  }, root);

  const legend = htmlEl("div",
    "display:flex;justify-content:center;gap:1.2em;flex-wrap:wrap;font-size:0.85em;color:#555;margin:0.6em 0 0;", root);

  const popup = htmlEl("div",
    `display:none;position:absolute;max-width:24em;padding:0.4em 0.6em;background:${DARK};color:#fff;` +
    "border-radius:4px;font-size:0.8em;line-height:1.3;pointer-events:none;z-index:2;" +
    "box-shadow:0 2px 8px rgba(0,0,0,.25);", root);

  // The popup follows the pointer until a click pins it to the clicked element: while one
  // is pinned, hovering changes nothing. Clicking the same element again, or anywhere
  // else, unpins it. On a touch screen a tap is a hover followed by a click, so tapping
  // pins and tapping elsewhere clears.
  let pinned = null;
  // Popup with the given lines (text, or a ready-made element), horizontally centred on x
  // and sitting below y (root px).
  function showPopup(lines, x, y, force = false) {
    if (pinned && !force) return;
    popup.replaceChildren();
    for (const [content, style] of lines) {
      if (!content) continue;
      if (content instanceof Node) { content.style.cssText = style; popup.appendChild(content); }
      else htmlEl("div", style, popup, content);
    }
    popup.style.display = "block";
    const rw = root.getBoundingClientRect().width;
    popup.style.left = `${Math.max(0, Math.min(rw - popup.offsetWidth, x - popup.offsetWidth / 2))}px`;
    popup.style.top = `${y + 8}px`;
  }
  const hidePopup = () => { if (!pinned) popup.style.display = "none"; };
  function unpin() {
    if (!pinned) return;
    pinned.classList.remove("cv-pinned");
    pinned = null;
    popup.style.display = "none";
  }
  // Pins the popup to `el`, drawn by `show(force)`; a second click on `el` unpins instead.
  function togglePin(el, show) {
    const again = pinned === el;
    unpin();
    if (again) return;
    pinned = el;
    el.classList.add("cv-pinned");
    show(true);
  }
  document.addEventListener("click", unpin);
  // Popup anchored under an element's box.
  function popupAt(el, lines, force) {
    const rr = root.getBoundingClientRect(), er = el.getBoundingClientRect();
    showPopup(lines, er.left + er.width / 2 - rr.left, er.bottom - rr.top, force);
  }
  // Popup following the pointer (for bands, which can span several rows).
  const popupAtPointer = lines => (e, force) => {
    const rr = root.getBoundingClientRect();
    showPopup(lines, e.clientX - rr.left, e.clientY - rr.top + 12, force);
  };

  // --- Static drawing -------------------------------------------------------------------
  svgEl("text", {
    x: vbWidth / 2, y: 0.45, "text-anchor": "middle", "dominant-baseline": "central",
    "font-size": 0.55, "font-weight": "700", fill: DARK,
  }, svg).textContent = "Interactive timeline CV";
  svgEl("text", {
    x: vbWidth / 2, y: 0.92, "text-anchor": "middle", "font-size": 0.2, fill: LABEL,
  }, svg).textContent = "Benoît Pasquier";

  const band = svgEl("path", {d: bandOutline(0, nMonths - 1), fill: LIGHT}, svg);

  const yearText = [];
  for (let k = 0; k < nYears; k++) {
    yearText.push(svgEl("text", {
      x: LM - 1.0, y: rowY(k), "text-anchor": "end", "dominant-baseline": "central",
      "font-size": 0.304, fill: LABEL,
    }, svg));
    yearText[k].textContent = String(firstYear + k);
  }
  // Month names centred inside the band on every row, following each row's direction.
  // Drawn in their own layer so they sit above the coloured positions. Hidden unless
  // SHOW_MONTHS (they are hard to read on the light bands), except that the month under
  // the pointer is shown while hovering the band.
  const monthLayer = svgEl("g", {style: "pointer-events:none;"});
  const monthText = [];
  for (let k = 0; k < nYears; k++) {
    monthText.push([]);
    for (let j = 0; j < 12; j++) {
      const t = svgEl("text", {
        x: cellX(k * 12 + j, 0.5), y: rowY(k), "text-anchor": "middle",
        "dominant-baseline": "central", "font-size": 0.19, fill: LABEL,
        ...(SHOW_MONTHS ? {} : {display: "none"}),
      }, monthLayer);
      t.textContent = MONTHS[j];
      monthText[k].push(t);
    }
  }

  // --- Hover highlight of the year and month under the pointer ----------------------------
  const jobLabels = [];   // {t, m0, m1}: label element and the months it covers, filled below
  let lit = null;
  function clearHighlight() {
    if (!lit) return;
    yearText[lit.k].setAttribute("fill", LABEL);
    const t = monthText[lit.k][lit.j];
    t.setAttribute("fill", LABEL);
    if (!SHOW_MONTHS) t.setAttribute("display", "none");
    for (const l of jobLabels) l.t.style.opacity = "1";
    lit = null;
  }
  // Paints the year of the row under the pointer black and shows that month's name in
  // black or white, whichever reads on `fill`, the colour of the band under the pointer.
  function highlightAt(e, fill) {
    const sr = svg.getBoundingClientRect(), s = sr.width / vbWidth;
    const x = (e.clientX - sr.left) / s, y = (e.clientY - sr.top) / s;
    const k = Math.max(0, Math.min(nYears - 1, nYears - 1 - Math.floor((y - TOP) / PITCH)));
    const jx = Math.max(0, Math.min(11, Math.floor(x - LM)));
    const j = leftToRight(k) ? jx : 11 - jx;
    if (lit && (lit.k !== k || lit.j !== j)) clearHighlight();
    lit = {k, j};
    yearText[k].setAttribute("fill", "#000");
    const t = monthText[k][j];
    t.setAttribute("fill", contrast(fill));
    t.removeAttribute("display");
    // A job label sitting on the shown month fades out so the two do not clash.
    const m = k * 12 + j;
    for (const l of jobLabels) l.t.style.opacity = m >= l.m0 && m <= l.m1 ? "0" : "1";
  }
  band.addEventListener("mousemove", e => highlightAt(e, LIGHT));
  band.addEventListener("mouseleave", clearHighlight);

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

  // Colour: the n-th position of a group gets the group's n-th colour (positions are
  // listed chronologically), cycling if a group has more positions than colours.
  const seen = {}, colors = [];
  positions.forEach((p, i) => {
    const list = COLORS[p.group] ?? COLORS.private;
    seen[p.group] = (seen[p.group] ?? 0) + 1;
    const color = p.color ?? list[(seen[p.group] - 1) % list.length];
    colors.push(color);
    const {m0, m1, f0, f1} = span[i];
    const seg = svgEl("path", {
      d: bandOutline(m0, m1, f0, f1), fill: color, stroke: color,
      "aria-label": `${p.title}, ${p.at}`,
    }, svg);
    seg.classList.add("cv-seg");
    const showJob = popupAtPointer([[p.title, "font-weight:600;"], [p.at, "color:#ddd;"]]);
    seg.addEventListener("mousemove", e => { showJob(e); highlightAt(e, color); });
    seg.addEventListener("mouseleave", () => { hidePopup(); clearHighlight(); });
    seg.addEventListener("click", e => { e.stopPropagation(); togglePin(seg, force => showJob(e, force)); });
  });

  // Short job labels ("PhD", "Postdoc", ...) inside the band at the start of each position,
  // reading forward in time, in the month font, in black or white to suit the band.
  const LABEL_SIZE = 0.19, LABEL_INSET = TIP + 0.1;
  positions.forEach((p, i) => {
    if (!p.label) return;
    const {m0, f0} = span[i], k = rowOf(m0);
    const t = svgEl("text", {
      x: cellX(m0, f0 + LABEL_INSET), y: rowY(k), "text-anchor": leftToRight(k) ? "start" : "end",
      "dominant-baseline": "central", "font-size": LABEL_SIZE, fill: contrast(colors[i]),
      style: "transition:opacity .15s;",
    }, monthLayer);
    t.textContent = p.label;
    // Months the label covers, from an estimate of its width (the SVG is not laid out yet).
    const width = p.label.length * LABEL_SIZE * 0.6;
    jobLabels.push({t, m0, m1: Math.min(m0 + Math.ceil(f0 + LABEL_INSET + width) - 1, nMonths - 1)});
  });
  svg.appendChild(monthLayer);

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
      const link = svgEl("g", {tabindex: "0", role: "button"}, markerLayer);
      link.classList.add("cv-marker", `cv-marker-${kind.id}`);
      marker(link, kind, cx, cy, MARKER_R);
      // Author list: last names only (the last word of each name), mine in ME.
      const authors = htmlEl("div");
      (it.authors ?? []).forEach((a, n) => {
        const last = a.trim().split(/\s+/).pop();
        if (n) authors.append(", ");
        htmlEl("span", last === ME_NAME ? `color:${ME};` : "", authors, last);
      });
      // Last line: "Journal (2016)" for papers, "Meeting, Talk/Poster (Feb 2016)" for talks.
      const tail = kind.id === "talks"
        ? [it.venue, `${kind.one} (${monthLabel(it.date)})`].filter(Boolean).join(", ")
        : `${it.venue ? it.venue + " " : ""}(${it.date.slice(0, 4)})`;
      const lines = [
        [it.title, "font-weight:600;"],
        [authors.childNodes.length ? authors : "", "color:#ddd;font-size:0.92em;"],
        [tail, "color:#ddd;"],
      ];
      link.addEventListener("mouseenter", () => popupAt(link, lines));
      link.addEventListener("focus", () => popupAt(link, lines));
      link.addEventListener("mouseleave", hidePopup);
      link.addEventListener("blur", hidePopup);
      const pin = e => { e.stopPropagation(); togglePin(link, force => popupAt(link, lines, force)); };
      link.addEventListener("click", pin);
      link.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pin(e); } });
      markerGroups.get(kind.id).push(link);
    });
  }

  // --- Legend (with toggles) under the figure ---------------------------------------------------
  // Legend icons are drawn in the figure's own units and sized in pixels from the figure's
  // current scale, so they match the markers exactly at any width.
  const icons = [];
  for (const kind of KINDS) {
    const label = htmlEl("label", "display:flex;align-items:center;gap:0.35em;cursor:pointer;", legend);
    const box = htmlEl("input", "margin:0;", label);
    box.type = "checkbox";
    box.checked = true;
    box.dataset.kind = kind.id;
    const a = MARKER_R * 1.7, w = 2 * a, h = 2 * a;
    const icon = svgEl("svg", {viewBox: `${-a} ${-a} ${w} ${h}`, style: "overflow:visible;display:block;"}, label);
    marker(icon, kind, 0, 0, MARKER_R);
    icons.push({icon, w, h});
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
  const sizeIcons = () => {
    const s = svg.getBoundingClientRect().width / vbWidth;
    for (const {icon, w, h} of icons) {
      icon.setAttribute("width", w * s);
      icon.setAttribute("height", h * s);
    }
  };
  new ResizeObserver(sizeIcons).observe(root);
  sizeIcons();

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
