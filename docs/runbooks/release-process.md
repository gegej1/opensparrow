# OpenSparrow Mac UI-first Packaged Release Process

## 适用范围

本 runbook 随交付包分发，只覆盖今晚的 **Mac UI-first packaged 首发 cut**。

冻结口径：

- 只发 Mac
- 唯一官方 first-click path 是根目录 `01-开始部署.command`
- `mac/run-openclaw-usb.command` 与 `mac/harden-openclaw-usb.command` 仅是 advanced compatibility / handoff
- packaged outward promise 不承诺企业微信 tonight-ready
- companion 不纳入今晚正式支持面

## 1. 打开 candidate

进入当前交付包根目录，并确认至少存在：

```text
./01-开始部署.command
./README.txt
./README.md
./docs/INSTALL.md
./docs/SOP.md
./runbooks/F-005-ui-install-reset.md
./ui/public/dashboard.html
./mac/run-openclaw-usb.command
./mac/harden-openclaw-usb.command
```

## 2. 核对 packaged official support surface

至少确认：

- 根目录存在 `01-开始部署.command`
- `mac/run-openclaw-usb.command` 与 `mac/harden-openclaw-usb.command` 仍在，但只承担 handoff 角色
- `ui/public/dashboard.html` 不再把服务端口写死为 `18889`
- packaged docs 只承诺 Mac UI-first 支持面
- packaged docs 不再把 `mac/run-openclaw-usb.command` 当作主安装路径
- packaged outward promise 不再把企业微信写成今晚正式可交付支持面

可直接使用的只读检查：

```bash
test -f ./01-开始部署.command
bash -n ./01-开始部署.command
bash -n ./mac/run-openclaw-usb.command
bash -n ./mac/harden-openclaw-usb.command
rg -n "18889" ./ui/public/dashboard.html
rg -n "Windows|windows|WeCom|企业微信|run-openclaw-usb.command" \
  ./README.txt \
  ./README.md \
  ./docs/INSTALL.md \
  ./docs/SOP.md \
  ./runbooks/F-005-ui-install-reset.md
```

## 3. 官方使用方式

统一口径：

1. 从交付包根目录双击 `01-开始部署.command`
2. 在浏览器安装向导中只按今晚正式支持面完成配置
3. 安装完成后在 Dashboard 中继续操作
4. 若误点 `mac/run-openclaw-usb.command` 或 `mac/harden-openclaw-usb.command`，应只看到 handoff 回根目录入口

## 4. 何时视为 blocker

以下任一命中，都应阻止继续外发：

- 根目录缺少 `01-开始部署.command`
- Dashboard 仍把 gateway port 写死为 `18889`
- 文档仍把 Windows 写成今晚正式支持面
- 文档仍把 `mac/run-openclaw-usb.command` 写成主安装入口
- 文档仍把企业微信写成今晚 packaged ready 支持面
- secondary wrapper 仍像主安装 / 主 hardening 入口

## 5. 边界提醒

- 这份 runbook 不把 Windows 纳入今晚正式支持面
- 这份 runbook 不把企业微信写成今晚 packaged ready 支持面
- 这份 runbook 不把 companion 纳入今晚正式支持面
- bundled runtime / plugin mismatch 不能被反写成真正 `F-014` 失败
