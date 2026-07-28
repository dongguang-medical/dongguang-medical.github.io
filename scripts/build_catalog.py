#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_catalog.py
────────────────
靜態商品目錄產生器（僅使用 Python 標準庫）。

讀取 content/products/<slug>.md（YAML frontmatter + Markdown 內文），產出：

  catalog/index.html            商品總覽頁（四大分類區塊 + 商品卡片 + 前端搜尋）
  catalog/search-index.json     前端搜尋用輕量索引
  category/<分類名>/index.html   分類頁（四大分類各一頁，含空分類）
  product/<slug>/index.html     商品頁（圖庫、價格、規格表、說明、CTA、麵包屑、相關商品）
  sitemap.xml                   首頁 + 目錄 + 分類 + 商品頁

用法：
  python3 scripts/build_catalog.py        # 在 repo 任意位置執行皆可

frontmatter 欄位契約（與內容編輯流程共用，勿任意更改）：
  name(必填)、category(必填，四選一)、subcategory、price、brand、
  tags(字串清單)、specs(label/value 清單)、images(路徑清單，相對網站根目錄)、
  published(預設 true)
"""

import html
import json
import re
import shutil
import sys
from datetime import date
from pathlib import Path
from urllib.parse import quote

# ── 常數 ────────────────────────────────────────────────

ROOT = Path(__file__).resolve().parent.parent
CONTENT_DIR = ROOT / "content" / "products"
BASE_URL = "https://dongguang-medical.github.io"
SITE_NAME = "東光醫療器材"
PLACEHOLDER = "assets/images/placeholder.svg"
LOGO = "assets/images/logo.png"

# 洽詢電話（全站統一使用店面實際電話）
PHONE_DISPLAY = "(06) 290-7244"
PHONE_TEL = "062907244"

# 四大分類（固定順序）：名稱、簡介、代表圖
CATEGORIES = [
    ("行動輔具", "輪椅、助行器、拐杖、輔助踏車等行動輔助器材",
     "assets/images/products/mobility-wheelchair.jpeg"),
    ("衛浴輔具", "洗澡椅、安全扶手、便器椅、防滑墊等衛浴安全器材",
     "assets/images/products/bathroom-commode-folding.jpeg"),
    ("臥床輔具", "氣墊床、電動護理床、床邊護欄、移位腰帶等臥床照護器材",
     "assets/images/products/bed-nursing.jpeg"),
    ("呼吸輔具", "氧氣機、抽痰機、製氧機、血氧機等呼吸照護器材",
     "assets/images/products/respiratory-suction.jpeg"),
]
CATEGORY_NAMES = [c[0] for c in CATEGORIES]

PLACEHOLDER_SVG = """<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <rect width="400" height="300" fill="#f0f0f0"/>
  <rect x="150" y="100" width="100" height="80" rx="8" fill="#d0d0d0"/>
  <circle cx="175" cy="125" r="15" fill="#b0b0b0"/>
  <polygon points="150,180 185,140 215,165 240,145 280,180" fill="#c0c0c0"/>
  <text x="200" y="220" font-family="sans-serif" font-size="14" fill="#999" text-anchor="middle">暫無圖片</text>
