@echo off
REM start-director.bat — double-click to bring up the full Director Dashboard stack
REM Ollama + ComfyUI + Next.js dashboard, then open the browser.

powershell -ExecutionPolicy Bypass -NoProfile -File "%~dp0start-director.ps1"
echo.
echo Press any key to close this window (services keep running in the background)...
pause >nul