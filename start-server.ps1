Write-Host "🚀 启动 OpenSparrow 服务器..." -ForegroundColor Green

# 检查配置文件
if (-not (Test-Path "profiles\server\config.json")) {
    Write-Host "❌ 配置文件不存在: profiles\server\config.json" -ForegroundColor Red
    Write-Host "请先复制 config.template.json 并填写配置"
    exit 1
}

# 创建日志目录
if (-not (Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" | Out-Null
}

# 启动服务
Write-Host "📦 启动中..."
Start-Process -FilePath "node" -ArgumentList "ui/server.mjs --profile server" `
  -RedirectStandardOutput "logs\server.log" `
  -RedirectStandardError "logs\server-error.log" `
  -WindowStyle Hidden

# 等待启动
Start-Sleep -Seconds 5

# 健康检查
try {
    $response = Invoke-WebRequest -Uri "http://localhost:19000/health" -UseBasicParsing
    Write-Host "✅ 服务启动成功！" -ForegroundColor Green
    Write-Host "📊 管理面板: http://localhost:19000"
    Write-Host "📝 日志文件: logs\server.log"
} catch {
    Write-Host "❌ 服务启动失败，请查看日志" -ForegroundColor Red
    exit 1
}
