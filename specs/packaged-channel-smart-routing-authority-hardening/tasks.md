# Tasks: Packaged Channel Smart Routing Authority Hardening

> **Status:** facts-only closeout recorded 2026-05-02. These tasks are a gate checklist, not Worker authorization. Do not skip gates; any non-`APPROVED` or non-`PASS` gate result returns the packet to the previous responsible phase.

## Closeout Record

- [x] Packet identity recorded: `packaged-channel-smart-routing-authority-hardening`.
- [x] Spec Review recorded as `APPROVED`.
- [x] Worker Rounds 8-16 recorded as `DONE`.
- [x] Batch Review recorded as `APPROVED`.
- [x] Batch Verify recorded as `PASS`.
- [x] Fresh package root recorded as `dist/usb-pack/opensparrow-0.1.0-alpha`.
- [x] Active instance recorded with profile `gtclaw-portable`, packaged configPath `.gtclaw-state/.openclaw-gtclaw-portable/openclaw.json`, UI/router/gateway `19000 / 18412 / 18929`, and runtimeOwnership `current/current/current/current_only`.
- [x] Smart authority recorded as `effectivePrimaryModel=opensparrow-router/auto`, `singleModelMode=false`, and tier map `SIMPLE -> gpt-4o`, `MEDIUM -> gpt-5.4-nano`, `COMPLEX -> gpt-5.4`, `REASONING -> gpt-5.5`.
- [x] Feishu live external inbound PASS recorded with redacted evidence only, `routerInvocation.invokedSinceStart=true`, `inputSource=sanitized-current-user-text`, recorded length/hash without raw text, `selectedTier=SIMPLE`, `outboundTier=SIMPLE`, and `outboundModel=gpt-4o`.
- [x] Carry-forward Batch Verify evidence recorded for MEDIUM/COMPLEX/REASONING routing, post-history SIMPLE routing, single-model regression, secret safety, and Round 13 vendor marker cleanup.
- [x] Residual risk recorded: DingTalk / WeCom live external inbound was not rerun in the final live continuation and is not claimed as live PASS.
- [x] Security closeout recorded without raw Feishu event envelope, raw user text, sender/chat/message IDs, tokens, secrets, bearer tokens, API keys, or raw JSON metadata.

## Spec Review Gate

- [ ] Confirm current facts were corrected: Feishu `4o-mini` is stale/pre-reload or ambiguous evidence, not current post-reload inbound proof.
- [ ] Confirm DingTalk and WeCom current snapshots are `opensparrow-router/auto`.
- [ ] Confirm DingTalk/WeCom nano behavior is treated as router `COMPLEX` tier selection from wrapped input, not router bypass.
- [ ] Confirm active instance facts are recorded: UI `19000`, gateway `18930`, router `18412`, provider/model `opensparrow-router/auto`.
- [ ] Confirm tier map is recorded: `SIMPLE -> gpt-4o`, `MEDIUM -> gpt-4o`, `COMPLEX -> gpt-5.4-nano`, `REASONING -> gpt-5.5`.
- [ ] Confirm root cause is channel smart-routing input-boundary bug plus stale-instance evidence hazard.
- [ ] Confirm no model hardcoding is requested.
- [ ] Confirm Worker write-set is still only proposed, not authorized by this SpecWriter revision.
- [ ] Confirm after Spec Review approval, `specs/**` is frozen for Worker, Reviewer, and Verifier unless the packet returns to SpecWriter and Spec Review.
- [ ] If Spec Review is not `APPROVED`, return to SpecWriter revision.

## Worker Gate

- [ ] Enter Worker Gate only after Spec Review approves the revised spec and write-set.
- [ ] Confirm Worker does not edit forbidden surfaces:
  - `vendor/**`
  - `dist/**`
  - `platforms/**`
  - `scripts/build-usb-pack.sh`
  - `ui/public/**`
  - `docs/**`
  - `longrun/**`
  - `.gtclaw-state/**`
  - credential/auth files
  - frozen `specs/**`
  - Mem0
