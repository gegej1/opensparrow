# UnifiedFramework

这是 `codeSPEC` 下的统一总框架目录，用来定义多个方法体系之间的边界、主从关系与整合方式。

当前已收录：
- `01-Unified-Framework-Architecture.md`：统一总框架架构定义（当前唯一权威）
- `02-Pruning-Checklist.md`：剪枝清单，定义哪些重复项该删、该迁、该改为引用
- `03-Interface-Contracts.md`：四层之间的输入、输出、读写边界与触发顺序
- `04-New-Project-Integration-Flow.md`：新项目如何以最小内核接入统一框架
- `05-Migration-Playbook.md`：已有项目如何从混用状态迁移到统一框架
- `06-Future-Extension-Policy.md`：未来引入新记忆框架或更成熟多 Agent 架构时的扩展策略
- `07-Current-State-Audit.md`：基于当前 `spec规范`、`longterm`、`superpower` 的现状审计与首轮整改建议

使用建议：
1. 先读 `01-Unified-Framework-Architecture.md`
2. 再读 `02-Pruning-Checklist.md` 明确删改原则
3. 再读 `03-Interface-Contracts.md` 明确层间接口
4. 接着读 `04-New-Project-Integration-Flow.md`，按标准顺序接入新项目
5. 再读 `05-Migration-Playbook.md`，把已有项目迁移到统一框架
6. 最后读 `06-Future-Extension-Policy.md`，为未来扩展预留正确接口
7. 再读 `07-Current-State-Audit.md`，明确现阶段哪些地方已经重叠、该先改什么
8. 最后再做剪枝、迁移、合并或项目适配

说明：
- 这里不直接替代 `spec规范`、`longterm`、`AgentTeam` 或 `superpower skill`
- 这里负责定义它们之间的关系
