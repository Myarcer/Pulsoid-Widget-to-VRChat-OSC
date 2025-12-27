@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ========================================
echo   Pulsoid Widget to VRChat OSC
echo ========================================
echo.

:: Check for widget_id.txt - create from template if missing
if not exist "widget_id.txt" (
    if exist "widget_id.txt.template" (
        copy "widget_id.txt.template" "widget_id.txt" >nul
        echo [INFO] Created widget_id.txt from template
        echo [INFO] Please edit widget_id.txt with your Pulsoid widget ID
        echo [INFO] Get it from: https://pulsoid.net/ui/widgets
        echo.
        notepad "widget_id.txt"
        pause
        exit /b 0
    ) else (
        echo [ERROR] widget_id.txt not found!
        echo [INFO] Create widget_id.txt with your Pulsoid widget ID
        pause
        exit /b 1
    )
)

:: Check for local portable Node first
if exist "node\node.exe" (
    set "NODE_EXE=node\node.exe"
    goto :check_modules
)

:: Check for system Node
where node >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set "NODE_EXE=node"
    goto :check_modules
)

:: No Node found - download portable version
echo [INFO] Node.js not found. Downloading portable version...
echo.

:: Create node folder
if not exist "node" mkdir node

:: Download Node.js portable (Windows x64)
set "NODE_VERSION=v20.10.0"
set "NODE_URL=https://nodejs.org/dist/%NODE_VERSION%/node-%NODE_VERSION%-win-x64.zip"
set "NODE_ZIP=node\node.zip"

echo [INFO] Downloading Node.js %NODE_VERSION%...
powershell -Command "& { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri '%NODE_URL%' -OutFile '%NODE_ZIP%' }"

if not exist "%NODE_ZIP%" (
    echo [ERROR] Failed to download Node.js
    echo [INFO] Please install Node.js manually from https://nodejs.org
    pause
    exit /b 1
)

echo [INFO] Extracting Node.js...
powershell -Command "& { Expand-Archive -Path '%NODE_ZIP%' -DestinationPath 'node' -Force }"

:: Move files from nested folder to node\
for /d %%i in (node\node-*) do (
    xcopy /E /Y "%%i\*" "node\" >nul
    rmdir /S /Q "%%i"
)

:: Clean up zip
del "%NODE_ZIP%" 2>nul

if exist "node\node.exe" (
    echo [OK] Node.js installed successfully!
    set "NODE_EXE=node\node.exe"
) else (
    echo [ERROR] Node.js installation failed
    pause
    exit /b 1
)

:check_modules
:: Check if node_modules exists
if not exist "node_modules" (
    echo [INFO] Installing dependencies...
    if "%NODE_EXE%"=="node" (
        call npm install
    ) else (
        "%NODE_EXE%" "node\node_modules\npm\bin\npm-cli.js" install 2>nul || (
            echo [INFO] Using system npm...
            call npm install
        )
    )
)

echo.
echo [STATUS] Starting Pulsoid Widget OSC...
echo.

:: Run the app
"%NODE_EXE%" code\app.js

pause
