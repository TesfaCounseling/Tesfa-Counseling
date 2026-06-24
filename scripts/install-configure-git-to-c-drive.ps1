#Requires -RunAsAdministrator
# Copies configure-git scripts from your profile (or project) to C:\
# Right-click -> Run with PowerShell (as Administrator)

$ErrorActionPreference = "Stop"

$sources = @(
    "$env:USERPROFILE\configure-git.ps1",
    "C:\dev\tesfa-counseling\scripts\configure-git.ps1"
)

$srcPs1 = $sources | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $srcPs1) {
    Write-Host "Could not find configure-git.ps1. Run from project scripts folder first." -ForegroundColor Red
    Read-Host "Press Enter"
    exit 1
}

$srcDir = Split-Path $srcPs1 -Parent
Copy-Item (Join-Path $srcDir "configure-git.ps1") "C:\configure-git.ps1" -Force
Copy-Item (Join-Path $srcDir "configure-git.cmd") "C:\configure-git.cmd" -Force

Write-Host "Installed:" -ForegroundColor Green
Write-Host "  C:\configure-git.ps1"
Write-Host "  C:\configure-git.cmd"
Write-Host ""
Write-Host "Double-click C:\configure-git.cmd anytime to run the wizard."
Read-Host "Press Enter"
