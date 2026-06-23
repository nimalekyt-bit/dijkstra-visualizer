@echo off
REM Сборка десктопного приложения GraphLab в один .exe (PyInstaller, onefile, windowed).
REM Запуск: дважды кликнуть по файлу или выполнить `build_exe.bat` из терминала.
cd /d "%~dp0"

echo [1/3] Установка зависимостей сборки...
python -m pip install --upgrade pyinstaller pywebview pillow || goto :error

echo [2/3] Генерация иконки...
python make_icon.py || goto :error

echo [3/3] Сборка exe...
pyinstaller --noconfirm --clean GraphLab.spec || goto :error

echo.
echo Готово. Приложение: %~dp0dist\GraphLab.exe
goto :eof

:error
echo.
echo Сборка прервана из-за ошибки. См. вывод выше.
exit /b 1
