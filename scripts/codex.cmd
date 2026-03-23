@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..") do set "REPO_ROOT=%%~fI"

if not exist "%REPO_ROOT%\.codex" (
  echo [ERROR] .codex directory not found at repo root.
  exit /b 1
)

set "CODEX_HOME=%REPO_ROOT%\.codex"
pushd "%REPO_ROOT%"
where codex >nul 2>nul
if errorlevel 1 (
  popd
  echo [ERROR] Codex CLI not found. Install codex first.
  exit /b 127
)

codex %*
set "CODE=%ERRORLEVEL%"
popd
exit /b %CODE%
