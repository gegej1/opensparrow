param(
  [string]$Profile = 'usb-portable',
  [int]$UiPort = 19000,
  [switch]$NoPause
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Write-Step([string]$Message) {
  Write-Host ("[deploy] {0}" -f $Message)
}

function Finish-AndExit([int]$Code, [string]$Message) {
  if ($Message) {
    if ($Code -eq 0) {
      Write-Host ("[done] {0}" -f $Message)
    } else {
      Write-Host ("[error] {0}" -f $Message)
    }
  }

  if (-not $NoPause.IsPresent) {
    Read-Host 'Press Enter to close'
  }
  exit $Code
}

function Resolve-AbsolutePath([string]$RawPath) {
  return [System.IO.Path]::GetFullPath($RawPath)
}

function Test-TcpPort([string]$HostName, [int]$Port) {
  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $iar = $client.BeginConnect($HostName, $Port, $null, $null)
    $connected = $iar.AsyncWaitHandle.WaitOne(600)
    if (-not $connected) {
      return $false
    }
    $client.EndConnect($iar) | Out-Null
    return $client.Connected
  }
  catch {
    return $false
  }
  finally {
    $client.Close()
  }
}

function Test-LocalPortListening([int]$Port) {
  return Test-TcpPort -HostName '127.0.0.1' -Port $Port
}

function Get-NestedValue([object]$Target, [string[]]$Path) {
  $current = $Target
  foreach ($key in $Path) {
    if ($null -eq $current) {
      return $null
    }
    $prop = $current.PSObject.Properties[$key]
    if ($null -eq $prop) {
      return $null
    }
    $current = $prop.Value
  }
  return $current
}

function Find-UiEndpoint([int]$StartPort, [int]$ScanCount = 20) {
  for ($offset = 0; $offset -le $ScanCount; $offset += 1) {
    $port = $StartPort + $offset
    if (-not (Test-LocalPortListening -Port $port)) {
      continue
    }
    $candidate = "http://127.0.0.1:$port"
    try {
      $status = Invoke-RestMethod -Method Get -Uri "$candidate/api/status" -TimeoutSec 2
      if ($null -ne $status) {
        return @{
          baseUrl = $candidate
          port = $port
        }
      }
    }
    catch {}

    try {
      $res = Invoke-WebRequest -Method Get -Uri "$candidate/" -UseBasicParsing -TimeoutSec 2
      if ($res.StatusCode -ge 200 -and $res.StatusCode -lt 500) {
        return @{
          baseUrl = $candidate
          port = $port
        }
      }
    }
    catch {}
  }
  return $null
}

function Wait-UiEndpoint([int]$StartPort, [int]$TimeoutSeconds = 35, [int]$ScanCount = 20) {
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  $startedAt = Get-Date
  $tick = 0
  while ((Get-Date) -lt $deadline) {
    $tick += 1
    $found = Find-UiEndpoint -StartPort $StartPort -ScanCount $ScanCount
    if ($found) {
      return $found
    }
    if (($tick % 6) -eq 0) {
      $elapsed = [int]((Get-Date) - $startedAt).TotalSeconds
      Write-Step ("Waiting for UI service... {0}s" -f $elapsed)
    }
    Start-Sleep -Milliseconds 500
  }
  return $null
}

function Is-Enabled([object]$Value) {
  if ($Value -is [bool]) {
    return $Value
  }
  return ([string]$Value).Trim().ToLowerInvariant() -eq 'true'
}

function Resolve-NodeBinary([string]$RuntimeRoot) {
  $candidates = @(
    (Join-Path $RuntimeRoot 'node\node.exe'),
    (Join-Path $RuntimeRoot 'node.exe'),
    (Join-Path $RuntimeRoot 'bin\node.exe'),
    (Join-Path $RuntimeRoot 'bin\node')
  )
  foreach ($candidate in $candidates) {
    if (Test-Path $candidate) {
      return (Resolve-Path $candidate).Path
    }
  }
  return $null
}