</svg>
"""


def esc(s):
    return html.escape(str(s), quote=True)


def url_path(path):
    """網站絕對路徑（percent-encode 中文），path 不含開頭斜線。"""
    return "/" + quote(path)


# ── frontmatter 解析（簡易 YAML 子集，不依賴外部套件） ──────────

_KEY_RE = re.compile(r"^([A-Za-z_][\w-]*):\s*(.*)$")


def _strip_comment(val):
    return re.sub(r"\s+#.*$", "", val).strip()


def _scalar(val):
    val = val.strip()
    if len(val) >= 2 and val[0] == val[-1] and val[0] in ("'", '"'):
        return val[1:-1]
    return val


def parse_frontmatter(text):
    """回傳 (dict, body)。支援：純量、字串清單、label/value 物件清單。"""
    if not text.startswith("---"):
        return {}, text.strip()
    lines = text.split("\n")
    end = None
    for i in range(1, len(lines)):
        if lines[i].strip() == "---":
            end = i
            break
    if end is None:
        return {}, text.strip()

    data = {}
    cur_list = None   # 目前累積中的清單
    cur_dict = None   # 清單中累積中的物件項目

    for raw in lines[1:end]:
        if not raw.strip() or raw.lstrip().startswith("#"):
            continue
        indent = len(raw) - len(raw.lstrip(" "))
        line = raw.strip()
        m = _KEY_RE.match(line)

        if indent == 0 and m:                       # 頂層 key
            key, val = m.group(1), _strip_comment(m.group(2))
            cur_dict = None
            if val in ("", "[]"):
                data[key] = []                       # 可能接續清單項目
                cur_list = data[key] if val == "" else None
            else:
                data[key] = _scalar(val)
                cur_list = None
        elif line.startswith("- ") or line == "-":   # 清單項目
            if cur_list is None:
                continue
            item = line[1:].strip()
            dm = _KEY_RE.match(item)
            if dm:                                   # 物件項目（如 specs）
                cur_dict = {dm.group(1): _scalar(_strip_comment(dm.group(2)))}
                cur_list.append(cur_dict)
            else:
                cur_dict = None
                if item:
                    cur_list.append(_scalar(_strip_comment(item)))
        elif indent > 0 and m and cur_dict is not None:  # 物件的後續欄位
            cur_dict[m.group(1)] = _scalar(_strip_comment(m.group(2)))

    body = "\n".join(lines[end + 1:]).strip()
    return data, body


# ── Markdown → HTML（段落／粗體／清單／子標題） ─────────────────

_BOLD_RE = re.compile(r"\*\*(.+?)\*\*")
_LINK_RE = re.compile(r"\[([^\]]+)\]\(([^)\s]+)\)")
_UL_ITEM_RE = re.compile(r"^[-*]\s+")
_OL_ITEM_RE = re.compile(r"^\d+[.、]\s*")


def _inline(text):
    out = esc(text)
    out = _BOLD_RE.sub(r"<strong>\1</strong>", out)
    out = _LINK_RE.sub(r'<a href="\2">\1</a>', out)
    return out


def md_to_html(md):
    if not md:
        return ""
    blocks = re.split(r"\n\s*\n", md.strip())
    parts = []
    for block in blocks:
        lines = [ln.rstrip() for ln in block.split("\n") if ln.strip()]
        if not lines:
            continue
        if all(_UL_ITEM_RE.match(ln) for ln in lines):
            items = "".join(
                f"<li>{_inline(_UL_ITEM_RE.sub('', ln))}</li>" for ln in lines)
            parts.append(f"<ul>{items}</ul>")
        elif all(_OL_ITEM_RE.match(ln) for ln in lines):
            items = "".join(
                f"<li>{_inline(_OL_ITEM_RE.sub('', ln))}</li>" for ln in lines)
            parts.append(f"<ol>{items}</ol>")
        elif lines[0].startswith("#"):
            level = min(len(lines[0]) - len(lines[0].lstrip("#")) + 1, 4)
            level = max(level, 3)  # 商品名已是 h1、區塊標題是 h2
            text = lines[0].lstrip("#").strip()
            parts.append(f"<h{level}>{_inline(text)}</h{level}>")
        else:
            parts.append("<p>" + "<br>\n".join(_inline(ln) for ln in lines) + "</p>")
    return "\n".join(parts)


def md_to_text(md, limit=150):
    """給 meta description 用的純文字摘要。"""
    text = re.sub(r"[#*>`\[\]()\-]", "", md or "")
    text = re.sub(r"\s+", "", text)
    return text[:limit]


# ── 讀取商品 ────────────────────────────────────────────

def load_products():
    products = []
    if not CONTENT_DIR.is_dir():
        print(f"⚠️  找不到 {CONTENT_DIR}", file=sys.stderr)
        return products
    for md_file in sorted(CONTENT_DIR.glob("*.md")):
        fm, body = parse_frontmatter(md_file.read_text(encoding="utf-8"))

        def s(key):
            v = fm.get(key, "")
            return v.strip() if isinstance(v, str) else ""

        published = str(fm.get("published", "true")).strip().lower()
        if published in ("false", "no", "0"):
            continue

        name, category = s("name"), s("category")
        if not name:
            print(f"⚠️  {md_file.name}：缺少 name，略過", file=sys.stderr)
            continue
        if category not in CATEGORY_NAMES:
            print(f"⚠️  {md_file.name}：category「{category}」不在四大分類中，略過",
                  file=sys.stderr)
            continue

        specs = [d for d in fm.get("specs", []) or []
                 if isinstance(d, dict) and d.get("label")]
        images = [str(p).lstrip("/") for p in fm.get("images", []) or []
                  if isinstance(p, str) and p.strip()]
        tags = [t for t in fm.get("tags", []) or [] if isinstance(t, str) and t]

        products.append({
            "slug": md_file.stem,
            "name": name,
            "category": category,
            "subcategory": s("subcategory"),
            "price": s("price"),
            "brand": s("brand"),
            "tags": tags,
            "specs": specs,
            "images": images,
            "body": body,
            "url": f"/product/{quote(md_file.stem)}/",
        })
    return products


# ── 共用頁面外框（與 index.html 形象頁同一設計語彙） ──────────────

def nav_links():
    links = [("回首頁", "/"), ("商品目錄", "/catalog/")]
    links += [(c, url_path(f"category/{c}/")) for c in CATEGORY_NAMES]
    links.append(("聯絡我們", "/#contact"))
    return links


def page_header(active_url=""):
    desktop = "\n        ".join(
        '<a href="{u}"{cls}>{t}</a>'.format(
            u=u, t=esc(t),
            cls=' class="active"' if u == active_url else "")
        for t, u in nav_links())
    mobile = "\n    ".join(
        f'<a href="{u}" onclick="closeMobileNav()">{esc(t)}</a>'
        for t, u in nav_links())
    return f"""  <header class="intro-header">
    <div class="intro-header-inner">
      <a href="/" class="intro-logo" aria-label="{SITE_NAME} 首頁">
        <img src="/{LOGO}" alt="{SITE_NAME}" width="40" height="40">
        <div>
          <div class="intro-logo-name">{SITE_NAME}</div>
          <div class="intro-logo-sub">醫療輔具租賃</div>
        </div>
      </a>
      <nav class="intro-nav" aria-label="主要導覽">
        {desktop}
      </nav>
      <a href="tel:{PHONE_TEL}" class="intro-header-phone">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91A16 16 0 0 0 16 17l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 23.73 18z"/></svg>
        {PHONE_DISPLAY}
      </a>
      <button class="intro-hamburger" id="hamburger" aria-label="開啟選單" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>
    </div>
  </header>

  <nav class="intro-nav-mobile" id="mobile-nav" aria-label="行動版導覽">
    {mobile}
  </nav>
