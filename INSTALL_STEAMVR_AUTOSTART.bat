@echo off
echo ============================================
echo   Pulsoid Widget OSC - SteamVR Autostart
echo ============================================
echo.

REM Find Steam path from registry
for /f "tokens=2*" %%a in ('reg query "HKEY_CURRENT_USER\Software\Valve\Steam" /v SteamPath 2^>nul') do set STEAM_PATH=%%b

if "%STEAM_PATH%"=="" (
    echo [ERROR] Could not find Steam installation!
    echo Please install this manually.
    pause
    exit /b 1
)

echo [INFO] Found Steam at: %STEAM_PATH%

REM Convert to Windows path format
set STEAM_PATH=%STEAM_PATH:/=\%
set VRPATHREG=%STEAM_PATH%\steamapps\common\SteamVR\bin\win64\vrpathreg.exe

if not exist "%VRPATHREG%" (
    echo [ERROR] SteamVR not found at expected location!
    echo Expected: %VRPATHREG%
    pause
    exit /b 1
)

echo [INFO] Registering manifest with SteamVR...
"%VRPATHREG%" adddriver "%~dp0"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [OK] Successfully registered!
    echo [INFO] Pulsoid Widget OSC will now auto-start with SteamVR.
    echo.
    echo To disable: SteamVR Settings ^> Startup / Shutdown
) else (
    echo [ERROR] Failed to register manifest
)

pause
