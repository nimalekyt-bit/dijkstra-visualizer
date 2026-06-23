"""
Графический мастер установки GraphLab на tkinter.

Возможности:
  * кастомный тёмный заголовок окна (без системной рамки) с перетаскиванием,
    кнопками «свернуть»/«закрыть» и иконкой в панели задач;
  * боковая градиентная панель с логотипом и индикатором шагов;
  * шаги: приветствие → о программе → параметры → установка → готово;
  * скруглённые кнопки с hover, кастомный чекбокс, анимированный прогресс-бар;
  * лёгкая анимация появления при переключении шагов.

Сделан на tkinter (stdlib): надёжно работает в сборке PyInstaller и не зависит
от моста WebView2.
"""

import os
import sys
import math
import threading
import tkinter as tk
from tkinter import filedialog

from PIL import Image, ImageDraw, ImageTk

import installer
from ui_widgets import RoundedButton, RoundedCheck, RoundedProgress

# Палитра (Aurora / Glass)
BG = "#0f172a"
TITLEBAR = "#0b1322"
PANEL = "#182238"
TEXT = "#e8ecf5"
MUTED = "#9aa4bf"
ACCENT = "#38e0b8"
PRIMARY = "#6366f1"
PRIMARY_2 = "#8b5cf6"
ENTRY_BG = "#0b1322"
FONT = "Segoe UI"

WIN_W, WIN_H = 820, 560
TITLE_H = 40
BANNER_W = 280
BANNER_H = WIN_H - TITLE_H
STEPS = ["Добро пожаловать", "Параметры", "Установка"]


def _resource(name):
    base = sys._MEIPASS if getattr(sys, "frozen", False) else os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base, name)


