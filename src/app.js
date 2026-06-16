/* =============================================================================
 * app.js — Tuan River Basin Hydraulic Heritage GIS
 * Loads layered geodata, renders an interactive Leaflet map with a time axis
 * (Spring & Autumn → present), bilingual popups, a legend and a timeline panel.
 * Depends on: config.js, i18n.js, Leaflet 1.9.
 * =========================================================================== */
"use strict";

/* ----------------------------------------------------------------- state ---- */
const state = {
  lang: "zh",
  year: null, // null === "all eras"
  allEras: true,
  playing: false,
  playTimer: null,
  layerOn: {}, // layerId -> bool
};

const records = []; // { layer, props, layerId, kind, category, center:[lat,lng], search }
const adminLayers = []; // admin polygons needing tooltip refresh on lang change
let map, currentTile;

const t = () => I18N[state.lang];
const other = () => (state.lang === "zh" ? "en" : "zh");
const pick = (p, base) => p[`${base}_${state.lang}`] || p[`${base}_${other()}`] || "";
const compactYear = (y) =>
  y == null ? "" : y < 0 ? (state.lang === "zh" ? `前${-y}` : `${-y}BC`) : String(y);

/* =========================================================================== */
/* Map setup                                                                   */
/* =========================================================================== */
function initMap() {
  map = L.map("map", {
    center: MAP_CONFIG.center,
    zoom: MAP_CONFIG.zoom,
    minZoom: MAP_CONFIG.minZoom,
    maxZoom: MAP_CONFIG.maxZoom,
    zoomControl: true,
    attributionControl: true,
  });

  // Stacking panes so points sit above rivers above reservoirs above boundaries.
  [
    ["p_admin", 410],
    ["p_reservoir", 420],
    ["p_river", 430],
    ["p_canal", 440],
    ["p_point", 460],
  ].forEach(([name, z]) => {
    map.createPane(name).style.zIndex = z;
  });

  currentTile = makeTile(DEFAULT_BASEMAP).addTo(map);
  L.control.scale({ imperial: false, position: "bottomright" }).addTo(map);
  map.attributionControl.addAttribution(
    'Hydraulic dataset: <a href="https://github.com/alexmorerich/dengzhou-hydro">dengzhou-hydro</a> · boundaries: geoBoundaries (ODbL) · features: OpenStreetMap'
  );
  map.fitBounds(MAP_CONFIG.bounds);
}

function makeTile(key) {
  const b = BASEMAPS[key];
  return L.tileLayer(b.url, b.options);
}

/* =========================================================================== */
/* Data loading                                                                */
/* =========================================================================== */
async function loadAll() {
  await Promise.allSettled(LAYERS.map(loadLayer));
  document.getElementById("loading").classList.add("hidden");
  buildLayerControls();
  buildLegend();
  buildFeatureList();
  applyFilter();
}

async function loadLayer(def) {
  state.layerOn[def.id] = def.on;
  let data;
  try {
    const res = await fetch(def.file, { cache: "no-cache" });
    if (!res.ok) throw new Error(`${res.status}`);
    data = await res.json();
  } catch (e) {
    console.warn(`[layer skipped] ${def.file}: ${e.message}`);
    return;
  }
  (data.features || []).forEach((f) => addFeature(f, def));
}

