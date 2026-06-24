# Start Flask API from repo root (C:\dev\tesfa-counseling)
$backend = Join-Path $PSScriptRoot "backend"
Set-Location $backend

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Created backend/.env from .env.example"
}

$env:FLASK_APP = "wsgi:app"

$port5050 = Get-NetTCPConnection -LocalPort 5050 -State Listen -ErrorAction SilentlyContinue
if ($port5050) {
    $stalePid = $port5050.OwningProcess | Select-Object -First 1
    Write-Host "Stopping stale process on port 5050 (PID $stalePid)..."
    Stop-Process -Id $stalePid -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

Write-Host "Starting API at http://127.0.0.1:5050/api/v1"
python run.py
