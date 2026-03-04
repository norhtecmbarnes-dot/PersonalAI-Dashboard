#!/usr/bin/env pwsh
# ONLYOFFICE Setup Script for AI Dashboard
# Run this script to start the ONLYOFFICE Document Server

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " ONLYOFFICE Setup for AI Dashboard" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker Desktop is running
Write-Host "Checking Docker Desktop status..." -ForegroundColor Yellow
try {
    $dockerInfo = docker info 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Docker not running"
    }
    Write-Host "✅ Docker Desktop is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker Desktop is not running!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please start Docker Desktop first:" -ForegroundColor Yellow
    Write-Host "1. Open Docker Desktop from the Start Menu"
    Write-Host "2. Wait for it to fully start (green light)"
    Write-Host "3. Then run this script again"
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if ONLYOFFICE container exists
Write-Host ""
Write-Host "Checking for existing ONLYOFFICE container..." -ForegroundColor Yellow
$container = docker ps -a --filter "name=onlyoffice" --format "{{.Names}}"

if (-not $container) {
    Write-Host "📦 Creating new ONLYOFFICE Document Server container..." -ForegroundColor Yellow
    docker run -i -t -d -p 8080:80 --restart=always --name onlyoffice onlyoffice/documentserver
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to create container" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    
    Write-Host "⏳ Waiting for ONLYOFFICE to start (this may take 1-2 minutes)..." -ForegroundColor Yellow
    Start-Sleep -Seconds 30
} else {
    # Check if it's running
    $running = docker ps --filter "name=onlyoffice" --filter "status=running" --format "{{.Names}}"
    if (-not $running) {
        Write-Host "🚀 Starting existing ONLYOFFICE container..." -ForegroundColor Yellow
        docker start onlyoffice
        Write-Host "⏳ Waiting for ONLYOFFICE to start..." -ForegroundColor Yellow
        Start-Sleep -Seconds 10
    } else {
        Write-Host "✅ ONLYOFFICE container is already running" -ForegroundColor Green
    }
}

# Test connection
Write-Host ""
Write-Host "Testing ONLYOFFICE connection..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/welcome" -Method GET -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ ONLYOFFICE Document Server is ready!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  ONLYOFFICE may still be starting up..." -ForegroundColor Yellow
    Write-Host "   Waiting another 30 seconds..." -ForegroundColor Yellow
    Start-Sleep -Seconds 30
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8080/welcome" -Method GET -TimeoutSec 5 -ErrorAction Stop
        Write-Host "✅ ONLYOFFICE Document Server is ready!" -ForegroundColor Green
    } catch {
        Write-Host "❌ Could not connect to ONLYOFFICE" -ForegroundColor Red
        Write-Host "   Please check Docker Desktop for errors" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " 🎉 Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "ONLYOFFICE is now running at: http://localhost:8080" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Make sure your AI Dashboard is running (npm run dev)"
Write-Host "2. Navigate to http://localhost:3000/office/editor"
Write-Host "3. Create and edit documents!"
Write-Host ""
Read-Host "Press Enter to exit"
