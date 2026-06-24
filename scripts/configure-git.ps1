#Requires -Version 5.1
<#
.SYNOPSIS
  Interactive Git configuration for Windows.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Title([string]$Text) {
    Write-Host ""
    Write-Host "=== $Text ===" -ForegroundColor Cyan
}

function Read-YesNo([string]$Prompt, [bool]$Default = $true) {
    $suffix = if ($Default) { "[Y/n]" } else { "[y/N]" }
    while ($true) {
        $answer = Read-Host "$Prompt $suffix"
        if ([string]::IsNullOrWhiteSpace($answer)) { return $Default }
        switch ($answer.Trim().ToLower()) {
            { $_ -in "y", "yes" } { return $true }
            { $_ -in "n", "no" } { return $false }
            default { Write-Host "Please enter Y or N." -ForegroundColor Yellow }
        }
    }
}

function Read-WithDefault([string]$Prompt, [string]$Default) {
    if ([string]::IsNullOrWhiteSpace($Default)) {
        $value = Read-Host $Prompt
        return $value.Trim()
    }
    $value = Read-Host "$Prompt [$Default]"
    if ([string]::IsNullOrWhiteSpace($value)) { return $Default }
    return $value.Trim()
}

function Get-GitConfig([string]$Key) {
    try {
        $out = git config --global --get $Key 2>$null
        if ($LASTEXITCODE -eq 0) { return $out.Trim() }
    } catch { }
    return ""
}

function Set-GitConfig([string]$Key, [string]$Value) {
    if ([string]::IsNullOrWhiteSpace($Value)) { return }
    git config --global $Key $Value | Out-Null
    Write-Host "  Set $Key = $Value" -ForegroundColor Green
}

