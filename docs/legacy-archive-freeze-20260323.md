# Legacy 归档冻结说明（2026-03-23）

## 结论

从 `2026-03-23` 起，以下目录在 `opensparrow/` 根目录内进入 **逻辑归档（logical archive）** 状态：

- `opensparrow_win/`
- `_push_opensparrow_win/`
- `openclaw-usb-feishu-delivery/`
- `openclawtest/`

这里的“归档执行”不是立刻物理删除，而是先完成三件更安全的动作：

1. 明确它们不再承担 source-of-truth 角色；
2. 用根级 `.gitignore` 和工作规则阻止继续把它们当主维护面；
3. 用 `scripts/verify-legacy-freeze.sh` 把冻结契约固化成可重复校验。

物理压缩、搬离工作根或导出到 `dist/archive/` 的动作，留到 build/export 收口完成后再做，避免误伤仍需对照的历史交付物。

## 目录角色表

| Legacy 目录 | 当前身份 | 是否允许继续手改业务/真源 | Canonical 去向 | 备注 |
|---|---|---:|---|---|
| `opensparrow_win/` | 历史 Windows snapshot | 否 | `scripts/openclaw-usb/`、`ui/`、`docs/`、`platforms/windows/`、`longrun/workspaces/openclaw-usb-portable/` | 仅保留对照和回归参考 |
| `_push_opensparrow_win/` | 历史 push copy | 否 | 后续由 build/export 生成 | 不再作为手工维护目录 |
| `openclaw-usb-feishu-delivery/` | 历史 delivery snapshot | 否 | `platforms/`、`docs/`、`dist/`、后续 `deploy/docker/` | 保留用于 migration 对照 |
| `openclawtest/` | 实验与旧导出区 | 否 | `longrun/`、`dist/` | 仅保留历史证据 |

## 冻结后允许的动作

- 允许：查阅、比对、抽取漏迁资产。
- 允许：在有 spec/task 记录的前提下，把漏迁资产复制回 canonical 目录。
- 不允许：直接在 legacy 目录里继续修业务逻辑、脚本真源、UI 真源或交付规则。
- 不允许：把 legacy 目录重新当成主仓或二次真源。

## 归档执行证据

- 根级 `.gitignore` 已冻结 legacy 目录。
- 根级 `AGENTS.md` 与 `.specify/memory/constitution.md` 已写明冻结边界。
- `scripts/verify-legacy-freeze.sh` 已提供自动校验。
- `docs/runbooks/F-007-legacy-archive-docker-baseline.md` 已接入 F-007 验证流程。

## 校验命令

```bash
bash scripts/verify-legacy-freeze.sh
```

通过标准：

- 4 个 frozen 目录仍存在；
- `.gitignore` 仍保留冻结规则；
- canonical 主目录存在；
- 本说明文档存在。

## 下一阶段

1. 在 `deploy/docker/` 落地容器化基线；
2. 把 build/export 与 native wrapper 继续收口；
3. 等导出链稳定后，再做物理 archive / 移出工作根。

