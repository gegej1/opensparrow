import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..')
const serverSource = fs.readFileSync(path.join(repoRoot, 'ui', 'server.mjs'), 'utf8')

test('packaged profile has its own extension root for profiled openclaw commands', () => {
  assert.match(
    serverSource,
    /const PROFILE_EXTENSIONS_DIR = path\.join\(PROFILE_DIR, 'extensions'\)/,
  )
})

test('plugin install syncs discovered extensions into profile extension root', () => {
  assert.match(
    serverSource,
    /function syncInstalledPluginIntoProfile\(pluginId\) \{[\s\S]*path\.join\(EXTENSIONS_DIR, id\)[\s\S]*path\.join\(PROFILE_EXTENSIONS_DIR, id\)[\s\S]*fs\.cpSync\(sharedExtDir, profileExtDir, \{ recursive: true, force: true \}\)/,
  )
  assert.match(
    serverSource,
    /const profileSync = syncInstalledPluginIntoProfile\(id\)[\s\S]*if \(!profileSync\.ok\) \{[\s\S]*return \{[\s\S]*ok: false/,
  )
})

test('plugin install authority can close from a profile-ready footprint and backfill shared parity', () => {
  assert.match(
    serverSource,
    /function syncInstalledPluginIntoShared\(pluginId\) \{[\s\S]*path\.join\(PROFILE_EXTENSIONS_DIR, id\)[\s\S]*path\.join\(EXTENSIONS_DIR, id\)[\s\S]*fs\.cpSync\(profileExtDir, sharedExtDir, \{ recursive: true, force: true \}\)/,
  )
  assert.match(
    serverSource,
    /function closeInstalledPluginAuthority\(pluginId, packageSpec\) \{[\s\S]*authority\.profile\.structurallyReady[\s\S]*syncInstalledPluginIntoShared\(id\)[\s\S]*authority\.shared\.structurallyReady[\s\S]*syncInstalledPluginIntoProfile\(id\)/,
  )
})

test('plugins.allow bootstrap accepts plugins discovered in either shared or profile extension roots', () => {
  assert.match(
    serverSource,
    /fs\.existsSync\(path\.join\(EXTENSIONS_DIR, id\)\)\s*\|\|\s*fs\.existsSync\(path\.join\(PROFILE_EXTENSIONS_DIR, id\)\)/,
  )
})

test('dingtalk plugin patching prefers profiled extension root before shared extension root', () => {
  assert.match(
    serverSource,
    /function resolveDingtalkPluginDistFile\(\) \{[\s\S]*path\.join\(\s*PROFILE_EXTENSIONS_DIR,\s*'channels'[\s\S]*path\.join\(\s*EXTENSIONS_DIR,\s*'channels'/,
  )
})