"""


PAGE_FOOTER = f"""  <footer class="intro-footer">
    <div class="intro-footer-inner">
      <div class="intro-footer-col">
        <div class="intro-footer-brand">
          <img src="/{LOGO}" alt="{SITE_NAME}" loading="lazy" width="36" height="36">
          <div class="intro-footer-brand-name">{SITE_NAME}<br>醫療輔具租賃</div>
        </div>
        <p class="intro-footer-tagline">認真・負責・專業<br>超過二十年，守護您的健康</p>
      </div>
      <div class="intro-footer-col">
        <h4>聯絡資訊</h4>
        <ul>
          <li>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91A16 16 0 0 0 16 17l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 23.73 18z"/></svg>
            <a href="tel:{PHONE_TEL}">{PHONE_DISPLAY}</a>
          </li>
          <li>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            <a href="mailto:t2907244@seed.net.tw">t2907244@seed.net.tw</a>
          </li>
          <li>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            701 台南市東區崇德路 677 &amp; 679 號
          </li>
        </ul>
      </div>
      <div class="intro-footer-col">
        <h4>營業時間</h4>
        <ul class="intro-footer-hours">
          <li>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span class="fh-day">週一至週六</span><span class="fh-time">9:30 AM – 10:00 PM</span>
          </li>
          <li>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span class="fh-day">週日</span><span class="fh-time">10:00 AM – 5:00 PM</span>
          </li>
        </ul>
      </div>
    </div>
    <div class="intro-footer-bottom">
      <span>© 台南東光醫療器材醫療輔具租賃. All Rights Reserved.</span>
    </div>
  </footer>
