#Requires -Version 5.1
<#
  start-director.ps1
  Brings up the full MiniMax H3 Director Dashboard stack:
    1. Ollama       (local LLM server, port 11434)
    2. ComfyUI      (video generation backend, port 8188)
    3. Next.js dev  (the Director Dashboard, port 3000)
  Each service is launched in its own background window so you can watch logs.
  Already-running services are detected and skipped.
#>

# ---------- Configuration (override via environment or args) ----------
$OllamaExe     = if ($env:OLLAMA_EXE)     { $env:OLLAMA_EXE }     else { Join-Path $env:USERPROFILE "AppData\Local\Programs\Ollama\ollama.exe" }
$ComfyDir      = if ($env:COMFYUI_DIR)    { $env:COMFYUI_DIR }    else { "C:\ComfyUI\ComfyUI" }
$ComfyPython   = if ($env:COMFYUI_PYTHON) { $env:COMFYUI_PYTHON } else { "C:\ComfyUI\venv\Scripts\python.exe" }
$ComfyArgs     = if ($env:COMFYUI_ARGS)  { $env:COMFYUI_ARGS }  else { "--listen 0.0.0.0 --port 8188" }
$DashboardDir  = if ($env:DASHBOARD_DIR)  { $env:DASHBOARD_DIR }  else { $PSScriptRoot }
$OllamaPort    = 11434
$ComfyPort     = 8188
$DashPort      = 3000

# ---------- Helpers ----------
function Test-Port($port) {
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:$port" -UseBasicParsing -TimeoutSec 2
        return $true
    } catch {
        return $false
    }
}
function Test-Ollama {
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:$OllamaPort/api/tags" -UseBasicParsing -TimeoutSec 2
        return $r.StatusCode -eq 200
    } catch { return $false }
}
function Test-Comfy {
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:$ComfyPort/system_stats" -UseBasicParsing -TimeoutSec 2
        return $r.StatusCode -eq 200
    } catch { return $false }
}
function Test-Dashboard {
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:$DashPort" -UseBasicParsing -TimeoutSec 2
        return $r.StatusCode -lt 500
    } catch { return $false }
}

function Wait-For($name, $checker, $timeoutSec = 120) {
    $deadline = (Get-Date).AddSeconds($timeoutSec)
    while ((Get-Date) -lt $deadline) {
        if (& $checker) {
            Write-Host "  [OK] $name is up" -ForegroundColor Green
            return $true
        }
        Start-Sleep -Seconds 2
    }
    Write-Host "  [FAIL] $name did not come up in ${timeoutSec}s" -ForegroundColor Red
    return $false
}

# ---------- Header ----------
Write-Host ""
Write-Host "========================================" -ForegroundColor Magenta
Write-Host " MiniMax H3 Director - Full Stack Start" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host ""
Write-Host "Services:"
Write-Host "  Ollama      -> http://127.0.0.1:$OllamaPort"
Write-Host "  ComfyUI     -> http://127.0.0.1:$ComfyPort"
Write-Host "  Dashboard   -> http://127.0.0.1:$DashPort/minimax-h3"
Write-Host ""

# ---------- 1. Ollama ----------
Write-Host "[1/3] Ollama..." -ForegroundColor Cyan
if (Test-Ollama) {
    Write-Host "  [SKIP] Already running on :$OllamaPort" -ForegroundColor Yellow
} elseif (-not (Test-Path $OllamaExe)) {
    Write-Host "  [WARN] ollama.exe not found at $OllamaExE" -ForegroundColor Red
    Write-Host "         Install from https://ollama.com or set `$env:OLLAMA_EXE" -ForegroundColor Yellow
} else {
    Write-Host "  Starting ollama serve..."
    Start-Process -FilePath $OllamaExe -ArgumentList "serve" -WindowStyle Minimized
    Wait-For "Ollama" ${function:Test-Ollama} 60
}

# ---------- 2. ComfyUI ----------
Write-Host "[2/3] ComfyUI..." -ForegroundColor Cyan
if (Test-Comfy) {
    Write-Host "  [SKIP] Already running on :$ComfyPort" -ForegroundColor Yellow
} elseif (-not (Test-Path $ComfyPython)) {
    Write-Host "  [WARN] Python not found at $ComfyPython" -ForegroundColor Red
    Write-Host "         Set `$env:COMFYUI_PYTHON to your venv python" -ForegroundColor Yellow
} elseif (-not (Test-Path (Join-Path $ComfyDir "main.py"))) {
    Write-Host "  [WARN] main.py not found in $ComfyDir" -ForegroundColor Red
    Write-Host "         Set `$env:COMFYUI_DIR" -ForegroundColor Yellow
} else {
    Write-Host "  Starting ComfyUI ($ComfyPython main.py $ComfyArgs)..."
    Start-Process -FilePath $ComfyPython `
        -ArgumentList "main.py", $ComfyArgs.Split(' ') `
        -WorkingDirectory $ComfyDir `
        -WindowStyle Minimized
    Write-Host "  Waiting for ComfyUI to load model + nodes (this can take 30-90s)..."
    Wait-For "ComfyUI" ${function:Test-Comfy} 180
}

# ---------- 3. Dashboard ----------
Write-Host "[3/3] Director Dashboard..." -ForegroundColor Cyan
if (Test-Dashboard) {
    Write-Host "  [SKIP] Already running on :$DashPort" -ForegroundColor Yellow
} else {
    Write-Host "  Starting Next.js dev server..."
    $env:NEXT_TELEMETRY_DISABLED = "1"
    $env:NODE_NO_WARNINGS = "1"
    # Launch via cmd /c so the npm.cmd shim resolves correctly and the process persists.
    Start-Process -FilePath "cmd.exe" `
        -ArgumentList "/c", "npm", "run", "dev" `
        -WorkingDirectory $DashboardDir `
        -WindowStyle Minimized
    Write-Host "  Waiting for Next.js to compile (first run can take 60-120s)..."
    Wait-For "Dashboard" ${function:Test-Dashboard} 180
}

# ---------- Done ----------
Write-Host ""
if ((Test-Ollama) -and (Test-Comfy) -and (Test-Dashboard)) {
    Write-Host "========================================" -ForegroundColor Green
    Write-Host " All services are up!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Director Dashboard:  http://127.0.0.1:$DashPort/minimax-h3" -ForegroundColor White
    Write-Host "  ComfyUI:             http://127.0.0.1:$ComfyPort" -ForegroundColor White
    Write-Host "  Ollama:              http://127.0.0.1:$OllamaPort" -ForegroundColor White
    Write-Host ""
    Write-Host "Opening dashboard in browser..." -ForegroundColor Cyan
    Start-Process "http://127.0.0.1:$DashPort/minimax-h3"
} else {
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host " Some services failed to start." -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host "  Ollama:    $(if (Test-Ollama) {'UP'} else {'DOWN'})" -ForegroundColor $(if (Test-Ollama) {'Green'} else {'Red'})
    Write-Host "  ComfyUI:   $(if (Test-Comfy) {'UP'} else {'DOWN'})" -ForegroundColor $(if (Test-Comfy) {'Green'} else {'Red'})
    Write-Host "  Dashboard: $(if (Test-Dashboard) {'UP'} else {'DOWN'})" -ForegroundColor $(if (Test-Dashboard) {'Green'} else {'Red'})
}
Write-Host ""
Write-Host "To stop everything:" -ForegroundColor DarkGray
Write-Host "  Stop-Process -Name node,python,ollama -Force" -ForegroundColor DarkGray
Write-Host ""