function Resolve-PackContext() {
  $candidateRoots = @(
    $PSScriptRoot,
    (Join-Path $PSScriptRoot '..'),
    (Join-Path $PSScriptRoot '..\..\..')
  )

  foreach ($candidate in $candidateRoots) {
    $packRoot = Resolve-AbsolutePath $candidate
    $serverFile = Join-Path $packRoot 'ui\server.mjs'
    if (-not (Test-Path $serverFile)) {
      continue
    }

    $runtimeCandidates = @(
      (Join-Path $packRoot 'runtime'),
      (Join-Path $packRoot 'vendor\windows-openclaw')
    )

    foreach ($runtimeRoot in $runtimeCandidates) {
      $nodeBin = Resolve-NodeBinary -RuntimeRoot $runtimeRoot
      if ($nodeBin) {
        return @{
          packRoot = $packRoot
          runtimeRoot = (Resolve-Path $runtimeRoot).Path
          serverFile = (Resolve-Path $serverFile).Path
          nodeBin = $nodeBin
        }
      }
    }
  }

  throw 'Unable to resolve pack root. Expected either usb-pack/{runtime,ui}/ or repo-root/{ui/,vendor/windows-openclaw/}.'
}

function Resolve-OpenClawHome([string]$Profile) {
  $currentHome = [string]$HOME
  if ([string]::IsNullOrWhiteSpace($currentHome)) {
    $currentHome = [Environment]::GetFolderPath('UserProfile')
  }

  $currentStateDir = Join-Path $currentHome (".openclaw-{0}" -f $Profile)
  $currentConfig = Join-Path $currentStateDir 'openclaw.json'
  if (Test-Path $currentConfig) {
    return @{
      home = $currentHome
      reason = 'current'
      config = $currentConfig
    }
  }

  $roots = @('C:\Users')
  $candidates = @()
  foreach ($root in $roots) {
    if (-not (Test-Path $root)) { continue }
    foreach ($dir in (Get-ChildItem -Directory $root -ErrorAction SilentlyContinue)) {
      $name = [string]$dir.Name
      if ($name -in @('Public', 'Default', 'Default User', 'All Users')) { continue }
      $stateDir = Join-Path $dir.FullName (".openclaw-{0}" -f $Profile)
      $config = Join-Path $stateDir 'openclaw.json'
      if (Test-Path $config) {
        $info = Get-Item $config -ErrorAction SilentlyContinue
        if ($info) {
          $candidates += [pscustomobject]@{
            home = $dir.FullName
            config = $config
            lastWrite = $info.LastWriteTime
          }
        }
      }
    }
  }

  if ($candidates.Count -gt 0) {
    $best = $candidates | Sort-Object -Property lastWrite -Descending | Select-Object -First 1
    return @{
      home = [string]$best.home
      reason = 'detected'
      config = [string]$best.config
    }
  }

  return @{
    home = $currentHome
    reason = 'fallback'
    config = $currentConfig
  }
}

function Stop-DeployService([int]$UiPort) {
  $killed = 0
  try {
    $procs = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
      $cmd = [string]$_.CommandLine
      if ([string]::IsNullOrWhiteSpace($cmd)) { return $false }
      $cmd -like '*ui\server.mjs*' -or $cmd -like '*ui/server.mjs*'
    }
    foreach ($p in $procs) {
      try {
        Invoke-CimMethod -InputObject $p -MethodName Terminate -ErrorAction SilentlyContinue | Out-Null
        $killed += 1
      } catch {}
    }
  } catch {}

  try {
    $listeners = Get-NetTCPConnection -LocalPort $UiPort -State Listen -ErrorAction SilentlyContinue
    foreach ($c in $listeners) {
      $pid = [int]$c.OwningProcess
      if ($pid -gt 0) {
        try { Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue } catch {}
      }
    }
  } catch {}

  return $killed
}