class Wizard:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Установка — GraphLab")
        self.root.configure(bg=BG)
        self.root.resizable(False, False)
        try:
            self.root.iconbitmap(_resource("GraphLab.ico"))
        except Exception:
            pass
        self._center(WIN_W, WIN_H)

        self.path_var = tk.StringVar(value=installer.default_install_dir())
        self.desktop_var = tk.BooleanVar(value=True)
        self.startmenu_var = tk.BooleanVar(value=True)

        self._shared = {"percent": 0, "status": "", "done": False, "error": None}
        self._disp = 0.0
        self._frames = {}
        self._minimized = False

        # кастомный заголовок вместо системной рамки
        self.root.overrideredirect(True)
        self.root.after(10, self._set_appwindow)
        self.root.bind("<Map>", self._on_map)

        self._build_titlebar()

        body = tk.Frame(self.root, bg=BG)
        body.pack(fill="both", expand=True)

        self.banner = tk.Canvas(body, width=BANNER_W, height=BANNER_H,
                                highlightthickness=0, bd=0)
        self.banner.pack(side="left", fill="y")

        self.content = tk.Frame(body, bg=BG)
        self.content.pack(side="left", fill="both", expand=True, padx=40, pady=34)

        self._build_welcome()
        self._build_about()
        self._build_options()
        self._build_progress()
        self._build_done()

        self._current = "welcome"
        self.root.bind("<Return>", self._on_enter)
        self.root.bind("<Escape>", lambda e: self._cancel())
        self._show("welcome")

    # ------------------------------------------------------------------ #
    def _center(self, w, h):
        sw = self.root.winfo_screenwidth()
        sh = self.root.winfo_screenheight()
        self.root.geometry(f"{w}x{h}+{(sw - w) // 2}+{(sh - h) // 3}")

    # ---- кастомный заголовок ----------------------------------------- #
    def _build_titlebar(self):
        bar = tk.Frame(self.root, bg=TITLEBAR, height=TITLE_H)
        bar.pack(side="top", fill="x")
        bar.pack_propagate(False)

        glyph = tk.Canvas(bar, width=24, height=24, bg=TITLEBAR, highlightthickness=0, bd=0)
        glyph.pack(side="left", padx=(12, 8))
        self._tb_glyph = self._render_titlebar_glyph()
        glyph.create_image(12, 12, image=self._tb_glyph)

        title = tk.Label(bar, text="Установка — GraphLab", bg=TITLEBAR, fg="#c2c9f2",
                         font=(FONT, 10))
        title.pack(side="left")

        self._title_btn(bar, "✕", self._cancel, hover="#e25555")
        self._title_btn(bar, "—", self._minimize, hover="#222d49")

        for widget in (bar, title, glyph):
            widget.bind("<Button-1>", self._start_move)
            widget.bind("<B1-Motion>", self._on_move)

    def _title_btn(self, parent, text, command, hover):
        lbl = tk.Label(parent, text=text, bg=TITLEBAR, fg="#c2c9f2",
                       font=(FONT, 11, "bold"), width=4)
        lbl.pack(side="right", fill="y")
        lbl.bind("<Button-1>", lambda e: command())
        lbl.bind("<Enter>", lambda e: lbl.config(bg=hover, fg="#ffffff"))
        lbl.bind("<Leave>", lambda e: lbl.config(bg=TITLEBAR, fg="#c2c9f2"))
        return lbl

    def _render_titlebar_glyph(self):
        """Маленький сглаженный граф-глиф для заголовка (24x24)."""
        s = 4
        size = 24 * s
        img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        pts = [(12, 4), (20, 10), (17, 20), (7, 20), (4, 10)]
        pts = [(x * s, y * s) for x, y in pts]
        for a, b in [(0, 1), (1, 2), (2, 3), (3, 4), (4, 0), (0, 2)]:
            d.line([pts[a], pts[b]], fill=(124, 134, 200, 255), width=int(1.3 * s))
        r = int(2.4 * s)
        for i, (x, y) in enumerate(pts):
            col = (56, 224, 184, 255) if i in (0, 2) else (255, 255, 255, 255)
            d.ellipse([x - r, y - r, x + r, y + r], fill=col)
        img = img.resize((24, 24), Image.LANCZOS)
        return ImageTk.PhotoImage(img)

    def _start_move(self, event):
        self._mx, self._my = event.x_root, event.y_root
        self._wx, self._wy = self.root.winfo_x(), self.root.winfo_y()

    def _on_move(self, event):
        dx = event.x_root - self._mx
        dy = event.y_root - self._my
        self.root.geometry(f"+{self._wx + dx}+{self._wy + dy}")

    def _set_appwindow(self):
        """Показать окно без рамки в панели задач (WS_EX_APPWINDOW)."""
        try:
            from ctypes import windll

            GWL_EXSTYLE = -20
            WS_EX_APPWINDOW = 0x00040000
            WS_EX_TOOLWINDOW = 0x00000080
            get_l = getattr(windll.user32, "GetWindowLongPtrW", windll.user32.GetWindowLongW)
            set_l = getattr(windll.user32, "SetWindowLongPtrW", windll.user32.SetWindowLongW)
            hwnd = windll.user32.GetParent(self.root.winfo_id())
            style = get_l(hwnd, GWL_EXSTYLE)
            style = (style & ~WS_EX_TOOLWINDOW) | WS_EX_APPWINDOW
            set_l(hwnd, GWL_EXSTYLE, style)
            self.root.withdraw()
            self.root.after(10, self.root.deiconify)
        except Exception:
            pass

    def _minimize(self):
        self._minimized = True
        self.root.update_idletasks()
        self.root.overrideredirect(False)
        self.root.iconify()

    def _on_map(self, _event):
        # после разворачивания из панели задач возвращаем безрамочный режим
        if self._minimized:
            self._minimized = False
            self.root.overrideredirect(True)
            self.root.after(10, self._set_appwindow)

    # ---- боковая панель ---------------------------------------------- #
    def _render_shapes(self, active_idx):
        """Сглаженные фигуры панели (градиент, глиф, кружки) через Pillow."""
        s = 3
        w, h = BANNER_W * s, BANNER_H * s
        img = Image.new("RGB", (w, h))
        d = ImageDraw.Draw(img)

        top = (37, 99, 235)
        bottom = (124, 58, 237)
        for y in range(h):
            t = y / h
            r = int(top[0] + (bottom[0] - top[0]) * t)
            g = int(top[1] + (bottom[1] - top[1]) * t)
            b = int(top[2] + (bottom[2] - top[2]) * t)
            d.line([(0, y), (w, y)], fill=(r, g, b))

        accent = (56, 224, 184)
        dark = (11, 19, 34)
        cx = BANNER_W / 2 * s
        rad = 34 * s
        cyy = 72 * s
        nodes = []
        for i in range(5):
            ang = -math.pi / 2 + i * (2 * math.pi / 5)
            nodes.append((cx + rad * math.cos(ang), cyy + rad * math.sin(ang)))
        for a, b in [(0, 1), (1, 2), (2, 3), (3, 4), (4, 0), (0, 2)]:
            d.line([nodes[a], nodes[b]], fill=(255, 255, 255), width=2 * s)
        nr = 6 * s
        for i, (x, y) in enumerate(nodes):
            col = accent if i in (0, 2) else (255, 255, 255)
            d.ellipse([x - nr, y - nr, x + nr, y + nr], fill=col)

        y0 = 240 * s
        cc = 52 * s
        cr = 16 * s
        for i in range(len(STEPS)):
            y = y0 + i * 58 * s
            box = [cc - cr, y - cr, cc + cr, y + cr]
            if i < active_idx:  # пройден
                d.ellipse(box, fill=accent)
                d.line([(45 * s, y), (51 * s, y + 7 * s)], fill=dark, width=2 * s)
                d.line([(51 * s, y + 7 * s), (61 * s, y - 7 * s)], fill=dark, width=2 * s)
            elif i == active_idx:  # текущий
                d.ellipse(box, fill=(255, 255, 255))
            else:  # будущий
                d.ellipse(box, outline=(185, 192, 238), width=2 * s)

        img = img.resize((BANNER_W, BANNER_H), Image.LANCZOS)
        return ImageTk.PhotoImage(img)

    def _draw_banner(self, active_idx):
        c = self.banner
        c.delete("all")
        self._banner_img = self._render_shapes(active_idx)
        c.create_image(0, 0, anchor="nw", image=self._banner_img)

        cx = BANNER_W / 2
        c.create_text(cx, 138, text="GraphLab", fill="#ffffff", font=(FONT, 22, "bold"))
        c.create_text(cx, 164, text="Установка приложения", fill="#dfe3ff", font=(FONT, 10))

        y0 = 240
        for i, label in enumerate(STEPS):
            y = y0 + i * 58
            done = i < active_idx
            current = i == active_idx
            if not done:
                num_color = PRIMARY if current else "#b9c0ee"
                c.create_text(52, y, text=str(i + 1), fill=num_color, font=(FONT, 12, "bold"))
            lab_color = "#ffffff" if (current or done) else "#c2c9f2"
            lab_font = (FONT, 12, "bold") if current else (FONT, 12)
            c.create_text(86, y, anchor="w", text=label, fill=lab_color, font=lab_font)

        c.create_text(cx, BANNER_H - 24, text=f"Версия {installer.VERSION}",
                      fill="#dfe3ff", font=(FONT, 9))

    # ---- helpers ----------------------------------------------------- #
    def _title(self, parent, text):
        return tk.Label(parent, text=text, bg=BG, fg=TEXT, font=(FONT, 19, "bold"))

    def _text(self, parent, text, color=MUTED, size=12):
        return tk.Label(parent, text=text, bg=BG, fg=color, font=(FONT, size),
                        justify="left", anchor="w")

    # ---- шаги -------------------------------------------------------- #
    def _build_welcome(self):
        f = tk.Frame(self.content, bg=BG)
        self._frames["welcome"] = f
        self._title(f, "Добро пожаловать").pack(anchor="w", pady=(14, 16))
        self._text(
            f,
            "Этот мастер установит GraphLab на ваш компьютер\n"
            "и создаст ярлыки для быстрого запуска.\n\n"
            "Установка занимает несколько секунд и не требует\n"
            "прав администратора.\n\n"
            "Нажмите «Далее», чтобы продолжить.",
            size=12,
        ).pack(anchor="w")

        bar = tk.Frame(f, bg=BG)
        bar.pack(side="bottom", fill="x")
        RoundedButton(bar, "Далее", lambda: self._show("about"), primary=True,
                      width=150).pack(side="right")
        RoundedButton(bar, "Отмена", self._cancel, width=130).pack(side="right", padx=(0, 12))

    def _build_about(self):
        f = tk.Frame(self.content, bg=BG)
        self._frames["about"] = f
        self._title(f, "О программе").pack(anchor="w", pady=(14, 16))
        self._text(
            f,
            "GraphLab — учебное приложение для визуализации алгоритмов\n"
            "поиска кратчайших путей в графах (Дейкстра, Беллман-Форд,\n"
            "Флойд-Уоршелл).\n\n"
            "Технологии: HTML/CSS/JavaScript в нативном окне (pywebview),\n"
            "упаковка PyInstaller.\n\n"
            "Курсовая работа. Распространяется как есть, без гарантий.",
            size=11,
        ).pack(anchor="w")

        bar = tk.Frame(f, bg=BG)
        bar.pack(side="bottom", fill="x")
        RoundedButton(bar, "Далее", lambda: self._show("options"), primary=True,
                      width=150).pack(side="right")
        RoundedButton(bar, "Назад", lambda: self._show("welcome"), width=120).pack(side="left")

    def _build_options(self):
        f = tk.Frame(self.content, bg=BG)
        self._frames["options"] = f
        self._title(f, "Параметры установки").pack(anchor="w", pady=(14, 16))

        self._text(f, "Папка установки", size=10).pack(anchor="w")
        prow = tk.Frame(f, bg=BG)
        prow.pack(fill="x", pady=(6, 6))
        entry = tk.Entry(prow, textvariable=self.path_var, font=(FONT, 10),
                         bg=ENTRY_BG, fg=TEXT, insertbackground=TEXT, relief="flat",
                         highlightthickness=1, highlightbackground="#26304d",
                         highlightcolor=PRIMARY)
        entry.pack(side="left", fill="x", expand=True, ipady=8, padx=(0, 10))
        RoundedButton(prow, "Обзор…", self._browse, width=104, height=38).pack(side="right")

        self._text(f, self._size_text(), size=9).pack(anchor="w", pady=(0, 16))

        RoundedCheck(f, "Создать ярлык на рабочем столе", self.desktop_var).pack(anchor="w", pady=3)
        RoundedCheck(f, "Добавить в меню «Пуск»", self.startmenu_var).pack(anchor="w", pady=3)

        bar = tk.Frame(f, bg=BG)
        bar.pack(side="bottom", fill="x")
        RoundedButton(bar, "Установить", self._start_install, primary=True,
                      width=160).pack(side="right")
        RoundedButton(bar, "Назад", lambda: self._show("about"), width=120).pack(side="left")

    def _build_progress(self):
        f = tk.Frame(self.content, bg=BG)
        self._frames["progress"] = f
        self._title(f, "Установка…").pack(anchor="w", pady=(14, 26))
        self.bar = RoundedProgress(f, width=460, height=14)
        self.bar.pack(anchor="w", pady=(0, 10))
        info = tk.Frame(f, bg=BG)
        info.pack(fill="x")
        self.status_lbl = self._text(info, "Подготовка…", color=MUTED, size=11)
        self.status_lbl.pack(side="left")
        self.pct_lbl = tk.Label(info, text="0%", bg=BG, fg=ACCENT, font=(FONT, 12, "bold"))
        self.pct_lbl.pack(side="right")

    def _build_done(self):
        f = tk.Frame(self.content, bg=BG)
        self._frames["done"] = f
        cv = tk.Canvas(f, width=72, height=72, bg=BG, highlightthickness=0, bd=0)
        cv.pack(anchor="w", pady=(10, 10))
        cv.create_oval(4, 4, 68, 68, fill="", outline=ACCENT, width=3)
        cv.create_line(24, 38, 33, 48, fill=ACCENT, width=4, capstyle="round")
        cv.create_line(33, 48, 50, 26, fill=ACCENT, width=4, capstyle="round")

        self._title(f, "Готово!").pack(anchor="w", pady=(0, 6))
        self.done_lbl = self._text(
            f, "GraphLab установлен на ваш компьютер.\nЯрлыки добавлены для быстрого запуска.")
        self.done_lbl.pack(anchor="w")

        bar = tk.Frame(f, bg=BG)
        bar.pack(side="bottom", fill="x")
        RoundedButton(bar, "Запустить GraphLab", self._launch_and_close, primary=True,
                      width=200).pack(side="right")
        RoundedButton(bar, "Закрыть", self._finish, width=130).pack(side="right", padx=(0, 12))

    # ------------------------------------------------------------------ #
    def _size_text(self):
        try:
            mb = os.path.getsize(installer.current_exe_path()) / (1024 * 1024)
            return f"Требуется примерно {mb:.0f} МБ на диске"
        except OSError:
            return ""

    def _show(self, name):
        target = self._frames[name]
        for frame in self._frames.values():
            if frame is not target:
                frame.place_forget()
        target.place(relx=0, rely=0, relwidth=1, relheight=1)
        target.tkraise()
        self._current = name
        idx = {"welcome": 0, "about": 0, "options": 1, "progress": 2, "done": 3}[name]
        self._draw_banner(idx)
        self._animate_in(target)

    def _animate_in(self, frame):
        seq = [18, 12, 7, 3, 0]

        def step(i):
            try:
                frame.place_configure(y=seq[i])
            except tk.TclError:
                return
            if i + 1 < len(seq):
                self.root.after(15, lambda: step(i + 1))

        step(0)

    def _on_enter(self, _event=None):
        nxt = {"welcome": "about", "about": "options"}
        if self._current in nxt:
            self._show(nxt[self._current])
        elif self._current == "options":
            self._start_install()
        elif self._current == "done":
            self._launch_and_close()

    def _browse(self):
        start = self.path_var.get()
        if not os.path.isdir(start):
            start = os.path.expanduser("~")
        chosen = filedialog.askdirectory(initialdir=start, title="Выберите папку установки")
        if chosen:
            chosen = os.path.normpath(chosen)
            if os.path.basename(chosen).lower() != installer.APP_NAME.lower():
                chosen = os.path.join(chosen, installer.APP_NAME)
            self.path_var.set(chosen)

    def _start_install(self):
        path = self.path_var.get().strip()
        if not path:
            return
        self._show("progress")
        self._shared = {"percent": 0, "status": "Подготовка…", "done": False, "error": None}
        self._disp = 0.0
        threading.Thread(target=self._worker, args=(path,), daemon=True).start()
        self.root.after(20, self._poll)

    def _worker(self, path):
        try:
            def progress(percent, status):
                self._shared["percent"] = percent
                self._shared["status"] = status

            installer.perform_install(path, self.desktop_var.get(),
                                      self.startmenu_var.get(), progress=progress)
            self._shared["done"] = True
        except Exception as exc:  # noqa: BLE001
            self._shared["error"] = str(exc)
            self._shared["done"] = True

    def _poll(self):
        if self._shared["error"]:
            self.status_lbl.config(text="Ошибка: " + self._shared["error"], fg="#f87171")
            return

        target = self._shared["percent"]
        self._disp += (target - self._disp) * 0.25
        if abs(target - self._disp) < 0.6:
            self._disp = target
        self.bar.set(self._disp)
        if self._shared["status"]:
            self.status_lbl.config(text=self._shared["status"])
        self.pct_lbl.config(text=f"{int(round(self._disp))}%")

        if self._shared["done"] and self._disp >= 99.4:
            self.bar.set(100)
            self.pct_lbl.config(text="100%")
            self._show("done")
            return
        self.root.after(20, self._poll)

    def _launch_and_close(self):
        installer.launch_installed(self.path_var.get().strip())
        self.root.destroy()

    def _finish(self):
        self.root.destroy()

    def _cancel(self):
        self.root.destroy()

    def run(self):
        self.root.mainloop()


def run_wizard():
    Wizard().run()
