# -*- mode: python ; coding: utf-8 -*-
import os
from PyInstaller.utils.hooks import collect_all

# SPECPATH — каталог этого .spec (desktop/). Корень проекта — на уровень выше.
ROOT = os.path.abspath(os.path.join(SPECPATH, ".."))

# Статика сайта, которую нужно вшить в exe.
datas = [
    (os.path.join(ROOT, "index.html"), "."),
    (os.path.join(ROOT, "css"), "css"),
    (os.path.join(ROOT, "js"), "js"),
    (os.path.join(ROOT, "vendor"), "vendor"),
    (os.path.join(ROOT, "assets"), "assets"),
    (os.path.join(ROOT, "data"), "data"),
    (os.path.join(SPECPATH, "GraphLab.ico"), "."),
]
binaries = []
hiddenimports = []

# Обёртка нативного окна (как в AssetForge): pywebview + мост к WebView2.
for _pkg in ("webview", "clr_loader", "pythonnet"):
    _d, _b, _h = collect_all(_pkg)
    datas += _d
    binaries += _b
    hiddenimports += _h

hiddenimports += ["clr", "webview.platforms.edgechromium"]

a = Analysis(
    ["run_desktop.py"],
    pathex=[],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

_icon = os.path.join(SPECPATH, "GraphLab.ico")
exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name="GraphLab",
    debug=False,
    strip=False,
    upx=False,
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    icon=_icon if os.path.exists(_icon) else None,
)
