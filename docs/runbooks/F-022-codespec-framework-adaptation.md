# F-022 Runbook - codeSPEC 底层框架适配

## 目标

把 `codeSPEC` 从“参考模板来源”升级成当前 OpenSparrow 真正在使用的底层开发框架来源，并完成本地化适配。

## 本轮收口内容

- 新增 `docs/governance/` 作为当前仓活跃治理面
- 把 `AgentTeam` 中高价值的 onboarding / dispatch / quick reference 模板改写为 OpenSparrow 本地版本
- 把 `UnifiedFramework` 的 authority / execution bridge 视角吸收到 `framework-stack.md`
- 对齐 `AGENTS.md`、constitution、`README.md`、`longrun` prompt scaffold
- 扩展 `scripts/import-codespec-template.sh` 的 reference 白名单

## 刷新命令

```bash
./scripts/import-codespec-template.sh /Users/eduardogan/Desktop/GHJProject/codeSPEC
```

## 适配后应该怎么用

### 开新 feature

1. 先读 `AGENTS.md`
2. 再读 `docs/governance/framework-stack.md`
3. 再读 `longrun` 当前事实
4. 建 `spec -> plan -> tasks`
5. 再进实现与验证

### 接手陌生模块

直接先跑：

- `docs/governance/project-onboarding-sop.md`

### 派工

直接从：

- `docs/governance/dispatch-templates.md`

复制后按当前 feature 填空改写。

## 验证命令

```bash
node --test scripts/tests/import-codespec-template.test.mjs
bash -n scripts/import-codespec-template.sh
./scripts/import-codespec-template.sh /Users/eduardogan/Desktop/GHJProject/codeSPEC
./longrun/workspaces/opensparrow-unified/init.sh
python3 longrun/scripts/progress_report.py longrun/workspaces/opensparrow-unified/feature_list.json
```

## 完成判定

满足以下条件即可视为本轮框架底座已经适配完成：

- 新协作者可以从 `AGENTS.md` 找到治理入口
- feature 开发路径不再混淆 `specs/` 与 `longrun`
- `longrun` prompt scaffold 不再假装自己是完整执行框架
- `codeSPEC` reference 扩展后仍保持 source 只读和白名单导入
