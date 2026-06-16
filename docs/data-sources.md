# 数据来源与方法 · Data Sources & Method

本系统的数据分三类来源：**行政区界**（geoBoundaries）、**水系/水库/渠系几何**（OpenStreetMap）、**历代水利工程与史迹**（由史料与政府名录编纂）。

This dataset combines three kinds of source: **administrative boundaries** (geoBoundaries), **river / reservoir / canal geometry** (OpenStreetMap), and **historical works & sites** (compiled from primary texts and government inventories).

---

## 1. 图层来源 · Layer provenance

| 图层 / Layer | 来源 / Source | 许可 / License |
|---|---|---|
| `admin-boundaries.geojson` | geoBoundaries CHN ADM3 (simplified) | CC BY 4.0 |
| `rivers.geojson` | OpenStreetMap (Overpass) | ODbL 1.0 |
| `canals.geojson` | OpenStreetMap (Overpass) | ODbL 1.0 |
| `osm-reservoir-surfaces.geojson` | OpenStreetMap (Overpass) | ODbL 1.0 |
| `hydraulic-structures.geojson` | 本项目编纂 / compiled here (see §3) | CC BY-SA 4.0 |
| `sources/overpass-water.json` | OpenStreetMap (Overpass), trimmed | ODbL 1.0 |

坐标系 / CRS：**WGS-84 (EPSG:4326)**。OSM 瓦片与矢量均为 WGS-84，与底图无 GCJ-02 偏移。

---

## 2. OpenStreetMap 抽取 · The OSM extract

研究区外接框 / Bounding box `S,W,N,E = 32.16, 111.45, 33.62, 112.62`。Overpass 查询 / query：

```overpassql
[out:json][timeout:120];
(
  way["water"="reservoir"]({{bbox}});
  way["landuse"="reservoir"]({{bbox}});
  way["natural"="water"]["name"]({{bbox}});
  way["waterway"="canal"]["name"]({{bbox}});
  way["waterway"="weir"]["name"]({{bbox}});
  way["waterway"="dam"]["name"]({{bbox}});
);
out tags geom;
```

抽取结果按三县多边形做**点在多边形内**过滤；水库水面只保留县域内的命名水体，渠系只保留县域内的渠段（南水北调干渠按县界裁取）。原始抽取（仅保留所用要素）见 `data/sources/overpass-water.json`，© OpenStreetMap 贡献者，ODbL。

The extract is filtered by **point-in-polygon** against the three county polygons; reservoir surfaces keep only named water bodies inside the counties, and canals keep only in-county segments. The trimmed raw extract (only the elements actually used) is in `data/sources/overpass-water.json`, © OpenStreetMap contributors, ODbL.

> 说明 / Note：湍河流域多数中小型水库未录入 OSM，故水库**点要素**由政府名录补充（见 §3），水库**面要素**仅绘已入 OSM 者（张沟、王营、滕庄）。

---

## 3. 历史与现代工程的编纂 · Compiling the works

`hydraulic-structures.geojson` 的每条记录在 [`../scripts/build_data.py`](../scripts/build_data.py) 中以结构化字典维护，含双语名称、年代、营建者、说明、`confidence` 与 `source/source_url`。

**坐标推定方法 / Coordinate method.** 古代工程无经纬度，依据**邓州城关锚点（32.68°N, 112.08°E）**加史载方位里程（如“城西三里”“东南六十里”）推定；现代要素优先取政府/OSM 坐标。`confidence` 含义：

- `high` — 多源互证，定位明确（如六门堤、湍河渡槽、引丹灌区）。
- `medium` — 史载/政府来源明确，坐标为合理推定（如钳卢陂、打磨岗水库）。
- `low` — 仅单一来源或仅以乡镇定位/为临时工程（如运粮河、刘山水库、施工围堰）。

`high` = corroborated and well-located; `medium` = well-attested but with inferred coordinates; `low` = single-source, township-located, or temporary.

**主要史料 / Principal historical sources**

- 《水经注·湍水 / 淯水》（郦道元）— 楚堨、六门陂、邓氏陂、樊氏陂、新野陂、豫章大陂等
- 《汉书·循吏传》（召信臣）、《后汉书·杜诗传》（杜诗、“召父杜母”）
- 《元和郡县志》《通典》《读史方舆纪要》卷51 — 钳卢陂、楚堰方位里程
- 《嘉靖南阳府志》《乾隆邓州志》— 明代重修（三十八陂十四堰）
- 张芳《中国古代灌溉工程技术史》— 南阳陂渠系统综述、围堤工法
- 维基百科条目：[召信臣](https://zh.wikipedia.org/wiki/召信臣)、[湍河](https://zh.wikipedia.org/wiki/湍河)、[陶岔渠首](https://zh.wikipedia.org/wiki/陶岔渠首)、[打磨岗水库](https://zh.wikipedia.org/wiki/打磨岗水库)、[斩龙岗水库](https://zh.wikipedia.org/wiki/斩龙岗水库)

**主要现代来源 / Principal modern sources**

- 邓州市人民政府：[水库名录 (2026)](https://www.dengzhou.gov.cn/2026/01-23/1381408.html)、[湍河渡槽](https://www.dengzhou.gov.cn/2015/07-26/1115583.html)
- 百度百科：[湍河](https://baike.baidu.com/item/湍河/10310200)、[河南邓州湍河国家湿地公园](https://baike.baidu.com/item/河南邓州湍河国家湿地公园/16710096)
- 灌排云 / 大河网 — 打磨岗灌区、云露湖水库
- 南阳市人民政府、河南省自然资源/农业农村厅 — 引丹灌区、新野灌溉概况

每条要素的 `source` / `source_url` 字段在弹窗中可点击，保留单条记录的来源追溯。
Each feature's `source` / `source_url` is clickable in its popup, preserving per-record provenance.

---

## 4. 复现 · Reproducing

```bash
# 重建派生数据图层 / rebuild the derived layers
python3 scripts/build_data.py
```

若要刷新 OSM 底数据，用上面的 Overpass 查询重新拉取并替换 `data/sources/overpass-water.json`，再重跑脚本。
To refresh the OSM base data, re-run the Overpass query above, replace `data/sources/overpass-water.json`, and re-run the script.

---

## 5. 引用 · Citation

```
湍河流域水利工程地理信息系统 (Tuan River Basin Hydraulic Heritage GIS), 2026.
https://github.com/alexmorerich/dengzhou-hydro
Boundaries © geoBoundaries (CC BY 4.0). Geometry © OpenStreetMap contributors (ODbL).
Compiled heritage data CC BY-SA 4.0.
```
