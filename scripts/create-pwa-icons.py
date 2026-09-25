"""Generate the two raster install icons from the shapes in public/app-icon.svg."""

from pathlib import Path
from PIL import Image, ImageDraw

PUBLIC = Path(__file__).resolve().parents[1] / "public"
SCALE = 4
SIZE = 512 * SCALE

image = Image.new("RGB", (SIZE, SIZE), "#11161d")
draw = ImageDraw.Draw(image)


def box(x1, y1, x2, y2):
    return (x1 * SCALE, y1 * SCALE, x2 * SCALE, y2 * SCALE)


draw.rounded_rectangle(box(0, 0, 511, 511), radius=112 * SCALE, fill="#11161d")
draw.line([(144 * SCALE, 178 * SCALE), (144 * SCALE, 156 * SCALE)], fill="#f0b865", width=18 * SCALE)
draw.arc(box(144, 116, 224, 196), 180, 270, fill="#f0b865", width=18 * SCALE)
draw.line([(184 * SCALE, 116 * SCALE), (362 * SCALE, 116 * SCALE)], fill="#f0b865", width=18 * SCALE)
draw.rounded_rectangle(box(106, 170, 406, 376), radius=42 * SCALE, fill="#25313a", outline="#f0b865", width=18 * SCALE)
draw.rounded_rectangle(box(288, 232, 420, 318), radius=25 * SCALE, fill="#f0b865")
draw.ellipse(box(335, 261, 363, 289), fill="#25313a")

for size in (192, 512):
    image.resize((size, size), Image.Resampling.LANCZOS).save(PUBLIC / f"icon-{size}.png")
