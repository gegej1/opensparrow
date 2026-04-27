import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import {
  ACCEPTANCE_MATRIX,
  assertBundledPluginReadiness,
  assertStatusPackRoot,
  collectLauncherEvidence,
  createMissingArchiveFixture,
  fetchStatusUsingPrintedPort,
  parsePrintedUiPort,
} from '../../scripts/verify-packaged-mac-entry-contract.mjs'

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'opensparrow-acceptance-matrix-'))
}

function writeFile(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, contents, 'utf8')
}

test('acceptance matrix covers source wrapper, package root launcher, and mac handoff launcher', () => {
  assert.deepEqual(
    ACCEPTANCE_MATRIX.map((row) => row.id),
    ['source-wrapper', 'package-root-launcher', 'package-mac-handoff'],
  )
  assert.match(ACCEPTANCE_MATRIX[0].requiredRole, /developer|source/i)
  assert.match(ACCEPTANCE_MATRIX[1].requiredRole, /official packaged first-click/i)
  assert.match(ACCEPTANCE_MATRIX[2].requiredRole, /handoff|compatibility/i)
})

test('printed UI port is required and localhost 19000 is never used as fallback evidence', async () => {
  assert.equal(parsePrintedUiPort('Gateway: 18929\nUI: 19037\nMode: packaged runtime hardening\n'), 19037)
  assert.throws(
    () => parsePrintedUiPort('Listening: http://localhost:19000\n'),
    /launcher-printed UI port/i,
  )

  const seenUrls = []
  const status = await fetchStatusUsingPrintedPort('UI: 19037\n', {
    fetchImpl: async (url) => {
      seenUrls.push(url)
      return {
        ok: true,
        status: 200,
        json: async () => ({ instance: { packRoot: '/tmp/package-root' } }),
      }
    },
  })

  assert.equal(status.port, 19037)
  assert.deepEqual(seenUrls, ['http://127.0.0.1:19037/api/status'])
})

test('status packRoot must equal the package root under verification', () => {
  const packRoot = makeTempDir()

  assert.doesNotThrow(() => {
    assertStatusPackRoot({ instance: { packRoot } }, packRoot)
  })

  assert.throws(
    () => assertStatusPackRoot({ instance: { packRoot: makeTempDir() } }, packRoot),
    /stale or wrong UI process/i,
  )
})

test('bundled plugin readiness requires DingTalk and WeCom archives when expected ready', () => {
  const payload = {
    bundledPlugins: {
      required: true,
      ready: true,
      pluginsDir: '/tmp/package-root/plugins',
      archives: {
        '@openclaw-china/channels': {
          required: true,
          ready: true,
          archive: 'plugins/openclaw-china-channels-2026.4.27.tgz',
        },
        '@wecom/wecom-openclaw-plugin': {
          required: true,
          ready: true,
          archive: 'plugins/wecom-wecom-openclaw-plugin-2026.4.22.tgz',
        },
      },
      missing: [],
    },
  }

  assert.doesNotThrow(() => assertBundledPluginReadiness(payload, { expectReady: true }))
})

test('bundled plugin readiness records missing archive negative evidence', () => {
  const payload = {
    bundledPlugins: {
      required: true,
      ready: false,
      pluginsDir: '/tmp/package-root/plugins',
      archives: {
        '@openclaw-china/channels': {
          required: true,
          ready: false,
          archive: null,
        },
        '@wecom/wecom-openclaw-plugin': {
          required: true,
          ready: true,
          archive: 'plugins/wecom-wecom-openclaw-plugin-2026.4.22.tgz',
        },
      },
      missing: ['@openclaw-china/channels'],
    },
  }

  const evidence = assertBundledPluginReadiness(payload, {
    expectReady: false,
    expectedMissing: ['@openclaw-china/channels'],
  })

  assert.deepEqual(evidence.missing, ['@openclaw-china/channels'])
})

test('missing archive fixture removes DingTalk archive while preserving WeCom archive', () => {
  const sourcePackRoot = makeTempDir()
  writeFile(path.join(sourcePackRoot, 'plugins', 'openclaw-china-channels-2026.4.27.tgz'), 'dingtalk')
  writeFile(path.join(sourcePackRoot, 'plugins', 'wecom-wecom-openclaw-plugin-2026.4.22.tgz'), 'wecom')

  const { fixtureRoot, removedArchives } = createMissingArchiveFixture(sourcePackRoot, {
    workRoot: makeTempDir(),
  })

  assert.deepEqual(removedArchives, ['openclaw-china-channels-2026.4.27.tgz'])
  assert.equal(fs.existsSync(path.join(fixtureRoot, 'plugins', 'openclaw-china-channels-2026.4.27.tgz')), false)
  assert.equal(fs.existsSync(path.join(fixtureRoot, 'plugins', 'wecom-wecom-openclaw-plugin-2026.4.22.tgz')), true)
})

test('static launcher evidence recognizes package root launcher and mac handoff role', () => {
  const sourceRoot = makeTempDir()
  const packRoot = makeTempDir()

  writeFile(path.join(sourceRoot, 'platforms', 'mac', 'wrappers', '01-开始部署.command'), [
    '#!/bin/bash',
    'printf "提示：这是源码 source developer/debug mode，不是 packaged 用户安装入口。\\n"',
    'export OPENSPARROW_REQUIRE_BUNDLED_PLUGINS="${OPENSPARROW_REQUIRE_BUNDLED_PLUGINS:-0}"',
    'printf "UI: %s\\n" "$OPENSPARROW_UI_PORT"',
    '',
  ].join('\n'))
  writeFile(path.join(packRoot, '01-开始部署.command'), [
    '#!/bin/bash',
    'export OPENSPARROW_REQUIRE_BUNDLED_PLUGINS="${OPENSPARROW_REQUIRE_BUNDLED_PLUGINS:-1}"',
    'printf "UI: %s\\n" "$OPENSPARROW_UI_PORT"',
    '',
  ].join('\n'))
  writeFile(path.join(packRoot, 'mac', '01-开始部署.command'), [
    '#!/bin/bash',
    'printf "compatibility / handoff\\n"',
    'root_launcher="$script_dir/../01-开始部署.command"',
    'exec "$root_launcher" "$@"',
    '',
  ].join('\n'))

  const evidence = collectLauncherEvidence({ sourceRoot, packRoot })

  assert.equal(evidence.sourceWrapper.pass, true)
  assert.equal(evidence.packageRootLauncher.pass, true)
  assert.equal(evidence.packageMacHandoff.pass, true)
})
