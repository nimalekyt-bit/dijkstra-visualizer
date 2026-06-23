"""
Установщик GraphLab с графическим мастером (tkinter).

Один и тот же .exe:
  * запущенный как «свежая» копия (без файла-маркера рядом) — показывает мастер
    установки: выбор папки, опции ярлыков, прогресс, запуск после установки;
  * установленная копия (рядом лежит graphlab.installed) — сразу открывает
    приложение;
  * --silent   — тихая установка в папку по умолчанию (для развёртывания);
  * --uninstall — удаляет ярлыки, запись в реестре и каталог установки.

Установка идёт в выбранную папку (по умолчанию в %LOCALAPPDATA%, без прав
администратора) и регистрируется в «Программы и компоненты».

Мастер сделан на tkinter (stdlib): надёжно работает в сборке PyInstaller и не
зависит от моста WebView2, в отличие от pywebview js_api.
"""

import os
import subprocess
import sys
import threading
import winreg

APP_NAME = "GraphLab"
PUBLISHER = "GraphLab (курсовая работа)"
VERSION = "1.0.0"
WINDOW_TITLE = "Визуализатор алгоритмов на графах"
MARKER = "graphlab.installed"

_CREATE_NO_WINDOW = 0x08000000
_DETACHED_PROCESS = 0x00000008
_UNINSTALL_KEY = r"Software\Microsoft\Windows\CurrentVersion\Uninstall\GraphLab"


# --------------------------------------------------------------------------- #
# Пути
# --------------------------------------------------------------------------- #
def default_install_dir():
    base = os.environ.get("LOCALAPPDATA") or os.path.expanduser("~")
    return os.path.join(base, APP_NAME)


def current_exe_path():
    return os.path.abspath(sys.executable)


def current_exe_dir():
    return os.path.dirname(current_exe_path())


def is_installed_copy():
    """True, если рядом с exe лежит маркер установки."""
    return os.path.exists(os.path.join(current_exe_dir(), MARKER))


def _start_menu_lnk():
    appdata = os.environ.get("APPDATA", "")
    return os.path.join(appdata, "Microsoft", "Windows", "Start Menu", "Programs", APP_NAME + ".lnk")


def _desktop_lnk():
    return os.path.join(os.path.expanduser("~"), "Desktop", APP_NAME + ".lnk")


# --------------------------------------------------------------------------- #
# Вспомогательное
# --------------------------------------------------------------------------- #
def _make_shortcut(lnk_path, target):
    workdir = os.path.dirname(target)
    ps = (
        "$s=(New-Object -ComObject WScript.Shell).CreateShortcut('{lnk}');"
        "$s.TargetPath='{tgt}';"
        "$s.WorkingDirectory='{wd}';"
        "$s.IconLocation='{icon}';"
        "$s.Description='{desc}';"
        "$s.Save()"
    ).format(lnk=lnk_path, tgt=target, wd=workdir, icon=target + ",0", desc=WINDOW_TITLE)
    subprocess.run(
        ["powershell", "-NoProfile", "-NonInteractive", "-Command", ps],
        creationflags=_CREATE_NO_WINDOW,
        check=False,
    )


def _dir_size_kb(path):
    total = 0
    for root, _dirs, files in os.walk(path):
        for name in files:
            try:
                total += os.path.getsize(os.path.join(root, name))
            except OSError:
                pass
    return total // 1024


def _register_uninstall(target, install_location):
    with winreg.CreateKey(winreg.HKEY_CURRENT_USER, _UNINSTALL_KEY) as key:
        winreg.SetValueEx(key, "DisplayName", 0, winreg.REG_SZ, APP_NAME)
        winreg.SetValueEx(key, "DisplayVersion", 0, winreg.REG_SZ, VERSION)
        winreg.SetValueEx(key, "Publisher", 0, winreg.REG_SZ, PUBLISHER)
        winreg.SetValueEx(key, "DisplayIcon", 0, winreg.REG_SZ, target)
        winreg.SetValueEx(key, "InstallLocation", 0, winreg.REG_SZ, install_location)
        winreg.SetValueEx(key, "UninstallString", 0, winreg.REG_SZ, '"{0}" --uninstall'.format(target))
        winreg.SetValueEx(key, "NoModify", 0, winreg.REG_DWORD, 1)
        winreg.SetValueEx(key, "NoRepair", 0, winreg.REG_DWORD, 1)
        try:
            winreg.SetValueEx(key, "EstimatedSize", 0, winreg.REG_DWORD, _dir_size_kb(install_location))
        except OSError:
            pass


