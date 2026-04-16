import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const thisFile = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(thisFile), '..', '..');
const importScript = path.join(repoRoot, 'scripts', 'import-codespec-template.sh');

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function buildSourceTree(rootDir) {
  const unifiedDir = path.join(rootDir, 'UnifiedFramework');
  const agentTeamDir = path.join(rootDir, 'AgentTeam');

  writeFile(path.join(unifiedDir, 'README.md'), '# UnifiedFramework\n');
  writeFile(path.join(unifiedDir, '01-Unified-Framework-Architecture.md'), '# 01\n');
  writeFile(path.join(unifiedDir, '02-Pruning-Checklist.md'), '# 02\n');
  writeFile(path.join(unifiedDir, '03-Interface-Contracts.md'), '# 03\n');
  writeFile(path.join(unifiedDir, '04-New-Project-Integration-Flow.md'), '# 04\n');
  writeFile(path.join(unifiedDir, '05-Migration-Playbook.md'), '# 05\n');
  writeFile(path.join(unifiedDir, '06-Future-Extension-Policy.md'), '# 06\n');
  writeFile(path.join(unifiedDir, '12-Superpower-Execution-Bridge.md'), '# 12\n');
  writeFile(path.join(unifiedDir, '07-Current-State-Audit.md'), '# skip\n');
  writeFile(path.join(unifiedDir, '13-Batch-2-Execution-Design.md'), '# skip batch\n');
  writeFile(path.join(unifiedDir, 'export-manifest.authoring.yaml'), 'manifest_version: 1\n');
  writeFile(path.join(agentTeamDir, 'README.md'), '# agent team\n');
  writeFile(path.join(agentTeamDir, '01-Commander-SOP.md'), '# skip commander\n');
  writeFile(path.join(agentTeamDir, '02-Project-Onboarding-SOP.md'), '# onboarding\n');
  writeFile(path.join(agentTeamDir, '03-Dispatch-Templates.md'), '# dispatch\n');
  writeFile(path.join(agentTeamDir, '04-Quick-Reference.md'), '# quick ref\n');
}

function runImport(sourceDir, targetDir) {
  return spawnSync('bash', [importScript, sourceDir, targetDir], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
}

test('imports only curated UnifiedFramework files into upstream snapshot', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codespec-import-'));
  const sourceDir = path.join(tempRoot, 'codeSPEC');
  const targetDir = path.join(tempRoot, 'opensparrow', 'docs', 'reference', 'codeSPEC-template');

  buildSourceTree(sourceDir);
  writeFile(path.join(targetDir, 'README.md'), 'local readme\n');
  writeFile(path.join(targetDir, 'IMPORT_SCOPE.md'), 'local scope\n');

  const result = runImport(sourceDir, targetDir);

  assert.equal(result.status, 0, result.stderr || result.stdout);

  const upstreamDir = path.join(targetDir, 'upstream', 'UnifiedFramework');
  assert.equal(readFile(path.join(targetDir, 'README.md')), 'local readme\n');
  assert.equal(readFile(path.join(targetDir, 'IMPORT_SCOPE.md')), 'local scope\n');
  assert.ok(fs.existsSync(path.join(upstreamDir, 'README.md')));
  assert.ok(fs.existsSync(path.join(upstreamDir, '01-Unified-Framework-Architecture.md')));
  assert.ok(fs.existsSync(path.join(upstreamDir, '06-Future-Extension-Policy.md')));
  assert.ok(fs.existsSync(path.join(upstreamDir, '12-Superpower-Execution-Bridge.md')));
  assert.ok(fs.existsSync(path.join(upstreamDir, 'export-manifest.authoring.yaml')));
  assert.equal(fs.existsSync(path.join(upstreamDir, '07-Current-State-Audit.md')), false);
  assert.equal(fs.existsSync(path.join(upstreamDir, '13-Batch-2-Execution-Design.md')), false);
  const agentTeamDir = path.join(targetDir, 'upstream', 'AgentTeam');
  assert.ok(fs.existsSync(path.join(agentTeamDir, 'README.md')));
  assert.ok(fs.existsSync(path.join(agentTeamDir, '02-Project-Onboarding-SOP.md')));
  assert.ok(fs.existsSync(path.join(agentTeamDir, '03-Dispatch-Templates.md')));
  assert.ok(fs.existsSync(path.join(agentTeamDir, '04-Quick-Reference.md')));
  assert.equal(fs.existsSync(path.join(agentTeamDir, '01-Commander-SOP.md')), false);

  const manifest = readFile(path.join(targetDir, 'upstream', 'IMPORT_MANIFEST.md'));
  assert.match(manifest, /Semantic source:/);
  assert.match(manifest, /01-Unified-Framework-Architecture\.md/);
  assert.match(manifest, /12-Superpower-Execution-Bridge\.md/);
  assert.match(manifest, /02-Project-Onboarding-SOP\.md/);
});

test('refresh deletes stale upstream files without touching local reference docs', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codespec-refresh-'));
  const sourceDir = path.join(tempRoot, 'codeSPEC');
  const targetDir = path.join(tempRoot, 'opensparrow', 'docs', 'reference', 'codeSPEC-template');

  buildSourceTree(sourceDir);
  writeFile(path.join(targetDir, 'README.md'), 'keep me\n');
  writeFile(path.join(targetDir, 'upstream', 'UnifiedFramework', 'stale.md'), 'remove me\n');

  const result = runImport(sourceDir, targetDir);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(readFile(path.join(targetDir, 'README.md')), 'keep me\n');
  assert.equal(
    fs.existsSync(path.join(targetDir, 'upstream', 'UnifiedFramework', 'stale.md')),
    false,
  );
});
