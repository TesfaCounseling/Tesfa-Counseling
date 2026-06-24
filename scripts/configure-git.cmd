@echo off
title Git Setup Wizard
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0configure-git.ps1"
pause
