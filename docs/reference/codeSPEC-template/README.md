# codeSPEC 模板参考镜像

本目录用于在 **不修改 source 项目** 的前提下，把 `/Users/eduardogan/Desktop/GHJProject/codeSPEC` 中对 OpenSparrow 清洗 / 重整有帮助的模板资产镜像到当前统一仓。

## 定位

- 这是 **参考层 / 镜像层**，不是当前仓的权威规则层。
- 当前仓的权威仍然是：`AGENTS.md`、`.specify/memory/constitution.md`、`specs/`、`docs/runbooks/`、`longrun/`。
- 这里保留的是 `codeSPEC` 的策展模板快照，供后续整理目录、收束边界和统一流程时查阅。

## 当前内容

- `IMPORT_SCOPE.md`：本次导入范围、跳过清单、与当前仓的映射关系
- `upstream/UnifiedFramework/`：从 `codeSPEC/UnifiedFramework/` 复制进来的白名单模板快照
- `upstream/AgentTeam/`：从 `codeSPEC/AgentTeam/` 复制进来的高价值 onboarding / dispatch 参考模板
- `upstream/IMPORT_MANIFEST.md`：最近一次导入的 source 路径与文件清单

## 刷新方式

在当前仓根目录执行：

```bash
./scripts/import-codespec-template.sh /Users/eduardogan/Desktop/GHJProject/codeSPEC
```

默认情况下，脚本只会重建：

- `docs/reference/codeSPEC-template/upstream/`

它不会覆盖同级本地说明文档，例如：

- `docs/reference/codeSPEC-template/README.md`
- `docs/reference/codeSPEC-template/IMPORT_SCOPE.md`

## 已直接吸收到当前仓的改进

本轮不仅建立了 reference 镜像，也把 `codeSPEC` 中对 `longrun` 边界更清晰的说明，直接同步到了当前仓的活跃文档：

- `longrun/README.md`
- `longrun/CHECKLIST.md`
- `longrun/METHOD.zh-CN.md`

这些改动属于当前仓本地化后的正式文档；而 `upstream/` 下的内容仍然只是参考快照。

另外，本轮已把 `AgentTeam` 与 `UnifiedFramework` 的高价值能力本地化到当前仓活跃治理面：`docs/governance/`。

## 为什么不整包复制

因为 `codeSPEC` 同时包含 authoring 面、研究残留、实验目录与 source-specific 文档。如果直接整包搬运，会把当前仓已经存在的 `.specify/.codex/longrun/runbook` 权威面搞乱。

所以本次策略是：

1. **同构资产不覆盖**：当前仓已有 `.specify`、`.codex/prompts`、`scripts/codex`
2. **高价值边界文档镜像化**：导入 `UnifiedFramework` 与 `AgentTeam` 的策展白名单模板
3. **适合当前仓长期使用的内容做本地化改写**：沉淀为 `docs/governance/` 与 `longrun` 活跃文档
4. **仍避免双 authority**：不把上游原文直接当作当前仓活跃治理面