function Ensure-PluginsAllow([string]$ConfigFile, [string[]]$PluginIds) {
  if (-not (Test-Path $ConfigFile)) { return $false }
  $ids = @()
  foreach ($id in $PluginIds) {
    $v = ([string]$id).Trim()
    if ($v) { $ids += $v }
  }
  if ($ids.Count -eq 0) { return $false }

  try {
    $raw = Get-Content -Raw -LiteralPath $ConfigFile -ErrorAction Stop
    $cfg = $raw | ConvertFrom-Json -ErrorAction Stop
    if ($null -eq $cfg.plugins) { $cfg | Add-Member -NotePropertyName plugins -NotePropertyValue ([pscustomobject]@{}) }
    if ($null -eq $cfg.plugins.allow) { $cfg.plugins | Add-Member -NotePropertyName allow -NotePropertyValue @() }

    $current = @()
    foreach ($x in @($cfg.plugins.allow)) {
      $t = ([string]$x).Trim()
      if ($t) { $current += $t }
    }
    $changed = $false
    $stateDir = Split-Path -Parent $ConfigFile
    foreach ($id in $ids) {
      $extDir = Join-Path $stateDir ("extensions\{0}" -f $id)
      $installed = Test-Path $extDir
      if ($installed) {
        if ($current -notcontains $id) {
          $current += $id
          $changed = $true
        }
      } else {
        if ($current -contains $id) {
          $current = @($current | Where-Object { $_ -ne $id })
          $changed = $true
        }
      }
    }
    if (-not $changed) { return $false }

    $cfg.plugins.allow = $current
    $json = $cfg | ConvertTo-Json -Depth 30
    Set-Content -LiteralPath $ConfigFile -Value $json -Encoding UTF8 -ErrorAction Stop
    return $true
  } catch {
    return $false
  }
}