function addFeature(feature, def) {
  const props = feature.properties || {};
  const geom = feature.geometry;
  if (!geom) return;
  let layer, center;

  if (def.kind === "point" || geom.type === "Point") {
    layer = L.geoJSON(feature, { pointToLayer: pointToLayer }).getLayers()[0];
    center = [geom.coordinates[1], geom.coordinates[0]];
  } else if (def.kind === "river") {
    layer = L.geoJSON(feature, { style: riverStyle }).getLayers()[0];
    center = layer.getBounds().getCenter();
    center = [center.lat, center.lng];
  } else if (def.kind === "canal") {
    layer = L.geoJSON(feature, { style: canalStyle }).getLayers()[0];
    const c = layer.getBounds().getCenter();
    center = [c.lat, c.lng];
  } else if (def.kind === "reservoir") {
    layer = L.geoJSON(feature, {
      style: () => Object.assign({ pane: "p_reservoir" }, VECTOR_STYLE.reservoir),
    }).getLayers()[0];
    const c = layer.getBounds().getCenter();
    center = [c.lat, c.lng];
  } else if (def.kind === "admin") {
    layer = L.geoJSON(feature, {
      style: () => Object.assign({ pane: "p_admin" }, VECTOR_STYLE.admin),
    }).getLayers()[0];
    const c = layer.getBounds().getCenter();
    center = [c.lat, c.lng];
    bindCountyTooltip(layer, props);
    adminLayers.push({ layer, props });
  } else {
    return;
  }

  // Popups are built lazily so they always render in the current language.
  if (def.kind !== "admin") {
    layer.bindPopup(() => buildPopup(props), { maxWidth: 320 });
    layer.bindTooltip(() => pick(props, "name") || "", { direction: "top", opacity: 0.9 });
  }

  records.push({
    layer,
    props,
    layerId: def.id,
    kind: def.kind,
    category: props.category || def.kind,
    center,
    search: `${props.name_zh || ""} ${props.name_en || ""}`.toLowerCase(),
    inList: def.kind === "point" || def.kind === "reservoir" || def.kind === "canal",
  });
}

/* ------------------------------------------------------------- styling ----- */
function riverStyle(feature) {
  const main = (feature.properties.name_zh || "").includes("湍河");
  return Object.assign({ pane: "p_river" }, main ? VECTOR_STYLE.riverMain : VECTOR_STYLE.river);
}

function canalStyle(feature) {
  const c = feature.properties.category === "diversion" ? VECTOR_STYLE.diversion : VECTOR_STYLE.canal;
  return Object.assign({ pane: "p_canal" }, c);
}

function pointToLayer(feature, latlng) {
  const p = feature.properties || {};
  const cat = CATEGORIES[p.category] || { color: "#666" };
  const relict = p.era_end != null && p.era_end < 1949; // out of use → hollow ring
  const lowConf = p.confidence === "low";
  return L.circleMarker(latlng, {
    pane: "p_point",
    radius: 7,
    color: cat.color,
    weight: relict ? 2.2 : 1.5,
    fillColor: relict ? "#ffffff" : cat.color,
    fillOpacity: relict ? 0.2 : 0.85,
    dashArray: lowConf ? "2 3" : null,
  });
}

function bindCountyTooltip(layer, props) {
  layer.bindTooltip(pick(props, "name"), {
    permanent: true,
    direction: "center",
    className: "county-label",
  });
}

/* =========================================================================== */
/* Popups                                                                      */
/* =========================================================================== */
function buildPopup(p) {
  const L_ = t();
  const name = pick(p, "name") || "—";
  const alt = p[`name_${other()}`] ? `<p class="popup-sub">${p[`name_${other()}`]}</p>` : "";
  const cat = CATEGORIES[p.category];
  const catLabel = cat ? cat[state.lang] : p.category || "";
  const eraLabel = pick(p, "era_label");

  const rows = [];
  if (catLabel) rows.push(row(L_.f_type, esc(catLabel)));
  if (p.era_start != null || p.era_end != null)
    rows.push(row(L_.f_era, `${esc(formatEra(p.era_start, p.era_end, state.lang))}${eraLabel ? ` · ${esc(eraLabel)}` : ""}`));
  const builder = pick(p, "builder");
  if (builder) rows.push(row(L_.f_builder, esc(builder)));
  const status = pick(p, "status");
  if (status) rows.push(row(L_.f_status, esc(status)));
  if (p.confidence)
    rows.push(row(L_.f_confidence, `<span class="badge conf-${p.confidence}">${L_["conf_" + p.confidence] || p.confidence}</span>`));

  let src = "";
  if (p.source_url) src = `<a href="${esc(p.source_url)}" target="_blank" rel="noopener">${esc(p.source || p.source_url)}</a>`;
  else if (p.source) src = esc(p.source);
  if (src) rows.push(row(L_.f_source, src));

  const desc = pick(p, "description");
  const descHtml = desc ? `<div class="popup-desc">${esc(desc)}</div>` : "";

  return `
    <div class="popup">
      <p class="popup-title">${esc(name)}</p>
      ${alt}
      <table class="popup-table">${rows.join("")}</table>
      ${descHtml}
    </div>`;
}
const row = (k, v) => `<tr><td class="k">${esc(k)}</td><td>${v}</td></tr>`;
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

