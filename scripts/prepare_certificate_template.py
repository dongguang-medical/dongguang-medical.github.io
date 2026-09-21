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

簽名欄改用表格
  空白範本的簽名欄是一整段文字加底線，申請人姓名字數一變，後面的
  「身分證字號」就跟著位移。門市實際送件的檔案（0805 那份）已經把這一段
  改成表格，欄位固定不會跑。第二個參數就是拿那種檔案當來源，只取簽名
  表格與它的表格樣式，其餘內容一概不取。

會一併移除的東西（本 repo 為公開專案，不得含公司或個案資料）
  * 內文中的廠商名稱、地址、代表人 → 清空，改由使用者於頁面輸入
  * 簽名表格來源檔裡的個案姓名、身分證字號、電話 → 清空
  * docProps/core.xml 的作者與最後修改者
  * docProps/thumbnail.emf → 這是原始文件的縮圖，會把內容整個畫出來，
    連同 _rels/.rels 中的關聯一併移除

用法
  python3 scripts/prepare_certificate_template.py <空白範本.docx> [簽名表格來源.docx]

  衛生局日後改版時，拿新的範本重跑一次即可，通常不必改前端程式；
  但若欄位結構有變（段落順序、表格欄數），assets/js/subsidy.js 內
  對應的錨點也要一起確認。
