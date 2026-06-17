/* =============================================================================
 * config.js — static configuration for the Tuan River Basin Hydraulic GIS
 * 湍河流域水利工程地理信息系统 — 静态配置
 * =========================================================================== */

/* Map view defaults (WGS-84). Centred on the Tuan River as it passes Dengzhou. */
const MAP_CONFIG = {
  center: [32.78, 112.0],
  zoom: 9,
  minZoom: 7,
  maxZoom: 17,
  // Bounding box of the three-county study area (lon/lat extents from the data).
  bounds: [
    [32.16, 111.45], // SW
    [33.62, 112.62], // NE
  ],
};

/* Time axis. Years are integers; negative = BCE. Spring & Autumn begins 770 BCE. */
const TIME_CONFIG = {
  min: -770,
  max: 2026,
  default: 2026,
};

/* -----------------------------------------------------------------------------
 * Chinese dynastic periods spanning the dataset. `jump` is a representative year
 * used by the quick-jump chips. Order matters (drawn left→right on the timebar).
 * --------------------------------------------------------------------------- */
const DYNASTIES = [
  { id: "chunqiu",   zh: "春秋",     en: "Spring & Autumn",      start: -770, end: -476, jump: -600 },
  { id: "zhanguo",   zh: "战国",     en: "Warring States",       start: -475, end: -221, jump: -350 },
  { id: "qin",       zh: "秦",       en: "Qin",                  start: -221, end: -207, jump: -215 },
  { id: "xihan",     zh: "西汉",     en: "Western Han",          start: -206, end: 8,    jump: -38  },
  { id: "donghan",   zh: "东汉",     en: "Eastern Han",          start: 25,   end: 220,  jump: 40   },
  { id: "weijin",    zh: "魏晋南北朝", en: "Wei–Jin to N. & S.",  start: 220,  end: 589,  jump: 400  },
  { id: "suitang",   zh: "隋唐",     en: "Sui–Tang",             start: 581,  end: 907,  jump: 740  },
  { id: "songyuan",  zh: "宋元",     en: "Song–Yuan",            start: 960,  end: 1368, jump: 1100 },
  { id: "ming",      zh: "明",       en: "Ming",                 start: 1368, end: 1644, jump: 1500 },
  { id: "qing",      zh: "清",       en: "Qing",                 start: 1644, end: 1912, jump: 1750 },
  { id: "minguo",    zh: "民国",     en: "Republic",             start: 1912, end: 1949, jump: 1930 },
  { id: "modern",    zh: "现代",     en: "Modern (PRC)",         start: 1949, end: 2026, jump: 2026 },
];

/* -----------------------------------------------------------------------------
 * Feature categories → colour, bilingual label, and marker hint.
 * Point features carry a `category`; lines/polygons are styled separately.
 * --------------------------------------------------------------------------- */
const CATEGORIES = {
  weir:       { color: "#b5651d", zh: "堰 / 堤 (拦河堰)",  en: "Weir / barrage" },
  dam:        { color: "#8b4513", zh: "坝 (大坝)",         en: "Dam" },
  rubber_dam: { color: "#1abc9c", zh: "橡胶坝 / 景观坝",   en: "Rubber / landscape dam" },
  cofferdam:  { color: "#e07b39", zh: "围堰",              en: "Cofferdam" },
  reservoir:  { color: "#2a7fff", zh: "水库 / 陂 (蓄水)",  en: "Reservoir / impoundment" },
  reservoir_surface: { color: "#2a7fff", zh: "水库水面",   en: "Reservoir surface" },
  canal:      { color: "#16a085", zh: "渠 / 灌区",         en: "Canal / irrigation" },
  sluice:     { color: "#7f8c8d", zh: "闸 / 分水",         en: "Sluice / headworks" },
  dike:       { color: "#c0392b", zh: "堤防",              en: "Dike / embankment" },
  pump:       { color: "#34495e", zh: "泵站",              en: "Pumping station" },
  wetland:    { color: "#27ae60", zh: "湿地 / 公园",       en: "Wetland / park" },
  site:       { color: "#884ea0", zh: "遗址 / 史迹",       en: "Historic site" },
  diversion:  { color: "#2e86c1", zh: "调水工程",          en: "Water-transfer works" },
};