function Build-InstallPayload([string]$StateDir) {
  $configFile = Join-Path $StateDir 'openclaw.json'
  $authFile = Join-Path $StateDir 'agents\main\agent\auth-profiles.json'
  $uiMetaFile = Join-Path $StateDir 'ui-meta.json'

  if (-not (Test-Path $configFile)) {
    return $null
  }
  if (-not (Test-Path $authFile)) {
    return $null
  }

  $config = Get-Content -Raw -Path $configFile | ConvertFrom-Json
  $auth = Get-Content -Raw -Path $authFile | ConvertFrom-Json
  $uiMeta = $null
  if (Test-Path $uiMetaFile) {
    try {
      $uiMeta = Get-Content -Raw -Path $uiMetaFile | ConvertFrom-Json
    }
    catch {
      $uiMeta = $null
    }
  }

  $apiKey = [string](Get-NestedValue $auth @('profiles', 'openai:default', 'key'))
  $baseUrl = [string](Get-NestedValue $config @('models', 'providers', 'openai', 'baseUrl'))
  if ([string]::IsNullOrWhiteSpace($baseUrl)) {
    $baseUrl = 'https://api.openai.com/v1'
  }

  $model = ''
  $providerModels = Get-NestedValue $config @('models', 'providers', 'openai', 'models')
  if ($providerModels) {
    $firstProviderModel = @($providerModels) | Select-Object -First 1
    $model = [string](Get-NestedValue $firstProviderModel @('id'))
  }
  if ([string]::IsNullOrWhiteSpace($model)) {
    $primary = [string](Get-NestedValue $config @('agents', 'defaults', 'model', 'primary'))
    if ($primary.StartsWith('openai/')) {
      $model = $primary.Substring(7)
    } else {
      $model = $primary
    }
  }
  if ([string]::IsNullOrWhiteSpace($model)) {
    $model = if ($env:OPENCLAW_MODEL) { ($env:OPENCLAW_MODEL -replace '^openai/', '') } else { 'gpt-4o-mini' }
  }

  $channels = @()
  $channelsNode = Get-NestedValue $config @('channels')
  if ($channelsNode) {
    $feishu = Get-NestedValue $channelsNode @('feishu')
    if ($feishu -and (Is-Enabled (Get-NestedValue $feishu @('enabled')))) {
      $channels += @{
        type = 'feishu'
        appId = [string](Get-NestedValue $feishu @('appId'))
        appSecret = [string](Get-NestedValue $feishu @('appSecret'))
      }
    }

    $dingtalk = Get-NestedValue $channelsNode @('dingtalk')
    if ($dingtalk -and (Is-Enabled (Get-NestedValue $dingtalk @('enabled')))) {
      $dingtalkMeta = $null
      if ($uiMeta) {
        $dingtalkMeta = Get-NestedValue $uiMeta @('dingtalk')
      }

      $clientId = [string](Get-NestedValue $dingtalk @('clientId'))
      if ([string]::IsNullOrWhiteSpace($clientId)) {
        $clientId = [string](Get-NestedValue $dingtalk @('appKey'))
      }

      $clientSecret = [string](Get-NestedValue $dingtalk @('clientSecret'))
      if ([string]::IsNullOrWhiteSpace($clientSecret)) {
        $clientSecret = [string](Get-NestedValue $dingtalk @('appSecret'))
      }

      $robotCode = [string](Get-NestedValue $dingtalk @('robotCode'))
      if ([string]::IsNullOrWhiteSpace($robotCode) -and $dingtalkMeta) {
        $robotCode = [string](Get-NestedValue $dingtalkMeta @('robotCode'))
      }

      $corpId = [string](Get-NestedValue $dingtalk @('corpId'))
      if ([string]::IsNullOrWhiteSpace($corpId)) {
        $corpId = [string](Get-NestedValue $dingtalk @('cropId'))
      }
      if ([string]::IsNullOrWhiteSpace($corpId) -and $dingtalkMeta) {
        $corpId = [string](Get-NestedValue $dingtalkMeta @('corpId'))
        if ([string]::IsNullOrWhiteSpace($corpId)) {
          $corpId = [string](Get-NestedValue $dingtalkMeta @('cropId'))
        }
      }

      $dingtalkPayload = @{
        type = 'dingtalk'
        clientId = $clientId
        clientSecret = $clientSecret
      }
      if (-not [string]::IsNullOrWhiteSpace($robotCode)) {
        $dingtalkPayload.robotCode = $robotCode
      }
      if (-not [string]::IsNullOrWhiteSpace($corpId)) {
        $dingtalkPayload.corpId = $corpId
      }
      $channels += $dingtalkPayload
    }

    $wecom = Get-NestedValue $channelsNode @('wecom')
    if ($wecom -and (Is-Enabled (Get-NestedValue $wecom @('enabled')))) {
      $channels += @{
        type = 'wecom'
        botId = [string](Get-NestedValue $wecom @('botId'))
        secret = [string](Get-NestedValue $wecom @('secret'))
      }
    }
  }

  if ([string]::IsNullOrWhiteSpace($apiKey)) {
    return @{
      missingApiKey = $true
      payload = $null
    }
  }

  return @{
    missingApiKey = $false
    payload = @{
      channels = $channels
      api = @{
        baseUrl = $baseUrl
        apiKey = $apiKey
        model = $model
      }
    }
  }
}

function Read-WebExceptionBody([System.Management.Automation.ErrorRecord]$ErrorRecord) {
  if ($ErrorRecord -and $ErrorRecord.ErrorDetails) {
    $detailMessage = [string]$ErrorRecord.ErrorDetails.Message
    if (-not [string]::IsNullOrWhiteSpace($detailMessage)) {
      return $detailMessage
    }
  }
  try {
    $response = $ErrorRecord.Exception.Response
    if ($null -eq $response) {
      return ''
    }
    $stream = $response.GetResponseStream()
    if ($null -eq $stream) {
      return ''
    }
    $reader = New-Object System.IO.StreamReader($stream)
    try {
      return $reader.ReadToEnd()
    }
    finally {
      $reader.Dispose()
      $stream.Dispose()
    }
  }
  catch {
    return ''
  }
}

