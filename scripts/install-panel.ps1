# ============================================================================
# Motion QA - After Effects CEP Panel Installer (Windows)
# ============================================================================
[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

Write-Host "=== Installing Motion QA CEP Panel ===" -ForegroundColor Cyan

# 1. Enable PlayerDebugMode for CEP 9 through 12
Write-Host "`n[1/4] Enabling PlayerDebugMode in Windows Registry..." -ForegroundColor Yellow
$csxsVersions = @("9", "10", "11", "12")
foreach ($ver in $csxsVersions) {
    $regPath = "HKCU:\Software\Adobe\CSXS.$ver"
    if (-not (Test-Path $regPath)) {
        New-Item -Path $regPath -Force | Out-Null
    }
    Set-ItemProperty -Path $regPath -Name "PlayerDebugMode" -Value "1" -Type String -Force | Out-Null
    Write-Host "  -> CSXS.$ver PlayerDebugMode set to 1" -ForegroundColor Gray
}

# 2. Build the panel frontend
Write-Host "`n[2/4] Building Motion QA panel assets..." -ForegroundColor Yellow
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$frontendDir = Join-Path $repoRoot "frontend"

if (-not (Test-Path $frontendDir)) {
    Write-Error "Could not locate frontend directory at $frontendDir"
    exit 1
}

Push-Location $frontendDir
try {
    & npm run build:panel
    if ($LASTEXITCODE -ne 0) {
        Write-Error "`n[ERROR] npm run build:panel failed with exit code $LASTEXITCODE. Installation aborted."
        exit $LASTEXITCODE
    }
} finally {
    Pop-Location
}

# 3. Create CEP extensions directory and junction
Write-Host "`n[3/4] Linking /ae folder to Adobe CEP extensions directory..." -ForegroundColor Yellow
$cepDir = Join-Path $env:APPDATA "Adobe\CEP\extensions"
if (-not (Test-Path $cepDir)) {
    New-Item -ItemType Directory -Path $cepDir -Force | Out-Null
    Write-Host "  -> Created directory: $cepDir" -ForegroundColor Gray
}

$targetJunction = Join-Path $cepDir "MotionQA"
$sourceAe = Join-Path $repoRoot "ae"

if (-not (Test-Path $sourceAe)) {
    Write-Error "Could not locate ae directory at $sourceAe"
    exit 1
}

# Remove existing link/junction if present
if (Test-Path $targetJunction) {
    Write-Host "  -> Removing existing MotionQA link..." -ForegroundColor Gray
    cmd /c rmdir "$targetJunction" 2>$null
    if (Test-Path $targetJunction) {
        Remove-Item -Path $targetJunction -Recurse -Force | Out-Null
    }
}

# Create new directory junction
New-Item -ItemType Junction -Path $targetJunction -Target $sourceAe | Out-Null
Write-Host "  -> Linked: $targetJunction => $sourceAe" -ForegroundColor Green

# 4. Final checklist
Write-Host "`n=== Installation Complete! ===" -ForegroundColor Green
Write-Host "`nNext steps to test in Adobe After Effects:" -ForegroundColor White
Write-Host "  1. Restart Adobe After Effects (if it was already running)." -ForegroundColor Yellow
Write-Host "  2. In the top menu, go to: Window > Extensions > Motion QA." -ForegroundColor Yellow
Write-Host "  3. Open a project and click 'Scan Project'." -ForegroundColor Yellow
Write-Host "  4. (Optional) For remote debugging, navigate to http://localhost:8088 in Chrome." -ForegroundColor Yellow
Write-Host ""