/* =========================================================================== */
/* Time filtering                                                              */
/* =========================================================================== */
function isActiveAtYear(props, year) {
  if (year == null) return true; // all eras
  const s = props.era_start;
  if (s == null) return true; // timeless (admin)
  const end = props.era_end == null ? TIME_CONFIG.max : props.era_end;
  return year >= s && year <= end;
}

function applyFilter() {
  records.forEach((r) => {
    const show = state.layerOn[r.layerId] && isActiveAtYear(r.props, state.year);
    const on = map.hasLayer(r.layer);
    if (show && !on) r.layer.addTo(map);
    else if (!show && on) map.removeLayer(r.layer);
  });
  refreshListDimming();
}

/* =========================================================================== */
/* Sidebar — layer toggles, legend, timeline list                              */
/* =========================================================================== */
function buildLayerControls() {
  const host = document.getElementById("layerControls");
  host.innerHTML = "";
  LAYERS.forEach((def) => {
    const n = records.filter((r) => r.layerId === def.id).length;
    if (n === 0 && def.id === "structures") return; // hide until data exists
    const id = `chk_${def.id}`;
    const row = document.createElement("div");
    row.className = "layer-row";
    row.innerHTML = `<input type="checkbox" id="${id}" ${state.layerOn[def.id] ? "checked" : ""}>
      <label for="${id}">${def[state.lang]}</label>
      <span class="count">${n} ${t().layerCount}</span>`;
    row.querySelector("input").addEventListener("change", (e) => {
      state.layerOn[def.id] = e.target.checked;
      applyFilter();
    });
    host.appendChild(row);
  });
}

function buildLegend() {
  const host = document.getElementById("legend");
  host.innerHTML = "";
  // Vector layers present
  const lines = [
    { cls: "line", style: `border-top-color:${VECTOR_STYLE.riverMain.color}`, zh: "湍河（主干）", en: "Tuan River (focus)" },
    { cls: "line", style: `border-top-color:${VECTOR_STYLE.river.color}`, zh: "其他河流", en: "Other rivers" },
    { cls: "line", style: `border-top-color:${VECTOR_STYLE.diversion.color};border-top-style:dashed`, zh: "调水干渠", en: "Transfer canal" },
    { cls: "line", style: `border-top-color:${VECTOR_STYLE.canal.color};border-top-style:dashed`, zh: "灌渠", en: "Irrigation canal" },
    { cls: "poly", style: `background:${VECTOR_STYLE.reservoir.fillColor};opacity:.6`, zh: "水库水面", en: "Reservoir surface" },
  ];
  lines.forEach((l) => host.appendChild(legendRow(l.cls, l.style, l[state.lang])));
  // Point categories actually present in the data
  const present = new Set(records.filter((r) => r.kind === "point").map((r) => r.category));
  Object.keys(CATEGORIES).forEach((key) => {
    if (!present.has(key)) return;
    const c = CATEGORIES[key];
    host.appendChild(legendRow("", `background:${c.color}`, c[state.lang]));
  });
}
function legendRow(cls, style, label) {
  const d = document.createElement("div");
  d.className = "legend-row";
  d.innerHTML = `<span class="legend-swatch ${cls}" style="${style}"></span><span>${label}</span>`;
  return d;
}