"""

NAV_JS = """  <script>
    var hamburger = document.getElementById('hamburger');
    var mobileNav = document.getElementById('mobile-nav');
    hamburger.addEventListener('click', function () {
      var isOpen = mobileNav.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', isOpen);
    });
    function closeMobileNav() {
      mobileNav.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    }
    document.addEventListener('click', function (e) {
      if (!hamburger.contains(e.target) && !mobileNav.contains(e.target)) closeMobileNav();
    });
  </script>
"""


def render_page(*, title, description, path, og_type, og_image, jsonld,
                main_html, extra_js="", active_url=""):
    """組出完整 HTML 頁面。path 為不含開頭斜線的網站路徑（用於 canonical）。"""
    canonical = BASE_URL + url_path(path)
    jsonld_tag = ""
    if jsonld:
        jsonld_tag = ('<script type="application/ld+json">\n'
                      + json.dumps(jsonld, ensure_ascii=False, indent=2)
                      + "\n  </script>")
    return f"""<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{esc(title)}</title>
  <meta name="description" content="{esc(description)}">
  <link rel="canonical" href="{canonical}">

  <meta property="og:type" content="{og_type}">
  <meta property="og:site_name" content="台南東光儀器有限公司">
  <meta property="og:title" content="{esc(title)}">
  <meta property="og:description" content="{esc(description)}">
  <meta property="og:image" content="{og_image}">
  <meta property="og:url" content="{canonical}">

  <link rel="icon" href="/favicon.ico">
  {jsonld_tag}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/css/design-system.css">
  <link rel="stylesheet" href="/assets/css/intro.css">
  <link rel="stylesheet" href="/assets/css/catalog.css">
</head>
<body>

{page_header(active_url)}
  <main class="cat-main">
{main_html}
  </main>

{PAGE_FOOTER}
{NAV_JS}{extra_js}
</body>
</html>
"""


# ── 片段：麵包屑、商品卡片 ─────────────────────────────────

def breadcrumb(items):
    """items: [(text, url|None)]，最後一項為目前頁。"""
    parts = []
    for i, (text, url) in enumerate(items):
        if i:
            parts.append('<span class="cat-bc-sep">›</span>')
        if url:
            parts.append(f'<a href="{url}">{esc(text)}</a>')
        else:
            parts.append(f'<span class="cat-bc-current">{esc(text)}</span>')
    return ('<nav class="cat-breadcrumb" aria-label="麵包屑">'
            + "".join(parts) + "</nav>")


def breadcrumb_jsonld(items):
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": i + 1,
                "name": text,
                **({"item": BASE_URL + url} if url else {}),
            }
            for i, (text, url) in enumerate(items)
        ],
    }


def cover_of(product):
    return product["images"][0] if product["images"] else PLACEHOLDER


def price_html(product, big=False):
    cls = "cat-product-price" if big else "cat-card-price"
    if product["price"]:
        return f'<div class="{cls}">{esc(product["price"])}</div>'
    return f'<div class="{cls} cat-price-ask">歡迎洽詢</div>'


def product_card(product):
    tags = ""
    if product["tags"]:
        tags = ('<div class="cat-tags">'
                + "".join(f'<span class="cat-tag">{esc(t)}</span>'
                          for t in product["tags"][:3])
                + "</div>")
    brand = (f'<div class="cat-card-brand">{esc(product["brand"])}</div>'
             if product["brand"] else "")
    return f"""<a class="cat-card" href="{product['url']}">
  <div class="cat-card-photo">
    <img src="{url_path(cover_of(product))}" alt="{esc(product['name'])}" loading="lazy" width="400" height="300">
  </div>
  <div class="cat-card-body">
    <h3>{esc(product['name'])}</h3>
    {brand}
    {tags}
    {price_html(product)}
  </div>
