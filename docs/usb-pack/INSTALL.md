# OpenSparrow Mac UI-first 安装指南

当前版本：`0.1.0-alpha`

这份指南只覆盖今晚的 **Mac UI-first 首发 cut**。

## 今晚正式支持面

- 平台：`macOS 12+`
- 唯一官方 first-click path：根目录 `01-开始部署.command`
- 今晚正式支持渠道：`飞书`、`钉钉`
- `mac/run-openclaw-usb.command` 与 `mac/harden-openclaw-usb.command` 仅作为高级兼容 / handoff 入口
- 企业微信入口即使仍出现在 UI 中，也**不属于今晚 packaged 正式支持面**
- companion 不纳入今晚正式支持面

## 开始前准备

请先准备你实际要接入的渠道凭据：

- 飞书：`App ID` + `App Secret`
- 钉钉：`Client ID / AppKey` + `Client Secret / AppSecret`

同时确认：

- 设备可以联网
- 浏览器可访问本机 `http://localhost:19000`
- 你将从交付包根目录启动，而不是从 `mac/run-openclaw-usb.command` 直接开始安装

## 安装步骤

1. 打开交付包根目录。
2. 双击 `01-开始部署.command`。
3. 若 macOS 弹出安全提示，到“系统设置 → 隐私与安全性”中选择“仍要打开”。
4. 稍等片刻，浏览器会自动打开安装向导：
   - 默认地址：`http://localhost:19000`
   - 若 `19000` 已占用，系统会自动切换到下一个可用端口
5. 在安装向导中选择 **飞书** 或 **钉钉**。
6. 按页面提示填写对应凭据。
7. 点击“安装”并等待流程完成。
8. 安装成功后，页面会自动跳转到 Dashboard。

## 安装完成后应看到什么

至少确认以下几点：

- Dashboard 可以正常打开
- 服务状态显示为运行中
- 你选择的渠道显示已启用
- “基本信息”卡片中的端口与实际启动端口一致，而不是默认写死某个值

## 高级兼容入口说明

交付包中仍会保留：

- `mac/run-openclaw-usb.command`
- `mac/harden-openclaw-usb.command`

它们今晚只承担 **advanced compatibility / handoff** 角色：

- 不再是主安装路径
- 不再是独立 hardening 主路径
- 运行后应回到根目录 `01-开始部署.command` 所代表的 canonical UI / Dashboard 控制面

## 常见问题

### 1. 浏览器没有自动打开

- 先看启动终端输出中的实际地址
- 手动在浏览器访问该地址
- 若 `19000` 被占用，UI 可能已切到 `19001`、`19002` 等后续端口

### 2. 想重新安装

- 进入 Dashboard
- 使用“重置配置 / 全量重置”
- 页面会回到安装向导

### 3. 误点了 `mac/run-openclaw-usb.command`

这是高级兼容入口，不是今晚正式主路径。
当前脚本会把你转回根目录 `01-开始部署.command`。

### 4. 企业微信为什么不在今晚正式支持面

这是 **packaged outward promise de-scope**，不是把真正 `F-014` 改写成失败。
今晚首发只承诺 Mac UI-first + 飞书/钉钉支持面；企业微信留待后续单独补证 / 放行。

## 问题反馈建议

如需反馈问题，请一并提供：

- 当前 macOS 版本
- 当前打开的本地地址
- 页面报错截图
- 启动终端最近输出