function buildFeatureList() {
  const host = document.getElementById("featureList");
  const q = (document.getElementById("featureSearch").value || "").trim().toLowerCase();
  host.innerHTML = "";
  const items = records
    .filter((r) => r.inList && state.layerOn[r.layerId])
    .filter((r) => !q || r.search.includes(q))
    .sort((a, b) => (a.props.era_start ?? 9999) - (b.props.era_start ?? 9999));

  if (items.length === 0) {
    host.innerHTML = `<li class="list-empty">${t().noResults}</li>`;
    return;
  }
  items.forEach((r) => {
    const p = r.props;
    const cat = CATEGORIES[p.category] || { color: "#666" };
    const relict = p.era_end != null && p.era_end < 1949;
    const li = document.createElement("li");
    if (relict) li.classList.add("relict");
    li.innerHTML = `<span class="era">${compactYear(p.era_start)}</span>
      <span class="dot" style="background:${cat.color}"></span>
      <span class="nm">${esc(pick(p, "name"))}</span>`;
    li.addEventListener("click", () => openFeature(r));
    li.dataset.recIdx = records.indexOf(r);
    host.appendChild(li);
  });
}

function refreshListDimming() {
  document.querySelectorAll("#featureList li[data-rec-idx]").forEach((li) => {
    const r = records[+li.dataset.recIdx];
    if (!r) return;
    const active = isActiveAtYear(r.props, state.year);
    li.style.opacity = active ? "1" : "0.4";
  });
}

/* Click a timeline item → time-travel to its founding year, fly there, open. */
function openFeature(r) {
  if (r.props.era_start != null) setYear(r.props.era_start);
  closeSidebarOnMobile();
  map.flyTo(r.center, Math.max(map.getZoom(), 12), { duration: 0.6 });
  setTimeout(() => r.layer.openPopup(r.center), 250);
}

/* =========================================================================== */
/* Time axis controls                                                          */
/* =========================================================================== */
function dynastyForYear(year) {
  if (year == null) return null;
  let best = null, bestDist = Infinity;
  for (const d of DYNASTIES) {
    if (year >= d.start && year <= d.end) return d;
    const dist = Math.min(Math.abs(year - d.start), Math.abs(year - d.end));
    if (dist < bestDist) { bestDist = dist; best = d; }
  }
  return best;
}

function buildDynastyChips() {
  const host = document.getElementById("dynastyChips");
  host.innerHTML = "";
  DYNASTIES.forEach((d) => {
    const c = document.createElement("button");
    c.className = "chip";
    c.dataset.id = d.id;
    c.textContent = state.lang === "zh" ? d.zh : d.en;
    c.title = `${compactYear(d.start)} – ${compactYear(d.end)}`;
    c.addEventListener("click", () => setYear(d.jump));
    host.appendChild(c);
  });
}

function setYear(y) {
  state.allEras = false;
  state.year = Math.max(TIME_CONFIG.min, Math.min(TIME_CONFIG.max, y));
  document.getElementById("timeSlider").value = state.year;
  updateTimeUI();
  applyFilter();
}
function setAllEras() {
  stopPlay();
  state.allEras = true;
  state.year = null;
  updateTimeUI();
  applyFilter();
}

function updateTimeUI() {
  const yl = document.getElementById("yearLabel");
  const dl = document.getElementById("dynastyLabel");
  if (state.allEras) {
    yl.textContent = t().allErasReadout;
    dl.textContent = "";
  } else {
    yl.textContent = formatYear(state.year, state.lang);
    const d = dynastyForYear(state.year);
    dl.textContent = d ? (state.lang === "zh" ? d.zh : d.en) : "";
  }
  document.getElementById("allErasBtn").classList.toggle("active", state.allEras);
  const activeD = state.allEras ? null : dynastyForYear(state.year);
  document.querySelectorAll(".chip").forEach((c) =>
    c.classList.toggle("active", activeD && c.dataset.id === activeD.id)
  );
}

