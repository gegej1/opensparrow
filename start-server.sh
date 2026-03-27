#!/bin/bash
set -e

echo "🚀 启动 OpenSparrow 服务器..."

# 检查配置文件
if [ ! -f "profiles/server/config.json" ]; then
  echo "❌ 配置文件不存在: profiles/server/config.json"
  echo "请先复制 config.template.json 并填写配置"
  exit 1
fi

# 创建日志目录
mkdir -p logs

# 启动服务
echo "📦 启动中..."
node ui/server.mjs --profile server > logs/server.log 2>&1 &
SERVER_PID=$!

# 等待启动
sleep 5

# 健康检查
if curl -s http://localhost:19000/health > /dev/null; then
  echo "✅ 服务启动成功！"
  echo "📊 管理面板: http://localhost:19000"
  echo "🔍 进程 PID: $SERVER_PID"
  echo "📝 日志文件: logs/server.log"
else
  echo "❌ 服务启动失败，请查看日志"
  exit 1
fi
