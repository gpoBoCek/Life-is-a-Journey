#!/usr/bin/env python3
"""App icons: an amber '@' (the traveller) on a road, on black, with a soft phosphor glow."""
import pathlib
from PIL import Image, ImageDraw, ImageFont, ImageFilter
ROOT = pathlib.Path(__file__).parent
OUT = ROOT / 'icons'
OUT.mkdir(exist_ok=True)
FG = (255, 159, 58)
DIM = (196, 122, 44)
FONT = str(ROOT / 'fonts' / 'VT323-Regular.ttf')

def draw(size, safe):
    """safe: fraction of the canvas the artwork may use (maskable icons are cropped to a circle)."""
    S = size * 4  # draw large, then scale down for smooth edges
    img = Image.new('RGB', (S, S), (0, 0, 0))
    layer = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    area = S * safe
    big = ImageFont.truetype(FONT, int(area * 0.95))
    small = ImageFont.truetype(FONT, int(area * 0.22))
    cx, cy = S / 2, S / 2
    d.text((cx, cy - area * 0.1), '@', font=big, fill=FG, anchor='mm')
    d.text((cx, cy + area * 0.38), '===---?', font=small, fill=DIM, anchor='mm')
    glow = layer.filter(ImageFilter.GaussianBlur(S * 0.02))
    img.paste(glow, (0, 0), glow)
    img.paste(layer, (0, 0), layer)
    return img.resize((size, size), Image.LANCZOS)

for size in (192, 512):
    draw(size, 0.9).save(OUT / f'icon-{size}.png')
draw(512, 0.62).save(OUT / 'icon-maskable-512.png')
draw(180, 0.9).save(OUT / 'apple-touch-icon.png')
print('icons written')