def _message_box(text, title=APP_NAME, flags=0x40):
    try:
        import ctypes

        ctypes.windll.user32.MessageBoxW(0, text, title, flags)
    except Exception:
        pass


# --------------------------------------------------------------------------- #
# Установка (общая логика для мастера и тихого режима)
# --------------------------------------------------------------------------- #
def perform_install(path, desktop, startmenu, progress=None):
    """Копирует exe в path, создаёт ярлыки и запись удаления.

    progress — необязательный callback(percent:int, status:str).
    Бросает исключение при ошибке.
    """
    def report(percent, status):
        if progress:
            progress(percent, status)

    target_exe = os.path.join(path, APP_NAME + ".exe")
    os.makedirs(path, exist_ok=True)
    report(5, "Подготовка…")

    src = current_exe_path()
    total = max(os.path.getsize(src), 1)
    copied = 0
    with open(src, "rb") as fin, open(target_exe, "wb") as fout:
        while True:
            chunk = fin.read(1024 * 1024)
            if not chunk:
                break
            fout.write(chunk)
            copied += len(chunk)
            report(5 + int(copied / total * 75), "Копирование файлов…")

    with open(os.path.join(path, MARKER), "w", encoding="ascii") as fh:
        fh.write(VERSION)

    report(85, "Создание ярлыков…")
    if startmenu:
        _make_shortcut(_start_menu_lnk(), target_exe)
    if desktop:
        _make_shortcut(_desktop_lnk(), target_exe)

    report(95, "Регистрация в системе…")
    try:
        _register_uninstall(target_exe, path)
    except OSError:
        pass

    report(100, "Готово")
    return target_exe


def launch_installed(path):
    exe = os.path.join(path, APP_NAME + ".exe")
    try:
        subprocess.Popen([exe], cwd=path, close_fds=True, creationflags=_DETACHED_PROCESS)
    except OSError:
        pass


def silent_install(launch=False):
    """Установка в папку по умолчанию без интерфейса (для развёртывания/тестов)."""
    target = perform_install(default_install_dir(), desktop=True, startmenu=True)
    if launch:
        launch_installed(default_install_dir())
    return target


# --------------------------------------------------------------------------- #
# Удаление
# --------------------------------------------------------------------------- #
def uninstall():
    """Удаление: ярлыки, запись в реестре и каталог установки (= папка exe)."""
    for lnk in (_start_menu_lnk(), _desktop_lnk()):
        try:
            if os.path.exists(lnk):
                os.remove(lnk)
        except OSError:
            pass

    try:
        winreg.DeleteKey(winreg.HKEY_CURRENT_USER, _UNINSTALL_KEY)
    except OSError:
        pass

    _message_box("GraphLab удалён.")

    target_dir = current_exe_dir()
    exe = current_exe_path()
    import tempfile

    bat = os.path.join(tempfile.gettempdir(), "graphlab_uninstall.bat")
    script = (
        "@echo off\r\n"
        ":loop\r\n"
        'del "{exe}" >nul 2>&1\r\n'
        'if exist "{exe}" (\r\n'
        "  timeout /t 1 /nobreak >nul\r\n"
        "  goto loop\r\n"
        ")\r\n"
        'rmdir /s /q "{dir}" >nul 2>&1\r\n'
        'del "%~f0" >nul 2>&1\r\n'
    ).format(exe=exe, dir=target_dir)
    try:
        with open(bat, "w", encoding="ascii") as fh:
            fh.write(script)
        subprocess.Popen(
            'cmd /c "{0}"'.format(bat),
            creationflags=_DETACHED_PROCESS | _CREATE_NO_WINDOW,
        )
    except OSError:
        pass
