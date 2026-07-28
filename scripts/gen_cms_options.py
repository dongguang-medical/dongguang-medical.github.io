#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gen_cms_options.py
──────────────────
把 scripts/data/taxonomy.tsv 的分類階層同步到 admin/config.yml 的下拉選單。

分類階層只有一份真相來源（taxonomy.tsv）。後台設定檔的選項是產生物，
不要手改——改了下次執行本腳本就會被覆蓋。

用法：
  python3 scripts/gen_cms_options.py            # 寫入 admin/config.yml
  python3 scripts/gen_cms_options.py --check    # 只檢查是否同步（CI 用）
"""

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TAXONOMY = ROOT / "scripts" / "data" / "taxonomy.tsv"
CONFIG = ROOT / "admin" / "config.yml"

START = "# >>> TAXONOMY_OPTIONS_START"
END = "# <<< TAXONOMY_OPTIONS_END"


def load_taxonomy():
    """回傳 [(主分類, 子分類), ...]，維持檔案中的順序。"""
    if not TAXONOMY.is_file():
        sys.exit(f"找不到分類階層檔：{TAXONOMY}")
    pairs = []
    for lineno, raw in enumerate(TAXONOMY.read_text(encoding="utf-8").splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split("\t")
        if len(parts) != 2:
            sys.exit(f"{TAXONOMY.name} 第 {lineno} 行格式錯誤：{raw}")
        cat, sub = (p.strip() for p in parts)
        if (cat, sub) in pairs:
            sys.exit(f"{TAXONOMY.name} 第 {lineno} 行重複：{cat}/{sub}")
        pairs.append((cat, sub))
    return pairs


def render_options(pairs, indent=8):
    """產生 Decap/Sveltia select 的 options 區塊。"""
    pad = " " * indent
    lines = [f"{pad}options:"]
    current = None
    for cat, sub in pairs:
        if cat != current:
            lines.append(f"{pad}  # {cat}")
            current = cat
        # label 用「›」呈現階層，value 用「/」讓建置腳本切開
        lines.append(f'{pad}  - {{ label: "{cat} › {sub}", value: "{cat}/{sub}" }}')
    return "\n".join(lines)


def splice(text, block):
    """把 block 換進 config.yml 的標記區間。"""
    lines = text.split("\n")
    try:
        i = next(n for n, l in enumerate(lines) if START in l)
        j = next(n for n, l in enumerate(lines) if END in l)
    except StopIteration:
        sys.exit(f"{CONFIG.name} 找不到 {START} / {END} 標記")
    if j <= i:
        sys.exit(f"{CONFIG.name} 的標記順序顛倒")
    return "\n".join(lines[:i + 1] + block.split("\n") + lines[j:])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true",
                    help="只檢查是否同步，不寫檔（不同步時以非零結束碼離開）")
    args = ap.parse_args()

    pairs = load_taxonomy()
    current = CONFIG.read_text(encoding="utf-8")
    updated = splice(current, render_options(pairs))

    cats = len({c for c, _ in pairs})
    if args.check:
        if current != updated:
            print("❌ admin/config.yml 的分類選項與 taxonomy.tsv 不同步，"
                  "請執行 python scripts/gen_cms_options.py", file=sys.stderr)
            return 1
        print(f"✅ 已同步（{cats} 主分類 / {len(pairs)} 子分類）")
        return 0

    if current == updated:
        print(f"選項已是最新（{cats} 主分類 / {len(pairs)} 子分類），未變更")
        return 0
    CONFIG.write_text(updated, encoding="utf-8")
    print(f"✅ 已更新 admin/config.yml：{cats} 主分類 / {len(pairs)} 子分類")
    return 0


if __name__ == "__main__":
    sys.exit(main())