function Parse-InstallResponse([int]$StatusCode, [string]$RawBody) {
  $parsed = $null
  if (-not [string]::IsNullOrWhiteSpace($RawBody)) {
    try {
      $parsed = $RawBody | ConvertFrom-Json
    }
    catch {}
  }

  $errors = @()
  $warnings = @()
  $message = ''
  $runtimeMode = ''
  $ok = ($StatusCode -ge 200 -and $StatusCode -lt 300)

  if ($parsed) {
    if ($parsed.PSObject.Properties['errors']) {
      $errors += @($parsed.errors | ForEach-Object { [string]$_ })
    }
    if ($parsed.PSObject.Properties['error'] -and -not [string]::IsNullOrWhiteSpace([string]$parsed.error)) {
      $errors += [string]$parsed.error
    }
    if ($parsed.PSObject.Properties['message']) {
      $message = [string]$parsed.message
    }
    if ($parsed.PSObject.Properties['warnings']) {
      $warnings += @($parsed.warnings | ForEach-Object { [string]$_ })
    }
    if ($parsed.PSObject.Properties['runtimeMode']) {
      $runtimeMode = [string]$parsed.runtimeMode
    }
    if ($parsed.PSObject.Properties['ok']) {
      $ok = [bool]$parsed.ok
    }
  }

  return @{
    ok = $ok
    statusCode = $StatusCode
    errors = $errors
    warnings = $warnings
    message = $message
    runtimeMode = $runtimeMode
    rawBody = $RawBody
  }
}

