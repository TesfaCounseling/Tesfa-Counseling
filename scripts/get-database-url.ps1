# Get Netlify Database connection string for Render DATABASE_URL
# Run: C:\Users\jakli\get-database-url.cmd

$ProjectDir = "C:\dev\tesfa-counseling"
$ExpectedUrl = "tesfa-counseling.netlify.app"

Write-Host ""
Write-Host "Netlify Database URL helper" -ForegroundColor Cyan
Write-Host "===========================" -ForegroundColor Cyan
Write-Host ""

$netlifyCmd = Get-Command netlify -ErrorAction SilentlyContinue
if (-not $netlifyCmd) {
    Write-Host "Installing Netlify CLI..." -ForegroundColor Yellow
    npm install -g netlify-cli
}

Set-Location $ProjectDir

Write-Host "IMPORTANT: Log into the Netlify account for Tesfa Counseling." -ForegroundColor Yellow
Write-Host "  Site: https://$ExpectedUrl" -ForegroundColor Yellow
Write-Host "  NOT the Hibret Edir account." -ForegroundColor Yellow
Write-Host ""
$loginChoice = Read-Host "Switch Netlify login now? [Y/n]"
if ($loginChoice -ne "n" -and $loginChoice -ne "N") {
    netlify logout 2>$null
    Write-Host ""
    Write-Host "Browser opening - log in with Tesfa Counseling account." -ForegroundColor White
    netlify login
}

Write-Host ""
Write-Host "Checking which sites this login can see..." -ForegroundColor White
$siteList = netlify sites:list 2>&1 | Out-String
Write-Host $siteList

if ($siteList -notmatch "tesfa-counseling") {
    Write-Host ""
    Write-Host "WRONG NETLIFY ACCOUNT" -ForegroundColor Red
    Write-Host "This login does not see tesfa-counseling." -ForegroundColor Red
    Write-Host ""
    Write-Host "Easiest fix - use Neon in your browser:" -ForegroundColor Yellow
    Write-Host "  1. Open https://app.netlify.com/projects/tesfa-counseling/database" -ForegroundColor Cyan
    Write-Host "  2. Click Connect Neon (or Claim database)" -ForegroundColor White
    Write-Host "  3. Open https://console.neon.tech" -ForegroundColor Cyan
    Write-Host "  4. Your project -> Connection string -> copy postgresql://..." -ForegroundColor White
    Write-Host "  5. Paste into Render -> Environment -> DATABASE_URL" -ForegroundColor White
    Write-Host ""
    Write-Host "Or run: netlify logout" -ForegroundColor DarkGray
    Write-Host "       netlify login   (pick Tesfa Counseling team)" -ForegroundColor DarkGray
    Write-Host "       then run this script again" -ForegroundColor DarkGray
    Write-Host ""
    Read-Host "Press Enter to close"
    exit 1
}

Write-Host ""
Write-Host "Unlinking any old link..." -ForegroundColor White
netlify unlink 2>$null

Write-Host "Linking to tesfa-counseling..." -ForegroundColor White
netlify link --name tesfa-counseling 2>&1 | ForEach-Object { Write-Host $_ }
if ($LASTEXITCODE -ne 0) {
    netlify link --name Tesfa-Counseling 2>&1 | ForEach-Object { Write-Host $_ }
}
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Run manually: netlify link" -ForegroundColor Yellow
    Write-Host "Pick the site for $ExpectedUrl" -ForegroundColor Yellow
    Read-Host "Press Enter to close"
    exit 1
}

Write-Host ""
netlify status
Write-Host ""
Write-Host "Fetching database connection string..." -ForegroundColor White
Write-Host ""

$dbOutput = netlify database status --branch production --show-credentials 2>&1
$dbOutput | ForEach-Object { Write-Host $_ }

$connectionLine = @($dbOutput) | Where-Object { "$_" -match "^postgres(ql)?://" } | Select-Object -First 1
if ($connectionLine) {
    Write-Host ""
    Write-Host "SUCCESS - copy into Render -> Environment -> DATABASE_URL:" -ForegroundColor Green
    Write-Host $connectionLine -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "No URL in CLI output. Use Neon instead:" -ForegroundColor Yellow
    Write-Host "  https://app.netlify.com/projects/tesfa-counseling/database" -ForegroundColor Cyan
    Write-Host "  Connect Neon -> https://console.neon.tech -> Connection string" -ForegroundColor White
}

Write-Host ""
Write-Host "Do NOT commit this URL to GitHub." -ForegroundColor Yellow
Read-Host "Press Enter to close"
