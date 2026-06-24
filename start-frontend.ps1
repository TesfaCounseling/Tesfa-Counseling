# Start Next.js dev server from repo root (C:\dev\tesfa-counseling)
$frontend = Join-Path $PSScriptRoot "frontend"
Set-Location $frontend

if (-not (Test-Path "node_modules\next")) {
    Write-Host "Installing dependencies (first run)..."
    npm install
}

if (-not (Test-Path ".env.local")) {
    Copy-Item ".env.local.example" ".env.local"
}

if (Test-Path ".next") {
    Write-Host "Clearing .next cache..."
    Remove-Item -Recurse -Force ".next"
}

$port3000 = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($port3000) {
    $stalePid = $port3000.OwningProcess | Select-Object -First 1
    Write-Host "Stopping stale process on port 3000 (PID $stalePid)..."
    Stop-Process -Id $stalePid -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

Write-Host "Starting frontend at http://localhost:3000"
Write-Host "API should be running at http://127.0.0.1:5050 (run start-backend.ps1)"
npm run dev
