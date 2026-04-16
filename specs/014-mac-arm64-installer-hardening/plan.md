# F-020 Implementation Plan

1. Add pure install helpers for recursive skill copy and bundled plugin archive discovery.
2. Add node:test coverage for directory-copy behavior and archive resolution.
3. Wire UI install/update flows to prefer bundled plugin archives and gate channel config on plugin readiness.
4. Rebuild the latest mac arm64 UI handoff ZIP with bundled plugin archives and re-run smoke checks.
