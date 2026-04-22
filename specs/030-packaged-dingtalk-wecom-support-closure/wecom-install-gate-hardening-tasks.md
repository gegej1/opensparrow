# WeCom Install Gate Hardening Tasks

- [x] Add regression coverage for packaged WeCom plugin rejection gate in `ui/tests/packaged-wecom-install-gate.test.mjs`
- [x] Stop `handleInstall()` from continuing into WeCom channel config after plugin install rejection
- [x] Preserve plugin rejection truth in install-state and diagnostics surfaces while skipping follow-on `channels.wecom.*` writes
- [x] Re-run targeted node tests and `node --check ui/server.mjs`
