#!/usr/bin/env python3
"""由 assets/images/logo.png 產生 apple-touch-icon.png。

分工：
  favicon.ico        圓形徽章、四角透明——瀏覽器分頁用，看起來才是個圓章
  apple-touch-icon   實心方塊、完全不透明——iOS 加到主畫面用，
                     同時也是 Google 搜尋結果會參考的 favicon 來源之一

為什麼要實心：Google 搜尋結果（深色模式尤其明顯）會把 favicon 襯在淺色圓底上，
四角透明的圖會讓那層底色透出來，看起來像徽章外面鑲了一圈白邊。實心的圖
（例如 Facebook 的 icon）就沒有這個現象。

Google 會從多個 rel 裡自己挑一個用，挑哪個不由網站決定，所以這是「有機會改善」
而非保證。至少分頁那邊維持圓形不受影響。

用法：python3 scripts/make_app_icon.py
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "images" / "logo.png"
OUT = ROOT / "apple-touch-icon.png"

# 徽章金色外框內側的底色，取自 logo.png
FIELD = (240, 89, 37, 255)

# iOS 取 180x180；也是 Google 偏好的 48 倍數
SIZE = 180


def main():
    badge = Image.open(SRC).convert("RGBA")
    flat = Image.alpha_composite(Image.new("RGBA", badge.size, FIELD), badge)
    icon = flat.resize((SIZE, SIZE), Image.LANCZOS)

    assert icon.getchannel("A").getextrema() == (255, 255), "輸出仍有透明像素"
    icon.convert("RGB").save(OUT, format="PNG", optimize=True)
    print(f"✅ {OUT.relative_to(ROOT)}：{SIZE}x{SIZE}，全不透明，"
          f"{OUT.stat().st_size:,} bytes")


if __name__ == "__main__":
    main()
