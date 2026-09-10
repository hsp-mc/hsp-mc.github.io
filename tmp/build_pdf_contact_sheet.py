from pathlib import Path
from PIL import Image, ImageDraw
import sys

source = Path(sys.argv[1])
output = Path(sys.argv[2])
columns = int(sys.argv[3])
pages = sorted(source.glob("*.png"))
thumb_w, thumb_h = 310, 438
label_h, gap = 26, 14
rows = (len(pages) + columns - 1) // columns
sheet = Image.new("RGB", (columns * (thumb_w + gap) + gap, rows * (thumb_h + label_h + gap) + gap), "#d7dce2")
draw = ImageDraw.Draw(sheet)

for index, page_path in enumerate(pages):
    page = Image.open(page_path).convert("RGB")
    page.thumbnail((thumb_w, thumb_h), Image.Resampling.LANCZOS)
    x = gap + (index % columns) * (thumb_w + gap)
    y = gap + (index // columns) * (thumb_h + label_h + gap)
    sheet.paste(page, (x, y))
    draw.text((x, y + thumb_h + 5), f"Page {index + 1}", fill="#111827")

sheet.save(output, quality=92)
