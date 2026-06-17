/* =============================================================================
 * i18n.js — bilingual (中文 / English) UI strings and helpers.
 * The map UI is fully bilingual; the active language is held in app state.
 * =========================================================================== */

const I18N = {
  zh: {
    title: "湍河流域水利工程地理信息系统",
    subtitle: "Tuan River Basin Hydraulic Heritage GIS · 春秋至今 2000+ 年",
    demoLink: "▶ 动画演示",
    basemapLabel: "底图",
    layersTitle: "图层",
    legendTitle: "图例",
    legendHint: "空心环 = 历史遗存（已废）；虚线描边 = 低可信度",
    timelineTitle: "历史时间线",
    searchPh: "搜索设施 / 河流…",
    aboutTitle: "关于本系统",
    aboutText:
      "本系统汇集邓州市、内乡县、新野县境内、自春秋经两汉至今两千余年的水利工程与史迹，" +
      "涵盖六门堤、围堰、湍河及各蓄水湖（陂、水库）。拖动下方时间轴，可按年代浏览工程的兴废。",
    allEras: "全部年代",
    loading: "加载数据中…",
    langName: "中文",
    // popup field labels
    f_type: "类型",
    f_era: "年代",
    f_builder: "营建",
    f_status: "现状",
    f_confidence: "可信度",
    f_source: "来源",
    f_desc: "说明",
    f_basin: "水系",
    conf_high: "高", conf_medium: "中", conf_low: "低",
    present: "至今",
    bce: "公元前", ce: "公元",
    allErasReadout: "全部",
    eraActive: "在此年代存在",
    flyto: "定位",
    noResults: "无匹配结果",
    layerCount: "项",
  },
  en: {
    title: "Tuan River Basin Hydraulic Heritage GIS",
    subtitle: "Water-conservancy works of Dengzhou · Neixiang · Xinye — 2,000+ years",
    demoLink: "▶ Animation",
    basemapLabel: "Basemap",
    layersTitle: "Layers",
    legendTitle: "Legend",
    legendHint: "Hollow ring = relict / abandoned; dashed outline = low confidence",
    timelineTitle: "Timeline",
    searchPh: "Search works / rivers…",
    aboutTitle: "About",
    aboutText:
      "This system maps the water-conservancy works and historic sites of Dengzhou City, " +
      "Neixiang County and Xinye County across 2,000+ years — from the Spring & Autumn period " +
      "through the Han dynasties to today. It includes the Six-Gate Weir, cofferdams, the Tuan " +
      "River and its impoundments (bei reservoirs / modern reservoirs). Drag the time slider to " +
      "watch works appear and fall out of use.",
    allEras: "All eras",
    loading: "Loading data…",
    langName: "English",
    f_type: "Type",
    f_era: "Era",
    f_builder: "Built by",
    f_status: "Status",
    f_confidence: "Confidence",
    f_source: "Source",
    f_desc: "Notes",
    f_basin: "Basin",
    conf_high: "high", conf_medium: "medium", conf_low: "low",
    present: "present",
    bce: "BCE", ce: "CE",
    allErasReadout: "All",
    eraActive: "extant in this era",
    flyto: "Locate",
    noResults: "No matches",
    layerCount: "items",
  },
};

/* Format an integer year as a localized label, e.g. -38 → "公元前38年" / "38 BCE". */
function formatYear(year, lang) {
  const t = I18N[lang];
  if (year === null || year === undefined) return t.allErasReadout;
  if (year < 0) return lang === "zh" ? `${t.bce}${-year}年` : `${-year} ${t.bce}`;
  return lang === "zh" ? `${year}年` : `${year} ${t.ce}`;
}

/* Format an era range [start, end] for popups. */
function formatEra(start, end, lang) {
  const t = I18N[lang];
  if (start === null || start === undefined) return "—";
  const s = formatYear(start, lang);
  if (end === null || end === undefined || end >= TIME_CONFIG.max) {
    return lang === "zh" ? `${s} – ${t.present}` : `${s} – ${t.present}`;
  }
  return `${s} – ${formatYear(end, lang)}`;
}
