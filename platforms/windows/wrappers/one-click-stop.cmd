@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
set "REPO_ROOT=%SCRIPT_DIR%..\..\..\"
set "REPO_RUNTIME=%REPO_ROOT%vendor\windows-openclaw"
set "REPO_NPX=%REPO_RUNTIME%\npx.cmd"
if exist "%~dp0usb-pack\one-click-stop.cmd" (
  call "%~dp0usb-pack\one-click-stop.cmd"
  set "CODE=%ERRORLEVEL%"
  exit /b %CODE%
)
if exist "%REPO_NPX%" (
  pushd "%REPO_RUNTIME%"
  call "%REPO_NPX%" openclaw gateway stop
  set "CODE=%ERRORLEVEL%"
  popd
  exit /b %CODE%
)
echo [ERROR] No stop entrypoint found.
exit /b 1
