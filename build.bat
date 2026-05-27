@echo off
REM H Apps Build Script für Windows

echo ========================================
echo H Apps - Electron Build Script
echo ========================================
echo.

REM Prüfe ob npm installiert ist
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: npm nicht gefunden! Installiere Node.js von nodejs.org
    pause
    exit /b 1
)

echo [1/4] Installiere Dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: npm install fehlgeschlagen!
    pause
    exit /b 1
)

echo.
echo [2/4] Starte Electron App zum Testen...
echo (Drücke STRG+C um zu beenden)
timeout /t 2
call npm start
if %errorlevel% neq 0 (
    echo ERROR: App konnte nicht gestartet werden!
    pause
    exit /b 1
)

echo.
echo [3/4] Starte Build-Prozess...
call npm run build:win
if %errorlevel% neq 0 (
    echo ERROR: Build fehlgeschlagen!
    pause
    exit /b 1
)

echo.
echo [4/4] Build erfolgreich abgeschlossen!
echo.
echo Ergebnis in: dist/
echo  - H Apps-1.0.0-portable.exe
echo  - H Apps Setup 1.0.0.exe
echo.
pause
