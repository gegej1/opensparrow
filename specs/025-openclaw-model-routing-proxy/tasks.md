# F-025 Tasks — OpenClaw Model Routing Proxy Integration

- [x] 写 `scripts/tests/model-routing.test.mjs` 失败测试，锁定 provider/fallback/auth 纯逻辑预期。
- [x] 实现 `scripts/model-routing/lib/model-routing.mjs`，让纯逻辑测试转绿。
- [x] 实现 `scripts/model-routing/manage-clawrouter.mjs`，覆盖安装、启动、切换、恢复、状态查询。
- [x] 新增 `scripts/model-routing/{enable,disable,status}-clawrouter.sh`。
- [x] 新增 `platforms/mac/wrappers/02-开启模型智能路由.command`。
- [x] 新增 `platforms/mac/wrappers/03-关闭模型智能路由.command`。
- [x] 新增 `platforms/mac/wrappers/04-检查模型智能路由.command`。
- [x] 新增 `docs/runbooks/F-025-model-routing-proxy.md`。
- [x] 更新 `longrun/workspaces/opensparrow-unified/feature_list.json` 增加 `F-025`。
- [x] 更新 `longrun/workspaces/opensparrow-unified/claude-progress.txt`。
- [x] 跑 `node --test scripts/tests/model-routing.test.mjs`。
- [x] 跑 `node --check scripts/model-routing/manage-clawrouter.mjs`。
- [x] 跑 shell `bash -n`。
- [x] 用临时 profile 验证 enable / status / disable 全链路。