</a>"""


def category_chips(active=None):
    chips = [f'<a class="cat-chip{" active" if active is None else ""}" href="/catalog/">全部商品</a>']
    for c in CATEGORY_NAMES:
        cls = " active" if c == active else ""
        chips.append(f'<a class="cat-chip{cls}" href="{url_path(f"category/{c}/")}">{esc(c)}</a>')
    return '<div class="cat-chips">' + "".join(chips) + "</div>"


# ── 各頁面產生 ──────────────────────────────────────────

CATALOG_SEARCH_JS = """  <script>
    (function () {
      var input = document.getElementById('cat-search-input');
      if (!input) return;
      var browse = document.getElementById('cat-browse');
      var resultsWrap = document.getElementById('cat-search-results');
      var grid = document.getElementById('cat-results-grid');
      var empty = document.getElementById('cat-no-results');
      var index = null;

      function esc(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
          return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
      }

      function card(p) {
        var tags = (p.tags || []).slice(0, 3).map(function (t) {
          return '<span class="cat-tag">' + esc(t) + '</span>';
        }).join('');
        return '<a class="cat-card" href="' + esc(p.url) + '">'
          + '<div class="cat-card-photo"><img src="' + esc(p.image) + '" alt="' + esc(p.name) + '" loading="lazy" width="400" height="300"></div>'
          + '<div class="cat-card-body"><h3>' + esc(p.name) + '</h3>'
          + (p.brand ? '<div class="cat-card-brand">' + esc(p.brand) + '</div>' : '')
          + (tags ? '<div class="cat-tags">' + tags + '</div>' : '')
          + (p.price ? '<div class="cat-card-price">' + esc(p.price) + '</div>'
                     : '<div class="cat-card-price cat-price-ask">歡迎洽詢</div>')
          + '</div></a>';
      }

      function run() {
        var q = input.value.trim().toLowerCase();
        if (!q) {
          resultsWrap.hidden = true;
          browse.hidden = false;
          return;
        }
        if (!index) return;
        var hits = index.filter(function (p) {
          var hay = [p.name, p.brand, p.category, p.subcategory]
            .concat(p.tags || []).join(' ').toLowerCase();
          return q.split(/\\s+/).every(function (w) { return hay.indexOf(w) !== -1; });
        });
        grid.innerHTML = hits.map(card).join('');
        empty.hidden = hits.length > 0;
        grid.hidden = hits.length === 0;
        resultsWrap.hidden = false;
        browse.hidden = true;
      }

      input.addEventListener('input', function () {
        if (index) { run(); return; }
        fetch('/catalog/search-index.json')
          .then(function (r) { return r.json(); })
          .then(function (d) { index = d.products || []; run(); })
          .catch(function () {});
      });
    })();
  </script>
"""


def build_catalog_page(products):
    by_cat = {c: [p for p in products if p["category"] == c] for c in CATEGORY_NAMES}
    blocks = []
    for cat_name, cat_desc, _cover in CATEGORIES:
        items = by_cat[cat_name]
        cat_url = url_path(f"category/{cat_name}/")
        if items:
            grid = ('<div class="cat-grid">'
                    + "\n".join(product_card(p) for p in items)
                    + "</div>")
        else:
            grid = (f'<div class="cat-empty">此分類商品陸續上架中，'
                    f'歡迎來電 <a href="tel:{PHONE_TEL}">{PHONE_DISPLAY}</a> 洽詢庫存與租賃方案。</div>')
        blocks.append(f"""<section class="cat-cat-block">
  <div class="cat-cat-head">
    <h2><a href="{cat_url}">{esc(cat_name)}</a><span class="cat-cat-sub">{esc(cat_desc)}</span></h2>
    <a class="cat-cat-more" href="{cat_url}">查看全部 →</a>
  </div>
  {grid}
