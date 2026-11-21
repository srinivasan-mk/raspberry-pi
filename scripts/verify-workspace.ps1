# PowerShell Workspace Verification Script
# Validates directory structure, schemas, and contracts across segregated domains

$ErrorActionPreference = "Stop"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Raspberry Pi & Pi-hole Workspace Architecture Verification" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

$WorkspaceRoot = $PSScriptRoot | Split-Path -Parent
Write-Host "Workspace Root: $WorkspaceRoot" -ForegroundColor Green

# 1. Verify Core Directories
$RequiredDirs = @(
    "cross-cutting\hardware",
    "cross-cutting\telemetry",
    "cross-cutting\security",
    "cross-cutting\logging",
    "cross-cutting\networking",
    "cross-cutting\maintenance",
    "cross-cutting\contracts\schemas",
    "cross-cutting\contracts\types",
    "cross-cutting\contracts\go",
    "pi-daemon",
    "plugins\web-scraper",
    "plugins\messaging",
    "plugins\pihole",
    "host-tools\kiosk-chrome",
    "apps\mobile-web",
    "apps\flutter-ui",
    "docs"
)

Write-Host "`n[1] Checking Directory Layout:" -ForegroundColor Yellow
foreach ($dir in $RequiredDirs) {
    $fullPath = Join-Path $WorkspaceRoot $dir
    if (Test-Path $fullPath) {
        Write-Host "  [✓] $dir" -ForegroundColor Green
    } else {
        Write-Host "  [✗] MISSING: $dir" -ForegroundColor Red
    }
}

# 2. Verify Cross-Cutting Schemas & Contracts
$RequiredFiles = @(
    "cross-cutting\contracts\schemas\command.json",
    "cross-cutting\contracts\schemas\result.json",
    "cross-cutting\contracts\schemas\telemetry.json",
    "cross-cutting\contracts\schemas\interactive.json",
    "cross-cutting\contracts\schemas\pihole.json",
    "cross-cutting\contracts\types\contracts.ts",
    "cross-cutting\contracts\go\contracts.go",
    "cross-cutting\security\ufw-rules.sh",
    "cross-cutting\security\fail2ban-jail.local",
    "cross-cutting\security\secrets-template.env",
    "cross-cutting\maintenance\system-watchdog.sh",
    "cross-cutting\maintenance\backup-system.sh",
    "plugins\pihole\plugin.json",
    "plugins\pihole\main.py",
    "host-tools\kiosk-chrome\install-chrome.sh",
    "docs\ARCHITECTURE.md",
    "docs\CROSS_CUTTING_CONCERNS.md",
    "docs\SD_CARD_LONGEVITY.md"
)

Write-Host "`n[2] Checking Cross-Cutting Files:" -ForegroundColor Yellow
$missingCount = 0
foreach ($file in $RequiredFiles) {
    $fullPath = Join-Path $WorkspaceRoot $file
    if (Test-Path $fullPath) {
        Write-Host "  [✓] $file" -ForegroundColor Green
    } else {
        Write-Host "  [✗] MISSING: $file" -ForegroundColor Red
        $missingCount++
    }
}

# 3. Check JSON Schema Validity
Write-Host "`n[3] Validating JSON Schemas:" -ForegroundColor Yellow
Get-ChildItem -Path (Join-Path $WorkspaceRoot "cross-cutting\contracts\schemas\*.json") | ForEach-Object {
    try {
        $content = Get-Content $_.FullName -Raw | ConvertFrom-Json
        Write-Host "  [✓] $($_.Name) is valid JSON" -ForegroundColor Green
    } catch {
        Write-Host "  [✗] $($_.Name) JSON PARSE ERROR: $_" -ForegroundColor Red
    }
}

Write-Host "`n============================================================" -ForegroundColor Cyan
if ($missingCount -eq 0) {
    Write-Host "  Verification SUCCESS: All architecture domains segregated!" -ForegroundColor Green
} else {
    Write-Host "  Verification WARNING: $missingCount files missing." -ForegroundColor Red
}
Write-Host "============================================================" -ForegroundColor Cyan
