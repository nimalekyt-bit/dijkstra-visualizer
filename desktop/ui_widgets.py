"""
Кастомные виджеты на основе tkinter.Canvas для красивого мастера установки:
скруглённые кнопки с hover, свой чекбокс и анимируемый прогресс-бар.
Стандартный tkinter не умеет скругления и hover — поэтому рисуем сами.
"""

import tkinter as tk

FONT = "Segoe UI"


def round_rect_points(x1, y1, x2, y2, r):
    """Точки для сглаженного (smooth) полигона — имитация скруглённого прямоугольника."""
    return [
        x1 + r, y1,
        x2 - r, y1,
        x2, y1,
        x2, y1 + r,
        x2, y2 - r,
        x2, y2,
        x2 - r, y2,
        x1 + r, y2,
        x1, y2,
        x1, y2 - r,
        x1, y1 + r,
        x1, y1,
    ]


def lerp_color(c1, c2, t):
    r = int(c1[0] + (c2[0] - c1[0]) * t)
    g = int(c1[1] + (c2[1] - c1[1]) * t)
    b = int(c1[2] + (c2[2] - c1[2]) * t)
    return f"#{r:02x}{g:02x}{b:02x}"


class RoundedButton(tk.Canvas):
    def __init__(self, parent, text, command=None, primary=False,
                 width=150, height=46, bg="#0f172a",
                 fill="#6366f1", fill_hover="#8b5cf6",
                 ghost_fill="#182238", ghost_hover="#222d49",
                 fg="#ffffff", radius=14):
        super().__init__(parent, width=width, height=height, bg=bg,
                         highlightthickness=0, bd=0)
        self._text = text
        self._command = command
        self._primary = primary
        self._cw = width
        self._ch = height
        self._radius = radius
        self._fill = fill if primary else ghost_fill
        self._fill_hover = fill_hover if primary else ghost_hover
        self._fg = fg if primary else "#e8ecf5"
        self.configure(cursor="hand2")
        self._draw(False)
        self.bind("<Button-1>", self._on_click)
        self.bind("<Enter>", lambda e: self._draw(True))
        self.bind("<Leave>", lambda e: self._draw(False))

    def _draw(self, hover):
        self.delete("all")
        color = self._fill_hover if hover else self._fill
        self.create_polygon(
            round_rect_points(2, 2, self._cw - 2, self._ch - 2, self._radius),
            smooth=True, fill=color, outline="",
        )
        self.create_text(self._cw / 2, self._ch / 2, text=self._text,
                         fill=self._fg, font=(FONT, 11, "bold"))

    def _on_click(self, _event):
        if self._command:
            self._command()


class RoundedCheck(tk.Canvas):
    def __init__(self, parent, text, variable, bg="#0f172a",
                 accent="#38e0b8", fg="#e8ecf5", box="#0b1322",
                 border="#36406b", width=420, height=30):
        super().__init__(parent, width=width, height=height, bg=bg,
                         highlightthickness=0, bd=0)
        self._text = text
        self._var = variable
        self._accent = accent
        self._fg = fg
        self._box = box
        self._border = border
        self.configure(cursor="hand2")
        self.bind("<Button-1>", self._toggle)
        self._draw()

    def _toggle(self, _event):
        self._var.set(not self._var.get())
        self._draw()

    def _draw(self):
        self.delete("all")
        checked = bool(self._var.get())
        # бокс 22x22
        x1, y1, x2, y2 = 2, 4, 24, 26
        fill = self._accent if checked else self._box
        outline = self._accent if checked else self._border
        self.create_polygon(round_rect_points(x1, y1, x2, y2, 6),
                            smooth=True, fill=fill, outline=outline, width=1)
        if checked:
            # галочка
            self.create_line(8, 15, 12, 20, fill="#0b1322", width=2, capstyle="round")
            self.create_line(12, 20, 19, 9, fill="#0b1322", width=2, capstyle="round")
        self.create_text(36, 15, anchor="w", text=self._text, fill=self._fg,
                         font=(FONT, 11))


class RoundedProgress(tk.Canvas):
    def __init__(self, parent, width=480, height=14, bg="#0f172a",
                 trough="#0b1322", fill="#38e0b8"):
        super().__init__(parent, width=width, height=height, bg=bg,
                         highlightthickness=0, bd=0)
        self._cw = width
        self._ch = height
        self._trough = trough
        self._fill = fill
        self._value = 0.0
        self._draw()

    def set(self, value):
        self._value = max(0.0, min(100.0, value))
        self._draw()

    def _draw(self):
        self.delete("all")
        r = self._ch / 2
        self.create_polygon(round_rect_points(0, 0, self._cw, self._ch, r),
                            smooth=True, fill=self._trough, outline="")
        if self._value > 0:
            fill_w = max(self._ch, self._cw * self._value / 100.0)
            self.create_polygon(round_rect_points(0, 0, fill_w, self._ch, r),
                                smooth=True, fill=self._fill, outline="")
