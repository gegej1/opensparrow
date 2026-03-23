@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
set "PACKAGED_SCRIPT=%SCRIPT_DIR%harden-local-feishu.ps1"
set "PACKAGED_RUNTIME=%SCRIPT_DIR%..\runtime"
set "REPO_ROOT=%SCRIPT_DIR%..\..\..\"
set "REPO_SCRIPT=%REPO_ROOT%scripts\openclaw-usb\harden-local-feishu.ps1"
set "REPO_RUNTIME=%REPO_ROOT%vendor\windows-openclaw"
if exist "%REPO_SCRIPT%" if exist "%REPO_RUNTIME%" (
  if not defined USB_RUNTIME_ROOT set "USB_RUNTIME_ROOT=%REPO_RUNTIME%"
  powershell -NoProfile -ExecutionPolicy Bypass -File "%REPO_SCRIPT%" %*
  set "CODE=%ERRORLEVEL%"
  exit /b %CODE%
)
if exist "%PACKAGED_SCRIPT%" if exist "%PACKAGED_RUNTIME%" (
  if not defined USB_RUNTIME_ROOT set "USB_RUNTIME_ROOT=%PACKAGED_RUNTIME%"
  powershell -NoProfile -ExecutionPolicy Bypass -File "%PACKAGED_SCRIPT%" %*
  set "CODE=%ERRORLEVEL%"
  exit /b %CODE%
)
echo [ERROR] harden-local-feishu.ps1 not found.
exit /b 1
