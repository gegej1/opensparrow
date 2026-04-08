@echo off
setlocal
set "WRAPPER=%~dp0platforms\windows\wrappers\one-click-deploy.cmd"
if exist "%WRAPPER%" (
  call "%WRAPPER%" %*
  set "CODE=%ERRORLEVEL%"
  exit /b %CODE%
)
echo [ERROR] Windows deploy wrapper not found: %WRAPPER%
exit /b 1
