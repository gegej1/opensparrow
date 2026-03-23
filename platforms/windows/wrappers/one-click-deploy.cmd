@echo off
setlocal
if exist "%~dp0usb-pack\one-click-deploy.cmd" (
  call "%~dp0usb-pack\one-click-deploy.cmd"
  set "CODE=%ERRORLEVEL%"
  exit /b %CODE%
)
if exist "%~dp0run-openclaw-usb.cmd" (
  call "%~dp0run-openclaw-usb.cmd" %*
  set "CODE=%ERRORLEVEL%"
  exit /b %CODE%
)
echo [ERROR] No deploy entrypoint found.
exit /b 1
