@echo off
setlocal
set "LOCAL_SCRIPT=%~dp0install-local-feishu.ps1"
set "REPO_SCRIPT=%~dp0..\..\..\scripts\openclaw-usb\install-local-feishu.ps1"
if exist "%LOCAL_SCRIPT%" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%LOCAL_SCRIPT%" %*
  set "CODE=%ERRORLEVEL%"
  exit /b %CODE%
)
if exist "%REPO_SCRIPT%" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%REPO_SCRIPT%" %*
  set "CODE=%ERRORLEVEL%"
  exit /b %CODE%
)
echo [ERROR] install-local-feishu.ps1 not found.
exit /b 1