</section>""")

    bc = [("首頁", "/"), ("商品目錄", None)]
    main = f"""    <div class="cat-section">
      <div class="cat-container">
        {breadcrumb(bc)}
        <div class="cat-page-head">
          <div class="intro-heading-label">商品目錄</div>
          <h1>全部商品</h1>
          <p>行動、衛浴、臥床、呼吸四大類醫療輔具，租賃與販售皆有提供。價格如有異動以門市為準，歡迎來電洽詢。</p>
        </div>
        <div class="cat-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="search" id="cat-search-input" placeholder="搜尋商品名稱、品牌或標籤…" aria-label="搜尋商品">
        </div>
        {category_chips(active=None)}
        <div id="cat-search-results" hidden>
          <div class="cat-grid" id="cat-results-grid"></div>
          <div class="cat-empty" id="cat-no-results" hidden>找不到符合的商品，歡迎來電 <a href="tel:{PHONE_TEL}">{PHONE_DISPLAY}</a> 詢問，門市品項更齊全。</div>
        </div>
        <div id="cat-browse">
{chr(10).join(blocks)}
        </div>
      </div>
    </div>
"""
    desc = ("東光醫療器材商品目錄：行動輔具、衛浴輔具、臥床輔具、呼吸輔具，"
            "輪椅、電動床、氣墊床、安全扶手等醫療輔具租賃與販售，台南在地超過二十年。")
    jsonld = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "CollectionPage",
                "name": f"商品目錄 — {SITE_NAME}",
                "url": BASE_URL + "/catalog/",
                "description": desc,
            },
            breadcrumb_jsonld(bc),
        ],
    }
    html_out = render_page(
        title=f"商品目錄 — {SITE_NAME}",
        description=desc,
        path="catalog/",
        og_type="website",
        og_image=f"{BASE_URL}/{LOGO}",
        jsonld=jsonld,
        main_html=main,
        extra_js=CATALOG_SEARCH_JS,
        active_url="/catalog/",
    )
    out = ROOT / "catalog" / "index.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html_out, encoding="utf-8")


def build_category_pages(products):
    for cat_name, cat_desc, _cover in CATEGORIES:
        items = [p for p in products if p["category"] == cat_name]
        cat_url = url_path(f"category/{cat_name}/")
        if items:
            content = ('<div class="cat-grid">'
                       + "\n".join(product_card(p) for p in items)
                       + "</div>")
        else:
            content = (f'<div class="cat-empty">此分類商品陸續上架中，門市備有多款現貨。<br>'
                       f'歡迎來電 <a href="tel:{PHONE_TEL}">{PHONE_DISPLAY}</a> 洽詢庫存與租賃方案。</div>')

        bc = [("首頁", "/"), ("商品目錄", "/catalog/"), (cat_name, None)]
        main = f"""    <div class="cat-section">
      <div class="cat-container">
        {breadcrumb(bc)}
        <div class="cat-page-head">
          <div class="intro-heading-label">商品分類</div>
          <h1>{esc(cat_name)}</h1>
          <p>{esc(cat_desc)}。租賃與販售皆有提供，可協助評估政府輔具補助資格。</p>
        </div>
        {category_chips(active=cat_name)}
        {content}
      </div>
    </div>
"""
        desc = (f"東光醫療器材{cat_name}商品目錄：{cat_desc}。"
                f"台南醫療輔具租賃與販售，歡迎來電 {PHONE_DISPLAY} 洽詢。")
        jsonld = {
            "@context": "https://schema.org",
            "@graph": [
                {
                    "@type": "CollectionPage",
                    "name": f"{cat_name} — {SITE_NAME}",
                    "url": BASE_URL + cat_url,
                    "description": desc,
                },
                breadcrumb_jsonld(bc),
            ],
        }
        html_out = render_page(
            title=f"{cat_name} — {SITE_NAME}",
            description=desc,
            path=f"category/{cat_name}/",
            og_type="website",
            og_image=f"{BASE_URL}/{LOGO}",
            jsonld=jsonld,
            main_html=main,
            active_url=cat_url,
        )
        out = ROOT / "category" / cat_name / "index.html"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(html_out, encoding="utf-8")


GALLERY_JS = """  <script>
    (function () {
      var main = document.getElementById('cat-gallery-img');
      var thumbs = document.querySelectorAll('.cat-gallery-thumbs button');
      thumbs.forEach(function (btn) {
        btn.addEventListener('click', function () {
          main.src = btn.dataset.src;
          thumbs.forEach(function (b) { b.classList.remove('active'); });
          btn.classList.add('active');
        });
      });
    })();
  </script>
