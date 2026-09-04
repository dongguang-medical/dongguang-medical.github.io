#!/usr/bin/env python3
"""把蝦皮「銷售資訊」匯出檔的價格寫回 content/products/*.md。

用法：
  python3 scripts/import_shopee_prices.py <mass_update_sales_info_*.xlsx> [--dry-run]

匯出方式（賣家中心）：
  商品 → 批次工具 → 批次更新 → 類別選「銷售資訊」→ 下載

比對方式：
  商品 md 的 shopee_url（https://shopee.tw/product/<賣場ID>/<商品ID>）取出商品ID，
  對上匯出檔的「商品ID」欄。不做名稱模糊比對，對不上就跳過並列出來。

多規格商品（同一商品ID多列，各規格不同價）寫成價格區間：
  price 放最低價、price_max 放最高價；單一價格則清掉 price_max。

注意：蝦皮匯出的 xlsx 內含不合規的 <pane activePane="bottom_left">，
openpyxl 會拒讀，所以這裡直接解析 sheet XML。
"""

import argparse
import re
import sys
import zipfile
from collections import defaultdict
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent
PRODUCTS_DIR = ROOT / "content" / "products"
NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"

# 匯出檔的欄位位置（第 3 列是中文欄名，第 7 列起是資料）
COL_PRODUCT_ID = "A"
COL_PRODUCT_NAME = "B"
COL_PRICE = "G"
HEADER_ROW = 3
FIRST_DATA_ROW = 7


def read_rows(xlsx_path):
    """讀出 sheet 的所有列，回傳 {列號: {欄位字母: 值}}。"""
    with zipfile.ZipFile(xlsx_path) as z:
        names = z.namelist()
        shared = []
        if "xl/sharedStrings.xml" in names:
            root = ET.fromstring(z.read("xl/sharedStrings.xml"))
            shared = ["".join(t.text or "" for t in si.iter(NS + "t"))
                      for si in root.findall(NS + "si")]
        sheet_name = next(n for n in names
                          if re.match(r"xl/worksheets/sheet\d+\.xml$", n))
        root = ET.fromstring(z.read(sheet_name))

    rows = {}
    for row in root.iter(NS + "row"):
        cells = {}
        for c in row.findall(NS + "c"):
            col = re.match(r"[A-Z]+", c.get("r")).group(0)
            v = c.find(NS + "v")
            val = v.text if v is not None else None
            if c.get("t") == "s" and val is not None:
                val = shared[int(val)]
            if val not in (None, ""):
                cells[col] = val
        rows[int(row.get("r"))] = cells
    return rows


def load_shopee_prices(xlsx_path):
    """回傳 {蝦皮商品ID: (最低價, 最高價, 商品名稱, 規格數)}。"""
    rows = read_rows(xlsx_path)
    header = rows.get(HEADER_ROW, {})
    if header.get(COL_PRODUCT_ID) != "商品ID" or header.get(COL_PRICE) != "價格":
        sys.exit(f"❌ 欄位不如預期（A={header.get(COL_PRODUCT_ID)!r}、"
                 f"G={header.get(COL_PRICE)!r}），請確認匯出的是「銷售資訊」。")

    variants = defaultdict(list)
    for r in sorted(rows):
        if r < FIRST_DATA_ROW:
            continue
        cells = rows[r]
        pid, raw_price = cells.get(COL_PRODUCT_ID), cells.get(COL_PRICE)
        if not pid or raw_price is None:
            continue
        variants[pid].append((int(float(raw_price)), cells.get(COL_PRODUCT_NAME, "")))

    prices = {}
    for pid, rows_ in variants.items():
        values = sorted(v for v, _ in rows_)
        prices[pid] = (values[0], values[-1], rows_[0][1], len(rows_))
    return prices


def set_field(text, field, value):
    """設定 frontmatter 的某個欄位；value 為 None 表示移除該欄位。

    只動目標那一行，其餘內容與排版原封不動。欄位不存在時插在 price 之後，
    以維持既有檔案的欄位順序。
    """
    pattern = re.compile(rf"^{field}:.*$", re.M)
    if value is None:
        return pattern.sub("", text, count=1).replace("\n\n\n", "\n\n") \
            if pattern.search(text) else text
    line = f"{field}: {value}"
    if pattern.search(text):
        return pattern.sub(line, text, count=1)
    return re.sub(r"^(price:.*)$", rf"\1\n{line}", text, count=1, flags=re.M)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("xlsx", help="蝦皮「銷售資訊」匯出檔")
    ap.add_argument("--dry-run", action="store_true", help="只顯示會怎麼改，不寫檔")
    args = ap.parse_args()

    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="replace")

    prices = load_shopee_prices(args.xlsx)
    print(f"匯出檔讀到 {len(prices)} 項商品的價格")

    updated, unchanged, no_url, unmatched = [], 0, [], []
    for md in sorted(PRODUCTS_DIR.glob("*.md")):
        text = md.read_text(encoding="utf-8")
        m = re.search(r"^shopee_url: https://shopee\.tw/product/\d+/(\d+)",
                      text, re.M)
        if not m:
            no_url.append(md.name)
            continue
        pid = m.group(1)
        if pid not in prices:
            unmatched.append((md.name, pid))
            continue

        low, high, _, variant_count = prices[pid]
        new_text = set_field(text, "price", low)
        new_text = set_field(new_text, "price_max", high if high > low else None)
        if new_text == text:
            unchanged += 1
            continue
        updated.append((md.name, low, high, variant_count))
        if not args.dry_run:
            md.write_text(new_text, encoding="utf-8")

    print(f"\n{'（試跑）' if args.dry_run else ''}更新 {len(updated)} 項、"
          f"價格未變 {unchanged} 項")
    ranged = [u for u in updated if u[2] > u[1]]
    print(f"其中價格區間 {len(ranged)} 項、單一價格 {len(updated) - len(ranged)} 項")
    if unmatched:
        print(f"\n⚠️  有 shopee_url 但匯出檔查無此商品ID（{len(unmatched)} 項）：")
        for name, pid in unmatched[:20]:
            print(f"    {name}（{pid}）")
    print(f"\n未填 shopee_url 而跳過的商品：{len(no_url)} 項")

    site_ids = {re.search(r"/product/\d+/(\d+)", t).group(1)
                for t in (p.read_text(encoding="utf-8")
                          for p in PRODUCTS_DIR.glob("*.md"))
                if re.search(r"^shopee_url: https://shopee\.tw/", t, re.M)}
    only_shopee = set(prices) - site_ids
    if only_shopee:
        print(f"蝦皮有、網站沒有的商品：{len(only_shopee)} 項（可考慮補上架）")


if __name__ == "__main__":
    main()