"""

import json
import re
import sys
import zipfile
from pathlib import Path
from xml.dom import minidom

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "templates" / "certificate-template.json"

W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"

# 不放進模板的部件
DROP_PARTS = {"docProps/thumbnail.emf"}

# document.xml 中要清空的文字節點（完全比對 <w:t> 的內容）
# 左邊是原始檔案的文字，右邊是清空後保留的骨架（長度盡量維持，底線才不會縮短）。
TEXT_BLANKS = {
    "東光儀器有限公司": "        ",
    " 東光儀器有限公司": " ",
    "     地址:台南市東區崇德路677.679號  代表人:賈雯綉": "     地址:  代表人:",
    # 簽名表格來源檔（實際送件）裡的個案資料
    "許黃麗水": "    ",
    "R202588433": "          ",
    "0920958168": "          ",
}

# 公開前的防呆關鍵字
LEAK_WORDS = ("東光", "賈雯綉", "崇德路", "許黃麗水", "R202588433", "0920958168")


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


# ── 簽名表格 ──────────────────────────────────────────────────────────

def node_text(node) -> str:
    return "".join(t.firstChild.nodeValue if t.firstChild else ""
                   for t in node.getElementsByTagNameNS(W_NS, "t"))


def body_of(doc):
    return doc.getElementsByTagNameNS(W_NS, "body")[0]


def elements(node, name=None):
    return [c for c in node.childNodes
            if c.nodeType == 1 and (name is None or c.localName == name)]


def blanks_before(kids, index):
    """index 之前連續的空白段落數"""
    n = 0
    while index - n - 1 >= 0:
        node = kids[index - n - 1]
        if node.localName != "p" or node_text(node).strip():
            break
        n += 1
    return n


def splice_signature_table(doc_xml: str, ref_xml: str) -> str:
    """把範本裡「立契約人 … 乙方:」那一段換成來源檔的簽名表格。

    段落數量一變，第一頁的高度就跟著變，所以順便把表格前後的空白段落
    補到與來源檔相同，讓日期仍落在頁尾原本的位置。
    """
    doc = minidom.parseString(doc_xml)
    ref = minidom.parseString(ref_xml)

    ref_kids = elements(body_of(ref))
    ref_tbl = next((n for n in ref_kids
                    if n.localName == "tbl" and "立契約人" in node_text(n)), None)
    if ref_tbl is None:
        raise SystemExit("來源檔裡找不到含「立契約人」的簽名表格")
    ref_gap = blanks_before(ref_kids, ref_kids.index(ref_tbl))

    body = body_of(doc)
    kids = elements(body)
    start = next((i for i, n in enumerate(kids)
                  if n.localName == "p" and "立契約人" in node_text(n)), None)
    end = next((i for i, n in enumerate(kids)
                if n.localName == "p" and node_text(n).strip().startswith("乙方:")), None)
    if start is None or end is None or end < start:
        raise SystemExit("範本裡找不到「立契約人 … 乙方:」這一段")

    table = doc.importNode(ref_tbl, True)
    body.insertBefore(table, kids[start])
    for node in kids[start:end + 1]:
        body.removeChild(node)

    # 空白段落補到與來源檔一樣多
    kids = elements(body)
    at = kids.index(table)
    have = blanks_before(kids, at)
    if have and ref_gap > have:
        model = kids[at - 1]
        for _ in range(ref_gap - have):
            body.insertBefore(model.cloneNode(True), table)

    return doc.toxml()


def import_table_styles(styles_xml: str, ref_styles_xml: str) -> str:
    """把範本缺少的表格樣式從來源檔補進來（簽名表格會用到）。"""
    have = set(re.findall(r'w:styleId="([^"]+)"', styles_xml))
    add = [m.group(0) for m in re.finditer(r"<w:style\b.*?</w:style>", ref_styles_xml,
                                           re.S)
           if re.search(r'w:styleId="([^"]+)"', m.group(0)).group(1) not in have]
    if not add:
        return styles_xml
    return styles_xml.replace("</w:styles>", "".join(add) + "</w:styles>")


def main():
    # Windows 主控台預設 cp950，直接印中文／emoji 會 UnicodeEncodeError
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="replace")

    if len(sys.argv) not in (2, 3):
        print(__doc__)
        sys.exit(1)

    src = Path(sys.argv[1])
    if not src.is_file():
        print(f"找不到範本檔：{src}", file=sys.stderr)
        sys.exit(1)

    ref_parts = {}
    if len(sys.argv) == 3:
        ref_path = Path(sys.argv[2])
        if not ref_path.is_file():
            print(f"找不到簽名表格來源檔：{ref_path}", file=sys.stderr)
            sys.exit(1)
        with zipfile.ZipFile(ref_path) as rz:
            for name in ("word/document.xml", "word/styles.xml"):
                ref_parts[name] = rz.read(name).decode("utf-8")

    parts = {}

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
            parts[name] = text

    if ref_parts:
        parts["word/document.xml"] = splice_signature_table(
            parts["word/document.xml"], ref_parts["word/document.xml"])
        parts["word/styles.xml"] = import_table_styles(
            parts["word/styles.xml"], ref_parts["word/styles.xml"])

    blanked = 0
    for name in list(parts):
        if name == "word/document.xml":
            parts[name], blanked = blank_text_nodes(parts[name])
        elif name == "docProps/core.xml":
            parts[name] = strip_core_props(parts[name])
        elif name == "_rels/.rels":
            parts[name] = drop_thumbnail_rel(parts[name])

    # 防呆：確認公司與個案資料真的清乾淨了
    leaked = sorted({kw for kw in LEAK_WORDS for t in parts.values() if kw in t})
    if leaked:
        print(f"❌ 模板仍含應移除的資料：{leaked}，請檢查 TEXT_BLANKS 是否涵蓋",
              file=sys.stderr)
        sys.exit(1)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(parts, ensure_ascii=False, separators=(",", ":")),
                   encoding="utf-8")

    size = OUT.stat().st_size
    print(f"✅ 模板已產生：{OUT.relative_to(ROOT)}")
    print(f"   部件 {len(parts)} 個、清空欄位 {blanked} 處、檔案 {size:,} 位元組")
    print(f"   已移除：{'、'.join(sorted(DROP_PARTS))}")
    if ref_parts:
        print(f"   簽名欄已改用 {Path(sys.argv[2]).name} 的表格")


if __name__ == "__main__":
    main()
