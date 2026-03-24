# F-010 Runbook - CI/CD Pipeline Baseline

## 元数据
- 日期：`2026-03-24`
- 作者/Agent：`Codex-A`
- 关联 spec：`specs/009-ci-cd-pipeline/spec.md`

## 概述
- 本 runbook 说明统一真源仓第一版 GitHub Actions CI 的触发条件、job 组成、本地等价命令与常见故障排查。
- 当前 CI 只覆盖基础质量门槛，不负责 deploy/release。

## 触发条件
- `push` 到 `main`
- 任意 `pull_request`

工作流文件：`.github/workflows/ci.yml`

## Job 说明

### 1. `shell-lint`
- 目的：把仓内关键 shell / `.command` 入口的语法错误前移到 PR 阶段。
- 检查范围：
  - `scripts/openclaw-usb/*.sh`
  - `scripts/verify-legacy-freeze.sh`
  - `deploy/docker/bin/*.sh`
  - `platforms/linux/companion/*.sh`
  - `platforms/mac/companion/*`（排除 `*.md`）
  - `platforms/mac/wrappers/*.command`
- 实现方式：`find ... -print0 | xargs -0 -r bash -n`

### 2. `node-check`
- 目的：验证 `ui/server.mjs` 没有语法错误。
- 运行环境：Node `18.x`
- 命令：`node --check ui/server.mjs`

### 3. `docker-validate`
- 目的：验证 `deploy/docker/docker-compose.yml` 可以正确渲染。
- 命令：`docker compose -f deploy/docker/docker-compose.yml config`
- 说明：该 job 不会 build 镜像，也不会启动容器。

### 4. `repo-health`
- 目的：验证 unified longrun 清单与 legacy freeze 契约没有失效。
- 检查项：
  - `longrun/workspaces/opensparrow-unified/feature_list.json` 是合法 JSON
  - `scripts/verify-legacy-freeze.sh` 具备可执行位且执行通过
  - 冻结标记文件存在：`docs/legacy-archive-freeze-20260323.md`

## 本地等价验证命令

### YAML 结构检查

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"
```

若本机没有 PyYAML，至少手工确认 YAML 缩进，并继续执行下列 job 对应命令。

### Shell lint

```bash
find scripts/openclaw-usb -maxdepth 1 -type f -name '*.sh' -print0 | xargs -0 -r bash -n
find scripts -maxdepth 1 -type f -name 'verify-legacy-freeze.sh' -print0 | xargs -0 -r bash -n
find deploy/docker/bin -maxdepth 1 -type f -name '*.sh' -print0 | xargs -0 -r bash -n
find platforms/linux/companion -maxdepth 1 -type f -name '*.sh' -print0 | xargs -0 -r bash -n
find platforms/mac/companion -maxdepth 1 -type f ! -name '*.md' -print0 | xargs -0 -r bash -n
find platforms/mac/wrappers -maxdepth 1 -type f -name '*.command' -print0 | xargs -0 -r bash -n
```

### Node check

```bash
node --check ui/server.mjs
```

### Docker validate

```bash
docker compose -f deploy/docker/docker-compose.yml config
```

### Repo health

```bash
python3 -m json.tool longrun/workspaces/opensparrow-unified/feature_list.json >/dev/null
chmod +x scripts/verify-legacy-freeze.sh
test -x scripts/verify-legacy-freeze.sh
bash scripts/verify-legacy-freeze.sh
test -f docs/legacy-archive-freeze-20260323.md
```

## 通过标准
- 四个 job 全部为绿色。
- 当前 `main` 分支本地执行上述等价命令无失败。
- spec、runbook 与 unified longrun 记录保持同步。

## 故障排查
- `shell-lint` 失败：先定位是哪一个脚本被 `bash -n` 报错，再按原路径修复；不要把修复落到 frozen 目录。
- `node-check` 失败：优先检查 `ui/server.mjs` 最近改动是否引入未闭合括号、字符串或 import 语法错误。
- `docker-validate` 失败：优先检查 `deploy/docker/docker-compose.yml` 缩进、环境变量占位符、service/volume 结构。
- `repo-health` 失败：
  - JSON 失败：修复 `feature_list.json` 语法；
  - freeze verify 失败：检查 legacy 冻结目录、`.gitignore` 或校验脚本权限；
  - marker file 失败：确认 `docs/legacy-archive-freeze-20260323.md` 未被误删。

## 后续扩展建议
- 后续如需新增 job，优先继续复用“无额外依赖、可本地复现”的命令链。
- 如果要新增 PowerShell、build/export、Docker build 或 smoke test，需先补对应 spec/task，再扩展 workflow。
