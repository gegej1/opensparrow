@echo off
setlocal
if exist "%~dp0usb-pack\one-click-stop.cmd" (
  call "%~dp0usb-pack\one-click-stop.cmd"
  set "CODE=%ERRORLEVEL%"
  exit /b %CODE%
)
if exist "%~dp0..\companion\stop-gateway.ps1" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\companion\stop-gateway.ps1"
  set "CODE=%ERRORLEVEL%"
  exit /b %CODE%
)
echo [ERROR] No stop entrypoint found.
exit /b 1
