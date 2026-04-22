# Vendor Runtime 来源清单

> 本文档记录 `vendor/` 下各平台运行时包的来源、版本与校验信息。
> 最后更新：2026-04-22

## 说明

- 当前仓库没有保存原始下载压缩包，也没有 `vendor/checksums.sha256` 清单。
- 下表中的“SHA256（存档包）”采用 Node.js 官方 `SHASUMS256.txt` 中对应归档文件的上游 SHA256。
- 上游来源 URL 依据本地实际探测到的 **Node 版本 + 平台架构 + 目录布局** 对应到 Node.js 官方下载归档；本地 bundle 本身还附带了 `openclaw` 运行层（`package.json` 依赖为 `^2026.3.12`）。
- `2026-04-22` 起，mac packaged release 不再允许只靠 artifact 命名推断 CPU 架构；必须以 `file vendor/mac-openclaw/bin/node` 和 `RUNTIME_TRUTH.json.nodeBinaryArchitectures` 为准。
- `2026-04-22` 起，任何对外交付包都不得夹带 package-local Sparrow/OpenClaw 状态目录（`.gtclaw-state`、`.openclaw`、`.openclaw-*`）；release/export 脚本必须在 shipping 前清理这些目录。

## 总览

| 平台 | 目录 | Node 版本 | OpenClaw 版本 | 架构 | 来源 | SHA256（存档包） |
|------|------|-----------|--------------|------|------|-----------------|
| macOS | `vendor/mac-openclaw/` | `v24.14.0` | `2026.3.23` | `universal (x86_64 + arm64)` | `https://nodejs.org/dist/v24.14.0/node-v24.14.0-darwin-x64.tar.gz` + `https://nodejs.org/dist/v24.14.0/node-v24.14.0-darwin-arm64.tar.gz` | `f2879eb810e25993a0578e5d878930266fd2eafcffe9f2839b3d8db354d4879e` + `a1a54f46a750d2523d628d924aab61758a51c9dad3e0238beb14141be9615dd3` |
| Linux | `vendor/linux-openclaw/` | `v24.14.0` | `2026.3.23` | `x64` | `https://nodejs.org/dist/v24.14.0/node-v24.14.0-linux-x64.tar.xz` | `41cd79bb7877c81605a9e68ec4c91547774f46a40c67a17e34d7179ef11729df` |
| Windows | `vendor/windows-openclaw/` | `v24.14.0` | `2026.3.23` | `x64` | `https://nodejs.org/dist/v24.14.0/node-v24.14.0-win-x64.zip` | `313fa40c0d7b18575821de8cb17483031fe07d95de5994f6f435f3b345f85c66` |

## 探测方法

- macOS 版本：`vendor/mac-openclaw/bin/node --version`
- Linux 版本：当前主机为 macOS，无法直接执行 `vendor/linux-openclaw/bin/node`；改用 `strings vendor/linux-openclaw/bin/node` 提取版本，并用 `file` 确认其为 Linux x86-64 ELF
- Windows 版本：当前主机为 macOS，无法直接执行 `vendor/windows-openclaw/node.exe`；改用 `strings vendor/windows-openclaw/node.exe` 提取版本，并用 `file` 确认其为 Windows x86-64 PE
- 文档线索：检查各平台目录下的 `README.md`、`CHANGELOG.md`、`LICENSE`
- 架构探测：`file vendor/mac-openclaw/bin/node`

## 各平台详情

### macOS (`mac-openclaw`)

- 本地目录：`vendor/mac-openclaw/`
- Node 版本：`v24.14.0`
- 架构：`universal (x86_64 + arm64)`
- 本地探测证据：
  - `vendor/mac-openclaw/bin/node --version` → `v24.14.0`
  - `file vendor/mac-openclaw/bin/node` → `Mach-O universal binary with 2 architectures: [x86_64] [arm64]`
  - `vendor/mac-openclaw/CHANGELOG.md` 顶部为 `# Node.js 24 ChangeLog`，并包含 `24.14.0` 锚点
  - `vendor/mac-openclaw/README.md` 指向 Node.js 官方下载页 `https://nodejs.org/en/download/`
- 上游来源：Node.js 官方发布归档（Node 24.14.0）
  - 归档 URL（x64）：`https://nodejs.org/dist/v24.14.0/node-v24.14.0-darwin-x64.tar.gz`
  - 归档 URL（arm64）：`https://nodejs.org/dist/v24.14.0/node-v24.14.0-darwin-arm64.tar.gz`
  - 上游 SHA256（x64）：`f2879eb810e25993a0578e5d878930266fd2eafcffe9f2839b3d8db354d4879e`
  - 上游 SHA256（arm64）：`a1a54f46a750d2523d628d924aab61758a51c9dad3e0238beb14141be9615dd3`
- 本地关键文件摘要：
  - `bin/node`
  - `bin/npm`
  - `bin/npx`
  - `bin/corepack`
  - `include/node/`
  - `lib/node_modules/`
  - `share/doc/`
  - `share/man/`
  - `start`
- 本地 `node` 二进制 SHA256：`deb14a21a7f7a81978455eaaf9e3e3f1840a48a8afa2883994e3e59ec63e1649`
- 附加运行层：`vendor/mac-openclaw/lib/node_modules/openclaw/package.json` 版本为 `2026.3.23`（升级于 2026-03-25）
- 严重事故备注：
  - `2026-04-22` 曾发生一次假 arm64 packaged 事故：artifact 名称标记为 `arm64`，但 bundled `node` 实际只有 `x86_64`。
  - 从该事故起，mac release 必须同时满足：
    - `file vendor/mac-openclaw/bin/node` 包含 `arm64`
    - `RUNTIME_TRUTH.json.nodeBinaryArchitectures` 明确记录 bundled runtime CPU 架构
    - build/export 在架构不匹配时直接 fail-fast
    - build/export / handoff export 在 shipping 前清掉 `.gtclaw-state`、`.openclaw`、`.openclaw-*`

