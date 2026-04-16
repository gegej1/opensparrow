# F-021 Runbook - codeSPEC 模板导入与清洗映射

## 目标

把 `codeSPEC` 中适合 OpenSparrow 当前统一仓清洗 / 重整使用的模板资产，安全地镜像进当前仓，同时明确：

- 不修改 `/Users/eduardogan/Desktop/GHJProject/codeSPEC`
- 不覆盖当前仓已有 `.specify/.codex/longrun/runbook` 权威面
- 只导入经过策展的白名单模板

## 本轮动作

### 1. 建立可重复导入脚本

- 脚本：`scripts/import-codespec-template.sh`
- 自动化测试：`scripts/tests/import-codespec-template.test.mjs`

### 2. 建立参考镜像目录

- 目录：`docs/reference/codeSPEC-template/`
- upstream 快照：`docs/reference/codeSPEC-template/upstream/UnifiedFramework/`
- 白名单说明：`docs/reference/codeSPEC-template/IMPORT_SCOPE.md`

### 3. 同步当前仓长期记忆边界说明

- `longrun/README.md`
- `longrun/CHECKLIST.md`
- `longrun/METHOD.zh-CN.md`

## 刷新命令

```bash
./scripts/import-codespec-template.sh /Users/eduardogan/Desktop/GHJProject/codeSPEC
```

如果不传参数，脚本默认也会读取上述 source 路径。

## 验证命令

```bash
node --test scripts/tests/import-codespec-template.test.mjs
bash -n scripts/import-codespec-template.sh
./scripts/import-codespec-template.sh /Users/eduardogan/Desktop/GHJProject/codeSPEC
python3 -m json.tool longrun/workspaces/opensparrow-unified/feature_list.json >/dev/null
./longrun/workspaces/opensparrow-unified/init.sh
python3 longrun/scripts/progress_report.py longrun/workspaces/opensparrow-unified/feature_list.json
```

## 风险边界

### 禁止事项

- 禁止修改 `codeSPEC` source 项目
- 禁止把 `codeSPEC/spec规范/.specify/.codex/scripts/codex` 覆盖到当前仓
- 禁止把 `AgentTeam` 与当前仓 `F-019` 治理文档并列成双 authority
- 禁止导入研究/实验/回放残留目录

### 当前建议

- 后续若要进一步吸收 `AgentTeam` 的 onboarding / dispatch 模板，先新建 feature，再做本地化改写后迁入
- 后续若要扩展 `UnifiedFramework` 镜像范围，也应先补 `IMPORT_SCOPE.md`，再更新导入脚本白名单
