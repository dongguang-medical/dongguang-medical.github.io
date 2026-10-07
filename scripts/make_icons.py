#!/usr/bin/env python3
"""由 assets/images/logo.png 產生各尺寸網站圖示。

產出：
  icon-96.png / icon-192.png   圓形徽章、四角透明（與 favicon.ico 同一張圖）
  apple-touch-icon.png         實心方塊、不透明，180x180

為什麼要額外給大張 PNG：
Google 搜尋結果把 favicon 放進一個約 28px 的圓底裡，而且「會把過大的圖縮小，
但不會把過小的圖放大」。favicon.ico 是多尺寸容器，最大只到 64px，Google 取到
小張就只能置中擺著，實測橘色只佔圓底的 64%，外圈露出一圈灰白。給一張夠大的
PNG，Google 縮到剛好鋪滿，透明的四角會被圓形遮罩裁掉，灰底就不會露出來。

為什麼 apple-touch-icon 要不透明：
iOS 把它貼到主畫面時會套圓角方形遮罩，透明的角會透出桌布。

用法：python3 scripts/make_icons.py
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "images" / "logo.png"

# 徽章金色外框內側的底色，取自 logo.png
FIELD = (240, 89, 37, 255)

ROUND_SIZES = [96, 192]   # 圓形、保留透明：瀏覽器與 Google 搜尋結果用
TOUCH_SIZE = 180          # 實心方塊：iOS 主畫面用


def main():
    badge = Image.open(SRC).convert("RGBA")

    for size in ROUND_SIZES:
        out = ROOT / f"icon-{size}.png"
        badge.resize((size, size), Image.LANCZOS).save(
            out, format="PNG", optimize=True)
        print(f"✅ {out.name}：{size}x{size}，圓形保留透明，"
              f"{out.stat().st_size:,} bytes")

    flat = Image.alpha_composite(Image.new("RGBA", badge.size, FIELD), badge)
    touch = flat.resize((TOUCH_SIZE, TOUCH_SIZE), Image.LANCZOS)
    assert touch.getchannel("A").getextrema() == (255, 255), "仍有透明像素"
    out = ROOT / "apple-touch-icon.png"
    touch.convert("RGB").save(out, format="PNG", optimize=True)
    print(f"✅ {out.name}：{TOUCH_SIZE}x{TOUCH_SIZE}，實心不透明，"
          f"{out.stat().st_size:,} bytes")


if __name__ == "__main__":
    main()
