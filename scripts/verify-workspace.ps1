# PowerShell Workspace Verification Script for Raspberry Pi Platform
# Validates host infrastructure, cross-cutting concerns, hardware tuning, and schemas

$ErrorActionPreference = "Stop"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Raspberry Pi Host Platform & Cross-Cutting Verification   " -ForegroundColor Cyan
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
    "scripts",
    "docs"
)

Write-Host "`n[1] Checking Directory Layout:" -ForegroundColor Yellow
$missingDirCount = 0
foreach ($dir in $RequiredDirs) {
    $fullPath = Join-Path $WorkspaceRoot $dir
    if (Test-Path $fullPath) {
        Write-Host "  [OK] $dir" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] MISSING: $dir" -ForegroundColor Red
        $missingDirCount++
    }
}

# 2. Verify Cross-Cutting Schemas, Hardware, Security, and Contracts
$RequiredFiles = @(
    # Contracts
    "cross-cutting\contracts\schemas\command.json",
    "cross-cutting\contracts\schemas\result.json",
    "cross-cutting\contracts\schemas\telemetry.json",
    "cross-cutting\contracts\schemas\interactive.json",
    "cross-cutting\contracts\schemas\pihole.json",
    "cross-cutting\contracts\schemas\messaging.json",
    "cross-cutting\contracts\types\contracts.ts",
    "cross-cutting\contracts\go\contracts.go",
    # Hardware Longevity
    "cross-cutting\hardware\apply-fstab-commit.sh",
    "cross-cutting\hardware\apply-kernel-writeback.sh",
    "cross-cutting\hardware\apply-pihole-batching.sh",
    "cross-cutting\hardware\check-hardware-health.sh",
    "cross-cutting\hardware\optimize-sd-card.sh",
    # Security
    "cross-cutting\security\ufw-rules.sh",
    "cross-cutting\security\fail2ban-jail.local",
    "cross-cutting\security\secrets-template.env",
    "cross-cutting\security\security-audit.sh",
    # Logging
    "cross-cutting\logging\log2ram-setup.sh",
    "cross-cutting\logging\logrotate-system.conf",
    "cross-cutting\logging\logger-contract.md",
    # Telemetry
    "cross-cutting\telemetry\collector.go",
    "cross-cutting\telemetry\telemetry_collector.py",
    "cross-cutting\telemetry\telemetry-spec.md",
    # Networking
    "cross-cutting\networking\dns-fallback.sh",
    "cross-cutting\networking\resilience-policy.md",
    # Maintenance
    "cross-cutting\maintenance\system-watchdog.sh",
    "cross-cutting\maintenance\backup-system.sh",
    # Platform Scripts & Docs
    "scripts\setup-pi.sh",
    "docs\ARCHITECTURE.md",
    "docs\CROSS_CUTTING_CONCERNS.md",
    "docs\SD_CARD_LONGEVITY.md",
    "docs\sd-card-io-optimization-notes.md",
    "docs\IMPLEMENTATION_PLAN.md",
    "docs\RASPBIAN_LITE_DEPLOYMENT.md",
    "readme.md",
    "SETUP.md"
)

Write-Host "`n[2] Checking Cross-Cutting Files:" -ForegroundColor Yellow
$missingCount = 0
foreach ($file in $RequiredFiles) {
    $fullPath = Join-Path $WorkspaceRoot $file
    if (Test-Path $fullPath) {
        Write-Host "  [OK] $file" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] MISSING: $file" -ForegroundColor Red
        $missingCount++
    }
}

# 3. Check JSON Schema Validity
Write-Host "`n[3] Validating JSON Schemas:" -ForegroundColor Yellow
$schemaErrorCount = 0
Get-ChildItem -Path (Join-Path $WorkspaceRoot "cross-cutting\contracts\schemas\*.json") | ForEach-Object {
    try {
        $null = Get-Content $_.FullName -Raw | ConvertFrom-Json
        Write-Host "  [OK] $($_.Name) is valid JSON" -ForegroundColor Green
    } catch {
        Write-Host "  [FAIL] $($_.Name) JSON PARSE ERROR: $_" -ForegroundColor Red
        $schemaErrorCount++
    }
}

Write-Host "`n============================================================" -ForegroundColor Cyan
if ($missingCount -eq 0 -and $missingDirCount -eq 0 -and $schemaErrorCount -eq 0) {
    Write-Host "  Verification SUCCESS: Raspberry Pi host & cross-cutting domains valid!" -ForegroundColor Green
} else {
    Write-Host "  Verification WARNING: $missingDirCount dirs missing, $missingCount files missing, $schemaErrorCount schema errors." -ForegroundColor Red
}
Write-Host "============================================================" -ForegroundColor Cyan
