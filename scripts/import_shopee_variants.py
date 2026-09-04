#!/usr/bin/env python3
"""把蝦皮「媒體資訊」匯出檔的規格選項補進 content/products/*.md 的 specs。

用法：
  python3 scripts/import_shopee_variants.py <mass_update_media_info_*.xlsx> [--dry-run]

匯出方式（賣家中心）：
  商品 → 批次工具 → 批次更新 → 類別選「媒體資訊」→ 下載

只「補」不「改」：網站上已經有的規格是人工整理過的（含型號、條碼、
適用範圍等蝦皮沒有的資訊），品質比蝦皮的選項名稱好，因此一律不覆蓋。
只有該商品完全沒有對應規格欄位時才寫入。

蝦皮的「規格名稱」欄很髒——有未翻譯的 Variation、錯字（尺吋／尺丁）、
也有直接把商品名塞進去的。因此標籤要正規化，認不得的一律叫「規格選項」。
"""

import argparse
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from import_shopee_prices import read_rows  # noqa: E402  共用 xlsx 讀取

ROOT = Path(__file__).resolve().parent.parent
PRODUCTS_DIR = ROOT / "content" / "products"

COL_PRODUCT_ID = "A"
COL_VARIATION_NAME = "P"
# 「選項 N 的名稱」欄；中間夾著「選項 N 的圖片」，所以是隔一欄取一次
COL_OPTIONS = ["Q", "S", "U", "W", "Y", "AA", "AC", "AE", "AG", "AI", "AK", "AM"]
HEADER_ROW = 3
FIRST_DATA_ROW = 7

GENERIC_LABEL = "規格選項"
# 蝦皮的規格名稱正規化：錯字修掉，太籠統或未翻譯的收斂成通用標籤
LABEL_ALIASES = {
    "尺吋": "尺寸", "尺寸寸": "尺寸", "尺丁": "尺寸",
    "Variation": GENERIC_LABEL, "選項": GENERIC_LABEL, "商品選項": GENERIC_LABEL,
}
# 只有這些標籤夠具體、值得單獨當一欄顯示，其餘一律歸到「規格選項」
KNOWN_LABELS = {"尺寸", "顏色", "規格", "款式", "包裝", "型號",
                "長度", "數量", "樣式", "品項", "廠牌", "材質", "容量"}


# 選項全是這種形狀時，就算蝦皮那欄填的是 Variation 也認定為尺寸
_SIZE_RE = re.compile(r"^(XS|S|M|L|XL|XXL|XXXL|[234]XL)$", re.I)


def normalize_label(raw, options=()):
    label = LABEL_ALIASES.get((raw or "").strip(), (raw or "").strip())
    if label in KNOWN_LABELS:
        return label
    if options and all(_SIZE_RE.match(o.strip()) for o in options):
        return "尺寸"
    return GENERIC_LABEL


def load_variants(xlsx_path):
    """回傳 {蝦皮商品ID: (標籤, [選項…])}，沒有規格的商品不收。"""
    rows = read_rows(xlsx_path)
    header = rows.get(HEADER_ROW, {})
    if header.get(COL_PRODUCT_ID) != "商品ID" or header.get(COL_VARIATION_NAME) != "規格名稱 1":
        sys.exit(f"❌ 欄位不如預期（A={header.get(COL_PRODUCT_ID)!r}、"
                 f"P={header.get(COL_VARIATION_NAME)!r}），請確認匯出的是「媒體資訊」。")

    out = {}
    for r in sorted(rows):
        if r < FIRST_DATA_ROW:
            continue
        cells = rows[r]
        pid = cells.get(COL_PRODUCT_ID)
        if not pid:
            continue
        options = [cells[c].strip() for c in COL_OPTIONS if cells.get(c)]
        if options:
            out[pid] = (normalize_label(cells.get(COL_VARIATION_NAME), options),
                        options)
    return out


def existing_spec_labels(frontmatter):
    return set(re.findall(r"^  - label: (.+)$", frontmatter, re.M))


def yaml_value(text):
    """組出安全的 YAML 值。

    產生器的 frontmatter 解析器會把值裡「空白 + #」之後當註解砍掉，
    引號也必須成對，因此這兩者先中和掉。
    """
    safe = text.replace('"', "＂").replace(" #", " ＃")
    return f'"{safe}"'


def add_spec(text, label, value):
    """在 specs 清單末端加一列；原本是 specs: [] 就改成清單。"""
    entry = f"  - label: {label}\n    value: {yaml_value(value)}"
    if re.search(r"^specs: \[\]$", text, re.M):
        return re.sub(r"^specs: \[\]$", f"specs:\n{entry}", text, count=1, flags=re.M)
    # 既有清單：插在 specs 區塊的最後一項之後（也就是下一個頂層 key 之前）
    m = re.search(r"^specs:\n((?:  .*\n)+)", text, re.M)
    if not m:
        return text
    return text[:m.end(1)] + entry + "\n" + text[m.end(1):]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("xlsx", help="蝦皮「媒體資訊」匯出檔")
    ap.add_argument("--dry-run", action="store_true", help="只顯示會怎麼改，不寫檔")
    args = ap.parse_args()

    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="replace")

    variants = load_variants(args.xlsx)
    print(f"匯出檔讀到 {len(variants)} 項有規格選項的商品")

    added, skipped_has, skipped_thin, unmatched = [], 0, 0, 0
    for md in sorted(PRODUCTS_DIR.glob("*.md")):
        text = md.read_text(encoding="utf-8")
        m = re.search(r"^shopee_url: https://shopee\.tw/product/\d+/(\d+)", text, re.M)
        if not m:
            continue
        entry = variants.get(m.group(1))
        if entry is None:
            unmatched += 1
            continue
        label, options = entry

        labels = existing_spec_labels(text.split("---")[1])
        if label in labels or GENERIC_LABEL in labels:
            skipped_has += 1          # 已有人工整理過的規格，不動
            continue
        if len(options) == 1 and label == GENERIC_LABEL:
            skipped_thin += 1         # 單一選項又沒有具體標籤，寫了是雜訊
            continue

        new_text = add_spec(text, label, "｜".join(options))
        if new_text == text:
            continue
        added.append((md.name, label, options))
        if not args.dry_run:
            md.write_text(new_text, encoding="utf-8")

    print(f"\n{'（試跑）' if args.dry_run else ''}補上規格 {len(added)} 項")
    print(f"已有規格而略過 {skipped_has} 項、選項太少而略過 {skipped_thin} 項、"
          f"蝦皮無規格 {unmatched} 項")
    by_label = {}
    for _, label, _ in added:
        by_label[label] = by_label.get(label, 0) + 1
    print("標籤分布：" + "、".join(f"{k} {v}" for k, v in
                                sorted(by_label.items(), key=lambda x: -x[1])))
    print("\n前幾筆：")
    for name, label, options in added[:8]:
        print(f"  {name:22s} {label}: {'｜'.join(options)[:52]}")


if __name__ == "__main__":
    main()
