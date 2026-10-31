#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
prepare_certificate_template.py
───────────────────────────────
把「長照輔具服務給付證明暨契約書」的 Word 檔，轉成 /subsidy/ 頁面產生
Word 檔時使用的模板資料（assets/templates/certificate-template.json）。

為什麼要這樣做
  前端不從零重畫文件，而是直接沿用範本本身的 XML，只替換要填的文字，
  格式就必然與正本相同。瀏覽器端不做 ZIP 解壓（需要 inflate，容易出錯），
  所以在這裡先把 docx 拆成各個部件，存成一份 JSON；前端載入後只需替換
  文字並重新打包。

來源檔
  拿一份門市實際送件、已填好的檔案當來源（115 年 11 月改用的新版樣式：
  明細表七欄「編號／輔具/修繕項目名稱／產品廠牌/型號/序號／購買金額／
  申請給付金額／民眾部分負擔金額／超額自費」，下方三條註記，簽名欄是表格）。
  程式會把所有填寫內容清掉，只留下格式骨架：

  * 所有加底線的 run（申請人姓名、廠商名稱、電話……都是加底線的填寫欄）
    → 換成等寬的空白，底線長度維持
  * 乙方那一行底線後面的地址、代表人 → 只留「地址:  代表人:」
  * 明細表的資料列 → 清空文字，保留兩列（前端會依筆數增減）
  * 照片頁的「購買項目：」後面的品項名稱 → 清空
  * 日期 → 留空白
  * docProps/core.xml 的作者與最後修改者
  * docProps/thumbnail.emf → 原始文件的縮圖，會把內容整個畫出來，
    連同 _rels/.rels 中的關聯一併移除

  本 repo 為公開專案，不得含公司或個案資料。清完會用關鍵字再檢查一次；
  個案姓名、電話等不要寫進本檔，執行時用 --check 帶入即可：

用法
  python3 scripts/prepare_certificate_template.py <來源.docx> [--check 姓名 --check 電話 …]

  衛生局日後改版時，拿新的檔案重跑一次即可，通常不必改前端程式；
  但若欄位結構有變（段落順序、表格欄數），assets/js/subsidy.js 內
  對應的錨點也要一起確認。
