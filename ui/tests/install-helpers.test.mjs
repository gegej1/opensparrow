import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { copyDirectoryEntries, findBundledPluginArchive } from '../install-helpers.mjs'

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
  fs.writeFileSync(path.join(root, 'sunnoy-wecom-3.0.0.tgz'), 'x', 'utf8')

  assert.equal(
    path.basename(findBundledPluginArchive(root, '@openclaw-china/channels')),
    'openclaw-china-channels-2026.3.29.tgz',
  )
  assert.equal(
    path.basename(findBundledPluginArchive(root, '@sunnoy/wecom@3.0.0')),
    'sunnoy-wecom-3.0.0.tgz',
  )
  assert.equal(findBundledPluginArchive(root, '@missing/plugin'), null)
})
