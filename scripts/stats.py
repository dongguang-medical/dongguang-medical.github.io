#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
stats.py
────────
商品資料統計報表。直接讀 content/ 底下的 Markdown，不需要資料庫。

用法：
  python3 scripts/stats.py                # 印出總覽報表
  python3 scripts/stats.py --missing-images   # 缺圖清單（依品牌分組）
  python3 scripts/stats.py --csv out.csv      # 匯出全部商品成 CSV（可用 Excel 開）

缺圖清單的用途：向原廠索取商品照時，一個品牌一封信，
直接把該品牌的品項清單貼進信裡。
"""

import argparse
import csv
import sys
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_catalog import (CATEGORY_NAMES, load_brands,  # noqa: E402
                           load_products)


def fix_console():
    """Windows 主控台預設 cp950，直接印中文會 UnicodeEncodeError。"""
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="replace")


def price_value(p):
    """售價本身就是數字了（沒填則為 None，網站顯示「歡迎洽詢」）。"""
    return p["price"]


def bar(n, total, width=28):
    filled = round(width * n / total) if total else 0
    return "█" * filled + "·" * (width - filled)


def report_overview(products, brands):
    total = len(products)
    print(f"商品總數：{total} 項　品牌數：{len(brands)} 個\n")

    print("── 主分類分布 " + "─" * 40)
    cats = Counter(p["category"] for p in products)
    for c in CATEGORY_NAMES:
        n = cats.get(c, 0)
        print(f"  {c:<8}{n:>4}  {bar(n, total)}  {n / total * 100:4.1f}%")

    print("\n── 提供方式 " + "─" * 42)
    rent = [p for p in products if p["rentable"]]
    print(f"  可租賃      {len(rent):>4}  {bar(len(rent), total)}"
          f"  {len(rent) / total * 100:4.1f}%")
    has_rent_price = sum(1 for p in rent if p["rental_price"])
    print(f"    └ 已填租金 {has_rent_price:>4} / {len(rent)}")
    online = [p for p in products if "線上選購" in p["offering"]]
    print(f"  線上選購    {len(online):>4}  {bar(len(online), total)}"
          f"  {len(online) / total * 100:4.1f}%")
    no_url = sum(1 for p in online if not p["shopee_url"])
    if no_url:
        print(f"    └ ⚠ 有 {no_url} 項勾了線上選購卻沒填蝦皮連結")

    print("\n── 補助資格 " + "─" * 42)
    sub = [p for p in products if p["subsidy"]]
    print(f"  可申請補助  {len(sub):>4}  {bar(len(sub), total)}"
          f"  {len(sub) / total * 100:4.1f}%")
    for name in ("長照2.0輔具補助", "身障輔具補助"):
        n = sum(1 for p in products if name in p["subsidy"])
        print(f"    └ {name}  {n}")

    print("\n── 圖片 " + "─" * 46)
    no_img = [p for p in products if not p["images"]]
    print(f"  缺圖        {len(no_img):>4}  {bar(len(no_img), total)}"
          f"  {len(no_img) / total * 100:4.1f}%")
    pending = [p for p in products
               if p["images"] and p.get("image_status") == "暫用外部圖待替換"]
    own = [p for p in products
           if p["images"] and p.get("image_status") != "暫用外部圖待替換"]
    print(f"  自有圖片    {len(own):>4}  {bar(len(own), total)}"
          f"  {len(own) / total * 100:4.1f}%")
    print(f"  待替換      {len(pending):>4}  {bar(len(pending), total)}"
          f"  {len(pending) / total * 100:4.1f}%")
    if pending:
        by_brand = Counter(p["brand"] or "(未指定品牌)" for p in pending)
        top = "、".join(f"{n}({c})" for n, c in by_brand.most_common(5))
        print(f"    └ 待替換最多的品牌：{top}")

    print("\n── 品牌 Top 15 " + "─" * 39)
    by_brand = Counter(p["brand"] or "(未指定品牌)" for p in products)
    for name, n in by_brand.most_common(15):
        slug = next((p["brand_slug"] for p in products if p["brand"] == name), "")
        status = brands.get(slug, {}).get("asset_status", "—")
        print(f"  {name:<16}{n:>4} 項    素材：{status}")

    print("\n── 圖片素材取得進度 " + "─" * 34)
    prog = Counter(b["asset_status"] or "未填" for b in brands.values())
    for k, v in prog.most_common():
        print(f"  {k:<12}{v:>3} 個品牌")

    print("\n── 價格帶分布 " + "─" * 40)
    bands = [(0, 500, "500 以下"), (500, 1000, "500–1,000"),
             (1000, 3000, "1,000–3,000"), (3000, 10000, "3,000–10,000"),
             (10000, 30000, "10,000–30,000"), (30000, 10 ** 9, "30,000 以上")]
    priced = [v for v in (price_value(p) for p in products) if v is not None]
    for lo, hi, label in bands:
        n = sum(1 for v in priced if lo <= v < hi)
        print(f"  {label:<14}{n:>4}  {bar(n, len(priced))}")
    noprice = total - len(priced)
    if noprice:
        print(f"  未標價        {noprice:>4}")

    print("\n── 商品數最少的子分類（可能需要補貨或併類）" + "─" * 12)
    subs = Counter((p["category"], p["subcategory"]) for p in products)
    for (c, s), n in sorted(subs.items(), key=lambda x: x[1])[:8]:
        print(f"  {c} › {s:<14}{n:>3} 項")


def report_missing_images(products, brands):
    missing = defaultdict(list)
    for p in products:
        if not p["images"]:
            missing[p["brand"] or "(未指定品牌)"].append(p)

    print(f"缺圖商品共 {sum(len(v) for v in missing.values())} 項"
          f"，分屬 {len(missing)} 個品牌\n")
    for name, items in sorted(missing.items(), key=lambda x: -len(x[1])):
        slug = items[0]["brand_slug"]
        info = brands.get(slug, {})
        head = f"## {name}（{len(items)} 項）"
        extra = []
        if info.get("website"):
            extra.append(info["website"])
        if info.get("contact"):
            extra.append(info["contact"])
        if info.get("asset_status"):
            extra.append(f"素材狀態：{info['asset_status']}")
        print(head + ("　" + "　|　".join(extra) if extra else ""))
        for p in items:
            print(f"  - {p['name']}")
        print()


def export_csv(products, path):
    cols = ["slug", "name", "category", "subcategory", "brand", "price",
            "offering", "rentable", "rental_price", "subsidy",
            "images", "url"]
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["代碼", "商品名稱", "主分類", "子分類", "品牌", "售價",
                    "提供方式", "可租賃", "租金", "蝦皮連結", "可申請補助",
                    "圖片數", "網址"])
        for p in products:
            w.writerow([
                p["slug"], p["name"], p["category"], p["subcategory"],
                p["brand"], p["price"], "、".join(p["offering"]),
                "是" if p["rentable"] else "", p["rental_price"],
                p["shopee_url"], "、".join(p["subsidy"]),
                len(p["images"]), p["url"],
            ])
    print(f"✅ 已匯出 {len(products)} 筆到 {path}（UTF-8 BOM，Excel 可直接開）")


def main():
    fix_console()
    ap = argparse.ArgumentParser()
    ap.add_argument("--missing-images", action="store_true",
                    help="列出缺圖商品，依品牌分組")
    ap.add_argument("--csv", metavar="檔名", help="匯出全部商品成 CSV")
    args = ap.parse_args()

    brands = load_brands()
    products = load_products(brands)
    if not products:
        sys.exit("沒有讀到任何商品")

    if args.csv:
        export_csv(products, args.csv)
    elif args.missing_images:
        report_missing_images(products, brands)
    else:
        report_overview(products, brands)


if __name__ == "__main__":
    main()
