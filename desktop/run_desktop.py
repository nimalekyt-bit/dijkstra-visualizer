"""
GraphLab — десктопная обёртка для визуализатора алгоритмов на графах.

Подход повторяет десктопную часть AssetForge: нативное окно через pywebview
(Edge WebView2 на Windows), внутри которого открывается локальный веб-UI.
В отличие от AssetForge здесь НЕ нужен FastAPI/uvicorn — проект полностью
статический, поэтому файлы отдаёт крошечный http.server из стандартной
библиотеки. Локальный сервер нужен только для fetch('data/examples.json'),
который не работает по протоколу file://.
"""

import os
import sys
import socket
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

import webview

import installer
import wizard


def get_web_root():
    """Каталог со статикой сайта (index.html, css, js, vendor, assets, data)."""
    if getattr(sys, "frozen", False):
        # PyInstaller onefile: ресурсы распакованы во временный каталог _MEIPASS
        return sys._MEIPASS
    # Режим разработки: корень проекта = родитель папки desktop/
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def find_free_port():
    """Свободный TCP-порт на локальном интерфейсе."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


class QuietHandler(SimpleHTTPRequestHandler):
    """Тот же обработчик, но без шумного лога в консоль."""

    def log_message(self, *args):
        pass


def start_server(web_root, port):
    handler = partial(QuietHandler, directory=web_root)
    httpd = ThreadingHTTPServer(("127.0.0.1", port), handler)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    return httpd


def run_app():
    """Поднимает локальный сервер и открывает нативное окно с веб-UI."""
    web_root = get_web_root()
    port = find_free_port()
    start_server(web_root, port)

    url = f"http://127.0.0.1:{port}/index.html"
    webview.create_window(
        "GraphLab — Визуализатор алгоритмов на графах",
        url,
        width=1280,
        height=860,
        min_size=(1024, 680),
    )
    webview.start()


def run_installer():
    """Открывает графический мастер установки (tkinter)."""
    wizard.run_wizard()


def main():
    # Логика установщика работает только для собранного .exe.
    if getattr(sys, "frozen", False):
        if "--uninstall" in sys.argv:
            installer.uninstall()
            return
        if "--silent" in sys.argv:
            installer.silent_install(launch=False)
            return
        # Портативный запуск или уже установленная копия — сразу приложение.
        if "--portable" in sys.argv or installer.is_installed_copy():
            run_app()
            return
        # Свежая (скачанная) копия — показываем мастер установки.
        run_installer()
        return

    # Режим разработки: всегда открываем приложение.
    run_app()


if __name__ == "__main__":
    main()
