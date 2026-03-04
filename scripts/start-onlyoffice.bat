@echo off
chcp 65001 >nul
echo ========================================
echo  ONLYOFFICE Setup Script for AI Dashboard
echo ========================================
echo.

REM Check if Docker Desktop is running
echo Checking Docker Desktop status...
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker Desktop is not running!
    echo.
    echo Please start Docker Desktop first:
    echo 1. Open Docker Desktop from the Start Menu
    echo 2. Wait for it to fully start (green light)
    echo 3. Then run this script again
    echo.
    pause
    exit /b 1
)

echo ✅ Docker Desktop is running

REM Check if ONLYOFFICE container already exists
echo.
echo Checking for existing ONLYOFFICE container...
docker ps -a --filter "name=onlyoffice" --format "{{.Names}}" | findstr "onlyoffice" >nul 2>&1

if errorlevel 1 (
    echo 📦 Creating new ONLYOFFICE Document Server container...
    docker run -i -t -d -p 8080:80 --restart=always --name onlyoffice onlyoffice/documentserver
    
    if errorlevel 1 (
        echo ❌ Failed to create container
        pause
        exit /b 1
    )
    
    echo ⏳ Waiting for ONLYOFFICE to start (this may take 1-2 minutes)...
    timeout /t 30 /nobreak >nul
) else (
    REM Check if it's running
    docker ps --filter "name=onlyoffice" --filter "status=running" --format "{{.Names}}" | findstr "onlyoffice" >nul 2>&1
    if errorlevel 1 (
        echo 🚀 Starting existing ONLYOFFICE container...
        docker start onlyoffice
        echo ⏳ Waiting for ONLYOFFICE to start...
        timeout /t 10 /nobreak >nul
    ) else (
        echo ✅ ONLYOFFICE container is already running
    )
)

REM Test ONLYOFFICE connection
echo.
echo Testing ONLYOFFICE connection...
curl -s http://localhost:8080/welcome >nul 2>&1
if errorlevel 1 (
    echo ⚠️  ONLYOFFICE may still be starting up...
    echo    Waiting another 30 seconds...
    timeout /t 30 /nobreak >nul
    
    curl -s http://localhost:8080/welcome >nul 2>&1
    if errorlevel 1 (
        echo ❌ Could not connect to ONLYOFFICE
        echo    Please check Docker Desktop for errors
        pause
        exit /b 1
    )
)

echo ✅ ONLYOFFICE Document Server is ready!
echo.
echo ========================================
echo  🎉 Setup Complete!
echo ========================================
echo.
echo ONLYOFFICE is now running at: http://localhost:8080
echo.
echo Next steps:
echo 1. Make sure your AI Dashboard is running (npm run dev)
echo 2. Navigate to http://localhost:3000/office/editor
echo 3. Create and edit documents!
echo.
pause
