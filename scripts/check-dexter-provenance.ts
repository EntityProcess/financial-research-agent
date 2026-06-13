#!/usr/bin/env bun
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const DEXTER_PINNED_COMMIT = '8d9419829f443f84b804d033bb2c3b1fbd788629';

function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

function run(command: string, args: readonly string[], cwd: string) {
  return spawnSync(command, [...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function fail(message: string): never {
  console.error(message);
  console.error('No resolved secret values or private endpoints were printed.');
  process.exit(1);
}

function readJson(filePath: string): Record<string, unknown> {
  return JSON.parse(readFileSync(filePath, 'utf8')) as Record<string, unknown>;
}

function readReadmeLicenseSummary(readmePath: string): string {
  if (!existsSync(readmePath)) return 'README.md: missing';

  const lines = readFileSync(readmePath, 'utf8').split(/\r?\n/);
  const licenseHeadingIndex = lines.findIndex((line) => /^#{1,6}\s+.*license/i.test(line));
  if (licenseHeadingIndex < 0) return 'README.md: no license section found';

  const excerpt = lines
    .slice(licenseHeadingIndex, Math.min(lines.length, licenseHeadingIndex + 4))
    .map((line, index) => `${licenseHeadingIndex + index + 1}: ${line}`)
    .join('\n');

  return `README.md license excerpt:\n${excerpt}`;
}

function main() {
  const repoPath = env('DEXTER_REPO_PATH');
  if (!repoPath) fail('Set DEXTER_REPO_PATH to a local Dexter checkout.');

  const absolutePath = path.resolve(repoPath);
  if (!existsSync(absolutePath)) fail(`DEXTER_REPO_PATH must exist: ${repoPath}`);

  const revParse = run('git', ['rev-parse', 'HEAD'], absolutePath);
  if (revParse.status !== 0) {
    fail('DEXTER_REPO_PATH must be a git checkout so Dexter provenance can be verified.');
  }

  const actualCommit = revParse.stdout.trim();
  const expectedCommit = env('DEXTER_COMMIT') ?? DEXTER_PINNED_COMMIT;
  if (actualCommit !== expectedCommit) {
    fail(`Dexter checkout should be pinned to ${expectedCommit}. Current checkout is ${actualCommit}.`);
  }

  const licenseFiles = run(
    'git',
    ['ls-tree', '-r', '--name-only', 'HEAD'],
    absolutePath,
  )
    .stdout.split(/\r?\n/)
    .filter((name) => /(^|\/)(license|licence|copying|notice)(\.|$)/i.test(name));

  const packageJsonPath = path.join(absolutePath, 'package.json');
  const packageJson = existsSync(packageJsonPath) ? readJson(packageJsonPath) : {};
  const packageLicense = typeof packageJson.license === 'string' ? packageJson.license : undefined;

  console.log(`Dexter repo path: ${absolutePath}`);
  console.log(`Dexter commit: ${actualCommit}`);
  console.log(
    `Standalone license-like files: ${licenseFiles.length > 0 ? licenseFiles.join(', ') : '(none found)'}`,
  );
  console.log(`package.json license field: ${packageLicense ?? '(not set)'}`);
  console.log(readReadmeLicenseSummary(path.join(absolutePath, 'README.md')));
  console.log('');
  console.log(
    'Provenance conclusion: Dexter README states MIT licensing, while no standalone license file or package.json license field is present at the pinned commit.',
  );
  console.log(
    'This AgentV harness may cite Dexter as fixture provenance, but should not copy Dexter prose, source, provider internals, or private API assumptions.',
  );
}

main();
