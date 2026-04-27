import fs from 'node:fs'
import path from 'node:path'

export function copyDirectoryEntries(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true })
  for (const entry of fs.readdirSync(srcDir)) {
    fs.cpSync(path.join(srcDir, entry), path.join(destDir, entry), {
      recursive: true,
      force: true,
    })
  }
}

function normalizePackageName(spec) {
  let value = String(spec ?? '').trim()
  if (!value) return ''
  value = value.replace(/^(clawhub:|npm:)/, '')
  if (value.startsWith('@')) {
    const versionMarker = value.indexOf('@', 1)
    if (versionMarker !== -1) value = value.slice(0, versionMarker)
  } else {
    const versionMarker = value.lastIndexOf('@')
    if (versionMarker > 0) value = value.slice(0, versionMarker)
  }
  return value.replace(/^@/, '').replace(/\//g, '-').trim()
}

export function findBundledPluginArchive(pluginsDir, spec) {
  if (!pluginsDir || !spec || !fs.existsSync(pluginsDir)) return null
  const prefix = normalizePackageName(spec)
  if (!prefix) return null
  const matches = fs.readdirSync(pluginsDir)
    .filter(name => name.startsWith(`${prefix}-`) && name.endsWith('.tgz'))
    .sort((left, right) => right.localeCompare(left, undefined, { numeric: true, sensitivity: 'base' }))
  return matches[0] ? path.join(pluginsDir, matches[0]) : null
}

export const REQUIRED_BUNDLED_PLUGIN_SPECS = Object.freeze([
  '@openclaw-china/channels',
  '@wecom/wecom-openclaw-plugin',
])

function normalizeRequiredSpecs(specs) {
  const candidates = Array.isArray(specs) && specs.length > 0
    ? specs
    : REQUIRED_BUNDLED_PLUGIN_SPECS
  return [...new Set(
    candidates
      .map(spec => String(spec ?? '').trim())
      .filter(Boolean),
  )]
}

function toBundledArchiveDisplayPath(archivePath) {
  if (!archivePath) return null
  return path.posix.join('plugins', path.basename(archivePath))
}

export function inspectBundledPluginReadiness(pluginsDir, options = {}) {
  const checkedPluginsDir = pluginsDir ? path.resolve(String(pluginsDir)) : ''
  const required = Boolean(options?.required)
  const specs = normalizeRequiredSpecs(options?.specs)
  const archives = {}
  const missing = []

  for (const spec of specs) {
    const archivePath = findBundledPluginArchive(checkedPluginsDir, spec)
    const ready = Boolean(archivePath)
    archives[spec] = {
      required,
      ready,
      archive: toBundledArchiveDisplayPath(archivePath),
    }
    if (required && !ready) missing.push(spec)
  }

  return {
    required,
    ready: !required || missing.length === 0,
    pluginsDir: checkedPluginsDir,
    archives,
    missing,
  }
}
