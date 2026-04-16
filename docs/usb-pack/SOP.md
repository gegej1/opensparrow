# OpenSparrow Mac UI-first 首发 SOP

## 元数据

- 日期：`2026-04-15`
- Feature：`F-027`
- 适用对象：今晚 Mac packaged release 的操作者 / 支持人员

## 今晚边界

- 这是 **Mac-only UI-first 首发 cut**
- 唯一官方 first-click path：根目录 `01-开始部署.command`
- 今晚正式支持渠道：`飞书`、`钉钉`
- `mac/run-openclaw-usb.command` 与 `mac/harden-openclaw-usb.command` 只保留为 **advanced compatibility / handoff**
- 企业微信不纳入今晚 packaged outward promise
- companion 不纳入今晚正式支持面
- 不把 bundled runtime / plugin mismatch 反写成真正 `F-014` 失败

## 交付包应包含什么

至少应看到：

```text
opensparrow-<version>-mac-ui-<arch>/
├── 01-开始部署.command
├── README.md
├── README.txt
├── docs/
│   ├── INSTALL.md
│   └── SOP.md
├── mac/
│   ├── 01-开始部署.command
│   ├── run-openclaw-usb.command
│   └── harden-openclaw-usb.command
├── plugins/
├── runbooks/
└── ui/
```

重点口径：

- 根目录 `01-开始部署.command` 是唯一官方起点
- `mac/*.command` 不是主安装路径
- 文档不得继续把 Windows 当作今晚支持面
- 文档不得继续把企业微信写成今晚 packaged ready 支持面

## 标准操作

1. 进入交付包根目录。
2. 双击 `01-开始部署.command`。
3. 等待浏览器打开安装向导。
4. 只按今晚正式支持面选择：
   - 飞书
   - 钉钉
5. 完成安装后进入 Dashboard。
6. 如需重置或再次安装，在 Dashboard 中完成，不回退到 legacy CLI 流程。

## 高级兼容入口的处理方式

如果用户误点：

- `mac/run-openclaw-usb.command`
- `mac/harden-openclaw-usb.command`

当前期望行为是：

- 明确提示这只是高级兼容 / handoff 入口
- 提示今晚正式支持面仍是根目录 `01-开始部署.command`
- 自动转交到 canonical UI / Dashboard 链路

## 快速核对项

在今晚 release gate 中，至少确认：

- 根目录 `01-开始部署.command` 存在
- Dashboard “基本信息”卡片中的端口来自 authoritative read-back，而不是前端写死 `18889`
- `README.txt`、`docs/INSTALL.md`、`docs/SOP.md` 不再把 Windows 写成今晚正式支持面
- `docs/SOP.md` 不再把 `mac/run-openclaw-usb.command` 写成主安装入口
- packaged outward promise 已去掉企业微信 tonight-ready 承诺

## 故障排查

### 浏览器地址不是 `19000`

这是允许的。若默认端口占用，系统会自动切到下一个可用端口。
以启动输出和 Dashboard 展示的实际端口为准。

### 仍然看到高级兼容入口

这是允许的，但它们只能作为 handoff surface。
若脚本仍直接收凭据、直跑 legacy CLI、或绕开 UI / Dashboard，则应视为 blocker。

### 用户问到企业微信

统一口径：

- 真正 `F-014` 没有被改写
- 今晚只是 packaged outward promise de-scope
- 当前 cut 不把企业微信作为正式可交付支持面
