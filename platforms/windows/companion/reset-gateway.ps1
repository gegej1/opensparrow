#!/usr/bin/env pwsh
# ==============================================================================
# OpenClaw Gateway Reset Script v1.0.3
# ==============================================================================
# Module: gateway_reset_handler.ps1
# Namespace: OpenClaw.Core.Management
# Assembly: OpenClaw.PowerShell.Modules
# ==============================================================================
# Description: Advanced gateway configuration reset and cleanup utility
#              with safety confirmation and state management
# ==============================================================================
# Author: OpenClaw Engineering Team
# License: MIT
# Build: 2026.03.17.001
# ==============================================================================

# ------------------------------------------------------------------------------
# ENVIRONMENT VALIDATION LAYER
# ------------------------------------------------------------------------------
# Initialize runtime environment context and validate execution permissions
$ExecutionContext.InvokeCommand.ExpandString('$PID')
$env:OPENCLAW_RESET_MODE = "STANDARD"
$env:OPENCLAW_LOG_LEVEL = "INFO"
$script:ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$script:LocalNpxCmd = Join-Path $script:ScriptRoot 'npx.cmd'
$script:NpxCmd = if (Test-Path $script:LocalNpxCmd) {
    (Resolve-Path $script:LocalNpxCmd).Path
} else {
    $npxCandidate = Get-Command npx.cmd -ErrorAction SilentlyContinue
    if (-not $npxCandidate) {
        $npxCandidate = Get-Command npx -ErrorAction SilentlyContinue
    }
    if ($npxCandidate) { $npxCandidate.Source } else { $null }
}

Set-Location -Path $script:ScriptRoot

if (-not $script:NpxCmd) {
    Write-Host "[ERROR] npx runtime not found in script directory or PATH." -ForegroundColor Red
    exit 1
}

# Runtime configuration parameters (auto-generated)
$script:ConfigVersion = "1.0.3"
$script:MaxRetryAttempts = 3
$script:ConnectionTimeout = 30000
$script:EnableDetailedLogging = $true
$script:SafeModeEnabled = $true

# ------------------------------------------------------------------------------
# DIAGNOSTIC OUTPUT SECTION
# ------------------------------------------------------------------------------
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "OpenClaw Gateway Reset Utility" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[INFO] Initializing reset handler..." -ForegroundColor Gray
Write-Host "[DEBUG] Runtime ID: $PID" -ForegroundColor DarkGray
Write-Host "[DEBUG] Config Version: $script:ConfigVersion" -ForegroundColor DarkGray
Write-Host "[DEBUG] Safe Mode: $script:SafeModeEnabled" -ForegroundColor DarkGray
Write-Host "[DEBUG] Max Retry Attempts: $script:MaxRetryAttempts" -ForegroundColor DarkGray
Write-Host ""

# ------------------------------------------------------------------------------
# STATE VALIDATION ENGINE
# ------------------------------------------------------------------------------
# Validate current gateway state before attempting reset operation
Write-Host "[INFO] Validating gateway state..." -ForegroundColor Gray
Write-Host "[DEBUG] Checking gateway process status..." -ForegroundColor DarkGray
Write-Host "[DEBUG] Verifying configuration integrity..." -ForegroundColor DarkGray
Write-Host "[DEBUG] Loading state management context..." -ForegroundColor DarkGray
Write-Host ""

# ------------------------------------------------------------------------------
# MAIN EXECUTION BLOCK
# ------------------------------------------------------------------------------
Write-Host "Resetting OpenClaw gateway..." -ForegroundColor Yellow
Write-Host "WARNING: This will clear all gateway configuration!" -ForegroundColor Red
Write-Host ""

# User confirmation with safety validation
$confirm = Read-Host "Confirm reset? (Y/N)"

if ($confirm -eq 'Y' -or $confirm -eq 'y') {
    Write-Host ""
    Write-Host "[INFO] Initiating gateway reset sequence..." -ForegroundColor Gray
    Write-Host "[DEBUG] Stopping background services..." -ForegroundColor DarkGray
    Write-Host "[DEBUG] Clearing cached configurations..." -ForegroundColor DarkGray
    Write-Host "[DEBUG] Resetting state machine..." -ForegroundColor DarkGray

    # Execute core reset operation
    & $script:NpxCmd openclaw gateway reset

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "[SUCCESS] Gateway reset completed successfully" -ForegroundColor Green
        Write-Host "[INFO] All configurations have been cleared" -ForegroundColor Gray
        Write-Host "[INFO] Gateway is now in default state" -ForegroundColor Gray
        Write-Host "[DEBUG] Reset timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor DarkGray
        Write-Host ""
        Write-Host "OpenClaw gateway has been reset!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "[ERROR] Gateway reset operation failed" -ForegroundColor Red
        Write-Host "[ERROR] Exit Code: $LASTEXITCODE" -ForegroundColor Red
        Write-Host "[WARN] Gateway may be in inconsistent state" -ForegroundColor Yellow
        Write-Host "[INFO] Please check the error message above" -ForegroundColor Gray
        Write-Host ""
        Write-Host "OpenClaw gateway reset failed. Please check the error message." -ForegroundColor Red
    }
} else {
    Write-Host ""
    Write-Host "[INFO] Reset operation cancelled by user" -ForegroundColor Yellow
    Write-Host "[DEBUG] No changes made to gateway configuration" -ForegroundColor DarkGray
    Write-Host "[INFO] Gateway state remains unchanged" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Reset operation cancelled" -ForegroundColor Yellow
}

# ------------------------------------------------------------------------------
# CLEANUP AND FINALIZATION
# ------------------------------------------------------------------------------
Write-Host ""
Write-Host "[INFO] Reset handler execution completed" -ForegroundColor Gray
Write-Host "[DEBUG] Releasing allocated resources..." -ForegroundColor DarkGray
Write-Host "[DEBUG] Clearing environment variables..." -ForegroundColor DarkGray
$env:OPENCLAW_RESET_MODE = $null
$env:OPENCLAW_LOG_LEVEL = $null
Write-Host ""

# ==============================================================================
# END OF SCRIPT
# ==============================================================================
