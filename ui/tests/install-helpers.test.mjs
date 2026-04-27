import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import * as installHelpers from '../install-helpers.mjs'

const { copyDirectoryEntries, findBundledPluginArchive } = installHelpers

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'opensparrow-install-helpers-'))
}

test('copyDirectoryEntries copies files and nested directories', () => {
  const root = makeTempDir()
  const src = path.join(root, 'src')
  const dest = path.join(root, 'dest')
  fs.mkdirSync(path.join(src, 'agents'), { recursive: true })
  fs.writeFileSync(path.join(src, 'README.md'), '# hello\n', 'utf8')
  fs.writeFileSync(path.join(src, 'agents', 'worker.md'), 'agent\n', 'utf8')

  copyDirectoryEntries(src, dest)

  assert.equal(fs.readFileSync(path.join(dest, 'README.md'), 'utf8'), '# hello\n')
  assert.equal(fs.readFileSync(path.join(dest, 'agents', 'worker.md'), 'utf8'), 'agent\n')
})

test('findBundledPluginArchive resolves scoped package tarballs', () => {
  const root = makeTempDir()
  fs.writeFileSync(path.join(root, 'openclaw-china-channels-2026.3.29.tgz'), 'x', 'utf8')
  fs.writeFileSync(path.join(root, 'wecom-wecom-openclaw-plugin-2026.4.22.tgz'), 'x', 'utf8')

  assert.equal(
    path.basename(findBundledPluginArchive(root, '@openclaw-china/channels')),
    'openclaw-china-channels-2026.3.29.tgz',
  )
  assert.equal(
    path.basename(findBundledPluginArchive(root, '@wecom/wecom-openclaw-plugin@2026.4.22')),
    'wecom-wecom-openclaw-plugin-2026.4.22.tgz',
  )
  assert.equal(findBundledPluginArchive(root, '@missing/plugin'), null)
})

test('inspectBundledPluginReadiness reports required DingTalk and WeCom archives', () => {
  assert.equal(typeof installHelpers.inspectBundledPluginReadiness, 'function')

  const root = makeTempDir()
  fs.writeFileSync(path.join(root, 'openclaw-china-channels-2026.4.24.tgz'), 'x', 'utf8')
  fs.writeFileSync(path.join(root, 'wecom-wecom-openclaw-plugin-2026.4.22.tgz'), 'x', 'utf8')

  const readiness = installHelpers.inspectBundledPluginReadiness(root, { required: true })

  assert.equal(readiness.required, true)
  assert.equal(readiness.ready, true)
  assert.equal(readiness.pluginsDir, root)
  assert.deepEqual(readiness.missing, [])
  assert.deepEqual(Object.keys(readiness.archives).sort(), [
    '@openclaw-china/channels',
    '@wecom/wecom-openclaw-plugin',
  ])
  assert.deepEqual(readiness.archives['@openclaw-china/channels'], {
    required: true,
    ready: true,
    archive: 'plugins/openclaw-china-channels-2026.4.24.tgz',
  })
  assert.deepEqual(readiness.archives['@wecom/wecom-openclaw-plugin'], {
    required: true,
    ready: true,
    archive: 'plugins/wecom-wecom-openclaw-plugin-2026.4.22.tgz',
  })
})

test('inspectBundledPluginReadiness reports missing package specs by package name', () => {
  assert.equal(typeof installHelpers.inspectBundledPluginReadiness, 'function')

  const root = makeTempDir()
  fs.writeFileSync(path.join(root, 'wecom-wecom-openclaw-plugin-2026.4.22.tgz'), 'x', 'utf8')

  const readiness = installHelpers.inspectBundledPluginReadiness(root, { required: true })

  assert.equal(readiness.required, true)
  assert.equal(readiness.ready, false)
  assert.deepEqual(readiness.missing, ['@openclaw-china/channels'])
  assert.deepEqual(readiness.archives['@openclaw-china/channels'], {
    required: true,
    ready: false,
    archive: null,
  })
  assert.deepEqual(readiness.archives['@wecom/wecom-openclaw-plugin'], {
    required: true,
    ready: true,
    archive: 'plugins/wecom-wecom-openclaw-plugin-2026.4.22.tgz',
  })
})
