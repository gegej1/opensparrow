# F-003 Runbook - U 盘交付包

## 目标

组装一个可拷贝到 U 盘的独立目录，包含 macOS / Windows 手动入口、脚本、文档和 runbook。

## 主命令

```bash
bash longrun/workspaces/openclaw-usb-portable/execution/scripts/build-delivery-pack.sh
```

默认输出：`dist/usb-pack/openclaw-usb-pack/`

组包来源：`docs/usb-pack/`、`docs/runbooks/`、`platforms/*/wrappers/`、`scripts/openclaw-usb/`

## 验收点

- staging 包目录完整
- macOS 存在 `.command` 入口
- Windows 存在 `.cmd` + `.ps1` 入口
- README.txt 与 SOP 一致
