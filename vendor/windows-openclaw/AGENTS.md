# Vendor Runtime Rules

本目录是 Windows 版 `OpenClaw` 运行时分发包，虽然包含 `package.json`，但默认仍按 vendor 目录处理。

- 不要修改其中的 `node_modules/`、`node.exe`、`npm*`、`npx*`、锁文件或其他分发产物，除非用户明确要求。
- Windows 平台的定制逻辑优先放在 `../windows-配套文件/`。
- 如果必须改本目录，先在规格文档或进度记录中写明原因、范围和验证方式。

