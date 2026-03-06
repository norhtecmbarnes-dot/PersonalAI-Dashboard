# Prepare PersonalAI Dashboard for Transfer
# Run this script in PowerShell from the project root

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "PersonalAI Dashboard - Prepare for Transfer" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$SourcePath = $PSScriptRoot
$ExportPath = "$SourcePath\..\PersonalAI-Export"
$Timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm"

Write-Host "Source: $SourcePath" -ForegroundColor Gray
Write-Host "Export: $ExportPath" -ForegroundColor Gray
Write-Host ""

# Ask about including database
Write-Host "Do you want to include your database?" -ForegroundColor Yellow
Write-Host "  Y = Yes, include your chats, documents, and brands" -ForegroundColor Gray
Write-Host "  N = No, start fresh on the new computer" -ForegroundColor Gray
$IncludeData = Read-Host "Include database? (Y/N)"

# Ask about including .env.local
Write-Host ""
Write-Host "Do you want to include your .env.local file?" -ForegroundColor Yellow
Write-Host "  WARNING: This contains your API keys!" -ForegroundColor Red
Write-Host "  Only do this if the thumb drive is secure." -ForegroundColor Gray
$IncludeEnv = Read-Host "Include .env.local? (Y/N)"

Write-Host ""
Write-Host "Creating export folder..." -ForegroundColor Cyan

# Remove old export if exists
if (Test-Path $ExportPath) {
    Remove-Item $ExportPath -Recurse -Force
}

# Create folders
$Folders = @(
    "$ExportPath",
    "$ExportPath\src",
    "$ExportPath\book",
    "$ExportPath\docs",
    "$ExportPath\public"
)

foreach ($Folder in $Folders) {
    New-Item -ItemType Directory -Path $Folder -Force | Out-Null
}

Write-Host "Copying source code..." -ForegroundColor Green

# Copy folders
Copy-Item -Path "$SourcePath\src\*" -Destination "$ExportPath\src" -Recurse -Force
Copy-Item -Path "$SourcePath\book\*" -Destination "$ExportPath\book" -Recurse -Force
Copy-Item -Path "$SourcePath\docs\*" -Destination "$ExportPath\docs" -Recurse -Force
Copy-Item -Path "$SourcePath\public\*" -Destination "$ExportPath\public" -Recurse -Force

Write-Host "Copying configuration files..." -ForegroundColor Green

# Copy config files
$ConfigFiles = @(
    ".env.example",
    "package.json",
    "package-lock.json",
    "next.config.js",
    "tsconfig.json",
    "tailwind.config.js",
    "postcss.config.js",
    "README.md",
    "LICENSE",
    "CHANGELOG.md",
    ".gitignore"
)

foreach ($File in $ConfigFiles) {
    if (Test-Path "$SourcePath\$File") {
        Copy-Item -Path "$SourcePath\$File" -Destination "$ExportPath\$File" -Force
    }
}

# Optionally copy data folder
if ($IncludeData -eq "Y" -or $IncludeData -eq "y") {
    Write-Host "Copying database..." -ForegroundColor Green
    New-Item -ItemType Directory -Path "$ExportPath\data" -Force | Out-Null
    Copy-Item -Path "$SourcePath\data\*" -Destination "$ExportPath\data" -Recurse -Force
}

# Optionally copy .env.local
if ($IncludeEnv -eq "Y" -or $IncludeEnv -eq "y") {
    if (Test-Path "$SourcePath\.env.local") {
        Write-Host "Copying .env.local..." -ForegroundColor Yellow
        Copy-Item -Path "$SourcePath\.env.local" -Destination "$ExportPath\.env.local" -Force
    }
}

# Create setup instructions
$SetupInstructions = @"
# Quick Setup Instructions

## 1. Install Prerequisites

Download and install:
- Node.js (LTS version): https://nodejs.org
- Ollama: https://ollama.com

## 2. Install Dependencies

Open terminal in this folder and run:

    npm install

## 3. Create Environment File

If you didn't copy .env.local, create it:

    cp .env.example .env.local

## 4. (Optional) Add API Keys

Edit .env.local and add:

    OLLAMA_API_KEY=your-key-here

Get free key at: https://ollama.com/settings/keys

## 5. Pull a Model

    ollama pull qwen3.5:9b

## 6. Start the App

    npm run dev

Open: http://localhost:3000

## Full Documentation

See the 'book' folder for complete documentation.
See 'docs/MOVE-TO-ANOTHER-COMPUTER.md' for detailed instructions.
"@

Set-Content -Path "$ExportPath\SETUP.md" -Value $SetupInstructions

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Export Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Calculate size
$ExportSize = (Get-ChildItem -Path $ExportPath -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host "Export size: $([math]::Round($ExportSize, 1)) MB" -ForegroundColor Gray
Write-Host "Export location: $ExportPath" -ForegroundColor Gray
Write-Host ""
Write-Host "Files excluded (too large):" -ForegroundColor Yellow
Write-Host "  - node_modules (~500 MB)" -ForegroundColor Gray
Write-Host "  - .next cache (~100 MB)" -ForegroundColor Gray
Write-Host "  - .git history (~50 MB)" -ForegroundColor Gray
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Copy 'PersonalAI-Export' folder to your thumb drive" -ForegroundColor White
Write-Host "2. On new computer, copy to desired location" -ForegroundColor White
Write-Host "3. Run 'npm install' in the folder" -ForegroundColor White
Write-Host "4. Run 'npm run dev' to start" -ForegroundColor White
Write-Host ""
Write-Host "See SETUP.md in the export folder for detailed instructions." -ForegroundColor Gray