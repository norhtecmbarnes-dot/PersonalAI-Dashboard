@echo off
REM AI Dashboard Cleanup Script for Windows
REM Run this periodically to free disk space and maintain performance

echo ===================================
echo AI Dashboard Cleanup Script
echo Started at %date% %time%
echo ===================================
echo.

REM Change to script directory
cd /d "%~dp0"

REM Analyze what can be cleaned
echo Analyzing what can be cleaned...
echo.

REM 1. Check .next directory
if exist ".next" (
    for /f "tokens=*" %%a in ('dir /s /-c ".next" 2^>nul ^| findstr "File(s)"') do (
        echo [build cache] .next/: %%a
    )
)

REM 2. Check node_modules
if exist "node_modules" (
    for /f "tokens=*" %%a in ('dir /s /-c "node_modules" 2^>nul ^| findstr "File(s)"') do (
        echo [dependencies] node_modules/: %%a
    )
)

REM 3. Check logs
set LOG_COUNT=0
for /r %%F in (*.log) do (
    if not "%%~dpF"=="%CD%\node_modules\" (
        set /a LOG_COUNT+=1
    )
)
if %LOG_COUNT% GTR 0 (
    echo [logs] Found %LOG_COUNT% log files
)

echo.
echo ===================================
echo Cleanup Options
echo ===================================
echo.

REM Function to ask for confirmation
:ask_confirm
set /p response="%~1 (y/N): "
if /i "%response%"=="y" exit /b 0
exit /b 1

REM 1. Clean .next directory
echo 1. Clean build cache (.next/)
call :ask_confirm "   Remove .next directory?"
if %ERRORLEVEL% EQU 0 (
    if exist ".next" (
        rmdir /s /q ".next"
        echo    [OK] .next/ removed
    ) else (
        echo    [!] .next/ doesn't exist
    )
)
echo.

REM 2. Clean log files
echo 2. Clean log files
call :ask_confirm "   Remove all .log files (except node_modules)?"
if %ERRORLEVEL% EQU 0 (
    for /r %%F in (*.log) do (
        if not "%%~dpF"=="%CD%\node_modules\" (
            del "%%F" 2>nul
        )
    )
    echo    [OK] Log files cleaned
)
echo.

REM 3. Archive old session reports
echo 3. Archive old session reports
call :ask_confirm "   Archive session reports older than 30 days to docs\archive\?"
if %ERRORLEVEL% EQU 0 (
    if not exist "docs\archive" mkdir "docs\archive"
    
    REM Move old session reports (manual for now - Windows batch date handling is complex)
    echo    [!] Note: Windows batch date handling is limited
    echo    [!] Please manually move old SESSION-* and *CHANGELOG* files to docs\archive\
    echo    [!] Or use PowerShell: Get-ChildItem docs\*SESSION*.md ^| Where {$_.LastWriteTime -lt (Get-Date).AddDays(-30)} ^| Move-Item docs\archive\
)
echo.

REM 4. Clean node_modules (optional)
echo 4. Clean node_modules/ (REQUIRES 'npm install' afterwards)
echo    WARNING: This will remove all dependencies
call :ask_confirm "   Remove node_modules directory?"
if %ERRORLEVEL% EQU 0 (
    if exist "node_modules" (
        rmdir /s /q "node_modules"
        echo    [OK] node_modules/ removed
        echo    [!] Run 'npm install' to reinstall dependencies
    ) else (
        echo    [!] node_modules/ doesn't exist
    )
)
echo.

REM Summary
echo ===================================
echo Cleanup Complete
echo Finished at %date% %time%
echo ===================================
echo.
echo Tip: Run this script weekly or when disk space is low
echo.
pause