- [ ] Add failing source test for DingTalk simple wrapped channel prompt -> `SIMPLE/gpt-4o`.
- [ ] Add failing source test for WeCom simple wrapped channel prompt -> `SIMPLE/gpt-4o`.
- [ ] Add failing source test proving literal JSON metadata / channel envelope does not trigger `COMPLEX`.
- [ ] Add failing source test proving prior complex turn / shared `agent:main:main` history does not affect latest simple prompt.
- [ ] Add failing source test proving Feishu `4o-mini` stale/pre-reload evidence cannot count as current authority without active post-reload instance proof.
- [ ] Add failing source test proving active-instance evidence is filtered by `packRoot`, `configPath`, `profile`, ports, and current provider/model.
- [ ] Add secret-safety tests with synthetic fake secrets for API key, auth profile key, gateway token, and channel secret.
- [ ] Implement current-user-text extraction so router tier selection uses raw/sanitized current user text.
- [ ] Ensure channel envelope, literal JSON metadata, history, and tool/system context are not the complexity judgment body.
- [ ] Add redacted diagnostics containing only source label, length, hash, selected tier, and selected model by default.
- [ ] Ensure diagnostics do not output raw channel envelope or raw user original text.
- [ ] Preserve `opensparrow-router` and `opensparrow-router/auto`.
- [ ] Preserve single-model mode.
- [ ] Run approved source verification commands.
- [ ] If Worker Gate is not `DONE`, return to Worker changes or Spec Review if scope is wrong.

## Batch Review Gate

- [ ] Verify no forbidden write-set file changed.
- [ ] Verify Worker did not edit frozen `specs/**`.
- [ ] Verify Worker did not write Mem0.
- [ ] Verify no model hardcoding was introduced.
- [ ] Verify DingTalk/WeCom router authority remains `opensparrow-router/auto`.
- [ ] Verify DingTalk simple wrapped prompt routes `SIMPLE/gpt-4o` in tests.
- [ ] Verify WeCom simple wrapped prompt routes `SIMPLE/gpt-4o` in tests.
- [ ] Verify literal JSON metadata / channel envelope does not trigger `COMPLEX`.
- [ ] Verify prior complex turn / shared `agent:main:main` history does not affect latest simple prompt.
- [ ] Verify Feishu stale/pre-reload evidence is filtered by active instance facts.
- [ ] Verify diagnostics expose no raw channel envelope, no raw user original text, and no secrets.
- [ ] If Batch Review Gate is not `APPROVED`, return to Worker Gate or Spec Review Gate, depending on the issue.

## Batch Verify Gate

- [ ] Build or identify the active package instance only with instance proof.
- [ ] Verify active UI port `19000`, gateway port `18930`, router port `18412`, or record changed active ports with evidence.
- [ ] Verify active `packRoot`, `configPath`, `profile`, and current provider/model `opensparrow-router/auto`.
- [ ] Verify active tier map: `SIMPLE -> gpt-4o`, `MEDIUM -> gpt-4o`, `COMPLEX -> gpt-5.4-nano`, `REASONING -> gpt-5.5`.
- [ ] Verify DingTalk simple wrapped channel prompt -> `SIMPLE/gpt-4o`.
- [ ] Verify WeCom simple wrapped channel prompt -> `SIMPLE/gpt-4o`.
- [ ] Verify literal JSON metadata / channel envelope does not trigger `COMPLEX`.
- [ ] Verify prior complex turn / shared `agent:main:main` history does not affect latest simple prompt.
- [ ] Verify Feishu current post-reload inbound evidence before accepting any Feishu model evidence as current.
- [ ] If Feishu evidence only shows old `4o-mini`, classify it as stale/pre-reload or ambiguous and do not count it as current authority.
- [ ] Verify complex current text routes to `COMPLEX/gpt-5.4-nano`.
- [ ] Verify reasoning current text routes to `REASONING/gpt-5.5`.
- [ ] Verify existing single-model mode still works for all three channels.
- [ ] Run secret scans over status, install status, diagnostics, diagnostics export, diagnostic bundle, install state, install log, response headers, and verifier output.
- [ ] Confirm no synthetic fake API key, auth profile key, gateway token, channel secret, raw channel envelope, or raw user original text appears.
- [ ] If Batch Verify Gate is not `PASS`, return to Worker Gate or Batch Review Gate, depending on the failure.

## Closer Gate

- [ ] Enter Closer Gate only after Spec Review `APPROVED`, Worker Gate `DONE`, Batch Review Gate `APPROVED`, and Batch Verify Gate `PASS`.
- [ ] Confirm Worker, Reviewer, and Verifier did not write Mem0.
- [ ] Write facts-only docs/longrun closeout only after Batch Verify Gate `PASS`.
- [ ] Write durable Mem0 only as Closer and only after Batch Review `APPROVED` plus Batch Verify `PASS`.
- [ ] Use `metadata.project = opensparrow` for any Closer Mem0 write.
- [ ] Do not rewrite spec truth from closeout notes.
- [ ] If Closer Gate cannot be satisfied, leave packet open and return to the failed prior gate.