"""

import argparse
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

# 明細表保留的空白資料列數（前端依實際筆數複製或刪除）
BLANK_ROWS = 2

# 公開前的防呆關鍵字（公司資料）；個案資料用 --check 帶入，不寫進本檔
LEAK_WORDS = ("東光", "賈雯綉", "崇德路")


# ── DOM 小工具 ─────────────────────────────────────────────────────────

def tagged(node, name):
    return node.getElementsByTagNameNS(W_NS, name)


def node_text(node) -> str:
    return "".join(t.firstChild.nodeValue if t.firstChild else ""
                   for t in tagged(node, "t"))


def elements(node, name=None):
    return [c for c in node.childNodes
            if c.nodeType == 1 and (name is None or c.localName == name)]


def child(node, name):
    return next(iter(elements(node, name)), None)


def is_underlined(run) -> bool:
    rpr = child(run, "rPr")
    return rpr is not None and child(rpr, "u") is not None


def set_run_text(run, value: str):
    ts = elements(run, "t")
    if not ts:
        return
    t = ts[0]
    t.setAttribute("xml:space", "preserve")
    while t.firstChild:
        t.removeChild(t.firstChild)
    t.appendChild(run.ownerDocument.createTextNode(value))
    for extra in ts[1:]:
        run.removeChild(extra)


def blank_width(text: str) -> str:
    """等寬空白：全形字算兩格，底線長度才不會縮短"""
    return "".join("  " if ord(ch) > 0x2E80 else " " for ch in text)


# ── 各區塊的清除 ───────────────────────────────────────────────────────

def blank_underlines(body) -> int:
    n = 0
    for run in tagged(body, "r"):
        if is_underlined(run):
            txt = node_text(run)
            if txt.strip():
                set_run_text(run, blank_width(txt))
                n += 1
    return n


def blank_vendor_line(body):
    """乙方: ___ 地址:… 代表人:… → 地址、代表人只留標籤"""
    for p in tagged(body, "p"):
        if not node_text(p).strip().startswith("乙方"):
            continue
        runs = list(tagged(p, "r"))
        seen_u = False
        first = None
        for r in runs:
            if is_underlined(r):
                seen_u = True
                continue
            if seen_u:
                if first is None:
                    first = r
                    set_run_text(r, "     地址:  代表人:")
                else:
                    set_run_text(r, "")
        if first is None:
            raise SystemExit("找不到乙方那一行的地址、代表人")
        return
    raise SystemExit("找不到「乙方:」那一行")


def clear_cell(tc):
    for p in elements(tc, "p"):
        for n in list(p.childNodes):
            if n.nodeType == 1 and n.localName in ("r", "proofErr", "bookmarkStart",
                                                    "bookmarkEnd"):
                p.removeChild(n)


def blank_detail_table(body):
    tbl = next((t for t in tagged(body, "tbl") if "編號" in node_text(t)), None)
    if tbl is None:
        raise SystemExit("找不到含「編號」的明細表")
    rows = elements(tbl, "tr")
    if len(rows) < 2:
        raise SystemExit("明細表沒有資料列可以當骨架")
    data = rows[1:]
    for tr in data:
        for tc in elements(tr, "tc"):
            clear_cell(tc)
    # 列數補到或刪到 BLANK_ROWS
    while len(data) < BLANK_ROWS:
        clone = data[-1].cloneNode(True)
        tbl.appendChild(clone)
        data.append(clone)
    for tr in data[BLANK_ROWS:]:
        tbl.removeChild(tr)


def blank_photo_items(body):
    for p in tagged(body, "p"):
        if node_text(p).startswith("購買項目"):
            runs = list(tagged(p, "r"))
            if runs:
                set_run_text(runs[-1], " ")
                # 「購買項目：」之後若被拆成好幾個 run，中間的也清掉
                for r in runs[1:-1]:
                    set_run_text(r, "")


def blank_date(body):
    for p in tagged(body, "p"):
        if "中   華   民   國" in node_text(p):
            runs = list(tagged(p, "r"))
            set_run_text(runs[0], "中   華   民   國       年       月         日")
            for r in runs[1:]:
                set_run_text(r, "")
            return
    raise SystemExit("找不到日期那一行")


def blank_document(xml: str) -> tuple[str, int]:
    doc = minidom.parseString(xml)
    body = tagged(doc, "body")[0]
    blank_detail_table(body)
    blank_vendor_line(body)
    n = blank_underlines(body)
    blank_photo_items(body)
    blank_date(body)
    return doc.toxml(), n


def strip_core_props(xml: str) -> str:
    xml = re.sub(r"<dc:creator>[^<]*</dc:creator>", "<dc:creator></dc:creator>", xml)
    xml = re.sub(r"<cp:lastModifiedBy>[^<]*</cp:lastModifiedBy>",
                 "<cp:lastModifiedBy></cp:lastModifiedBy>", xml)
    xml = re.sub(r"<cp:lastPrinted>[^<]*</cp:lastPrinted>", "", xml)
    return xml


def drop_thumbnail_rel(xml: str) -> str:
    return re.sub(r"<Relationship[^>]*metadata/thumbnail[^>]*/>", "", xml)


def drop_thumbnail_type(xml: str) -> str:
    return re.sub(r'<Override[^>]*thumbnail[^>]*/>', "", xml)


def main():
    # Windows 主控台預設 cp950，直接印中文／emoji 會 UnicodeEncodeError
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="replace")

    ap = argparse.ArgumentParser(description="產生給付證明 Word 模板")
    ap.add_argument("source", help="來源 .docx（已填好的實際送件檔即可）")
    ap.add_argument("--check", action="append", default=[],
                    help="額外檢查不得殘留的字詞（個案姓名、電話、序號…），可重複")
    args = ap.parse_args()

    src = Path(args.source)
    if not src.is_file():
        print(f"找不到來源檔：{src}", file=sys.stderr)
        sys.exit(1)

    parts = {}
    with zipfile.ZipFile(src) as z:
        for name in z.namelist():
            if name in DROP_PARTS:
                continue
            raw = z.read(name)
            try:
                parts[name] = raw.decode("utf-8")
            except UnicodeDecodeError:
                print(f"⚠️  {name} 不是 UTF-8 文字，模板不支援二進位部件，已略過",
                      file=sys.stderr)

    parts["word/document.xml"], blanked = blank_document(parts["word/document.xml"])
    if "docProps/core.xml" in parts:
        parts["docProps/core.xml"] = strip_core_props(parts["docProps/core.xml"])
    if "_rels/.rels" in parts:
        parts["_rels/.rels"] = drop_thumbnail_rel(parts["_rels/.rels"])
    if "[Content_Types].xml" in parts:
        parts["[Content_Types].xml"] = drop_thumbnail_type(parts["[Content_Types].xml"])

    # 防呆：確認公司與個案資料真的清乾淨了
    words = list(LEAK_WORDS) + [w for w in args.check if w]
    leaked = sorted({kw for kw in words for t in parts.values() if kw in t})
    if leaked:
        print(f"❌ 模板仍含應移除的資料：{leaked}", file=sys.stderr)
        sys.exit(1)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(parts, ensure_ascii=False, separators=(",", ":")),
                   encoding="utf-8")

    size = OUT.stat().st_size
    print(f"✅ 模板已產生：{OUT.relative_to(ROOT)}")
    print(f"   部件 {len(parts)} 個、清空底線欄位 {blanked} 處、檔案 {size:,} 位元組")
    print(f"   已移除：{'、'.join(sorted(DROP_PARTS))}")


if __name__ == "__main__":
    main()
