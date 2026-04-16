param(
  [string]$Profile = 'usb-portable'
)

$ErrorActionPreference = 'Stop'

function Resolve-HardenBridge() {
  $candidates = @(
    @{
      root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..'))
      script = 'scripts\openclaw-usb\harden-local-feishu.ps1'
      runtime = 'vendor\windows-openclaw'
    },
    @{
      root = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
      script = 'scripts\openclaw-usb\harden-local-feishu.ps1'
      runtime = 'runtime'
    }
  )

  foreach ($candidate in $candidates) {
    $scriptPath = Join-Path $candidate.root $candidate.script
    $runtimePath = Join-Path $candidate.root $candidate.runtime
    if ((Test-Path $scriptPath) -and (Test-Path $runtimePath)) {
      return @{
        scriptPath = (Resolve-Path $scriptPath).Path
        runtimeRoot = (Resolve-Path $runtimePath).Path
      }
    }
  }

  throw 'harden-local-feishu.ps1 not found.'
}

$bridge = Resolve-HardenBridge
$hadRuntimeRoot = Test-Path Env:USB_RUNTIME_ROOT
$previousRuntimeRoot = if ($hadRuntimeRoot) { [string]$env:USB_RUNTIME_ROOT } else { $null }

if ([string]::IsNullOrWhiteSpace($previousRuntimeRoot)) {
  $env:USB_RUNTIME_ROOT = [string]$bridge.runtimeRoot
}

try {
  & $bridge.scriptPath -Profile $Profile -DmPolicy pairing -AllowFromJson '[]' -RequireMention true
}
finally {
  if ($hadRuntimeRoot) {
    $env:USB_RUNTIME_ROOT = $previousRuntimeRoot
  }
  else {
    Remove-Item Env:USB_RUNTIME_ROOT -ErrorAction SilentlyContinue
  }
}

Read-Host 'Hardening complete. Press Enter to close'
