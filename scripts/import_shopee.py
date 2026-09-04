#!/usr/bin/env python3
"""把蝦皮匯出檔的價格與規格寫回 content/products/*.md。

用法：
  python3 scripts/import_shopee.py --sales <mass_update_sales_info_*.xlsx> \\
                                   [--media <mass_update_media_info_*.xlsx>] \\
                                   [--dry-run]

匯出方式（賣家中心 → 商品 → 批次工具 → 批次更新）：
  銷售資訊 = 每個規格一列，含價格 → 決定 price / variants
  媒體資訊 = 每個商品一列，含規格名稱 → 決定 variant_label（規格表欄名）

比對只靠 shopee_url 裡的商品ID 對匯出檔的商品ID，不做名稱模糊比對。

寫入規則（兩者互斥，避免同一筆價格有兩個來源）：
  單一規格 → price 填數字，清掉 variants
  多個規格 → variants 一列一個規格各自帶價，price 清空（網站顯示的
             價格區間由 variants 自動推導）

蝦皮匯出的 xlsx 內含不合規的 <pane activePane="bottom_left">，openpyxl
會拒讀，所以這裡直接解析 sheet XML。
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

HEADER_ROW = 3
FIRST_DATA_ROW = 7

# 銷售資訊
S_PRODUCT_ID, S_VARIANT_NAME, S_PRICE = "A", "D", "G"
# 媒體資訊
M_PRODUCT_ID, M_VARIATION_NAME = "A", "P"

GENERIC_LABEL = "規格"
LABEL_ALIASES = {
    "尺吋": "尺寸", "尺寸寸": "尺寸", "尺丁": "尺寸",
    "Variation": GENERIC_LABEL, "選項": GENERIC_LABEL, "商品選項": GENERIC_LABEL,
}
# 只有這些名稱夠具體才當欄名用，其餘（含把商品名塞進該欄的髒資料）一律用通用值
KNOWN_LABELS = {"尺寸", "顏色", "規格", "款式", "包裝", "型號",
                "長度", "數量", "樣式", "品項", "廠牌", "材質", "容量"}
_SIZE_RE = re.compile(r"^(XS|S|M|L|XL|XXL|XXXL|[234]XL)$", re.I)


def read_rows(xlsx_path):
    """讀出 sheet 的所有列，回傳 {列號: {欄位字母: 值}}。"""
    with zipfile.ZipFile(xlsx_path) as z:
        names = z.namelist()
        shared = []
        if "xl/sharedStrings.xml" in names:
            root = ET.fromstring(z.read("xl/sharedStrings.xml"))
            shared = ["".join(t.text or "" for t in si.iter(NS + "t"))
                      for si in root.findall(NS + "si")]
        sheet = next(n for n in names
                     if re.match(r"xl/worksheets/sheet\d+\.xml$", n))
        root = ET.fromstring(z.read(sheet))

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


def check_header(rows, col, expected, kind):
    got = rows.get(HEADER_ROW, {}).get(col)
    if got != expected:
        sys.exit(f"❌ {kind}檔的 {col} 欄是 {got!r}，預期 {expected!r}，"
                 f"請確認匯出的類別正確。")


def load_sales(path):
    """回傳 {商品ID: [(規格名稱, 價格), …]}，順序照匯出檔。"""
    rows = read_rows(path)
    check_header(rows, S_PRODUCT_ID, "商品ID", "銷售資訊")
    check_header(rows, S_PRICE, "價格", "銷售資訊")

    out = defaultdict(list)
    for r in sorted(rows):
        if r < FIRST_DATA_ROW:
            continue
        cells = rows[r]
        pid, raw_price = cells.get(S_PRODUCT_ID), cells.get(S_PRICE)
        if not pid or raw_price is None:
            continue
        out[pid].append(((cells.get(S_VARIANT_NAME) or "").strip(),
                         int(float(raw_price))))
    return out


def load_variant_labels(path):
    """回傳 {商品ID: 規格欄名}，名稱髒的收斂成通用值。"""
    rows = read_rows(path)
    check_header(rows, M_PRODUCT_ID, "商品ID", "媒體資訊")
    check_header(rows, M_VARIATION_NAME, "規格名稱 1", "媒體資訊")

    out = {}
    for r in sorted(rows):
        if r < FIRST_DATA_ROW:
            continue
        cells = rows[r]
        pid = cells.get(M_PRODUCT_ID)
        if pid:
            raw = (cells.get(M_VARIATION_NAME) or "").strip()
            out[pid] = LABEL_ALIASES.get(raw, raw)
    return out


def pick_variant_label(raw_label, variant_names):
    """決定規格表的欄名：認得的名稱照用，全是 S/M/L 就叫尺寸，其餘用通用值。"""
    if raw_label in KNOWN_LABELS:
        return raw_label
    if variant_names and all(_SIZE_RE.match(n) for n in variant_names):
        return "尺寸"
    return GENERIC_LABEL


def yaml_value(text):
    """組出安全的 YAML 值。

    產生器的 frontmatter 解析器會把「空白 + #」之後當註解砍掉，引號也必須
    成對，這兩者先中和掉。
    """
    return '"' + text.replace('"', "＂").replace(" #", " ＃") + '"'


def set_scalar(text, field, value):
    """設定或清空一個純量欄位；欄位不存在時插在 price 之後。"""
    line = f"{field}: {value}"
    pattern = re.compile(rf"^{field}:.*$", re.M)
    if pattern.search(text):
        return pattern.sub(line, text, count=1)
    return re.sub(r"^(price:.*)$", rf"\1\n{line}", text, count=1, flags=re.M)


def drop_block(text, field):
    """移除一個清單欄位（含其所有縮排項目）。"""
    return re.sub(rf"^{field}:(?: \[\])?\n(?:  .*\n)*", "", text,
                  count=1, flags=re.M)


def set_variants(text, variants):
    """寫入 variants 清單；空清單則整段移除。"""
    text = drop_block(text, "variants")
    if not variants:
        return text
    block = "variants:\n" + "".join(
        f"  - label: {yaml_value(name)}\n    price: {price}\n"
        for name, price in variants)
    # 放在 price 之後，維持「價格相關欄位擺一起」的欄位順序
    return re.sub(r"^(price:.*\n)", rf"\1{block}", text, count=1, flags=re.M)


def drop_duplicate_spec(text, variant_names):
    """移除只是把規格選項列一遍的 spec（variants 已完整表達，留著是重複）。"""
    wanted = {n for n in variant_names if n}

    def repl(m):
        value = m.group("value").strip().strip('"')
        return "" if set(value.split("｜")) == wanted else m.group(0)

    text = re.sub(r"^  - label: .+\n    value: (?P<value>.+)\n", repl,
                  text, flags=re.M)
    # specs 底下被清空就還原成空清單，維持欄位契約
    return re.sub(r"^specs:\n(?=\w)", "specs: []\n", text, flags=re.M)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sales", required=True, help="蝦皮「銷售資訊」匯出檔")
    ap.add_argument("--media", help="蝦皮「媒體資訊」匯出檔（提供規格欄名）")
    ap.add_argument("--dry-run", action="store_true", help="只顯示會怎麼改，不寫檔")
    args = ap.parse_args()

    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="replace")

    sales = load_sales(args.sales)
    labels = load_variant_labels(args.media) if args.media else {}
    print(f"銷售資訊讀到 {len(sales)} 項商品"
          + (f"、媒體資訊讀到 {len(labels)} 項的規格名稱" if labels else ""))

    single, multi, unchanged, unmatched = 0, [], 0, 0
    for md in sorted(PRODUCTS_DIR.glob("*.md")):
        text = md.read_text(encoding="utf-8")
        m = re.search(r"^shopee_url: https://shopee\.tw/product/\d+/(\d+)",
                      text, re.M)
        if not m:
            continue
        rows = sales.get(m.group(1))
        if not rows:
            unmatched += 1
            continue

        # 蝦皮的匯出順序是隨機的（會出現 L、S、M），依價格排序讓表格好讀；
        # 同價則維持原順序
        named = sorted(((n, p) for n, p in rows if n),
                       key=lambda np: (np[1], [n for n, _ in rows].index(np[0])))
        if len(rows) > 1 and len(named) == len(rows):
            names = [n for n, _ in named]
            label = pick_variant_label(labels.get(m.group(1), ""), names)
            new_text = set_scalar(text, "price", '""')
            new_text = set_variants(new_text, named)
            new_text = set_scalar(new_text, "variant_label", yaml_value(label))
            new_text = drop_duplicate_spec(new_text, names)
            kind = (md.name, label, named)
        else:
            new_text = set_scalar(text, "price", min(p for _, p in rows))
            new_text = set_variants(new_text, [])
            new_text = re.sub(r"^variant_label:.*\n", "", new_text, flags=re.M)
            kind = None

        new_text = re.sub(r"^price_max:.*\n", "", new_text, flags=re.M)
        if new_text == text:
            unchanged += 1
            continue
        if kind:
            multi.append(kind)
        else:
            single += 1
        if not args.dry_run:
            md.write_text(new_text, encoding="utf-8")

    print(f"\n{'（試跑）' if args.dry_run else ''}多規格 {len(multi)} 項、"
          f"單一價格 {single} 項、無變更 {unchanged} 項、匯出檔查無 {unmatched} 項")
    by_label = defaultdict(int)
    for _, label, _ in multi:
        by_label[label] += 1
    if by_label:
        print("規格欄名分布：" + "、".join(
            f"{k} {v}" for k, v in sorted(by_label.items(), key=lambda x: -x[1])))
    print("\n前幾筆多規格：")
    for name, label, named in multi[:6]:
        detail = "、".join(f"{n}={p}" for n, p in named[:4])
        print(f"  {name:22s} [{label}] {detail}")


if __name__ == "__main__":
    main()