function Test-GitInstalled {
    $git = Get-Command git -ErrorAction SilentlyContinue
    if (-not $git) {
        Write-Host "Git is not installed or not on PATH." -ForegroundColor Red
        Write-Host "Install from: https://git-scm.com/download/win" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "Git: $(git --version)" -ForegroundColor DarkGray
}

Clear-Host
Write-Host ""
Write-Host "  Git setup wizard (Windows)" -ForegroundColor White
Write-Host "  --------------------------" -ForegroundColor White
Write-Host "  Configures global Git settings. Safe to run again anytime." -ForegroundColor White
Write-Host ""

Test-GitInstalled

Write-Title "1. Your identity (used on every commit)"

$currentName = Get-GitConfig "user.name"
$currentEmail = Get-GitConfig "user.email"

if ($currentName -or $currentEmail) {
    Write-Host "Current settings:" -ForegroundColor DarkGray
    if ($currentName) { Write-Host "  user.name  = $currentName" }
    if ($currentEmail) { Write-Host "  user.email = $currentEmail" }
}

$name = Read-WithDefault "Full name for commits" $currentName
while ([string]::IsNullOrWhiteSpace($name)) {
    Write-Host "Name cannot be empty." -ForegroundColor Yellow
    $name = Read-Host "Full name for commits"
}

$email = Read-WithDefault "Email (use your GitHub email)" $currentEmail
while ([string]::IsNullOrWhiteSpace($email) -or $email -notmatch "@") {
    Write-Host "Enter a valid email address." -ForegroundColor Yellow
    $email = Read-Host "Email (use your GitHub email)"
}

Set-GitConfig "user.name" $name
Set-GitConfig "user.email" $email

Write-Title "2. Defaults"

$currentBranch = Get-GitConfig "init.defaultBranch"
if ([string]::IsNullOrWhiteSpace($currentBranch)) { $currentBranch = "main" }
$branch = Read-WithDefault "Default branch name for new repos" $currentBranch
Set-GitConfig "init.defaultBranch" $branch

if (Read-YesNo "Use long path support on Windows? (recommended)" $true) {
    Set-GitConfig "core.longpaths" "true"
}

if (Read-YesNo "Colorize Git output in the terminal?" $true) {
    Set-GitConfig "color.ui" "auto"
}

Write-Title "3. GitHub sign-in (HTTPS)"

Write-Host "  For GitHub over HTTPS, Windows Git Credential Manager stores your login" -ForegroundColor DarkGray
Write-Host "  after the first successful push. Use a Personal Access Token (PAT) as the" -ForegroundColor DarkGray
Write-Host "  password - not your GitHub account password." -ForegroundColor DarkGray
Write-Host "  Create a token: https://github.com/settings/tokens" -ForegroundColor DarkGray
Write-Host ""

$credHelper = Get-GitConfig "credential.helper"
if ([string]::IsNullOrWhiteSpace($credHelper)) {
    if (Read-YesNo "Enable Git Credential Manager (recommended on Windows)?" $true) {
        git config --global credential.helper manager | Out-Null
        Write-Host "  Set credential.helper = manager" -ForegroundColor Green
    }
} else {
    Write-Host "  credential.helper already set: $credHelper" -ForegroundColor DarkGray
}

$ghUser = Read-WithDefault "GitHub username (optional, for remote URLs)" ""
if ($ghUser) {
    Write-Host "  GitHub username: $ghUser" -ForegroundColor DarkGray
}

if (Read-YesNo "Open GitHub token page in browser now?" $false) {
    Start-Process "https://github.com/settings/tokens/new"
}

Write-Title "4. Repository setup (optional)"

$repoRoot = (Get-Location).Path
$isRepo = Test-Path (Join-Path $repoRoot ".git")

if ($isRepo) {
    Write-Host "Current folder is already a Git repo:" -ForegroundColor DarkGray
    Write-Host "  $repoRoot"
    git remote get-url origin 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        $remote = git remote get-url origin
        Write-Host "  origin = $remote" -ForegroundColor DarkGray
    } elseif (Read-YesNo "Add GitHub remote origin now?" $false) {
        $defaultRemote = if ($ghUser) { "https://github.com/$ghUser/REPO_NAME.git" } else { "https://github.com/USERNAME/REPO_NAME.git" }
        $remoteUrl = Read-WithDefault "Remote URL" $defaultRemote
        git remote add origin $remoteUrl
        Write-Host "  Added origin = $remoteUrl" -ForegroundColor Green
    }
} elseif (Read-YesNo "Initialize a new Git repo in the CURRENT folder? ($repoRoot)" $false) {
    git init
    Write-Host "  Initialized repository." -ForegroundColor Green

    if (Read-YesNo "Add GitHub remote origin now?" $false) {
        $defaultRemote = if ($ghUser) { "https://github.com/$ghUser/REPO_NAME.git" } else { "https://github.com/USERNAME/REPO_NAME.git" }
        $remoteUrl = Read-WithDefault "Remote URL" $defaultRemote
        git remote add origin $remoteUrl
        Write-Host "  Added origin = $remoteUrl" -ForegroundColor Green
    }
} else {
    Write-Host "Skipped repo setup. Run again from your project folder if needed." -ForegroundColor DarkGray
}

Write-Title "5. Test GitHub connection (optional)"

if (Read-YesNo "Test SSH connection to GitHub? (only if you use SSH remotes)" $false) {
    Write-Host "Running: ssh -T git@github.com" -ForegroundColor DarkGray
    ssh -T git@github.com 2>&1
}

Write-Title "Done - current global Git config"

git config --global --list | ForEach-Object {
    if ($_ -match "^(user\.|init\.|credential\.|core\.longpaths|color\.ui)") {
        Write-Host "  $_" -ForegroundColor White
    }
}

Write-Host ""
Write-Host "Next steps (Tesfa Counseling example):" -ForegroundColor DarkGray
Write-Host "  cd C:\dev\tesfa-counseling" -ForegroundColor DarkGray
Write-Host "  git init" -ForegroundColor DarkGray
Write-Host "  git add ." -ForegroundColor DarkGray
Write-Host "  git commit -m Initial-commit" -ForegroundColor DarkGray
Write-Host "  git remote add origin https://github.com/YOUR_USER/tesfa-counseling.git" -ForegroundColor DarkGray
Write-Host "  git push -u origin main" -ForegroundColor DarkGray
Write-Host "  When prompted for password, paste your GitHub PAT." -ForegroundColor DarkGray
Write-Host ""

Read-Host 'Press Enter to close'
