# OpenSparrow Mac UI-first Packaged Release Checklist

## 适用范围

本清单随交付包分发，只用于今晚的 **Mac UI-first packaged 首发 cut**。

## 1. Package-local checks

```bash
test -f ./01-开始部署.command
bash -n ./01-开始部署.command
bash -n ./mac/run-openclaw-usb.command
bash -n ./mac/harden-openclaw-usb.command
rg -n "18889" ./ui/public/dashboard.html
```

- [ ] 根目录 `01-开始部署.command` 存在
- [ ] 三个 `.command` 语法检查通过
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
- [ ] packaged outward promise 不再把企业微信写成今晚正式支持面
- [ ] companion 没有被写入今晚正式支持面

## 3. Official support assertions

- [ ] 今晚唯一官方 first-click path 是根目录 `01-开始部署.command`
- [ ] `mac/run-openclaw-usb.command` 仅作 advanced compatibility / handoff
- [ ] `mac/harden-openclaw-usb.command` 仅作 advanced compatibility / handoff
- [ ] packaged 正式支持渠道只写飞书 / 钉钉
- [ ] 企业微信 de-scope 被表述为 packaged outward promise 收窄，而不是真正 `F-014` 失败

## 4. Ready for `PKT-027-A3`

- [ ] 新 candidate 已反映当前 source truth
- [ ] 仅剩 packaged execution / verification gate 待 `A3` 处理
- [ ] 可以把 candidate 交给 `PKT-027-A3`

**Release candidate ready for A3 dispatch**: [ ] Yes / [ ] No