"""


def product_jsonld(product, bc):
    cover = cover_of(product)
    data = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Product",
                "name": product["name"],
                "url": BASE_URL + product["url"],
                "image": [BASE_URL + url_path(img) for img in product["images"]]
                         or [BASE_URL + url_path(cover)],
                "description": md_to_text(product["body"], 200) or product["name"],
                "category": product["category"],
            },
            breadcrumb_jsonld(bc),
        ],
    }
    prod = data["@graph"][0]
    if product["brand"]:
        prod["brand"] = {"@type": "Brand", "name": product["brand"]}
    digits = re.sub(r"[^\d.]", "", product["price"] or "")
    if digits:
        prod["offers"] = {
            "@type": "Offer",
            "price": digits,
            "priceCurrency": "TWD",
            "availability": "https://schema.org/InStock",
            "url": BASE_URL + product["url"],
        }
    return data


def build_product_pages(products):
    for product in products:
        images = product["images"] or [PLACEHOLDER]
        main_img = images[0]
        thumbs = ""
        if len(images) > 1:
            btns = "".join(
                '<button type="button" data-src="{src}"{cls} aria-label="檢視圖片 {n}">'
                '<img src="{src}" alt="{name} 圖片 {n}" loading="lazy" '
                'width="120" height="120"></button>'.format(
                    src=url_path(img), n=i + 1, name=esc(product["name"]),
                    cls=' class="active"' if i == 0 else "")
                for i, img in enumerate(images))
            thumbs = f'<div class="cat-gallery-thumbs">{btns}</div>'

        specs_html = ""
        if product["specs"]:
            rows = "".join(
                f'<tr><th scope="row">{esc(d.get("label", ""))}</th>'
                f'<td>{esc(d.get("value", ""))}</td></tr>'
                for d in product["specs"])
            specs_html = f"""        <section class="cat-block">
          <h2>商品規格</h2>
          <div style="overflow-x:auto;">
            <table class="cat-spec-table">{rows}</table>
          </div>
        </section>
"""

        desc_html = ""
        body_html = md_to_html(product["body"])
        if body_html:
            desc_html = f"""        <section class="cat-block">
          <h2>商品說明</h2>
          <div class="cat-desc">
{body_html}
          </div>
        </section>
"""

        tags_html = ""
        if product["tags"]:
            tags_html = ('<div class="cat-tags">'
                         + "".join(f'<span class="cat-tag">{esc(t)}</span>'
                                   for t in product["tags"])
                         + "</div>")

        brand_html = ""
        if product["brand"]:
            brand_html = (f'<p class="cat-product-brand">品牌：'
                          f'<strong>{esc(product["brand"])}</strong></p>')

        price_note = ('<p class="cat-price-note">價格如有異動，以門市標示為準。</p>'
                      if product["price"] else
                      '<p class="cat-price-note">此商品採詢價報價，歡迎來電或親臨門市。</p>')

        related = [p for p in products
                   if p["category"] == product["category"] and p["slug"] != product["slug"]][:4]
        related_html = ""
        if related:
            related_html = f"""        <section class="cat-related">
          <h2>{esc(product['category'])}・其他商品</h2>
          <div class="cat-grid">
{chr(10).join(product_card(p) for p in related)}
          </div>
        </section>
