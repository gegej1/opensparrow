# OpenSparrow Mac UI-first Packaged Release Checklist

## 适用范围

本清单随交付包分发，只用于今晚的 **Mac UI-first packaged 首发 cut**。

## 1. Package-local checks

```bash
test -f ./01-开始部署.command
bash -n ./01-开始部署.command
bash -n ./mac/run-openclaw-usb.command
bash -n ./mac/harden-openclaw-usb.command
file ./vendor/mac-openclaw/bin/node
cat ./vendor/mac-openclaw/RUNTIME_TRUTH.json
find . -type d \( -name '.gtclaw-state' -o -name '.openclaw' -o -name '.openclaw-*' \)
rg -n "18889" ./ui/public/dashboard.html
```

- [ ] 根目录 `01-开始部署.command` 存在
- [ ] 三个 `.command` 语法检查通过
- [ ] bundled `vendor/mac-openclaw/bin/node` 包含 `arm64` slice
- [ ] `RUNTIME_TRUTH.json` 存在且带 `nodeBinaryArchitectures`
- [ ] 交付包内没有残留 `.gtclaw-state`、`.openclaw`、`.openclaw-*` 等 package-local Sparrow/OpenClaw 状态目录
- [ ] packaged dashboard 不再把端口写死为 `18889`

## 2. Support-surface wording checks

```bash
rg -n "Windows|windows|WeCom|企业微信|run-openclaw-usb.command|harden-openclaw-usb.command" \
  ./README.txt \
  ./README.md \
  ./docs/INSTALL.md \
  ./docs/SOP.md \
  ./runbooks/F-005-ui-install-reset.md \
  ./runbooks/release-process.md
```

- [ ] packaged docs 不再把 Windows 写成今晚正式支持面
- [ ] packaged docs 不再把 `mac/run-openclaw-usb.command` 写成主安装路径
- [ ] packaged docs 已与最新 DingTalk / WeCom PASS truth 对齐
- [ ] companion 没有被写入今晚正式支持面
- [ ] docs 已明确记录 “安装页假转圈 / retry 不幂等” 事故与日志路径

## 3. Official support assertions

- [ ] 今晚唯一官方 first-click path 是根目录 `01-开始部署.command`
- [ ] `mac/run-openclaw-usb.command` 仅作 advanced compatibility / handoff
- [ ] `mac/harden-openclaw-usb.command` 仅作 advanced compatibility / handoff
- [ ] packaged 正式支持渠道与 latest fresh truth 一致
- [ ] shipping 前已单独确认 runtime CPU 架构 truth，而不是只看 artifact 名称中的 `arm64`
- [ ] install retry / reinstall 不会因旧插件目录残留而直接报 `plugin already exists`
- [ ] `/api/install` 超时后，页面会根据 `/api/install/status` 的 terminal state 及时显示成功或失败，而不是无限显示“正在部署中…”

## 4. Ready for `PKT-027-A3`

- [ ] 新 candidate 已反映当前 source truth
- [ ] 仅剩 packaged execution / verification gate 待 `A3` 处理
- [ ] 可以把 candidate 交给 `PKT-027-A3`

**Release candidate ready for A3 dispatch**: [ ] Yes / [ ] No

## 5. 严重事故回归防线

- [ ] 旧错误 Desktop bundle `opensparrow-mac-full-package-20260422-170758-skills100` 已明确标记为事故证据，不再继续外发
- [ ] 没有再次出现“artifact 名称是 `arm64`，但 bundled `node` 只有 `x86_64`”的假 arm64 包
- [ ] 新 Apple Silicon Mac 无 Rosetta 时，不会因 `Bad CPU type in executable` 在 first-click 直接退出
- [ ] 任意对外交付包都没有把 package-local `.gtclaw-state` / `.openclaw*` 状态重新打进去
- [ ] 发生安装失败时，可直接在 `GTClaw-*/.gtclaw-state/.openclaw-gtclaw-portable/` 下找到 `install-state.json`、`install.log`、`diagnostic-bundle.json`
- [ ] 对外交付使用的是未运行过的 zip 或重新解压的干净目录，而不是已经在本机跑出 `.gtclaw-state` 的展开目录
- [ ] 如果还要再打最外层桌面总包 zip，必须使用保留 symlink 的归档方式；不能用普通 `zip -qr` 把 `vendor/mac-openclaw/bin/npm|npx|corepack` 压扁
