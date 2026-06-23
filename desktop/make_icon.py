"""
Генерация иконки приложения GraphLab.ico из бренд-палитры проекта.
Рисует упрощённый граф (вершины + рёбра) на градиентном фоне.
Требует Pillow (pip install pillow). Запуск: python make_icon.py
"""

import math
import os

from PIL import Image, ImageDraw

SIZE = 512
BG_TOP = (37, 99, 235)      # синий
BG_BOTTOM = (124, 58, 237)  # фиолетовый
NODE = (255, 255, 255)
NODE_ACCENT = (56, 224, 184)  # бирюзовый акцент
EDGE = (255, 255, 255)


def vertical_gradient(size, top, bottom):
    img = Image.new("RGB", (size, size), top)
    draw = ImageDraw.Draw(img)
    for y in range(size):
        t = y / (size - 1)
        r = round(top[0] + (bottom[0] - top[0]) * t)
        g = round(top[1] + (bottom[1] - top[1]) * t)
        b = round(top[2] + (bottom[2] - top[2]) * t)
        draw.line([(0, y), (size, y)], fill=(r, g, b))
    return img


def main():
    img = vertical_gradient(SIZE, BG_TOP, BG_BOTTOM).convert("RGBA")
    draw = ImageDraw.Draw(img)

    cx, cy, radius = SIZE / 2, SIZE / 2, SIZE * 0.30
    # 5 вершин по окружности
    nodes = []
    for i in range(5):
        angle = -math.pi / 2 + i * (2 * math.pi / 5)
        nodes.append((cx + radius * math.cos(angle), cy + radius * math.sin(angle)))

    # рёбра (кратчайший путь по периметру)
    edges = [(0, 1), (1, 2), (2, 3), (3, 4), (4, 0), (0, 2)]
    for a, b in edges:
        draw.line([nodes[a], nodes[b]], fill=EDGE + (180,), width=10)

    # вершины
    r = SIZE * 0.065
    for i, (x, y) in enumerate(nodes):
        color = NODE_ACCENT if i in (0, 2) else NODE
        draw.ellipse([x - r, y - r, x + r, y + r], fill=color)

    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "GraphLab.ico")
    sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    img.save(out, format="ICO", sizes=sizes)
    print("Saved:", out)


if __name__ == "__main__":
    main()
