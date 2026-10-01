#!/usr/bin/env python3
"""由 assets/images/logo.png 產生 favicon.ico。

logo.png 是圓形徽章配透明四角——放在網站的米色底上剛好，但當 favicon 就不行：
Google 搜尋結果（尤其深色模式）會把 favicon 放在淺色圓底上，透明的角會讓那層
底色透出來，看起來像徽章外面鑲了一圈白邊。Facebook 的 icon 是實心不透明的，
所以沒有這個問題。

這支把透明區域填成徽章自己的橘底，輸出完全不透明的方形 icon。圖本身不縮放、
不裁切，只是把角落補滿。

用法：python3 scripts/make_favicon.py
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "images" / "logo.png"
OUT = ROOT / "favicon.ico"

# 徽章金色外框內側的底色，取自 logo.png（見本檔 git 紀錄的取樣方式）
FIELD = (240, 89, 37, 255)

# Google 建議 favicon 為 48 的倍數的正方形；一併附上瀏覽器分頁常用的小尺寸
SIZES = [16, 32, 48, 64, 96, 128]


def main():
    badge = Image.open(SRC).convert("RGBA")
    flat = Image.alpha_composite(Image.new("RGBA", badge.size, FIELD), badge)

    frames = [flat.resize((s, s), Image.LANCZOS) for s in SIZES]
    frames[-1].save(OUT, format="ICO",
                    sizes=[(s, s) for s in SIZES], append_images=frames[:-1])

    alpha = flat.getchannel("A")
    assert alpha.getextrema() == (255, 255), "輸出仍有透明像素"
    print(f"✅ {OUT.relative_to(ROOT)}：{', '.join(f'{s}x{s}' for s in SIZES)}，"
          f"全不透明，{OUT.stat().st_size:,} bytes")


if __name__ == "__main__":
    main()
