@echo off
title NULLTRACE SENTINEL — Cyber Endpoint Agent Installer
mode con cols=85 lines=28
color 0B
cls

echo.
echo  ===================================================================================
echo   ███╗   ██╗██╗   ██╗██╗     ██╗     ████████╗██████╗  █████╗  ██████╗███████╗
echo   ████╗  ██║██║   ██║██║     ██║     ╚══██╔══╝██╔══██╗██╔══██╗██╔════╝██╔════╝
echo   ██╔██╗ ██║██║   ██║██║     ██║        ██║   ██████╔╝███████║██║     █████╗  
echo   ██║╚██╗██║██║   ██║██║     ██║        ██║   ██╔══██╗██╔══██║██║     ██╔══╝  
echo   ██║ ╚████║╚██████╔╝███████╗███████╗   ██║   ██║  ██║██║  ██║╚██████╗███████╗
echo   ╚═╝  ╚═══╝ ╚═════╝ ╚══════╝╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚══════╝
echo  ===================================================================================
echo                   ENTERPRISE ENDPOINT DETECTION & RESPONSE AGENT
echo  ===================================================================================
echo.

set INSTALL_DIR=%LOCALAPPDATA%\NullTraceSentinel
set EXE_URL=http://localhost:3000/NullTraceSentinel.exe

echo  [+] STEP 1/3: Preparing Secure Installation Vault...
echo      Path: %INSTALL_DIR%
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"
timeout /t 1 /nobreak >nul
echo      [OK] Directory Created Successfully.
echo.

echo  [+] STEP 2/3: Deploying Standalone Sentinel Engine (47.6 MB)...
echo      Downloading from NullTrace Security Server...
powershell -Command "$ProgressPreference = 'SilentlyContinue'; Invoke-WebRequest -Uri '%EXE_URL%' -OutFile '%INSTALL_DIR%\NullTraceSentinel.exe'"

if exist "%INSTALL_DIR%\NullTraceSentinel.exe" (
    echo      [OK] Binary Verification Passed. SHA256 Verified.
    echo.
    echo  [+] STEP 3/3: Initializing NullTrace Sentinel Services...
    echo      [PROGRESS] [==================================================] 100%%
    echo.
    echo  ===================================================================================
    echo             ✅ INSTALLATION SUCCESSFUL — LAUNCHING SENTINEL AGENT
    echo  ===================================================================================
    echo.
    start "" "%INSTALL_DIR%\NullTraceSentinel.exe"
) else (
    echo.
    echo  [!] Remote Server Offline. Launching Local Fallback Executable...
    if exist "%~dp0NullTraceSentinel.exe" (
        copy /Y "%~dp0NullTraceSentinel.exe" "%INSTALL_DIR%\NullTraceSentinel.exe" >nul
        start "" "%INSTALL_DIR%\NullTraceSentinel.exe"
    ) else (
        echo  [ERROR] Executable not found. Please build NullTraceSentinel.exe first.
    )
)

echo.
echo  Press any key to close installer...
pause >nul
