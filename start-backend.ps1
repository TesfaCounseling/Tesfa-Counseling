# Start Flask API from repo root (C:\dev\tesfa-counseling)
$backend = Join-Path $PSScriptRoot "backend"
Set-Location $backend

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Created backend/.env from .env.example"
}

$env:FLASK_APP = "wsgi:app"

$stalePids = Get-NetTCPConnection -LocalPort 5050 -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique
foreach ($stalePid in $stalePids) {
    Write-Host "Stopping stale process on port 5050 (PID $stalePid)..."
    Stop-Process -Id $stalePid -Force -ErrorAction SilentlyContinue
}
if ($stalePids) {
    Start-Sleep -Seconds 2
}

Write-Host "Starting API at http://127.0.0.1:5050/api/v1"
python run.py
