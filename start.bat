@echo off
setlocal EnableExtensions EnableDelayedExpansion
title MIET Jammu - Seating Arrangement System
color 07

echo =======================================================
echo   MIET Jammu - Examination Seating Arrangement System
echo =======================================================
echo.

:: Prefer the bundled Node.js and npm so native modules use the expected runtime.
set "NODE_DIR=C:\nodejs\node-v22.16.0-win-x64"
if exist "%NODE_DIR%\node.exe" (
    set "NODE_EXE=%NODE_DIR%\node.exe"
    set "NPM_CMD=%NODE_DIR%\npm.cmd"
    set "PATH=%NODE_DIR%;%PATH%"
    echo [INFO] Using bundled Node.js from %NODE_DIR%
) else (
    for /f "delims=" %%I in ('where node 2^>nul') do if not defined NODE_EXE set "NODE_EXE=%%I"
    for /f "delims=" %%I in ('where npm.cmd 2^>nul') do if not defined NPM_CMD set "NPM_CMD=%%I"
)

if not defined NODE_EXE (
    echo [ERROR] Node.js was not found. Install Node.js or restore the bundled runtime.
    pause
    exit /b 1
)
if not defined NPM_CMD (
    echo [ERROR] npm was not found. Install Node.js with npm or restore the bundled runtime.
    pause
    exit /b 1
)

echo [OK] Node.js version:
"%NODE_EXE%" --version
echo.

cd /d "%~dp0backend"
if not exist "node_modules\express\package.json" (
    echo [INFO] Installing backend dependencies...
    call "%NPM_CMD%" install
    if errorlevel 1 (
        echo [ERROR] Dependency installation failed.
        pause
        exit /b 1
    )
)
if not exist "node_modules\better-sqlite3\prebuilds\win32-x64.node" (
    echo [INFO] Repairing the SQLite native dependency...
    call "%NPM_CMD%" install
    if errorlevel 1 (
        echo [ERROR] Dependency installation failed.
        pause
        exit /b 1
    )
)

:: Reuse an existing MIET server on the loopback address used by server.js.
set "PORT=3000"
set "RUN_SERVER=1"
:find_existing
curl.exe -fsS --max-time 1 "http://127.0.0.1:!PORT!/" 2>nul | findstr /I /C:"Examination Seating Arrangement" >nul
if not errorlevel 1 (
    set "RUN_SERVER=0"
    set "SITE_URL=http://127.0.0.1:!PORT!"
    goto :launch_site
)
if !PORT! GEQ 3010 goto :find_available
set /a PORT+=1
goto :find_existing

:find_available
set "PORT=3000"
:check_port
netstat -ano -p tcp | findstr /R /C:":!PORT! .*LISTENING" >nul
if not errorlevel 1 (
    set /a PORT+=1
    if !PORT! GTR 3010 (
        echo [ERROR] Ports 3000 through 3010 are already in use.
        pause
        exit /b 1
    )
    goto :check_port
)
set "SITE_URL=http://127.0.0.1:!PORT!"
set "RUN_SERVER=1"

:launch_site
echo.
echo =======================================================
echo   Student Portal: !SITE_URL!
echo   Admin Portal:   !SITE_URL!/admin
echo   Admin login: configure JWT_SECRET, ADMIN_USERNAME, and ADMIN_INITIAL_PASSWORD first
echo =======================================================
echo.

if "!RUN_SERVER!"=="0" (
    echo [INFO] MIET is already running. Opening the existing portal.
    start "" "!SITE_URL!"
    exit /b 0
)

:: Open the selected MIET URL after the server has started.
start "" cmd /c "timeout /t 2 /nobreak >nul & start !SITE_URL!"
set "PORT=!PORT!"
"%NODE_EXE%" server.js

echo.
echo [INFO] MIET server stopped.
pause
