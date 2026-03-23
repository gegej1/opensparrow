@echo off
setlocal
if exist "%~dp0runtime\node\codex.cmd" (
  call "%~dp0runtime\node\codex.cmd" %*
  set "CODE=%ERRORLEVEL%"
  exit /b %CODE%
)
where codex >nul 2>nul
if %ERRORLEVEL%==0 (
  codex %*
  set "CODE=%ERRORLEVEL%"
  exit /b %CODE%
)
echo [ERROR] Codex CLI not found. Install codex or run from a packaged runtime.
exit /b 127
