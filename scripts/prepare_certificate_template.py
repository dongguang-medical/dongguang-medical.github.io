#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
prepare_certificate_template.py
───────────────────────────────
把台南市政府衛生局的「長照輔具服務給付證明暨契約書」Word 範本，
轉成 /subsidy/ 頁面產生 Word 檔時使用的模板資料。

為什麼要這樣做
  先前的做法是用程式從零重畫整份文件，欄寬、邊界、行距都是照著範本估的，
  印出來和正本有落差。改成直接沿用範本本身的 XML，只替換要填的文字，
  格式就必然與正本相同。

  瀏覽器端不做 ZIP 解壓（需要 inflate，容易出錯），所以在這裡先把 docx
  拆成各個部件，存成一份 JSON；前端載入後只需替換文字並重新打包。

會一併移除的東西（本 repo 為公開專案，不得含公司資料）
  * 內文中的廠商名稱、地址、代表人 → 清空，改由使用者於頁面輸入
  * docProps/core.xml 的作者與最後修改者
  * docProps/thumbnail.emf → 這是原始文件的縮圖，會把內容整個畫出來，
    連同 _rels/.rels 中的關聯一併移除

用法
  python3 scripts/prepare_certificate_template.py <原始範本.docx>

  衛生局日後改版時，拿新的範本重跑一次即可，通常不必改前端程式；
  但若欄位結構有變（段落順序、表格欄數），assets/js/subsidy.js 內
  對應的錨點也要一起確認。
"""

import json
import re
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "templates" / "certificate-template.json"

# 不放進模板的部件
DROP_PARTS = {"docProps/thumbnail.emf"}

# document.xml 中要清空的文字節點（完全比對 <w:t> 的內容）
# 左邊是原始範本的文字，右邊是清空後保留的骨架。
TEXT_BLANKS = {
    "東光儀器有限公司": "        ",
    " 東光儀器有限公司": " ",
    "     地址:台南市東區崇德路677.679號  代表人:賈雯綉": "     地址:  代表人:",
}


def blank_text_nodes(xml: str) -> tuple[str, int]:
    """把 TEXT_BLANKS 指定的 <w:t> 內容換成空白骨架。"""
    count = 0

    def repl(m):
        nonlocal count
        open_tag, text, close_tag = m.group(1), m.group(2), m.group(3)
        if text in TEXT_BLANKS:
            count += 1
            return open_tag + TEXT_BLANKS[text] + close_tag
        return m.group(0)

    xml = re.sub(r"(<w:t(?:\s[^>]*)?>)([^<]*)(</w:t>)", repl, xml)
    return xml, count


def strip_core_props(xml: str) -> str:
    xml = re.sub(r"<dc:creator>[^<]*</dc:creator>", "<dc:creator></dc:creator>", xml)
    xml = re.sub(r"<cp:lastModifiedBy>[^<]*</cp:lastModifiedBy>",
                 "<cp:lastModifiedBy></cp:lastModifiedBy>", xml)
    return xml


def drop_thumbnail_rel(xml: str) -> str:
    return re.sub(r"<Relationship[^>]*metadata/thumbnail[^>]*/>", "", xml)


def main():
    # Windows 主控台預設 cp950，直接印中文／emoji 會 UnicodeEncodeError
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="replace")

    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(1)

    src = Path(sys.argv[1])
    if not src.is_file():
        print(f"找不到範本檔：{src}", file=sys.stderr)
        sys.exit(1)

    parts = {}
    blanked = 0

    with zipfile.ZipFile(src) as z:
        names = [n for n in z.namelist() if n not in DROP_PARTS]
        for name in names:
            raw = z.read(name)
            try:
                text = raw.decode("utf-8")
            except UnicodeDecodeError:
                print(f"⚠️  {name} 不是 UTF-8 文字，模板不支援二進位部件，已略過",
                      file=sys.stderr)
                continue

            if name == "word/document.xml":
                text, blanked = blank_text_nodes(text)
            elif name == "docProps/core.xml":
                text = strip_core_props(text)
            elif name == "_rels/.rels":
                text = drop_thumbnail_rel(text)

            parts[name] = text

    # 防呆：確認公司資料真的清乾淨了
    leaked = sorted({kw for kw in ("東光", "賈雯綉", "崇德路")
                     for t in parts.values() if kw in t})
    if leaked:
        print(f"❌ 模板仍含公司資料：{leaked}，請檢查 TEXT_BLANKS 是否涵蓋",
              file=sys.stderr)
        sys.exit(1)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(parts, ensure_ascii=False, separators=(",", ":")),
                   encoding="utf-8")

    size = OUT.stat().st_size
    print(f"✅ 模板已產生：{OUT.relative_to(ROOT)}")
    print(f"   部件 {len(parts)} 個、清空欄位 {blanked} 處、檔案 {size:,} 位元組")
    print(f"   已移除：{'、'.join(sorted(DROP_PARTS))}")


if __name__ == "__main__":
    main()