"""

        cat_url = url_path(f"category/{product['category']}/")
        bc = [("首頁", "/"), ("商品目錄", "/catalog/"),
              (product["category"], cat_url), (product["name"], None)]

        main = f"""    <div class="cat-section">
      <div class="cat-container">
        {breadcrumb(bc)}
        <div class="cat-product-layout">
          <div class="cat-gallery">
            <div class="cat-gallery-main">
              <img id="cat-gallery-img" src="{url_path(main_img)}" alt="{esc(product['name'])}" width="800" height="600">
            </div>
            {thumbs}
            <p class="cat-photo-note">圖片僅供參考，實品請依門市現場為主</p>
          </div>
          <div class="cat-product-info">
            <h1>{esc(product['name'])}</h1>
            {brand_html}
            {price_html(product, big=True)}
            {price_note}
            {tags_html}
            <div class="cat-cta-box">
              <p>租賃、購買與政府輔具補助申請，歡迎來電由專人為您服務</p>
              <a href="tel:{PHONE_TEL}" class="cat-cta-call">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91A16 16 0 0 0 16 17l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 23.73 18z"/></svg>
                電話洽詢 {PHONE_DISPLAY}
              </a>
              <p class="cat-cta-sub">門市地址：701 台南市東區崇德路 677 &amp; 679 號（台南市立醫院對面）</p>
            </div>
          </div>
        </div>
{desc_html}{specs_html}{related_html}
      </div>
    </div>
"""
        summary = md_to_text(product["body"], 90)
        desc_parts = [f"{product['name']}"]
        if product["brand"]:
            desc_parts.append(f"品牌 {product['brand']}")
        desc_parts.append(f"售價 {product['price']}" if product["price"] else "歡迎洽詢")
        meta_desc = "，".join(desc_parts) + f"。{summary}｜台南東光醫療器材，電話 {PHONE_DISPLAY}。"

        cover = cover_of(product)
        og_image = (BASE_URL + url_path(cover) if product["images"]
                    else f"{BASE_URL}/{LOGO}")
        html_out = render_page(
            title=f"{product['name']} — {SITE_NAME}",
            description=meta_desc,
            path=f"product/{product['slug']}/",
            og_type="product",
            og_image=og_image,
            jsonld=product_jsonld(product, bc),
            main_html=main,
            extra_js=GALLERY_JS if len(images) > 1 else "",
            active_url=cat_url,
        )
        out = ROOT / "product" / product["slug"] / "index.html"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(html_out, encoding="utf-8")


def build_sitemap(products):
    today = date.today().isoformat()
    paths = ["", "catalog/"]
    paths += [f"category/{c}/" for c in CATEGORY_NAMES]
    paths += [f"product/{p['slug']}/" for p in products]
    entries = "\n".join(
        f"  <url>\n    <loc>{BASE_URL}{url_path(p) if p else '/'}</loc>\n"
        f"    <lastmod>{today}</lastmod>\n  </url>"
        for p in paths)
    xml = ('<?xml version="1.0" encoding="UTF-8"?>\n'
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
           f"{entries}\n</urlset>\n")
    (ROOT / "sitemap.xml").write_text(xml, encoding="utf-8")


def build_search_index(products):
    index = {
        "products": [
            {
                "name": p["name"],
                "brand": p["brand"],
                "tags": p["tags"],
                "category": p["category"],
                "subcategory": p["subcategory"],
                "price": p["price"],
                "url": p["url"],
                "image": url_path(cover_of(p)),
            }
            for p in products
        ]
    }
    out = ROOT / "catalog" / "search-index.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(index, ensure_ascii=False, indent=2),
                   encoding="utf-8")


# ── 主流程 ──────────────────────────────────────────────

def main():
    # 確保無圖商品的預設圖存在
    placeholder = ROOT / PLACEHOLDER
    if not placeholder.is_file():
        placeholder.parent.mkdir(parents=True, exist_ok=True)
        placeholder.write_text(PLACEHOLDER_SVG, encoding="utf-8")

    products = load_products()
    print(f"讀取 {len(products)} 項已發布商品")

    # 重建產出目錄（皆為純產生內容，可安全清除）
    for d in ("catalog", "category", "product"):
        shutil.rmtree(ROOT / d, ignore_errors=True)

    build_catalog_page(products)
    build_category_pages(products)
    build_product_pages(products)
    build_search_index(products)
    build_sitemap(products)

    pages = 1 + len(CATEGORIES) + len(products)
    print(f"✅ 產生完成：{pages} 個頁面（1 總覽 + {len(CATEGORIES)} 分類 + "
          f"{len(products)} 商品）、sitemap.xml、search-index.json")


if __name__ == "__main__":
    main()