/* Styling for the non-point vector layers already in the dataset. */
const VECTOR_STYLE = {
  riverMain:  { color: "#1f6feb", weight: 4.0, opacity: 0.95 }, // 湍河 (focus river)
  river:      { color: "#5b9bd5", weight: 2.0, opacity: 0.85 },
  diversion:  { color: "#2e86c1", weight: 3.0, opacity: 0.95, dashArray: "10 5" }, // 南水北调
  canal:      { color: "#16a085", weight: 2.2, opacity: 0.9, dashArray: "6 4" },  // 灌渠
  reservoir:  { color: "#1c6dd0", weight: 1, fillColor: "#2a7fff", fillOpacity: 0.45 },
  admin:      { color: "#555", weight: 1.6, opacity: 0.8, dashArray: "5 5", fill: true, fillColor: "#888", fillOpacity: 0.03 },
};

/* -----------------------------------------------------------------------------
 * Layer manifest. The app fetches each `file`, builds a Leaflet layer of the
 * given `kind`, and registers a toggle in the sidebar. Files that 404 are
 * skipped gracefully so the app still runs with partial data.
 * --------------------------------------------------------------------------- */
const LAYERS = [
  { id: "admin",      kind: "admin",     file: "data/admin-boundaries.geojson",      zh: "行政区界",         en: "County boundaries", on: true,  z: 200 },
  { id: "rivers",     kind: "river",     file: "data/rivers.geojson",                zh: "河流水系",         en: "Rivers & streams",  on: true,  z: 300 },
  { id: "canals",     kind: "canal",     file: "data/canals.geojson",                zh: "灌渠 / 调水工程",  en: "Canals & transfers",on: true,  z: 320 },
  { id: "resSurface", kind: "reservoir", file: "data/osm-reservoir-surfaces.geojson",zh: "水库水面",         en: "Reservoir surfaces",on: true,  z: 350 },
  { id: "places",     kind: "place",     file: "data/places.geojson",                zh: "城邑·乡镇·村",     en: "Towns & villages",  on: true,  z: 500 },
  { id: "structures", kind: "point",     file: "data/hydraulic-structures.geojson",  zh: "水利设施 / 史迹",  en: "Hydraulic works",   on: true,  z: 600 },
];

/* Place styling by level. minMarker / minLabel = zoom thresholds for showing the
 * dot and its label (progressive disclosure: seats → townships → villages). */
const PLACE_STYLE = {
  seat:    { color: "#8a1c1c", r: 6.0, minMarker: 7, minLabel: 8 },
  town:    { color: "#b5651d", r: 3.8, minMarker: 9, minLabel: 10 },
  village: { color: "#6b7785", r: 2.4, minMarker: 11, minLabel: 12 },
};

/* Basemap tile sources. OSM and its derivatives serve WGS-84 tiles, which align
 * with the WGS-84 vector data (no GCJ-02 offset). */
const BASEMAPS = {
  carto_light: {
    zh: "浅色地图", en: "Light",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    options: { maxZoom: 19, subdomains: "abcd", attribution: '© OpenStreetMap, © CARTO' },
  },
  osm: {
    zh: "标准地图", en: "OpenStreetMap",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    options: { maxZoom: 19, attribution: '© OpenStreetMap contributors' },
  },
  esri_img: {
    zh: "卫星影像", en: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    options: { maxZoom: 18, attribution: 'Tiles © Esri, Maxar, Earthstar Geographics' },
  },
  carto_dark: {
    zh: "深色地图", en: "Dark",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    options: { maxZoom: 19, subdomains: "abcd", attribution: '© OpenStreetMap, © CARTO' },
  },
};
const DEFAULT_BASEMAP = "carto_light";
