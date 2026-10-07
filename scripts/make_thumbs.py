#!/usr/bin/env python3
"""由 assets/uploads/ 產生 assets/thumbs/ 的卡片縮圖（WebP）。

為什麼需要：商品卡在桌機輪播是 240px 寬、手機 200px，但原圖是 800～1024px，
等於送了十倍的像素過去。首頁一次放 84 張卡，原圖合計 4.6 MB，桌機因為畫面高、
一次有好幾排輪播進入載入範圍，圖就一張一張慢慢浮出來。

480px 對應 2 倍螢幕下的 240px 卡片，WebP 約為原檔的 19%。

搭配 build_catalog.py 的 product_card()，用 <picture> 輸出：
支援 WebP 的瀏覽器只抓縮圖，不支援的退回原圖——不會有圖破掉，
也不必為了相容再多產生一套 JPEG。

用法：python3 scripts/make_thumbs.py [--force]
預設只處理原圖比縮圖新、或縮圖還不存在的，重跑很快。
"""
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / "assets" / "uploads"
OUT_DIR = ROOT / "assets" / "thumbs"

MAX_EDGE = 480      # 卡片 240px × 2 倍螢幕
QUALITY = 80


def main():
    force = "--force" in sys.argv
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    srcs = sorted(p for p in SRC_DIR.iterdir()
                  if p.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp"))
    made = skipped = 0
    src_bytes = out_bytes = 0

    for src in srcs:
        out = OUT_DIR / (src.stem + ".webp")
        if out.is_file() and not force and out.stat().st_mtime >= src.stat().st_mtime:
            skipped += 1
            src_bytes += src.stat().st_size
            out_bytes += out.stat().st_size
            continue
        with Image.open(src) as im:
            im = im.convert("RGB")
            im.thumbnail((MAX_EDGE, MAX_EDGE), Image.LANCZOS)
            im.save(out, "WEBP", quality=QUALITY, method=6)
        made += 1
        src_bytes += src.stat().st_size
        out_bytes += out.stat().st_size

    # 原圖已經刪掉、縮圖還留著的，一併清掉
    stems = {p.stem for p in srcs}
    removed = 0
    for old in OUT_DIR.glob("*.webp"):
        if old.stem not in stems:
            old.unlink()
            removed += 1

    print(f"✅ 縮圖 {len(srcs)} 張（新產生 {made}、沿用 {skipped}"
          + (f"、清除 {removed}" if removed else "") + "）")
    print(f"   {src_bytes/1048576:.1f} MB → {out_bytes/1048576:.1f} MB"
          f"（{out_bytes/src_bytes:.0%}）")


if __name__ == "__main__":
    main()
