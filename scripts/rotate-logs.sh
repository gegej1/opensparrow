#!/bin/bash
# 保留最近 7 天的日志，删除旧日志

find logs/ -name "*.log" -mtime +7 -delete 2>/dev/null
echo "✅ 日志清理完成"