function togglePlay() {
  if (state.playing) return stopPlay();
  state.playing = true;
  document.getElementById("playBtn").textContent = "⏸";
  if (state.allEras || state.year == null) setYear(TIME_CONFIG.min);
  const step = Math.max(1, Math.round((TIME_CONFIG.max - TIME_CONFIG.min) / 160));
  state.playTimer = setInterval(() => {
    let next = (state.year ?? TIME_CONFIG.min) + step;
    if (next >= TIME_CONFIG.max) { next = TIME_CONFIG.max; setYear(next); stopPlay(); return; }
    setYear(next);
  }, 110);
}
function stopPlay() {
  state.playing = false;
  if (state.playTimer) clearInterval(state.playTimer);
  state.playTimer = null;
  document.getElementById("playBtn").textContent = "▶";
}

/* =========================================================================== */
/* Language + chrome                                                           */
/* =========================================================================== */
function applyI18nStatic() {
  document.documentElement.lang = state.lang === "zh" ? "zh" : "en";
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const k = el.getAttribute("data-i18n");
    if (t()[k]) el.textContent = t()[k];
  });
  document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
    const k = el.getAttribute("data-i18n-ph");
    if (t()[k]) el.placeholder = t()[k];
  });
  document.getElementById("langToggle").textContent = state.lang === "zh" ? "EN" : "中文";
}

function toggleLang() {
  state.lang = state.lang === "zh" ? "en" : "zh";
  applyI18nStatic();
  buildLayerControls();
  buildLegend();
  buildDynastyChips();
  buildFeatureList();
  updateTimeUI();
  // Refresh permanent county tooltips
  adminLayers.forEach(({ layer, props }) => {
    layer.unbindTooltip();
    bindCountyTooltip(layer, props);
  });
  // Reopen any open popup in the new language
  records.forEach((r) => {
    if (r.layer.isPopupOpen && r.layer.isPopupOpen()) {
      r.layer.closePopup();
      r.layer.openPopup();
    }
  });
  applyFilter();
}

function buildBasemapSelect() {
  const sel = document.getElementById("basemap");
  sel.innerHTML = "";
  Object.entries(BASEMAPS).forEach(([k, b]) => {
    const o = document.createElement("option");
    o.value = k;
    o.textContent = state.lang === "zh" ? b.zh : b.en;
    if (k === DEFAULT_BASEMAP) o.selected = true;
    sel.appendChild(o);
  });
  sel.addEventListener("change", (e) => {
    map.removeLayer(currentTile);
    currentTile = makeTile(e.target.value).addTo(map);
    currentTile.bringToBack();
  });
}

function closeSidebarOnMobile() {
  if (window.innerWidth <= 760) document.getElementById("sidebar").classList.remove("open");
}

/* =========================================================================== */
/* Wire up                                                                     */
/* =========================================================================== */
function bindControls() {
  document.getElementById("langToggle").addEventListener("click", toggleLang);
  document.getElementById("allErasBtn").addEventListener("click", () => {
    if (state.allEras) return;
    setAllEras();
  });
  document.getElementById("playBtn").addEventListener("click", togglePlay);
  const slider = document.getElementById("timeSlider");
  slider.addEventListener("input", (e) => {
    stopPlay();
    setYear(parseInt(e.target.value, 10));
  });
  document.getElementById("featureSearch").addEventListener("input", buildFeatureList);
  document.getElementById("sidebarToggle").addEventListener("click", () =>
    document.getElementById("sidebar").classList.toggle("open")
  );
}

async function main() {
  initMap();
  buildBasemapSelect();
  buildDynastyChips();
  applyI18nStatic();
  bindControls();
  updateTimeUI();
  await loadAll();
}

document.addEventListener("DOMContentLoaded", main);