### Linux (`linux-openclaw`)

- 本地目录：`vendor/linux-openclaw/`
- Node 版本：`v24.14.0`
- 架构：`x64`
- 本地探测证据：
  - `strings vendor/linux-openclaw/bin/node` 命中 `v24.14.0`
  - `file vendor/linux-openclaw/bin/node` → `ELF 64-bit LSB executable, x86-64, ... for GNU/Linux 3.2.0`
  - `vendor/linux-openclaw/CHANGELOG.md` 顶部为 `# Node.js 24 ChangeLog`，并包含 `24.14.0` 锚点
  - `vendor/linux-openclaw/README.md` 指向 Node.js 官方下载页 `https://nodejs.org/en/download/`
- 上游来源：Node.js 官方发布归档（Node 24.14.0）
  - 归档 URL：`https://nodejs.org/dist/v24.14.0/node-v24.14.0-linux-x64.tar.xz`
  - 上游 SHA256：`41cd79bb7877c81605a9e68ec4c91547774f46a40c67a17e34d7179ef11729df`
- 本地关键文件摘要：
  - `bin/node`
  - `bin/npm`
  - `bin/npx`
  - `bin/corepack`
  - `include/node/`
  - `lib/node_modules/`
  - `share/doc/`
  - `share/man/`
- 本地 `node` 二进制 SHA256：`e237a2839d0cbdc9a9a2adda1a184afc0f5b20306ffbe923af5686550472d8a8`
- 附加运行层：`vendor/linux-openclaw/lib/node_modules/openclaw/package.json` 版本为 `2026.3.23`（升级于 2026-03-25）

### Windows (`windows-openclaw`)

- 本地目录：`vendor/windows-openclaw/`
- Node 版本：`v24.14.0`
- 架构：`x64`
- 本地探测证据：
  - `strings vendor/windows-openclaw/node.exe` 命中 `v24.14.0`
  - `file vendor/windows-openclaw/node.exe` → `PE32+ executable (console) x86-64, for MS Windows`
  - `vendor/windows-openclaw/README.md` 与 `LICENSE` 显示该目录为 Node.js 发布内容
  - `vendor/windows-openclaw/package.json` 仅声明 `openclaw` 依赖为 `^2026.3.12`，不单独记录 Node 版本；因此版本以 `node.exe` 二进制探测为准
- 上游来源：Node.js 官方发布归档（Node 24.14.0）
  - 归档 URL：`https://nodejs.org/dist/v24.14.0/node-v24.14.0-win-x64.zip`
  - 上游 SHA256：`313fa40c0d7b18575821de8cb17483031fe07d95de5994f6f435f3b345f85c66`
- 本地关键文件摘要：
  - `node.exe`
  - `npm` / `npm.cmd` / `npm.ps1`
  - `npx` / `npx.cmd` / `npx.ps1`
  - `corepack` / `corepack.cmd`
  - `node_modules/`
  - `install_tools.bat`
- 本地 `node.exe` SHA256：`63c259c81e5d472b5f11c8d506070130cb04a1ecf84b80377a34ed6ec9048088`
- 附加运行层：`vendor/windows-openclaw/node_modules/openclaw/package.json` 版本为 `2026.3.23`（升级于 2026-03-25）

## 更新流程

1. **确定目标版本与平台**
   - 明确要更新的 Node 版本、目标平台（macOS / Linux / Windows）和架构（当前仓内分别为 `universal(x86_64 + arm64)`、`x64`、`x64`）。

2. **下载上游归档与校验文件**
   - 从 `nodejs.org` 对应版本目录下载官方归档与 `SHASUMS256.txt` / `SHASUMS256.txt.asc`。
   - 示例：
     - `https://nodejs.org/dist/v24.14.0/node-v24.14.0-darwin-x64.tar.gz`
     - `https://nodejs.org/dist/v24.14.0/node-v24.14.0-darwin-arm64.tar.gz`
     - `https://nodejs.org/dist/v24.14.0/node-v24.14.0-linux-x64.tar.xz`
     - `https://nodejs.org/dist/v24.14.0/node-v24.14.0-win-x64.zip`

3. **校验上游归档**
   - 使用官方 `SHASUMS256.txt` 做 SHA256 校验；如需更严格校验，再结合 `SHASUMS256.txt.asc` 做签名校验。

4. **解压并替换 vendor 目录**
   - 将归档解压到对应 `vendor/<platform>-openclaw/`。
   - macOS 当前要求最终 `bin/node` 至少带 `arm64` slice；若需要保留 x64 兼容，可在校验来源后构建 universal binary。
   - 不要在未记录来源和 SHA 的情况下直接替换 `vendor/` 二进制。

5. **恢复 OpenClaw 运行层**
   - 确认 `package.json` / `package-lock.json` 与 `openclaw` 依赖层保持一致。
   - 更新后重新核对 `node` 二进制、`npm`、`npx`、`corepack`、`LICENSE` 等关键文件。

6. **更新文档与校验脚本输出**
   - 运行：`bash scripts/verify-vendor.sh`
   - 同步更新本文档中的：
     - Node 版本
     - 架构
     - 上游 URL
     - 上游 SHA256
     - 本地二进制 SHA256（如有变化）

7. **补充 checksum 清单（推荐）**
   - 后续建议新增 `vendor/checksums.sha256`，把当前仓内实际保存的关键二进制和必要文件摘要纳入版本管理外的校验流程。
   - `scripts/verify-vendor.sh` 已预留对该文件的自动校验逻辑。
