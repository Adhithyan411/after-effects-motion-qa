# ============================================================================
# Motion QA - After Effects CEP Panel Uninstaller (Windows)
# ============================================================================
[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

Write-Host "=== Uninstalling Motion QA CEP Panel ===" -ForegroundColor Cyan

$cepDir = Join-Path $env:APPDATA "Adobe\CEP\extensions"
$targetJunction = Join-Path $cepDir "MotionQA"

if (Test-Path $targetJunction) {
    Write-Host "Removing MotionQA junction from: $targetJunction..." -ForegroundColor Yellow
    cmd /c rmdir "$targetJunction" 2>$null
    if (Test-Path $targetJunction) {
        Remove-Item -Path $targetJunction -Recurse -Force | Out-Null
    }
    Write-Host "Motion QA extension unlinked successfully." -ForegroundColor Green
} else {
    Write-Host "No MotionQA extension link found at: $targetJunction" -ForegroundColor Yellow
}

Write-Host "`nRestart After Effects to complete uninstallation.`n" -ForegroundColor White
