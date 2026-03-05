#!/usr/bin/env pwsh
# Quiet Startup Script for AI Dashboard
# Redirects all console output to log file to prevent PowerShell crashes

$logFile = "ai-dashboard.log"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " AI Dashboard - Quiet Startup Mode" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Console output will be redirected to: $logFile" -ForegroundColor Yellow
Write-Host ""

# Clean up old log if it exists
if (Test-Path $logFile) {
    Remove-Item $logFile -Force
}

# Create initial log entry
"[$timestamp] AI Dashboard Starting..." | Out-File -FilePath $logFile
"[$timestamp] Logs redirected to file to prevent console crashes" | Out-File -FilePath $logFile -Append
"" | Out-File -FilePath $logFile -Append

Write-Host "Starting Next.js development server..." -ForegroundColor Green
Write-Host ""

# Set environment variables to reduce output
$env:NEXT_TELEMETRY_DISABLED = "1"
$env:NODE_NO_WARNINGS = "1"

# Start the dev server with all output redirected to file
try {
    # Use Start-Process to run npm in background with redirected output
    $process = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -NoNewWindow -PassThru -RedirectStandardOutput $logFile -RedirectStandardError "$logFile.error"
    
    Write-Host "✅ Server started successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Status:" -ForegroundColor Yellow
    Write-Host "  - Server running in background (PID: $($process.Id))" -ForegroundColor White
    Write-Host "  - Logs written to: $logFile" -ForegroundColor White
    Write-Host "  - Error logs: $logFile.error" -ForegroundColor White
    Write-Host ""
    Write-Host "Commands:" -ForegroundColor Cyan
    Write-Host "  View logs:     Get-Content $logFile -Tail 50 -Wait" -ForegroundColor White
    Write-Host "  View errors:   Get-Content '$logFile.error' -Tail 20" -ForegroundColor White
    Write-Host "  Stop server:   Stop-Process -Id $($process.Id) -Force" -ForegroundColor White
    Write-Host ""
    Write-Host "Press Ctrl+C to detach (server keeps running)" -ForegroundColor Yellow
    Write-Host ""
    
    # Keep script running and show a simple status indicator
    $spinner = @('|', '/', '-', '\')
    $i = 0
    while ($process -and -not $process.HasExited) {
        Write-Host "`r[$($spinner[$i % 4])] Server running... (PID: $($process.Id))" -NoNewLine -ForegroundColor Green
        Start-Sleep -Milliseconds 250
        $i++
    }
} catch {
    Write-Host "❌ Failed to start server" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