function Get-InstallErrorText([hashtable]$InstallResult) {
  $parts = @()
  if ($InstallResult.errors) {
    $parts += @($InstallResult.errors | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
  }
  if (-not [string]::IsNullOrWhiteSpace($InstallResult.message)) {
    $parts += $InstallResult.message.Trim()
  }
  if ($parts.Count -eq 0 -and -not [string]::IsNullOrWhiteSpace($InstallResult.rawBody)) {
    $parts += $InstallResult.rawBody.Trim()
  }
  if ($parts.Count -eq 0) {
    $parts += ("HTTP {0}" -f $InstallResult.statusCode)
  }
  return ($parts -join '; ')
}

function Test-InstallTimeoutLike([string]$Text) {
  if ([string]::IsNullOrWhiteSpace($Text)) {
    return $false
  }
  $timeoutLike = $Text -match '(?i)(timed out|timeout|health\s*check)'
  $hardFail = $Text -match '(?i)(config set|models set|plugin install|writing auth-profiles|spawn .*enoent|unknown channel type|不能为空|invalid)'
  return $timeoutLike -and (-not $hardFail)
}

function Wait-InstallConvergence([string]$BaseUrl, [int]$TimeoutSeconds = 300) {
  $startedAt = Get-Date
  $deadline = $startedAt.AddSeconds($TimeoutSeconds)
  $tick = 0
  while ((Get-Date) -lt $deadline) {
    $tick += 1
    try {
      $status = Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/status" -TimeoutSec 10
      if ($status.installed -eq $true -and [string]$status.daemon -eq 'running') {
        return @{
          ok = $true
          status = $status
        }
      }
    }
    catch {}

    if (($tick % 5) -eq 0) {
      $elapsed = [int]((Get-Date) - $startedAt).TotalSeconds
      Write-Step ("Install still converging... {0}s" -f $elapsed)
    }
    Start-Sleep -Seconds 2
  }

  return @{
    ok = $false
    status = $null
  }
}

function Invoke-InstallRequest([string]$BaseUrl, [hashtable]$Payload) {
  $body = $Payload | ConvertTo-Json -Depth 12
  $attempt = 0

  while ($attempt -lt 2) {
    $attempt += 1
    try {
      $response = Invoke-WebRequest -Method Post -Uri "$BaseUrl/api/install" -ContentType 'application/json' -Body $body -UseBasicParsing -TimeoutSec 240
      return Parse-InstallResponse -StatusCode ([int]$response.StatusCode) -RawBody ([string]$response.Content)
    }
    catch {
      $statusCode = 0
      try {
        $statusCode = [int]$_.Exception.Response.StatusCode.value__
      }
      catch {
        try {
          $statusCode = [int]$_.Exception.Response.StatusCode
        }
        catch {}
      }

      if ($statusCode -ge 400) {
        $rawBody = Read-WebExceptionBody -ErrorRecord $_
        return Parse-InstallResponse -StatusCode $statusCode -RawBody $rawBody
      }

      if ($attempt -lt 2) {
        $detail = $_.Exception.Message
        Write-Step ("Install request transient failure, retrying once: {0}" -f $detail)
        Start-Sleep -Seconds 2
        continue
      }
      throw
    }
  }
}

try {
  Write-Step 'One-click deployment started.'
  $packContext = Resolve-PackContext
  $packRoot = [string]$packContext.packRoot
  $runtimeRoot = [string]$packContext.runtimeRoot
  $nodeBin = [string]$packContext.nodeBin
  $serverFile = [string]$packContext.serverFile
  $baseUrl = "http://127.0.0.1:$UiPort"
  $browserBaseUrl = "http://localhost:$UiPort"
  $homeResolution = Resolve-OpenClawHome -Profile $Profile
  $openclawHome = [string]$homeResolution.home
  $stateDir = Join-Path $openclawHome (".openclaw-{0}" -f $Profile)
  if ($homeResolution.reason -eq 'detected') {
    Write-Step ("Detected existing OpenClaw profile in {0}. If you launched as Administrator, this keeps using your normal user config." -f $stateDir)
  }
  Write-Step ("Working folder: {0}" -f $packRoot)
  Write-Step ("Runtime root: {0}" -f $runtimeRoot)

  if (-not (Test-Path $nodeBin)) {
    throw "Node runtime not found: $nodeBin"
  }
  if (-not (Test-Path $serverFile)) {
    throw "UI server not found: $serverFile"
  }

  $endpoint = Find-UiEndpoint -StartPort $UiPort -ScanCount 20
  if ($endpoint) {
    $baseUrl = [string]$endpoint.baseUrl
    $browserBaseUrl = "http://localhost:{0}" -f [int]$endpoint.port
    Write-Step ("Deploy service already running on port {0}." -f [int]$endpoint.port)
    Write-Step 'Restarting deploy service to pick up latest deploy logic...'
    Stop-DeployService -UiPort ([int]$endpoint.port) | Out-Null
    $endpoint = $null
  }
  if (-not $endpoint) {
    Write-Step 'Starting local deploy service...'
    $oldAutoOpen = $env:OPENSPARROW_AUTO_OPEN
    $oldOpenclawHome = $env:OPENCLAW_HOME
    $oldOpenclawProfile = $env:OPENCLAW_PROFILE
    $oldRuntimeRoot = $env:USB_RUNTIME_ROOT
    $env:OPENSPARROW_AUTO_OPEN = '0'
    $env:OPENCLAW_HOME = $openclawHome
    $env:OPENCLAW_PROFILE = $Profile
    $env:USB_RUNTIME_ROOT = $runtimeRoot
    try {
      Start-Process -FilePath $nodeBin -ArgumentList @($serverFile) -WorkingDirectory $packRoot -WindowStyle Hidden | Out-Null
    }
    finally {
      if ($null -eq $oldAutoOpen) {
        Remove-Item Env:OPENSPARROW_AUTO_OPEN -ErrorAction SilentlyContinue
      }
      else {
        $env:OPENSPARROW_AUTO_OPEN = $oldAutoOpen
      }
      if ($null -eq $oldOpenclawHome) {
        Remove-Item Env:OPENCLAW_HOME -ErrorAction SilentlyContinue
      } else {
        $env:OPENCLAW_HOME = $oldOpenclawHome
      }
      if ($null -eq $oldOpenclawProfile) {
        Remove-Item Env:OPENCLAW_PROFILE -ErrorAction SilentlyContinue
      } else {
        $env:OPENCLAW_PROFILE = $oldOpenclawProfile
      }
      if ($null -eq $oldRuntimeRoot) {
        Remove-Item Env:USB_RUNTIME_ROOT -ErrorAction SilentlyContinue
      } else {
        $env:USB_RUNTIME_ROOT = $oldRuntimeRoot
      }
    }
    Write-Step 'Local deploy service process started.'
    $endpoint = Wait-UiEndpoint -StartPort $UiPort -TimeoutSeconds 35 -ScanCount 20
    if (-not $endpoint) {
      throw "UI server is not ready near port $UiPort"
    }
    $baseUrl = [string]$endpoint.baseUrl
    $browserBaseUrl = "http://localhost:{0}" -f [int]$endpoint.port
    Write-Step ("Deploy service is ready on port {0}." -f [int]$endpoint.port)
  }

  $installData = Build-InstallPayload -StateDir $stateDir
  if ($null -eq $installData) {
    Write-Step 'Config or credentials not found, opening setup page...'
    Start-Process "$browserBaseUrl/" | Out-Null
    Finish-AndExit 0 'Please fill in config in browser, then click Install once.'
  }

  if (Ensure-PluginsAllow -ConfigFile (Join-Path $stateDir 'openclaw.json') -PluginIds @('channels')) {
    Write-Step 'Updated openclaw.json: plugins.allow reconciled'
  }

  if ($installData.missingApiKey) {
    Write-Step 'API key is missing, opening setup page...'
    Start-Process "$browserBaseUrl/" | Out-Null
    Finish-AndExit 0 'Please fill in API key in browser and click Install.'
  }

  Write-Step 'Running one-click install...'
  Write-Step 'This step may take 1-3 minutes, please wait.'
  $result = Invoke-InstallRequest -BaseUrl $baseUrl -Payload $installData.payload

  if ($result.ok -ne $true) {
    $errorText = Get-InstallErrorText -InstallResult $result
    if (Test-InstallTimeoutLike -Text $errorText) {
      Write-Step 'Install reported timeout-like response; waiting for status convergence...'
      $convergence = Wait-InstallConvergence -BaseUrl $baseUrl -TimeoutSeconds 300
      if ($convergence.ok -eq $true) {
        Start-Process "$browserBaseUrl/dashboard" | Out-Null
        $mode = [string]$convergence.status.runtimeMode
        Finish-AndExit 0 ("Deployment completed after delayed startup. runtimeMode={0}" -f $mode)
      }
      throw ("Install timeout-like response did not converge in time: {0}" -f $errorText)
    }
    throw ("Install failed: {0}" -f $errorText)
  }

  Start-Process "$browserBaseUrl/dashboard" | Out-Null

  $warnings = @($result.warnings)
  if ($warnings.Count -gt 0) {
    Write-Host '[warn] Install completed with warnings:'
    $warnings | ForEach-Object { Write-Host ("  - {0}" -f $_) }
  }

  $status = Invoke-RestMethod -Method Get -Uri "$baseUrl/api/status" -TimeoutSec 10
  $mode = [string]$status.runtimeMode
  Finish-AndExit 0 ("Deployment completed. runtimeMode={0}" -f $mode)
}
catch {
  try {
    Start-Process "$browserBaseUrl/" | Out-Null
  }
  catch {}
  Finish-AndExit 1 $_.Exception.Message
}
