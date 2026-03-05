@echo off
chcp 65001 >nul
REM Quiet Startup Script for AI Dashboard
REM Redirects all console output to log file to prevent PowerShell crashes

set LOG_FILE=ai-dashboard.log
set ERROR_FILE=ai-dashboard-errors.log

echo ========================================
echo  AI Dashboard - Quiet Startup Mode
echo ========================================
echo.

REM Kill any existing Node.js processes first
echo Stopping any existing server instances...
Taskkill /F /IM node.exe /FI "STATUS eq RUNNING" >nul 2>&1
Taskkill /F /IM npm.exe /FI "STATUS eq RUNNING" >nul 2>&1
timeout /t 2 /nobreak >nul
echo ✅ Existing instances stopped
echo.

echo Console output will be redirected to: %LOG_FILE%
echo.

REM Clean up old logs
if exist "%LOG_FILE%" del /f /q "%LOG_FILE%"
if exist "%ERROR_FILE%" del /f /q "%ERROR_FILE%"

REM Create initial log entry
echo [%date% %time%] AI Dashboard Starting... > "%LOG_FILE%"
echo [%date% %time%] Logs redirected to file to prevent console crashes >> "%LOG_FILE%"
echo. >> "%LOG_FILE%"

echo Starting Next.js development server...
echo.

REM Set environment variables to reduce output
set NEXT_TELEMETRY_DISABLED=1
set NODE_NO_WARNINGS=1

REM Start the dev server with all output redirected to file
start /b npm run dev > "%LOG_FILE%" 2> "%ERROR_FILE%"

if errorlevel 1 (
    echo [31m❌ Failed to start server[0m
    pause
    exit /b 1
)

echo [32m✅ Server started successfully![0m
echo.
echo Status:
echo   - Server running in background
echo   - Logs written to: %LOG_FILE%
echo   - Error logs: %ERROR_FILE%
echo.
echo Commands:
echo   View logs:     type %LOG_FILE%
echo   View errors:   type %ERROR_FILE%
echo   Stop server:   Taskkill /F /IM node.exe
echo.
echo Press any key to detach (server keeps running)...
pause >nul

echo.
echo Server is still running in the background.
echo Use 'Taskkill /F /IM node.exe' to stop it.
