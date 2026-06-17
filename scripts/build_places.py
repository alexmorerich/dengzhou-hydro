#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_places.py — build the comprehensive "places" layer (county seats, townships,
villages) for the Tuan River Basin GIS, and enrich rivers.geojson with historical
river names.  现今地名取自 OpenStreetMap；历史/古地名为人工考订。

Inputs:
  - data/admin-boundaries.geojson
  - data/sources/osm-places.json   (trimmed OSM Overpass extract; bootstrapped from
    /tmp/op_places.json on first run if the committed copy is absent)
Outputs:
  - data/places.geojson            (Point features: county-seat / town / village)
  - data/rivers.geojson            (re-written with name_hist_zh / name_hist_en added)

Run:  python3 scripts/build_places.py
"""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def P(*a): return os.path.join(ROOT, *a)

COUNTY_EN = {"内乡县": "Neixiang", "邓州市": "Dengzhou", "新野县": "Xinye"}

# County seats (县城 / 主城区) — rendered larger.
SEATS = {"城关镇", "花洲街道", "汉城街道"}

# --------------------------------------------------------------------------- #
# Historical / ancient names + one-line notes for townships (人工考订).         #
# key = current OSM name_zh.  hz/he = 古称(zh/en); nz/ne = note(zh/en).          #
# Only well-attested correspondences are filled; others stay current-only.      #
# --------------------------------------------------------------------------- #
HIST = {
  # —— 邓州市 ——
  "花洲街道": dict(hz="穰县·花洲", he="Rang / Huazhou", nz="穰县故城核心；范仲淹建花洲书院、作《岳阳楼记》", ne="Core of old Rang; Fanzhong­yan's Huazhou Academy"),
  "古城街道": dict(hz="穰县故城", he="Old Rang town", nz="古穰城所在", ne="Site of the old Rang city wall"),
  "湍河街道": dict(hz="穰城·湍滨", he="Tuan-side of Rang", nz="沿湍河城区", ne="Tuan-riverside urban district"),
  "穰东镇":   dict(hz="涅阳", he="Nieyang", nz="汉南阳郡涅阳县故城（涅水/赵河之阳）", ne="Han Nieyang county seat, on the Zhao (Nie) River"),
  "构林镇":   dict(hz="山都", he="Shandu", nz="汉南阳郡山都县故城（古村）", ne="Han Shandu county seat (Gucun)"),
  "张村镇":   dict(hz="冠军", he="Guanjun", nz="汉冠军县故城；霍去病封地", ne="Han Guanjun county; fief of Huo Qubing"),
  "林扒镇":   dict(hz="临湍 / 古邓", he="Linтuan / anc. Deng", nz="隋唐临湍县治；一说古邓国故地", ne="Sui–Tang Lintuan county; one tradition's site of ancient Deng"),
  "㴔滩镇":   dict(hz="汲滩", he="Jitan", nz="明清水陆码头；近汉安众县", ne="Ming–Qing river port; near Han Anzhong county"),
  "小杨营镇": dict(hz="朝阳", he="Zhaoyang", nz="近汉朝阳县故城（刁河/朝水之阳）", ne="Near Han Zhaoyang county, on the Diao (Chao) River"),
  "十林镇":   dict(hz="楚碣 / 冠军境", he="Chu-weir area", nz="州西北；楚堨(楚堰)遗址、南水北调湍河渡槽", ne="NW of the city; Chu-weir site & Tuanhe Aqueduct"),
  "罗庄镇":   dict(hz="湍惠渠渠首", he="Tuanhui head", nz="湍河入邓州处；湍惠渠拦河堰", ne="Where the Tuan enters Dengzhou; Tuanhui Canal weir"),
  "龙堰乡":   dict(hz="龙堰", he="Longyan (Dragon Weir)", nz="以古堰得名", ne="Named for an old weir (堰)"),
  "都司镇":   dict(hz="守御千户所", he="Ming garrison", nz="明代军事都司/千户所", ne="Ming military garrison post"),
  "高集乡":   dict(hz="", he="", nz="张沟水库所在", ne="Site of Zhanggou Reservoir"),
  "赵集镇":   dict(hz="", he="", nz="半坡水库、湍惠渠灌区", ne="Banpo Reservoir; Tuanhui irrigation"),
  "彭桥镇":   dict(hz="", he="", nz="排子河；刘山水库", ne="Paizi River; Liushan Reservoir"),
  # —— 内乡县 ——
  "城关镇":   dict(hz="郦县 / 菊潭", he="Li / Jutan", nz="秦汉郦县→隋菊潭→唐内乡；内乡县衙", ne="Qin–Han Li county → Sui Jutan → Tang Neixiang; the County Yamen"),
  "夏馆镇":   dict(hz="湍水之源", he="Tuan headwaters", nz="湍河发源地（宝天曼/翼望山）", ne="Source of the Tuan (Baotianman / Mt Yiwang)"),
  "马山口镇": dict(hz="马山口", he="Mashankou", nz="古商道；打磨岗水库", ne="Old trade pass; Damogang Reservoir"),
  "赤眉镇":   dict(hz="赤眉", he="Chimei", nz="弹琴河；斩龙岗水库（传赤眉军）", ne="Tanqin River; Zhanlonggang Reservoir"),
  "湍东镇":   dict(hz="", he="", nz="湍河东岸", ne="East bank of the Tuan"),
  "灌涨镇":   dict(hz="", he="", nz="默河", ne="On the Mo River"),
  "王店镇":   dict(hz="", he="", nz="云露湖水库", ne="Yunluhu Reservoir"),
  "瓦亭镇":   dict(hz="瓦亭", he="Wating", nz="古瓦亭", ne="Old Wating post"),
  # —— 新野县 ——
  "汉城街道": dict(hz="新野故城", he="Old Xinye", nz="汉新野县城；光武中兴、邓禹故里", ne="Han Xinye county seat; cradle of the Later-Han restoration"),
  "前高庙乡": dict(hz="棘阳", he="Jiyang", nz="汉南阳郡棘阳县故城（唐河西岸）", ne="Han Jiyang county seat, west bank of the Tang River"),
  "沙堰镇":   dict(hz="西棘阳", he="Xi-Jiyang", nz="南北朝西棘阳县故城（古城村）", ne="N. & S. Dynasties Western-Jiyang county (Gucheng village)"),
  "新甸铺镇": dict(hz="刁河堂", he="Diaohetang", nz="刁河入白河处；近朝阳", ne="Where the Diao joins the Bai; near Zhaoyang"),
  "王集镇":   dict(hz="湍口", he="Tuankou", nz="湍河入白河汇流口", ne="Confluence where the Tuan empties into the Bai"),
  "溧河铺镇": dict(hz="溧河 / 棘水", he="Li (Ji) River", nz="古棘水之畔；近育阳", ne="On the old Ji River; near Yuyang"),
}

# Historical names for rivers (matched by name_zh in rivers.geojson).
RIVER_HIST = {
  "湍河":   dict(hz="湍水", he="Tuanshui", nz="下游古称七里河", ne="lower course anc. Qilihe"),
  "刁河":   dict(hz="朝水", he="Chaoshui", nz="《水经注》朝水", ne="the Chao of the Water Classic"),
  "白河":   dict(hz="淯水", he="Yushui", nz="东晋后改称白河", ne="renamed Baihe after the Eastern Jin"),
  "唐白河": dict(hz="唐河·白河合流", he="Tang + Bai", nz="唐河(古泚水)与白河(古淯水)合流", ne="confluence of the Tang (anc. Ci) and Bai (anc. Yu)"),
  "赵河":   dict(hz="涅水", he="Nieshui", nz="涅阳因涅水得名", ne="Nieyang county is named for it"),
  "严陵河": dict(hz="", he="", nz="湍河左岸支流", ne="left-bank tributary of the Tuan"),
  "礓石河": dict(hz="", he="", nz="湍河支流", ne="tributary of the Tuan"),
}

# --------------------------------------------------------------------------- #
def load_counties():
    a = json.load(open(P("data", "admin-boundaries.geojson"), encoding="utf-8"))
    return [(f["properties"]["name_zh"], f["geometry"]["coordinates"][0]) for f in a["features"]]

def pip(lon, lat, ring):
    inside = False; n = len(ring); j = n - 1
    for i in range(n):
        xi, yi = ring[i]; xj, yj = ring[j]
        if ((yi > lat) != (yj > lat)) and (lon < (xj - xi) * (lat - yi) / (yj - yi + 1e-15) + xi):
            inside = not inside
        j = i
    return inside

def county_of(lon, lat, counties):
    for nm, ring in counties:
        if pip(lon, lat, ring):
            return nm
    return None

def center(e):
    if e["type"] == "node":
        return e.get("lon"), e.get("lat")
    c = e.get("center") or {}
    return c.get("lon"), c.get("lat")

def load_osm():
    committed = P("data", "sources", "osm-places.json")
    if os.path.exists(committed):
        return json.load(open(committed, encoding="utf-8"))["elements"]
    raw = json.load(open("/tmp/op_places.json", encoding="utf-8"))["elements"]
    return raw  # trimmed copy written at the end

SKIP_NAMES = {"南阳市黄牛良种繁育场"}

def main():
    counties = load_counties()
    els = load_osm()

    feats, used = [], []
    seen = set()
    for e in els:
        tg = e.get("tags", {}); nm = tg.get("name")
        if not nm or nm in SKIP_NAMES:
            continue
        lon, lat = center(e)
        if lon is None:
            continue
        co = county_of(lon, lat, counties)
        if not co:
            continue
        place = tg.get("place")
        adm = tg.get("admin_level") if tg.get("boundary") == "administrative" else None
        is_town = (adm == "8") or (place == "town")
        is_village = place in ("village", "hamlet")
        if not (is_town or is_village):
            continue
        level = "village"
        if is_town:
            level = "seat" if nm in SEATS else "town"
        key = (nm, level)
        if key in seen:
            continue
        seen.add(key)
        clean = nm.replace("街道", "").replace("镇", "").replace("乡", "")
        h = HIST.get(nm, {})
        props = {
            "name_zh": nm, "name_en": tg.get("name:en", ""),
            "name_hist_zh": h.get("hz", ""), "name_hist_en": h.get("he", ""),
            "level": level, "county_zh": co, "county_en": COUNTY_EN[co],
            "note_zh": h.get("nz", ""), "note_en": h.get("ne", ""),
            "source": "OpenStreetMap (name); 历史地名人工考订 / hist. names compiled",
        }
        feats.append({"type": "Feature", "properties": props,
                      "geometry": {"type": "Point", "coordinates": [round(lon, 5), round(lat, 5)]}})
        used.append({"type": e["type"], "id": e["id"], "tags": tg,
                     "lon": lon, "lat": lat, "center": e.get("center")})

    feats.sort(key=lambda f: ({"seat": 0, "town": 1, "village": 2}[f["properties"]["level"]], f["properties"]["name_zh"]))
    fc = {"type": "FeatureCollection", "name": "places", "features": feats}
    json.dump(fc, open(P("data", "places.geojson"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    # committed trimmed source
    os.makedirs(P("data", "sources"), exist_ok=True)
    json.dump({"_comment": "Trimmed OSM Overpass extract (places + named waterways) for the three counties. "
                           "© OpenStreetMap contributors, ODbL. bbox 32.16,111.45,33.62,112.62.",
               "elements": used},
              open(P("data", "sources", "osm-places.json"), "w", encoding="utf-8"), ensure_ascii=False)

    from collections import Counter
    lv = Counter(f["properties"]["level"] for f in feats)
    byco = Counter(f["properties"]["county_zh"] for f in feats)
    print(f"places.geojson: {len(feats)} features  levels={dict(lv)}  byCounty={dict(byco)}")

    # enrich rivers
    rf = P("data", "rivers.geojson")
    rivers = json.load(open(rf, encoding="utf-8"))
    n = 0
    for f in rivers["features"]:
        p = f["properties"]; h = RIVER_HIST.get(p.get("name_zh"))
        if h:
            p["name_hist_zh"] = h["hz"]; p["name_hist_en"] = h["he"]
            if h["nz"]: p["note_zh"] = h["nz"]
            if h["ne"]: p["note_en"] = h["ne"]
            n += 1
    json.dump(rivers, open(rf, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"rivers.geojson: enriched {n} segments with historical names")

if __name__ == "__main__":
    main()
