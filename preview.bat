@echo off
title Beyond The Internet 2026 - Live Preview
echo ===================================================
echo   Beyond The Internet 2026 - Khoi dong Live Preview
echo ===================================================
echo.

:: Add Node.js to PATH if not already available
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    if exist "%LOCALAPPDATA%\OpenAI\Codex\runtimes\cua_node\fcf5d08964516500\bin\node.exe" (
        set "PATH=%LOCALAPPDATA%\OpenAI\Codex\runtimes\cua_node\fcf5d08964516500\bin;%PATH%"
    )
)

:: Check if node_modules exists
if not exist "node_modules" (
    echo [!] Dang cai dat thu vien (node_modules)... Vui long cho trong giay lat...
    call npm.cmd install
)

echo [*] Dang chuan bi mo trinh duyet tai http://localhost:3000 ...
start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:3000"

echo [*] Dang khoi chay may chu Express + Vite Dev Server...
echo [i] Nhan Ctrl + C de dung may chu.
echo.
call npm.cmd run dev

pause
